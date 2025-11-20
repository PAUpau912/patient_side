import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Platform } from 'react-native';
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

const ActivityTable = () => {
  const [activityData, setActivityData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) return;

        const user = JSON.parse(userData);
        const userId = user.id;

        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('patient_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((item: any) => {
          const startDate = new Date(item.start_time);
          const endDate = new Date(item.end_time);
          return {
            ...item,
            recordedDate: startDate,
            formattedStartDate: startDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            formattedStartTime: startDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
            formattedEndTime: endDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
          };
        });

        setActivityData(formatted);
        setFilteredData(formatted);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Filter based on search and single date
  useEffect(() => {
    let filtered = [...activityData];

    // search by activity type
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.activity_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // filter by single date
    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item =>
        item.recordedDate >= start && item.recordedDate <= end
      );
    }

    setFilteredData(filtered);
  }, [searchQuery, filterDate, activityData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#067425" />
        </View>
      </SafeAreaView>
    );
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.noDataText}>No activity records found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>🏃 Activity Tracking</Text>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Single Date Filter */}
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            {filterDate ? filterDate.toDateString() : 'Filter by Date'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={filterDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setFilterDate(date);
            }}
          />
        )}

        {filteredData.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="running" size={20} color="#fff" />
              <Text style={styles.activityType}>{item.activity_type}</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.detailText}>
                🗓️ <Text style={styles.bold}>{item.formattedStartDate}</Text>
              </Text>
              <Text style={styles.detailText}>
                🕒 Start: <Text style={styles.bold}>{item.formattedStartTime}</Text>
              </Text>
              <Text style={styles.detailText}>
                🕒 End: <Text style={styles.bold}>{item.formattedEndTime}</Text>
              </Text>
              <Text style={styles.detailText}>
                ⏱️ Duration: <Text style={styles.bold}>{item.duration} mins</Text>
              </Text>
              <Text style={styles.detailText}>
                💬 Notes: <Text style={styles.bold}>{item.notes || '—'}</Text>
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityTable;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F5' },
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#067425', marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  dateButton: {
    backgroundColor: "#067425",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  dateButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#067425', paddingVertical: 10, paddingHorizontal: 12 },
  activityType: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  cardContent: { padding: 12 },
  detailText: { fontSize: 15, color: '#333', marginBottom: 6 },
  bold: { fontWeight: 'bold', color: '#000' },
  noDataText: { fontSize: 16, color: '#333' },
});
