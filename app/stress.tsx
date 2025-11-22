import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Button,
} from "react-native";
import React, { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { createClient } from "@supabase/supabase-js";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const StressTracker = () => {
  const router = useRouter();
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selectedDate) setDateTime(selectedDate);
  };

  const handleSave = async () => {
    if (!stressLevel || stressLevel < 1 || stressLevel > 10) {
      alert("Please pick a stress level between 1 and 10.");
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
        stress_score: stressLevel,
        notes: notes || null,
        recorded_at: dateTime.toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("patient_stress").insert([record]);
      if (error) throw error;

      alert("Stress level recorded!");
      setStressLevel(5);
      setNotes("");
      setDateTime(new Date());
      router.back();
    } catch (err) {
      console.error(err);
      alert("Failed to save stress level.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top"]}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>😟 Stress Tracker</Text>

          <Text style={[styles.label, { textAlign: "center" }]}>
            On a scale of 1–10, how stressed are you right now?
          </Text>
          <Text style={[styles.label, { textAlign: "center", fontSize: 12 }]}>
            1 = Not stressed at all, 10 = Extremely stressed
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={stressLevel}
              onValueChange={(val) => setStressLevel(Number(val))}
              style={styles.picker}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Picker.Item key={n} label={`${n}`} value={n} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Date & Time</Text>
          <View style={{ marginBottom: 16 }}>
            <Button
              title={`🕒 Pick Date & Time`}
              onPress={() => setShowPicker(true)}
              color="#067425"
            />
            {showPicker && (
              <DateTimePicker
                value={dateTime}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateTimeChange}
              />
            )}
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="How are you feeling?"
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
            <Text style={styles.buttonText}>{loading ? "Saving..." : "💾 Save Stress"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StressTracker;

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
