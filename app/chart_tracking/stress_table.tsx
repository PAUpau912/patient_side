import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// ✅ Supabase connection
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

interface StressEntry {
  id: string;
  patient_id: string;
  stress_score: number;
  notes: string;
  recorded_at: string;
  created_at: string;
  recordedDate?: Date;
  formattedDate?: string;
  formattedTime?: string;
}

export default function StressTable() {
  const [stressData, setStressData] = useState<StressEntry[]>([]);
  const [filteredData, setFilteredData] = useState<StressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showNoRecordModal, setShowNoRecordModal] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchStressData = async () => {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const userId = user.id;

        const { data, error } = await supabase
          .from<StressEntry>('patient_stress')
          .select('*')
          .eq('patient_id', userId)
          .order('recorded_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map(entry => ({
          ...entry,
          recordedDate: new Date(entry.recorded_at),
          formattedDate: new Date(entry.recorded_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          formattedTime: new Date(entry.recorded_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        }));

        setStressData(formatted);
        setFilteredData(formatted);
      } catch (err) {
        console.error('Error fetching stress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStressData();
  }, []);

  // Filter logic (search + date)
  useEffect(() => {
    let filtered = [...stressData];

    // Search by integer stress score
    const scoreQuery = parseInt(searchQuery);
    if (!isNaN(scoreQuery)) {
      filtered = filtered.filter(entry => Math.floor(entry.stress_score) === scoreQuery);
    }

    // Date filter (ignore time)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(entry => entry.recordedDate! >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => entry.recordedDate! <= end);
    }

    setFilteredData(filtered);
    setShowNoRecordModal(filtered.length === 0 && searchQuery.trim() !== '');
  }, [searchQuery, startDate, endDate, stressData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#067425" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>😰 Stress Tracking</Text>

        {/* Search by stress score */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by stress score..."
          value={searchQuery}
          onChangeText={setSearchQuery} // auto-filter habang nagta-type
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* Date range filter */}
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.dateButtonText}>{startDate ? startDate.toDateString() : 'Start Date'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.dateButtonText}>{endDate ? endDate.toDateString() : 'End Date'}</Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {filteredData.map(entry => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="brain" size={20} color="#fff" />
              <Text style={styles.cardHeaderText}>{entry.formattedDate}</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.detailText}>🕒 Time: <Text style={styles.bold}>{entry.formattedTime}</Text></Text>
              <Text style={styles.detailText}>📊 Stress Score: <Text style={styles.bold}>{entry.stress_score}</Text></Text>
              <Text style={styles.detailText}>💬 Notes: <Text style={styles.bold}>{entry.notes || '—'}</Text></Text>
              <Text style={styles.detailText}>📅 Recorded At: <Text style={styles.bold}>{new Date(entry.recorded_at).toLocaleString()}</Text></Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showNoRecordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>❌ No records found</Text>
            <Pressable style={styles.modalButton} onPress={() => setShowNoRecordModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 🌿 Styles
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F5' },
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#067425', marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  dateFilterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dateButton: { backgroundColor: '#067425', padding: 10, borderRadius: 8, flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: '#ccc' },
  dateButtonText: { textAlign: 'center',color: "#fff", fontSize: 16, fontWeight: "600"},
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#067425', paddingVertical: 10, paddingHorizontal: 12 },
  cardHeaderText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  cardContent: { padding: 12 },
  detailText: { fontSize: 15, color: '#333', marginBottom: 6 },
  bold: { fontWeight: 'bold', color: '#000' },
  modalOverlay: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContainer: { width:'80%', backgroundColor:'#fff', padding:20, borderRadius:12, alignItems:'center' },
  modalText: { fontSize:18, fontWeight:'600', marginBottom:12, color:'#000' },
  modalButton: { backgroundColor:'#067425', paddingVertical:10, paddingHorizontal:20, borderRadius:8 },
  modalButtonText: { color:'#fff', fontWeight:'600', fontSize:16 },
});
