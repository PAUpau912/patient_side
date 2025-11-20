import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { createClient } from "@supabase/supabase-js";

// ✅ Connect to Supabase using environment variables
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginTemplate() {
  const router = useRouter();

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log("🔄 Testing Supabase connection...");
        const { data, error } = await supabase.from("patients").select("*").limit(1);
        if (error) throw error;
        console.log("✅ Connected to Supabase:", data);
      } catch (err) {
        console.error("❌ Supabase connection failed:", err);
      }
    };

    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      {/* Icon */}
      <Image source={require("../../assets/icons/images.png")} style={styles.icon} />

      {/* Title */}
      <Text style={styles.title}>Welcome to Diabetic App</Text>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("../screens/login")}>
        <Text style={styles.loginText}>LOGIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#067425",
    marginBottom: 10,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#067425",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  loginText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
