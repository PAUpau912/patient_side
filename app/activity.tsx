import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';

// ✅ Supabase connection
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const ActivityTracker = () => {
  const [activity, setActivity] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  // 🕒 Handle Time Change
  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(null);
      return;
    }
    if (showPicker === 'start' && selectedTime) setStartTime(selectedTime);
    if (showPicker === 'end' && selectedTime) setEndTime(selectedTime);
    setShowPicker(null);
  };

  // 🧮 Compute Duration in minutes
  const computeDuration = () => {
    if (!startTime || !endTime) return 0;
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round(diffMs / 60000);
  };

  // 💾 Submit Activity
  const handleSubmit = async () => {
    if (!activity || !startTime || !endTime) {
      Alert.alert('Please fill in all fields including start and end time.');
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('User not logged in!');
        return;
      }

      const user = JSON.parse(userData);
      const patientId = user.patientId || user.id;
      const duration = computeDuration();

      // ✅ Insert to Supabase
      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            patient_id: patientId,
            activity_type: activity,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration,
            notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('✅ Activity saved successfully!');
      setActivity('');
      setNotes('');
      setStartTime(null);
      setEndTime(null);
    } catch (err: any) {
      console.error('Error saving activity:', err);
      Alert.alert('Error saving activity', err.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>🏃 Activity Tracker</Text>

          <Text style={styles.label}>Activity</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Walking"
            placeholderTextColor="#999"
            value={activity}
            onChangeText={setActivity}
          />

          {/* Start Time Picker */}
          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowPicker('start')}
          >
            <Text style={styles.timeButtonText}>
              {startTime ? startTime.toLocaleTimeString() : 'Pick Start Time'}
            </Text>
          </TouchableOpacity>

          {/* End Time Picker */}
          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowPicker('end')}
          >
            <Text style={styles.timeButtonText}>
              {endTime ? endTime.toLocaleTimeString() : 'Pick End Time'}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={showPicker === 'start' ? startTime || new Date() : endTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={false}
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Any extra notes..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>💾 Save Entry</Text>
          </TouchableOpacity>

          {startTime && endTime && (
            <Text style={styles.durationText}>
              ⏱ Duration: {computeDuration()} mins
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityTracker;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#067425',
    marginBottom: 24,
  },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#000',
    marginBottom: 16,
  },
  timeButton: {
    backgroundColor: '#E6F4EA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  timeButtonText: { color: '#067425', fontWeight: '600', fontSize: 16 },
  button: {
    backgroundColor: '#067425',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  durationText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
