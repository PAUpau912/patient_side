import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// ✅ Supabase connection
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

interface SleepEntry {
  id: string;
  patient_id: string;
  sleep_hours: number;
  notes: string;
  recorded_at: string;
  created_at: string;
}

export default function SleepTable() {
  const [sleepData, setSleepData] = useState<SleepEntry[]>([]);
  const [filteredData, setFilteredData] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showNoRecordModal, setShowNoRecordModal] = useState(false);

  useEffect(() => {
    const fetchSleepData = async () => {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const userId = user.id;

        const { data, error } = await supabase
          .from<SleepEntry>('patient_sleep')
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

        setSleepData(formatted);
        setFilteredData(formatted);
      } catch (err) {
        console.error('Error fetching sleep data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSleepData();
  }, []);

 // Filter based on search (sleep_hours) and date range
useEffect(() => {
  let filtered = [...sleepData];

  // Search by sleep hours (decimal allowed)
  if (searchQuery.trim()) {
    const hoursQuery = parseFloat(searchQuery);
    if (!isNaN(hoursQuery)) {
      filtered = filtered.filter(entry => entry.sleep_hours === hoursQuery);
    }
  }

  // Date filter ignoring time
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // simula ng araw
    filtered = filtered.filter(entry => entry.recordedDate! >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // katapusan ng araw
    filtered = filtered.filter(entry => entry.recordedDate! <= end);
  }

  setFilteredData(filtered);
  setShowNoRecordModal(filtered.length === 0 && searchQuery.trim() !== '');
}, [searchQuery, startDate, endDate, sleepData]);

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
        <Text style={styles.title}>🛌 Sleep Tracking</Text>

        {/* Search by sleep hours */}
        <TextInput
            style={styles.searchInput}
            placeholder="Search by sleep hours..."
            value={searchQuery}
            onChangeText={setSearchQuery} // patuloy pa rin mag-update ang value
            keyboardType="numeric"
            returnKeyType="search"
            onSubmitEditing={() => {
                // I-filter ang data kapag na-submit na
                let filtered = [...sleepData];
                const hoursQuery = parseFloat(searchQuery);
                if (!isNaN(hoursQuery)) {
                filtered = filtered.filter(entry => entry.sleep_hours === hoursQuery);
                }

                if (startDate) filtered = filtered.filter(entry => entry.recordedDate >= startDate);
                if (endDate) filtered = filtered.filter(entry => entry.recordedDate <= endDate);

                setFilteredData(filtered);
                // Modal lalabas lang kapag walang na-match
                setShowNoRecordModal(filtered.length === 0);
            }}
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
              <Ionicons name="bed-outline" size={20} color="#fff" />
              <Text style={styles.cardHeaderText}>{entry.formattedDate}</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.detailText}>🕒 Time: <Text style={styles.bold}>{entry.formattedTime}</Text></Text>
              <Text style={styles.detailText}>🛏️ Sleep Hours: <Text style={styles.bold}>{entry.sleep_hours} hrs</Text></Text>
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
  noDataText: { fontSize: 16, color: '#333' },
  modalOverlay: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContainer: { width:'80%', backgroundColor:'#fff', padding:20, borderRadius:12, alignItems:'center' },
  modalText: { fontSize:18, fontWeight:'600', marginBottom:12, color:'#000' },
  modalButton: { backgroundColor:'#067425', paddingVertical:10, paddingHorizontal:20, borderRadius:8 },
  modalButtonText: { color:'#fff', fontWeight:'600', fontSize:16 },
});
