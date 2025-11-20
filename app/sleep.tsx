import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const SleepTracker = () => {
  const router = useRouter();
  const [hoursSlept, setHoursSlept] = useState<number>(8);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (hoursSlept < 0 || hoursSlept > 24) {
      alert("Please select a valid number of hours (0 - 24).");
      return;
    }

    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) {
        alert("No user data found.");
        setLoading(false);
        return;
      }
      const user = JSON.parse(stored);
      const patient_id = user.id ?? user.userId ?? null;
      if (!patient_id) {
        alert("Cannot determine patient ID.");
        setLoading(false);
        return;
      }

      const record = {
        patient_id,
        sleep_hours: hoursSlept,
        notes: notes || null,
        recorded_at: new Date().toISOString(), // current datetime only
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("patient_sleep").insert([record]);
      if (error) throw error;

      alert("Sleep recorded!");
      setHoursSlept(8);
      setNotes("");
      router.back();
    } catch (err) {
      console.error(err);
      alert("Failed to save sleep record.");
    } finally {
      setLoading(false);
    }
  };

  // Dropdown options: 0.0 to 24.0 in 0.5 increments
  const sleepOptions = Array.from({ length: 49 }, (_, i) => i * 0.5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top"]}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>😴 Night Sleep Tracker</Text>

          <Text style={styles.label}>Hours Slept</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={hoursSlept}
              onValueChange={(val) => setHoursSlept(Number(val))}
              style={styles.picker}
            >
              {sleepOptions.map((h) => (
                <Picker.Item key={h} label={`${h} hrs`} value={h} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Any notes about your sleep..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          {loading && (
            <ActivityIndicator size="large" color="#067425" style={{ marginBottom: 10 }} />
          )}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Saving..." : "💾 Save Sleep"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SleepTracker;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8", padding: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#067425",
    marginBottom: 24,
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
    color: "#000",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  picker: { color: "#000", fontSize: 16 },
  button: {
    backgroundColor: "#067425",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
