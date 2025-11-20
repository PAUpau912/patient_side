import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { createClient } from "@supabase/supabase-js";
import { FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

// ✅ Supabase connection
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const MealTracking = () => {
  const [mealData, setMealData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) {
          console.log("❌ No logged-in user found in storage");
          setLoading(false);
          return;
        }

        const user = JSON.parse(userData);
        const userId = user.id;

        console.log("👤 Fetching meals for patient ID:", userId);

        const { data, error } = await supabase
          .from("meals")
          .select("*")
          .eq("patient_id", userId)
          .order("time", { ascending: false }); // Use patient-entered time

        if (error) throw error;

        const formatted = (data || []).map((item: any) => {
          const timeObj = new Date(item.time); // patient-entered time
          return {
            ...item,
            date: timeObj.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            formattedTime: timeObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            timeObj,
          };
        });

        setMealData(formatted);
        setFilteredData(formatted);
        console.log("✅ Fetched meals:", formatted);
      } catch (error) {
        console.error("❌ Error fetching meals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  // Filter meals by search query or selected date
  useEffect(() => {
    let data = mealData;

    if (searchQuery.trim()) {
      data = data.filter((item) =>
        item.meal_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dish?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.drinks?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDate) {
      data = data.filter((item) => {
        const d1 = new Date(item.timeObj); // filter by patient-entered time
        return (
          d1.getFullYear() === selectedDate.getFullYear() &&
          d1.getMonth() === selectedDate.getMonth() &&
          d1.getDate() === selectedDate.getDate()
        );
      });
    }

    setFilteredData(data);
  }, [searchQuery, selectedDate, mealData]);

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
          <Text style={styles.noDataText}>No meal records found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>🍽️ Meal Tracking</Text>

        {/* Search bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by meal type, dish, or drinks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Date filter */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {selectedDate ? selectedDate.toDateString() : "Filter by Date"}
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

        {filteredData.map((entry, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="utensils" size={18} color="#fff" />
              <Text style={styles.mealTypeText}>
                {entry.meal_type || "Unknown Type"}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>📅 Date:</Text>
                <Text style={styles.value}>{entry.date}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>⏰ Time:</Text>
                <Text style={styles.value}>{entry.formattedTime}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>🥗 Meal:</Text>
                <Text style={styles.value}>{entry.meal || entry.dish}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>🍚 Cups of Rice:</Text>
                <Text style={styles.value}>
                  {entry.cup_of_rice || entry.rice_cups || "-"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>🍚 Rice Type:</Text>
                <Text style={styles.value}>{entry.rice_type || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>🥤 Drinks:</Text>
                <Text style={styles.value}>{entry.drinks || "-"}</Text>
              </View>

              <View style={styles.divider} />         
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MealTracking;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F9F4" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#056030",
    marginBottom: 20,
  },
  noDataText: { fontSize: 16, color: "#444" },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dateButton: {
    backgroundColor: "#067425",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  dateButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#067425",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  mealTypeText: { color: "#fff", fontWeight: "bold", fontSize: 16, marginLeft: 8 },
  cardBody: { padding: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  label: { fontWeight: "600", color: "#333", fontSize: 15 },
  value: { fontSize: 15, color: "#444", textAlign: "right", flexShrink: 1 },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: "#056030", marginVertical: 6 },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 8 },
});
