import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const InsulinTable = () => {
  const [insulinData, setInsulinData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Fetch insulin data
  useEffect(() => {
    const fetchInsulin = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) {
          console.log("No user found in storage");
          setLoading(false);
          return;
        }

        const user = JSON.parse(userData);
        const userId = user.id;

        const { data, error } = await supabase
          .from("insulin")
          .select("*")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Format dates using exact time from Supabase
        const formatted = (data || []).map((item: any) => {
          const dateObj = new Date(item.time); // exact log time
          return {
            ...item,
            formattedDate: dateObj.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            formattedTime: dateObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            dateObj,
          };
        });

        setInsulinData(formatted);
        setFilteredData(formatted);
        console.log("✅ Fetched insulin data:", formatted);
      } catch (error) {
        console.error("❌ Error fetching insulin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsulin();
  }, []);

  // Filter data by search query or selected date
  useEffect(() => {
    let data = insulinData;

    if (searchQuery.trim()) {
      data = data.filter((item) =>
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.dosage).includes(searchQuery)
      );
    }

    if (selectedDate) {
      data = data.filter((item) => {
        const d1 = new Date(item.dateObj);
        return (
          d1.getFullYear() === selectedDate.getFullYear() &&
          d1.getMonth() === selectedDate.getMonth() &&
          d1.getDate() === selectedDate.getDate()
        );
      });
    }

    setFilteredData(data);
  }, [searchQuery, selectedDate, insulinData]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

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
          <Text style={styles.noDataText}>No insulin records found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>💉 Insulin Tracking</Text>

        {/* Search by notes or dosage */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by notes or dosage..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filter by date */}
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButtonText}>
            {selectedDate ? selectedDate.toDateString() : 'Filter by Date'}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}

        {filteredData.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="syringe" size={20} color="#fff" />
              <Text style={styles.activityType}>Insulin Entry</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.detailText}>
                🗓️ <Text style={styles.bold}>{item.formattedDate}</Text>
              </Text>
              <Text style={styles.detailText}>
                🕒 <Text style={styles.bold}>{item.formattedTime}</Text>
              </Text>
              <Text style={styles.detailText}>
                💉 Dosage: <Text style={styles.bold}>{item.dosage} units</Text>
              </Text>
              {item.cbg && (
                <Text style={styles.detailText}>
                  🔹 CBG: <Text style={styles.bold}>{item.cbg} mg/dL</Text>
                </Text>
              )}
              {item.cbg_pre_meal && (
                <Text style={styles.detailText}>
                  🍽️ Pre-Meal CBG:{" "}
                  <Text style={styles.bold}>{item.cbg_pre_meal} mg/dL</Text>
                </Text>
              )}
              {item.cbg_post_meal && (
                <Text style={styles.detailText}>
                  🍛 Post-Meal CBG:{" "}
                  <Text style={styles.bold}>{item.cbg_post_meal} mg/dL</Text>
                </Text>
              )}
              <Text style={styles.detailText}>
                💬 Notes: <Text style={styles.bold}>{item.notes || "—"}</Text>
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InsulinTable;

// 🌿 Styles
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F7F5" },
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", color: "#067425", marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  dateButton: { backgroundColor: "#067425", padding: 10, borderRadius: 8, marginBottom: 16, alignItems: "center" },
  dateButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#067425", paddingVertical: 10, paddingHorizontal: 12 },
  activityType: { color: "#fff", fontSize: 18, fontWeight: "600", marginLeft: 8 },
  cardContent: { padding: 12 },
  detailText: { fontSize: 15, color: "#333", marginBottom: 6 },
  bold: { fontWeight: "bold", color: "#000" },
  noDataText: { fontSize: 16, color: "#333" },
});
