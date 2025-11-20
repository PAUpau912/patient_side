import {
  StyleSheet,
  TextInput,
  Button,
  Alert,
  ScrollView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const MealTracker = () => {
  const [mealType, setMealType] = useState("");
  const [dish, setDish] = useState("");
  const [cupOfRice, setCupOfRice] = useState("");
  const [riceType, setRiceType] = useState(""); // 🍚 Rice type
  const [drinks, setDrinks] = useState("");
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selectedTime) setTime(selectedTime);
  };

  const fetchCaloriesFromAPI = async (foodName: string) => {
    try {
      setAnalyzing(true);
      const response = await fetch("https://food-tracker-zxaz.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food: foodName }),
      });

      const result = await response.json();
      if (result.found) return result.nutrition.calories || 0;
      return 0;
    } catch (err) {
      console.error("Error fetching calories from API:", err);
      return 0;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    // Validation: Dish and Drinks always required
    if (!mealType || !dish || !drinks) {
      Alert.alert("⚠️ Missing Fields", "Please fill in meal type, dish, and drinks.");
      return;
    }

    try {
      setLoading(true);

      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Not logged in", "Please log in first.");
        return;
      }
      const user = JSON.parse(userData);
      const patientId = user.patientId || user.id;

      // 🍽 Dish calories
      const dishCalories = await fetchCaloriesFromAPI(dish);

      // 🍚 Rice calories (optional for meal types)
      let riceCalories = 0;
      const riceCups = Number(cupOfRice) || 0;
      const riceRequiredMealTypes = ["Breakfast", "Lunch", "Dinner", "Snacks"];

      if (riceRequiredMealTypes.includes(mealType) && riceType !== "None" && riceCups > 0) {
        if (riceType === "Brown Rice") riceCalories = riceCups * 215;
        else riceCalories = riceCups * 200; // default White Rice
      }

      // 🥤 Drink calories
      const drinkCalories = await fetchCaloriesFromAPI(drinks);

      const totalCalories = Math.round(dishCalories + riceCalories + drinkCalories);

      console.log("🍱 Computed Calories:", {
        dishCalories,
        riceType,
        riceCalories,
        drinkCalories,
        totalCalories,
      });

      const { error } = await supabase.from("meals").insert([
        {
          patient_id: patientId,
          meal_type: mealType,
          dish,
          rice_type: riceType || "None",
          rice_cups: riceCups,
          drinks,
          calories: totalCalories,
          time: time.toISOString(),
          notes,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      Alert.alert("✅ Success", `Meal saved! (${totalCalories} kcal)`);

      // Reset form
      setMealType("");
      setDish("");
      setRiceType("");
      setCupOfRice("");
      setDrinks("");
      setNotes("");
      setTime(new Date());
    } catch (err: any) {
      console.error("❌ Error saving meal:", err.message);
      Alert.alert("Error", "Failed to save meal entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top"]}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>🍽️ Meal Tracker</Text>

          {/* Meal Type */}
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={mealType} onValueChange={setMealType} style={styles.picker}>
              <Picker.Item label="Select Meal Type" value="" />
              <Picker.Item label="Breakfast" value="Breakfast" />
              <Picker.Item label="Lunch" value="Lunch" />
              <Picker.Item label="Dinner" value="Dinner" />
              <Picker.Item label="Snacks" value="Snacks" />
            </Picker>
          </View>

          {/* Dish */}
          <Text style={styles.label}>Dish</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Adobo"
            value={dish}
            onChangeText={setDish}
          />

          {/* Rice Type */}
          <Text style={styles.label}>Rice Type (Optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={riceType} onValueChange={setRiceType} style={styles.picker}>
              <Picker.Item label="Select Rice Type" value="" />
              <Picker.Item label="White Rice" value="White Rice" />
              <Picker.Item label="Brown Rice" value="Brown Rice" />
              <Picker.Item label="None" value="None" />
            </Picker>
          </View>

          {/* Number of Cups */}
          <Text style={styles.label}>No. of Cups of Rice (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2"
            keyboardType="numeric"
            value={cupOfRice}
            onChangeText={setCupOfRice}
          />

          {/* Drinks */}
          <Text style={styles.label}>Drinks</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Water"
            value={drinks}
            onChangeText={setDrinks}
          />

          {/* Time Picker */}
          <Text style={styles.label}>Time of Meal</Text>
          <View style={{ marginBottom: 16 }}>
            <Button
              title={`🕒 Pick Time (${time.toLocaleTimeString()})`}
              onPress={() => setShowPicker(true)}
              color="#067425"
            />
            {showPicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                is24Hour={false}
                onChange={onTimeChange}
              />
            )}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Any extra notes..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          {(loading || analyzing) && (
            <ActivityIndicator size="large" color="#067425" style={{ marginBottom: 10 }} />
          )}

          <TouchableOpacity
            style={[styles.button, (loading || analyzing) && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading || analyzing}
          >
            <Text style={styles.buttonText}>
              {analyzing ? "Analyzing..." : loading ? "Saving..." : "💾 Save Entry"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MealTracker;

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
  button: {
    backgroundColor: "#067425",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  picker: { color: "#000", fontSize: 16 },
});
