import {StyleSheet,Text,View,TextInput,Alert,ScrollView,TouchableOpacity,Platform,Image,} from "react-native";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { createClient } from "@supabase/supabase-js";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Supabase setup
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const Insulin = () => {
  const [dosage, setDosage] = useState("");
  const [cbg, setCbg] = useState("");
  const [cbgPreMeal, setCbgPreMeal] = useState("");
  const [cbgPostMeal, setCbgPostMeal] = useState("");
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ TIME PICKER HANDLER
  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selectedTime) setTime(selectedTime);
  };

  // ✅ CAMERA HANDLER
  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return Alert.alert("Camera permission denied");

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setImageUri(uri);

      const userData = await AsyncStorage.getItem("user");
      if (!userData) return Alert.alert("User data not found!");
      const user = JSON.parse(userData);

      // ✅ Upload image and insert metadata
      const uploadedUrl = await handleUpload(user.id, uri);
      if (uploadedUrl) {
        setPhotoUrl(uploadedUrl);
        Alert.alert("✅ Photo uploaded successfully!");
      } else {
        Alert.alert("❌ Upload failed, try again.");
      }
    } catch (err: any) {
      console.error("Camera error:", err.message);
      Alert.alert("❌ Error taking/uploading photo.");
    }
  };

  // ✅ UPLOAD IMAGE + INSERT METADATA
  const handleUpload = async (patientId: string, uri: string) => {
    try {
      const ext = uri.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${ext}`;

      // Convert URI to Uint8Array
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to bucket root (no subfolder)
      const { error: uploadError } = await supabase.storage
        .from("insulin_photos")
        .upload(fileName, uint8Array, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        Alert.alert("❌ Upload failed");
        return null;
      }

      // ✅ Insert metadata linking photo to patient
      const { error: dbError } = await supabase
        .from("insulin_photos_metadata")
        .insert([{ patient_id: patientId, file_name: fileName }]);

      if (dbError) {
        console.error("Metadata insert failed:", dbError);
        Alert.alert("❌ Failed to save photo info");
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("insulin_photos")
        .getPublicUrl(fileName);

      return publicUrlData?.publicUrl || null;
    } catch (err: any) {
      console.error("Upload error:", err.message);
      return null;
    }
  };

  // ✅ SUBMIT INSULIN DATA
  const handleSubmit = async () => {
    if (!dosage || !time) return Alert.alert("Please fill in dosage and time.");

    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return Alert.alert("User data not found!");
      const user = JSON.parse(userData);

      const insulinData: any = {
        patient_id: user.id,
        dosage: parseFloat(dosage),
        cbg: cbg ? parseInt(cbg) : null,
        cbg_pre_meal: cbgPreMeal ? parseInt(cbgPreMeal) : null,
        cbg_post_meal: cbgPostMeal ? parseInt(cbgPostMeal) : null,
        time: time.toISOString(),
        notes,
      };

      const { error } = await supabase.from("insulin").insert([insulinData]);
      if (error) throw error;

      Alert.alert("✅ Insulin Entry Saved Successfully!");
      setDosage("");
      setCbg("");
      setCbgPreMeal("");
      setCbgPostMeal("");
      setNotes("");
      setTime(new Date());
      setImageUri(null);
      setPhotoUrl(null);
    } catch (err: any) {
      console.error("Error saving insulin data:", err.message);
      Alert.alert("❌ Error saving entry.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ UI
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>💉 Insulin Tracker</Text>

          <Text style={styles.label}>Dosage (units)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            keyboardType="numeric"
            value={dosage}
            onChangeText={setDosage}
          />

          <Text style={styles.label}>CBG (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter CBG reading anytime"
            keyboardType="numeric"
            value={cbg}
            onChangeText={setCbg}
          />

          <Text style={styles.label}>Pre-Meal CBG (mg/dL)</Text>
          <TextInput
            style={styles.input}
            placeholder="Before 1 hr of meal"
            keyboardType="numeric"
            value={cbgPreMeal}
            onChangeText={setCbgPreMeal}
          />

          <Text style={styles.label}>Post-Meal CBG (mg/dL)</Text>
          <TextInput
            style={styles.input}
            placeholder="After 1 hr of meal"
            keyboardType="numeric"
            value={cbgPostMeal}
            onChangeText={setCbgPostMeal}
          />

          <Text style={styles.label}>Time of Injection</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.buttonText}>
              🕒 Pick Time ({time.toLocaleTimeString()})
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              is24Hour={false}
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Any notes..."
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.button} onPress={openCamera}>
            <Text style={styles.buttonText}>📸 Take Picture</Text>
          </TouchableOpacity>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "💾 Save Entry"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insulin;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#067425",
    marginBottom: 20,
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
    color: "#000",
  },
  button: {
    backgroundColor: "#067425",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  imagePreview: { width: "100%", height: 200, marginTop: 10, borderRadius: 12 },
});
