import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { FontAwesome5 } from '@expo/vector-icons';

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

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) {
          console.log('No user found in storage');
          setLoading(false);
          return;
        }

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
        setFilteredData(formatted); // initial filtered = all
        console.log('✅ Fetched activities:', formatted);
      } catch (error) {
        console.error('❌ Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Filter activities based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(activityData);
    } else {
      const filtered = activityData.filter((item) =>
        item.activity_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, activityData]);

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

// 🌿 Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#067425',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#067425',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activityType: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardContent: {
    padding: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000',
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
  },
});
