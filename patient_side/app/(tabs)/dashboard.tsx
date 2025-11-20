import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import TrackingButton from "../../components/TrackingButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// ✅ Connect to Supabase using environment variables
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const { width: screenWidth } = Dimensions.get("window");

interface UserType {
  userId: string;
  username: string;
  gender: string;
  phone_number: string;
  address: string;
  date_of_birth: string;
  condition: string;
  profile_picture: string;
  email: string;
  height: number;
  weight: number;
  age: number;
}

interface InsulinEntry {
  id: string;
  user_id: string;
  cbg_pre_meal: number;
  cbg_post_meal: number;
  created_at: string;
}

// Format date properly
const formatDate = (date_of_birth: string) => {
  if (!date_of_birth) return "N/A";
  const date = new Date(date_of_birth);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);

  const handleNavigate = (path: string) => router.push(`/${path}`);

  // Fetch user + alerts together
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          setLoading(true);

          const storedUser = await AsyncStorage.getItem("user");
          if (!storedUser) return;

          const userData = JSON.parse(storedUser);
          if (!isActive) return;

          const currentUser: UserType = {
            userId: userData.id || "N/A",
            username: userData.username || "Patient",
            gender: userData.gender || "N/A",
            phone_number: userData.phone_number || "N/A",
            address: userData.address || "N/A",
            date_of_birth: userData.date_of_birth || "",
            condition: userData.condition || "N/A",
            profile_picture: userData.profile_picture || "https://via.placeholder.com/150",
            email: userData.email || "N/A",
            height: userData.height || 0,
            weight: userData.weight || 0,
            age: userData.age || 0,
          };

          setUser(currentUser);

          // Fetch insulin alerts
          const { data, error } = await supabase
            .from<InsulinEntry, any>("insulin")
            .select("*")
            .eq("patient_id", currentUser.userId)
            .order("created_at", { ascending: true });

          if (error) {
            console.error("Error fetching insulin data:", error);
            return;
          }

          if (!data) return;

          const newAlerts: string[] = [];
          data.forEach(entry => {
            const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            });

            if (entry.cbg_pre_meal < 70) newAlerts.push(`Low Pre-Meal Blood Sugar on ${dateStr} (${entry.cbg_pre_meal} mg/dL)`);
            else if (entry.cbg_pre_meal > 150) newAlerts.push(`High Pre-Meal Blood Sugar on ${dateStr} (${entry.cbg_pre_meal} mg/dL)`);

            if (entry.cbg_post_meal < 70) newAlerts.push(`Low Post-Meal Blood Sugar on ${dateStr} (${entry.cbg_post_meal} mg/dL)`);
            else if (entry.cbg_post_meal > 150) newAlerts.push(`High Post-Meal Blood Sugar on ${dateStr} (${entry.cbg_post_meal} mg/dL)`);
          });

          setAlerts(newAlerts);

        } catch (err) {
          console.error("Unexpected error:", err);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadData();

      return () => { isActive = false; };
    }, [])
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#067425" />
      </View>
    );

  if (!user)
    return (
      <View style={styles.center}>
        <Text>No user data found</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Profile Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={{ uri: user.profile_picture || "https://via.placeholder.com/150" }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{user.username}</Text>

        <View style={styles.profileInfoContainer}>
          <View style={styles.profileInfoColumn}>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Gender: </Text>{user.gender}</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Mobile: </Text>{user.phone_number}</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Address: </Text>{user.address}</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Birthday: </Text>{formatDate(user.date_of_birth)}</Text>
          </View>

          <View style={styles.profileInfoColumn}>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Age: </Text>{user.age}</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Diabetic Type: </Text>{user.condition}</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Height: </Text>{user.height} cm</Text>
            <Text style={styles.profileInfoText}><Text style={styles.profileInfoLabel}>Weight: </Text>{user.weight} kg</Text>
          </View>
        </View>
      </View>

      {/* HORIZONTAL TRACKING OVERVIEW */}
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Tracking Overview</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardScroll}
        >
          <TouchableOpacity
            style={[styles.overviewCard, { backgroundColor: "#E3FCEF" }]}
            onPress={() => handleNavigate("chart_tracking/insulin_table")}
          >
            <Ionicons name="water" size={36} color="#067425" />
            <Text style={styles.cardTitle}>Insulin Logs</Text>
            <Text style={styles.cardSubtitle}>View insulin doses & CBG levels</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.overviewCard, { backgroundColor: "#FFF4E6" }]}
            onPress={() => handleNavigate("chart_tracking/meal_table")}
          >
            <Ionicons name="fast-food" size={36} color="#F59E0B" />
            <Text style={styles.cardTitle}>Meal Records</Text>
            <Text style={styles.cardSubtitle}>Check meals & calories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.overviewCard, { backgroundColor: "#E0E7FF" }]}
            onPress={() => handleNavigate("chart_tracking/activity_table")}
          >
            <Ionicons name="walk" size={36} color="#3B82F6" />
            <Text style={styles.cardTitle}>Activity Logs</Text>
            <Text style={styles.cardSubtitle}>See exercise history</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tracking Buttons */}
