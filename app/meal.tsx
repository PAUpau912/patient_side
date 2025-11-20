import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  Text,
  View,
  ScrollView,
  Button,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const MealTracker = () => {
  const [mealType, setMealType] = useState("");
  const [dish, setDish] = useState("");
  const [cupOfRice, setCupOfRice] = useState("");
  const [riceType, setRiceType] = useState(""); 
  const [drinks, setDrinks] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableMeals, setAvailableMeals] = useState<string[]>(["Breakfast", "Lunch", "Dinner", "Snacks"]);

  useEffect(() => {
    checkAvailableMeals();
  }, []);

  const checkAvailableMeals = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return;
      const user = JSON.parse(userData);
      const patientId = user.patientId || user.id;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: mealsToday, error } = await supabase
        .from("meals")
        .select("meal_type")
        .eq("patient_id", patientId)
        .gte("time", todayStart.toISOString())
        .lte("time", todayEnd.toISOString());

      if (error) throw error;

      const existingMeals = mealsToday?.map((m: any) => m.meal_type) || [];
      const mealOrder = ["Breakfast", "Lunch", "Dinner"];

      // Determine next meal allowed
      let nextMealIndex = -1;
      for (let i = 0; i < mealOrder.length; i++) {
        if (!existingMeals.includes(mealOrder[i])) {
          nextMealIndex = i;
          break;
        }
      }

      const newAvailableMeals = ["Snacks"];
      if (nextMealIndex !== -1) newAvailableMeals.unshift(mealOrder[nextMealIndex]);
      setAvailableMeals(newAvailableMeals);

      // Auto-select next meal if exists
      if (newAvailableMeals.length > 0) setMealType(newAvailableMeals[0]);
    } catch (err) {
      console.error("❌ Error checking available meals:", err);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selectedTime) setTime(selectedTime);
  };

  const handleSubmit = async () => {
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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: mealsToday, error } = await supabase
        .from("meals")
        .select("meal_type")
        .eq("patient_id", patientId)
        .gte("time", todayStart.toISOString())
        .lte("time", todayEnd.toISOString());

      if (error) throw error;

      const existingMeals = mealsToday?.map((m: any) => m.meal_type) || [];
      const mealOrder = ["Breakfast", "Lunch", "Dinner"];

      if (mealType !== "Snacks") {
        const lastMealIndex = existingMeals
          .map(m => mealOrder.indexOf(m))
          .filter(i => i !== -1)
          .sort((a, b) => b - a)[0] ?? -1;

        const currentMealIndex = mealOrder.indexOf(mealType);

        if (currentMealIndex <= lastMealIndex) {
          const nextMeal = mealOrder[lastMealIndex + 1];
          Alert.alert(
            "Meal Order Violation",
            `You already logged ${mealOrder[lastMealIndex]} today. Please log ${nextMeal} next.`
          );
          setLoading(false);
          return;
        }
      }

      const riceCups = Number(cupOfRice) || 0;
      const carbsValueNum = carbohydrates.trim() ? parseFloat(carbohydrates) : NaN;
      const carbsValue = Number.isFinite(carbsValueNum) ? carbsValueNum : null;

      const { error: insertError } = await supabase.from("meals").insert([
        {
          patient_id: patientId,
          meal_type: mealType,
          dish,
          rice_type: riceType || "None",
          rice_cups: riceCups,
          carbohydrates_estimation: carbsValue,
          drinks,
          time: time.toISOString(),
          notes,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      Alert.alert("✅ Success", "Meal entry saved!");
      setMealType("");
      setDish("");
      setRiceType("");
      setCupOfRice("");
      setCarbohydrates("");
      setDrinks("");
      setNotes("");
      setTime(new Date());

      checkAvailableMeals(); // Update available meals after submission
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

          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={mealType}
              onValueChange={setMealType}
              style={styles.picker}
            >
              <Picker.Item label="Select Meal Type" value="" />
              {["Breakfast", "Lunch", "Dinner", "Snacks"].map(meal => (
                <Picker.Item
                  key={meal}
                  label={meal}
                  value={meal}
                  enabled={availableMeals.includes(meal)}
                  color={availableMeals.includes(meal) ? "#000" : "#888"}
                />
              ))}
            </Picker>
          </View>

          {/* Dish */}
          <Text style={styles.label}>Dish</Text>
          <TextInput style={styles.input} placeholder="e.g., Adobo" value={dish} onChangeText={setDish} />

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

          {/* Cups of Rice */}
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
          <TextInput style={styles.input} placeholder="e.g., Water" value={drinks} onChangeText={setDrinks} />

          {/* Carbs */}
          <Text style={styles.label}>Estimated Carbohydrates (grams, optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 45"
            keyboardType="numeric"
            value={carbohydrates}
            onChangeText={setCarbohydrates}
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

          {loading && <ActivityIndicator size="large" color="#067425" style={{ marginBottom: 10 }} />}

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Saving..." : "💾 Save Entry"}</Text>
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
  heading: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#067425", marginBottom: 24 },
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
  button: { backgroundColor: "#067425", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, backgroundColor: "#F9FAFB", marginBottom: 16 },
  picker: { color: "#000", fontSize: 16 },
});
