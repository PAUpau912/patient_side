import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ cbg: '', cbg_pre_meal: '', cbg_post_meal: '' });

  // Fetch insulin data
  useEffect(() => {
    const fetchInsulin = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) {
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

        const formatted = (data || []).map((item: any) => {
          const dateObj = new Date(item.time);
          return {
            ...item,
            formattedDate: dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            formattedTime: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            dateObj,
          };
        });

        setInsulinData(formatted);
        setFilteredData(formatted);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsulin();
  }, []);

  // Filter by search and date
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

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditValues({
      cbg: item.cbg?.toString() || '',
      cbg_pre_meal: item.cbg_pre_meal?.toString() || '',
      cbg_post_meal: item.cbg_post_meal?.toString() || '',
    });
  };

  const saveEdit = async (id: number) => {
    try {
      const updates: any = {};
      const now = new Date().toISOString();

      // Only update empty fields
      if (editValues.cbg && !insulinData.find(item => item.id === id)?.cbg) {
        updates.cbg = Number(editValues.cbg);
        updates.cbg_time = now;
      }
      if (editValues.cbg_pre_meal && !insulinData.find(item => item.id === id)?.cbg_pre_meal) {
        updates.cbg_pre_meal = Number(editValues.cbg_pre_meal);
        updates.cbg_pre_time = now;
      }
      if (editValues.cbg_post_meal && !insulinData.find(item => item.id === id)?.cbg_post_meal) {
        updates.cbg_post_meal = Number(editValues.cbg_post_meal);
        updates.cbg_post_time = now;
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert("⚠️ Nothing to update");
        return;
      }

      const { error } = await supabase
        .from("insulin")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setInsulinData(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                ...updates,
                cbg: updates.cbg ?? item.cbg,
                cbg_pre_meal: updates.cbg_pre_meal ?? item.cbg_pre_meal,
                cbg_post_meal: updates.cbg_post_meal ?? item.cbg_post_meal,
              }
            : item
        )
      );

      setEditingId(null);
      Alert.alert("✅ Updated successfully");
    } catch (err) {
      console.error(err);
      Alert.alert("❌ Failed to update");
    }
  };

  if (loading) return <SafeAreaView style={styles.safeArea}><ActivityIndicator size="large" color="#067425" style={{ flex: 1, justifyContent: "center" }} /></SafeAreaView>;
  if (!filteredData.length) return <SafeAreaView style={styles.safeArea}><Text style={styles.noDataText}>No insulin records found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>💉 Insulin Tracking</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by notes or dosage..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButtonText}>{selectedDate ? selectedDate.toDateString() : 'Filter by Date'}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}

        {filteredData.map((item, index) => {
          const isToday = (() => {
            const today = new Date();
            const d = new Date(item.dateObj);
            return (
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate()
            );
          })();

          return (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <FontAwesome5 name="syringe" size={20} color="#fff" />
                <Text style={styles.activityType}>Insulin Entry</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.detailText}>🗓️ <Text style={styles.bold}>{item.formattedDate}</Text></Text>
                <Text style={styles.detailText}>🕒 <Text style={styles.bold}>{item.formattedTime}</Text></Text>
                <Text style={styles.detailText}>💉 Dosage: <Text style={styles.bold}>{item.dosage} units</Text></Text>

                {editingId === item.id ? (
                  <>
                    {!item.cbg && (
                      <TextInput
                        style={styles.input}
                        placeholder="CBG"
                        keyboardType="numeric"
                        value={editValues.cbg}
                        onChangeText={text => setEditValues(prev => ({ ...prev, cbg: text }))}
                      />
                    )}
                    {!item.cbg_pre_meal && (
                      <TextInput
                        style={styles.input}
                        placeholder="Pre-Meal CBG"
                        keyboardType="numeric"
                        value={editValues.cbg_pre_meal}
                        onChangeText={text => setEditValues(prev => ({ ...prev, cbg_pre_meal: text }))}
                      />
                    )}
                    {!item.cbg_post_meal && (
                      <TextInput
                        style={styles.input}
                        placeholder="Post-Meal CBG"
                        keyboardType="numeric"
                        value={editValues.cbg_post_meal}
                        onChangeText={text => setEditValues(prev => ({ ...prev, cbg_post_meal: text }))}
                      />
                    )}

                    {(!item.cbg || !item.cbg_pre_meal || !item.cbg_post_meal) && (
                      <TouchableOpacity style={styles.saveButton} onPress={() => saveEdit(item.id)}>
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingId(null)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {item.cbg && (
                      <Text style={styles.detailText}>
                        🔹 CBG: <Text style={styles.bold}>{item.cbg} mg/dL</Text> {item.cbg_time && `(${new Date(item.cbg_time).toLocaleTimeString()})`}
                      </Text>
                    )}
                    {item.cbg_pre_meal && (
                      <Text style={styles.detailText}>
                        🍽️ Pre-Meal CBG: <Text style={styles.bold}>{item.cbg_pre_meal} mg/dL</Text> {item.cbg_pre_time && `(${new Date(item.cbg_pre_time).toLocaleTimeString()})`}
                      </Text>
                    )}
                    {item.cbg_post_meal && (
                      <Text style={styles.detailText}>
                        🍛 Post-Meal CBG: <Text style={styles.bold}>{item.cbg_post_meal} mg/dL</Text> {item.cbg_post_time && `(${new Date(item.cbg_post_time).toLocaleTimeString()})`}
                      </Text>
                    )}

                    {isToday && (!item.cbg || !item.cbg_pre_meal || !item.cbg_post_meal) && (
                      <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <Text style={styles.detailText}>💬 Notes: <Text style={styles.bold}>{item.notes || "—"}</Text></Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InsulinTable;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F7F5" },
  container: { flex: 1, padding: 16 },
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
  editButton: { marginTop: 6, backgroundColor: "#FFA500", padding: 8, borderRadius: 6, alignItems: "center" },
  editButtonText: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 15 },
  saveButton: { backgroundColor: "#067425", padding: 10, borderRadius: 6, alignItems: "center", marginBottom: 6 },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  cancelButton: { backgroundColor: "#888", padding: 10, borderRadius: 6, alignItems: "center", marginBottom: 6 },
  cancelButtonText: { color: "#fff", fontWeight: "600" },
});