<View style={styles.trackingContainer}>
  <Text style={styles.trackingTitle}>Blood Sugar Tracking</Text>

  <View style={styles.trackingButtons}>
    <TrackingButton 
      label="Insulin" 
      emoji="💉" 
      onPress={() => handleNavigate("insulin")} 
      style={styles.trackingButtonItem}
    />

    <TrackingButton 
      label="Meal" 
      emoji="🍽️" 
      onPress={() => handleNavigate("meal")} 
      style={styles.trackingButtonItem}
    />

    <TrackingButton 
      label="Activity" 
      emoji="🏃" 
      onPress={() => handleNavigate("activity")} 
      style={styles.trackingButtonItem}
    />
  </View>
</View>
      {/* Alerts */}
      <View style={styles.alertContainer}>
        <Text style={styles.chartSubtitle}>Alerts</Text>

        {alerts.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#555" }}>No alerts</Text>
        ) : (
          alerts.map((alert, index) => (
            <View key={index} style={styles.AlertTextContainer}>
              <Ionicons name="alert-circle" size={24} color="red" />
              <Text style={styles.AlertText}>{alert}</Text>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8", padding: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4F8" },

  header: {
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 250,
    borderBottomRightRadius: 250,
    backgroundColor: "#067425",
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 8,
  },

  profileCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
  },
  profileName: { fontSize: 20, fontWeight: "bold", marginBottom: 12, color: "#000" },

  profileInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  profileInfoColumn: { flex: 1, paddingHorizontal: 5 },
  profileInfoText: { marginVertical: 2 },
  profileInfoLabel: { color: "#10B981", fontWeight: "600" },

  // HORIZONTAL CARDS
  overviewContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
  cardScroll: {
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  overviewCard: {
    width: 180,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    color: "#000",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginTop: 4,
  },

  // Tracking section
  trackingContainer: {
  marginVertical: 22,
  paddingHorizontal: 20,
  paddingVertical: 20,
  backgroundColor: "#fff",
  borderRadius: 25,
  alignItems: "center",
  width: "90%",
  alignSelf: "center",
  },
  trackingTitle: {  
  fontWeight: "bold",
  marginTop: 5,
  marginBottom: 20,
  fontSize: 18,
  color: "#000",
  textAlign: "center", 
},
  trackingButtons: {  
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  paddingHorizontal: 10,
  columnGap: 10,
},
trackingButtonItem: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
},
  // Alerts
  chartSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  alertContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
  },
  AlertTextContainer: { 
    flexDirection: "row", 
    marginVertical: 2 
  },
  AlertText: { 
    marginLeft: 4,
    fontSize: 14, 
    color: "#000" 
  },
});
