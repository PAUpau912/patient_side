import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Picker } from '@react-native-picker/picker';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ Supabase connection
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id?: string;
  user_id?: string;
  email: string;
  password?: string;
  full_name?: string;
  role?: string;
}

const Settings = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportTitle, setReportTitle] = useState("App Bug");

  // Alarms
  const [insulinTime, setInsulinTime] = useState(new Date());
  const [mealTime, setMealTime] = useState(new Date());
  const [activityTime, setActivityTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState<{ type: string; visible: boolean }>({
    type: "",
    visible: false,
  });

  // Report Issue
  const [issueText, setIssueText] = useState("");
  // Current view state
  const [activeSection, setActiveSection] = useState<"menu" | "account" | "alarms" | "report">("menu");

  // Load user from AsyncStorage
  useEffect(() => {
    const fetchUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setEmail(parsedUser.email);
      }
    };
    fetchUser();
  }, []);

  const getUserId = () => user?.user_id || user?.id;

  // Handlers
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ type: "", visible: false });
    if (!selectedDate) return;
    switch (showPicker.type) {
      case "insulin":
        setInsulinTime(selectedDate);
        break;
      case "meal":
        setMealTime(selectedDate);
        break;
      case "activity":
        setActivityTime(selectedDate);
        break;
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) return Alert.alert("Error", "Please enter your new email.");
    if (!user) return;
    const userId = getUserId();
    if (!userId) return Alert.alert("Error", "User ID not found.");
    setLoading(true);
    const { error } = await supabase.from("users").update({ email }).eq("id", userId);
    setLoading(false);
    if (error) return Alert.alert("Error", error.message);
    const updatedUser = { ...user, email };
    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    Alert.alert("Success", "Email updated successfully!");
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword)
      return Alert.alert("Error", "Please fill out both password fields.");
    if (newPassword !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match.");
    if (!user) return;
    const userId = getUserId();
    if (!userId) return Alert.alert("Error", "User ID not found.");
    setLoading(true);
    const { error } = await supabase.from("users").update({ password: newPassword }).eq("id", userId);
    setLoading(false);
    if (error) return Alert.alert("Error", error.message);
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Success", "Password updated successfully!");
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("userId");
    router.replace("/");
  };

// Sa handleReportIssue
const handleReportIssue = async () => {
  if (!issueText.trim()) return Alert.alert("Error", "Please describe the issue.");
  const userId = getUserId();
  const { error } = await supabase
    .from("reports")
    .insert({ 
      user_id: userId, 
      report_title: reportTitle,  // <-- title field
      report_data: issueText 
    });
  if (error) return Alert.alert("Error", error.message);
  setIssueText("");
  Alert.alert("Success", "Issue reported successfully!");
};
  // MAIN RENDER
  if (activeSection === "menu") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => setActiveSection("account")}>
          <Text style={styles.menuText}>Account Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => setActiveSection("alarms")}>
          <Text style={styles.menuText}>Alarms</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => setActiveSection("report")}>
          <Text style={styles.menuText}>Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => setActiveSection("menu")}>
        <Text style={styles.backText}>← Back to Menu</Text>
      </TouchableOpacity>

      {activeSection === "account" && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <Text style={styles.label}>Current Email</Text>
          <Text style={styles.currentEmail}>{user?.email || "Loading..."}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleUpdateEmail} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Updating..." : "Update Email"}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Updating..." : "Update Password"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeSection === "alarms" && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Alarm Times</Text>
          {["insulin", "meal", "activity"].map((type) => (
            <View key={type} style={{ marginBottom: 15 }}>
              <Text style={{ marginBottom: 5, fontSize: 16 }}>
                {`${type.charAt(0).toUpperCase() + type.slice(1)} Time:`}
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setShowPicker({ type, visible: true })}
              >
                <Text style={styles.buttonText}>
                  {type === "insulin"
                    ? insulinTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : type === "meal"
                    ? mealTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : activityTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          {showPicker.visible && (
            <DateTimePicker
              value={
                showPicker.type === "insulin"
                  ? insulinTime
                  : showPicker.type === "meal"
                  ? mealTime
                  : activityTime
              }
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          )}
        </View>
      )}

          {activeSection === "report" && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Report Issue</Text>

          <Text style={{ marginBottom: 8, fontSize: 16 }}>Select Issue Title</Text>
          <View style={{ backgroundColor: "#f4f4f4", borderRadius: 8, marginBottom: 10 }}>
            <Picker
              selectedValue={reportTitle}
              onValueChange={(itemValue) => setReportTitle(itemValue)}
            >
              <Picker.Item label="App Bug" value="App Bug" />
              <Picker.Item label="Data Issue" value="Data Issue" />
              <Picker.Item label="Suggestion" value="Suggestion" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Describe your issue..."
            value={issueText}
            onChangeText={setIssueText}
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={handleReportIssue}>
            <Text style={styles.buttonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 90, backgroundColor: "#f9f9f9", flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, color: "#067425", textAlign: "center" },
  backText: { color: "#067425", fontWeight: "600", marginBottom: 15 },
  menuButton: {
    backgroundColor: "#067425",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  menuText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  logoutButton: { backgroundColor: "#FF6347", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 15, color: "#067425" },
  label: { fontSize: 16, marginBottom: 5 },
  currentEmail: { fontSize: 16, color: "#555", backgroundColor: "#f4f4f4", padding: 10, borderRadius: 8, marginBottom: 10 },
  input: { backgroundColor: "#f4f4f4", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10, marginTop:5 },
  button: { backgroundColor: "#067425", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});

export default Settings;
