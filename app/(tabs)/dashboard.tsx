import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { glucoseApi } from "../../hooks/useGlucoseApi";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const { width: screenWidth } = Dimensions.get("window");

// ----------------------------- Types ----------------------------------
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
  patient_id: string;
  cbg_pre_meal: number;
  cbg_post_meal: number;
  created_at: string;
}

interface PredictionResponse {
  patient_id: string;
  predicted_glucose: number;
  prediction_timestamp: string;
  model_confidence: string;
  expected_accuracy: string;
}

interface DoctorReport {
  id: string;
  patient_id: string;
  report_data: any;
  created_at: string;
}

// ---------------- Glucose Prediction Widget -------------------
const GlucosePredictionWidget = ({ userId }: { userId: string }) => {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        patient_id: userId,
        dosage: 10,
        cbg: 120,
        carbohydrates_estimation: 45,
        meal_type: "lunch",
        rice_cups: 1,
        time: new Date().toISOString(),
      };

      const result = await glucoseApi.predictGlucose(payload);
      setPrediction(result);
    } catch (e) {
      setError("Failed to load prediction");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPrediction();
  }, []);

  return (
    <View style={styles.widgetContainer}>
      <Text style={styles.title}>Glucose Prediction</Text>

      {loading && <Text style={styles.loadingText}>Loading prediction...</Text>}

      {error && (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchPrediction}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </>
      )}

      {prediction && !loading && !error && (
        <>
          <Text style={styles.glucoseValue}>
            {prediction.predicted_glucose} mg/dL
          </Text>
          <Text style={styles.confidence}>
            Confidence: {prediction.model_confidence}
          </Text>
          <TouchableOpacity style={styles.button} onPress={fetchPrediction}>
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ------------------------------- Dashboard -------------------------------
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorNotes, setDoctorNotes] = useState<any[]>([]);
  const [checkedNotes, setCheckedNotes] = useState<string[]>([]);
  const [insulinEntries, setInsulinEntries] = useState<InsulinEntry[]>([]);

  const handleNavigate = (path: string) => router.push(`/${path}`);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          setLoading(true);

          // Load checked notes
          const storedChecked = await AsyncStorage.getItem("checkedNotes");
          if (storedChecked) {
            setCheckedNotes(JSON.parse(storedChecked));
          }

          // Load user
          const storedUser = await AsyncStorage.getItem("user");
          if (!storedUser) return;

          const userData = JSON.parse(storedUser);

          const currentUser: UserType = {
            userId: userData.id || "N/A",
            username: userData.username || "Patient",
            gender: userData.gender || "N/A",
            phone_number: userData.phone_number || "N/A",
            address: userData.address || "N/A",
            date_of_birth: userData.date_of_birth || "",
            condition: userData.condition || "N/A",
            profile_picture:
              userData.profile_picture || "https://via.placeholder.com/150",
            email: userData.email || "N/A",
            height: userData.height || 0,
            weight: userData.weight || 0,
            age: userData.age || 0,
          };

          if (!isActive) return;
          setUser(currentUser);

          // Fetch Insulin Data
          const { data: insulinData, error: insulinError } = await supabase
            .from<InsulinEntry>("insulin")
            .select("*")
            .eq("patient_id", currentUser.userId)
            .order("created_at", { ascending: true });

          if (!insulinError) setInsulinEntries(insulinData || []);

          // Fetch Doctor Notes
          const { data: notesData, error: notesError } = await supabase
            .from<DoctorReport>("doctor_reports")
            .select("*")
            .eq("patient_id", currentUser.userId)
            .order("created_at", { ascending: false });

          if (!notesError) setDoctorNotes(notesData || []);
        } catch (e) {
          console.error("Error loading dashboard:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadData();
      return () => {
        isActive = false;
      };
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={{
              uri: user.profile_picture || "https://via.placeholder.com/150",
            }}
            style={styles.profileImage}
          />
        </TouchableOpacity>

        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{user.username} 👋</Text>
      </View>

      {/* Prediction Widget */}
      <GlucosePredictionWidget userId={user.userId} />

      {/* Overview Cards */}
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
            <Text style={styles.cardSubtitle}>
              View insulin doses & CBG levels
            </Text>
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
            style={[styles.overviewCard, { backgroundColor: "#DBEAFE" }]}
            onPress={() => handleNavigate("chart_tracking/activity_table")}
          >
            <Ionicons name="walk" size={36} color="#2563EB" />
            <Text style={styles.cardTitle}>Activity Logs</Text>
            <Text style={styles.cardSubtitle}>Exercise history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.overviewCard, { backgroundColor: "#FECACA" }]}
            onPress={() => handleNavigate("chart_tracking/stress_table")}
          >
            <Ionicons name="happy" size={36} color="#DC2626" />
            <Text style={styles.cardTitle}>Stress Level</Text>
            <Text style={styles.cardSubtitle}>Stress history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.overviewCard, { backgroundColor: "#EDE9FE" }]}
            onPress={() => handleNavigate("chart_tracking/sleep_table")}
          >
            <Ionicons name="moon" size={36} color="#6D28D9" />
            <Text style={styles.cardTitle}>Sleep Logs</Text>
            <Text style={styles.cardSubtitle}>Sleep tracking</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* TRACKING BUTTONS */}
      <View style={styles.trackingContainer}>
        <Text style={styles.trackingTitle}>Blood Sugar Tracking</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          <TouchableOpacity
            style={[styles.trackingCard, { backgroundColor: "#D1FAE5" }]}
            onPress={() => handleNavigate("insulin")}
          >
            <Text style={styles.trackingEmoji}>💉</Text>
            <Text style={styles.trackingLabel}>Insulin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.trackingCard, { backgroundColor: "#FEF3C7" }]}
            onPress={() => handleNavigate("meal")}
          >
            <Text style={styles.trackingEmoji}>🍎</Text>
            <Text style={styles.trackingLabel}>Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.trackingCard, { backgroundColor: "#DBEAFE" }]}
            onPress={() => handleNavigate("activity")}
          >
            <Text style={styles.trackingEmoji}>🏃</Text>
            <Text style={styles.trackingLabel}>Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.trackingCard, { backgroundColor: "#FECACA" }]}
            onPress={() => handleNavigate("stress")}
          >
            <Text style={styles.trackingEmoji}>😟</Text>
            <Text style={styles.trackingLabel}>Stress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.trackingCard, { backgroundColor: "#EDE9FE" }]}
            onPress={() => handleNavigate("sleep")}
          >
            <Text style={styles.trackingEmoji}>😴</Text>
            <Text style={styles.trackingLabel}>Sleep</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* DOCTOR NOTES */}
      <View style={styles.doctorContainer}>
        <Text style={styles.chartSubtitle}>Doctor's Notes</Text>

        {doctorNotes.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#555" }}>
            No doctor's notes available
          </Text>
        ) : (
          doctorNotes.map((note, index) => (
            <View key={note.id ?? index} style={styles.doctorNoteCard}>
              <Ionicons name="medkit" size={24} color="#067425" />

              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.doctorNoteText}>
                  {typeof note.report_data === "string"
                    ? note.report_data
                    : note.report_data?.note
                    ? note.report_data.note
                    : JSON.stringify(note.report_data)}
                </Text>

                <Text style={styles.doctorDateText}>
                  {new Date(note.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------- Styles -------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
    padding: 10,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },

  // HEADER
  header: {
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 26,
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

  welcomeText: {
    fontSize: 16,
    color: "#E6FFE6",
    marginTop: 6,
  },

  usernameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 2,
  },

  // Widget
  widgetContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginVertical: 16,
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#000" },
  glucoseValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#067425",
    marginBottom: 8,
  },
  confidence: { fontSize: 14, color: "#666", marginBottom: 12 },
  loadingText: { fontSize: 14, color: "#666", fontStyle: "italic" },
  errorText: { color: "#EF4444", textAlign: "center", marginBottom: 10 },
  button: {
    backgroundColor: "#067425",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },

  // Overview
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

  cardSubtitle: { fontSize: 13, color: "#555", textAlign: "center", marginTop: 4 },

  // Tracking
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },

  trackingCard: {
    width: 140,
    height: 140,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  trackingEmoji: { fontSize: 36, marginBottom: 10 },
  trackingLabel: { fontSize: 16, fontWeight: "600", color: "#000" },

  // Doctor Notes
  doctorContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    width: "100%",
    marginVertical: 16,
    alignItems: "center",
  },

  chartSubtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },

  doctorNoteCard: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    marginBottom: 10,
  },

  doctorNoteText: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
  },

  doctorDateText: {
    fontSize: 12,
    color: "#555",
    marginTop: 3,
  },
});

