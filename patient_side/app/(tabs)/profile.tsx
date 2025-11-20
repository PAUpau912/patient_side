import { 
  View, Text, StyleSheet, ScrollView, Image, 
  TextInput, TouchableOpacity, KeyboardAvoidingView, 
  Platform, ActivityIndicator, Alert 
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import moment from 'moment';
import { Picker } from "@react-native-picker/picker";
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase client (no Auth)
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

type UserProfile = {
  id: string;
  user_id?: string;
  name?: string;
  username?: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  condition?: string;
  created_at?: string;
  profile_picture?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  email?: string;
};

const Profile: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [dobModal, setDobModal] = useState(false);
  const [tempDOB, setTempDOB] = useState<Date>(new Date());
  const [bmi, setBmi] = useState<string>("—");

  // 🧩 Address fields
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  // ✅ Load user data from AsyncStorage, then fetch latest from Supabase
  const fetchProfile = async () => {
    try {
      setLoading(true);

      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        Alert.alert("Error", "No stored user found. Please login again.");
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser.id;

      // ✅ Fetch patient data with joined email
      const { data, error } = await supabase
        .from("patients")
        .select(`
          id,
          user_id,
          name,
          username,
          gender,
          phone_number,
          address,
          date_of_birth,
          condition,
          profile_picture,
          height,
          weight,
          age,
          created_at,
          users ( email )
        `)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      const mergedProfile = {
        ...parsedUser,
        ...data,
        email: data?.users?.email || parsedUser.email || null,
      };

      setProfileData(mergedProfile);
      calculateBMI(mergedProfile.height, mergedProfile.weight);
      await AsyncStorage.setItem("user", JSON.stringify(mergedProfile));

      // 🧩 Split address into fields if available
      if (mergedProfile.address) {
        const parts = mergedProfile.address.split(",").map((p: string) => p.trim());
        setStreet(parts[0] || "");
        setBarangay(parts[1] || "");
        setCity(parts[2] || "");
        setProvince(parts[3] || "");
      }
    } catch (error) {
      console.error("❌ Error loading profile:", error);
      Alert.alert("Error", "Failed to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Calculate BMI automatically
  const calculateBMI = (height?: number, weight?: number) => {
    if (height && weight && height > 0) {
      const heightInMeters = height / 100;
      const bmiValue = weight / (heightInMeters * heightInMeters);
      const roundedBMI = bmiValue.toFixed(1);
      setBmi(roundedBMI);
    } else {
      setBmi("—");
    }
  };

  // ✅ Update field locally
  const handleChange = (field: keyof UserProfile, value: any) => {
    if (!profileData) return;
    const updated = { ...profileData, [field]: value };
    setProfileData(updated);
    if (field === "height" || field === "weight") {
      calculateBMI(updated.height, updated.weight);
    }
  };

  // ✅ Upload image to Supabase Storage
  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      if (!profileData?.id) return null;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${profileData.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile_picture/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error("❌ Upload error:", error);
      Alert.alert("Error", "Failed to upload image");
      return null;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const uploadedUrl = await uploadImageToSupabase(uri);
      if (uploadedUrl) handleChange("profile_picture", uploadedUrl);
    }
  };

  // ✅ Save updates to Supabase and AsyncStorage
  const handleSave = async () => {
    try {
      if (!profileData?.id) return;

      // 🧩 Combine address before saving
      const combinedAddress = [street, barangay, city, province]
        .filter(Boolean)
        .join(", ");

      const updateFields = {
        username: profileData.username,
        phone_number: profileData.phone_number,
        date_of_birth: profileData.date_of_birth,
        address: combinedAddress,
        profile_picture: profileData.profile_picture,
        height: profileData.height,
        weight: profileData.weight,
        gender: profileData.gender,
        age: profileData.age,
      };

      const { data: updated, error } = await supabase
        .from("patients")
        .update(updateFields)
        .eq("id", profileData.id)
        .select(`*, users ( email )`)
        .single();

      if (error) throw error;

      const updatedProfile = {
        ...profileData,
        ...updated,
        email: updated?.users?.email || profileData.email,
      };

      await AsyncStorage.setItem("user", JSON.stringify(updatedProfile));
      setProfileData(updatedProfile);
      setEditMode(false);
      Alert.alert("✅ Success", "Profile updated successfully!");
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const confirmDOB = (event: any, date?: Date) => {
    if (date) {
      setTempDOB(date);
      handleChange("date_of_birth", date.toISOString());
    }
    setDobModal(false);
  };

  if (loading || !profileData) {
    return (
      <View style={[styles.center, { backgroundColor: "#F0F4F8" }]}>
        <ActivityIndicator size="large" color="#067425" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F0F4F8" }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.header, { backgroundColor: "#067425" }]}>
          <TouchableOpacity disabled={!editMode} onPress={pickImage}>
            <Image 
              source={{ uri: profileData.profile_picture || "https://via.placeholder.com/100" }} 
              style={styles.avatar} 
            />
            {editMode && (
              <Text style={{ color: "white", fontSize: 12, textAlign: "center" }}>Change Photo</Text>
            )}
          </TouchableOpacity>

          <View style={styles.centerInfo}>
            <Text style={styles.nameText}>{profileData.name || "—"}</Text>
            <Text style={styles.emailText}>{profileData.email || "No email"}</Text>
          </View>
        </View>

        <View style={[styles.infoSection, { backgroundColor: "#FFFFFF" }]}>
          <ProfileItem icon="user" label="Username" value={profileData.username} editable={editMode} onChangeText={(t) => handleChange('username', t)} />
          <ProfileItem icon="phone" label="Phone" value={profileData.phone_number} editable={editMode} keyboardType="numeric" onChangeText={(t) => handleChange('phone_number', t)} />
          <TouchableOpacity onPress={() => editMode && setDobModal(true)}>
            <ProfileItem icon="calendar" label="Date of Birth" value={profileData.date_of_birth ? moment(profileData.date_of_birth).format("MMMM D, YYYY") : undefined} editable={false} />
          </TouchableOpacity>

          {/* Height Picker */}
          <ProfileItem icon="arrows-v" label="Height (cm)">
            <Picker
              selectedValue={profileData.height}
              enabled={editMode}
              onValueChange={(value) => handleChange("height", value)}
            >
              {[...Array(223)].map((_, i) => {
                const height = 50 + i;
                return <Picker.Item key={height} label={`${height} cm`} value={height} />;
              })}
            </Picker>
          </ProfileItem>

          {/* Weight Picker */}
          <ProfileItem icon="balance-scale" label="Weight (kg)">
            <Picker
              selectedValue={profileData.weight}
              enabled={editMode}
              onValueChange={(value) => handleChange("weight", value)}
            >
              {[...Array(491)].map((_, i) => {
                const weight = 10 + i;
                return <Picker.Item key={weight} label={`${weight} kg`} value={weight} />;
              })}
            </Picker>
          </ProfileItem>

          <ProfileItem icon="heartbeat" label="BMI" value={bmi} editable={false} />

          {/* 🎂 Age */}
          <ProfileItem
            icon="birthday-cake"
            label="Age"
            value={profileData.age?.toString() || ""}
            editable={editMode}
            keyboardType="numeric"
            onChangeText={(t) => handleChange("age", t === "" ? undefined : Number(t))}
          />

          {/* 👤 Gender */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <FontAwesome name="venus-mars" size={20} color="#067425" style={{ marginRight: 15 }} />
            {editMode ? (
              <Picker selectedValue={profileData.gender || ""} onValueChange={(val) => handleChange("gender", val)} style={{ flex: 1, color: "#000" }}>
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>{profileData.gender || "—"}</Text>
            )}
          </View>

          {/* 🏠 Address split inputs */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <FontAwesome name="map-marker" size={20} color="#067425" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: "#888", fontWeight: "500" }}>Address</Text>
            </View>

            {editMode ? (
              <>
                <TextInput style={styles.addressInput} placeholder="Street / House No." value={street} onChangeText={setStreet} />
                <TextInput style={styles.addressInput} placeholder="Barangay" value={barangay} onChangeText={setBarangay} />
                <TextInput style={styles.addressInput} placeholder="City / Municipality" value={city} onChangeText={setCity} />
                <TextInput style={styles.addressInput} placeholder="Province" value={province} onChangeText={setProvince} />
              </>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                {profileData.address || "—"}
              </Text>
            )}
          </View>

          <ProfileItem icon="heartbeat" label="Medical Condition" value={profileData.condition} editable={false} />
          <ProfileItem icon="clock-o" label="Account Created" value={profileData.created_at ? new Date(profileData.created_at).toDateString() : "—"} />
        </View>

        <TouchableOpacity style={styles.button} onPress={() => (editMode ? handleSave() : setEditMode(true))}>
          <Text style={styles.buttonText}>{editMode ? "Save" : "Edit Profile"}</Text>
        </TouchableOpacity>

        {dobModal && (
          <DateTimePicker value={tempDOB} mode="date" display="default" onChange={confirmDOB} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ✅ ProfileItem reusable component
const   ProfileItem: React.FC<any> = ({ icon, label, value, editable = false, onChangeText, children, keyboardType = "default" }) => (
  <View style={{ marginBottom: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      <FontAwesome name={icon} size={20} color="#067425" style={{ marginRight: 10 }} />
      <Text style={{ fontSize: 14, color: "#888", fontWeight: "500" }}>{label}</Text>
    </View>

    {children ? (
      <View style={{ backgroundColor: "#f4f4f4", borderRadius: 8 }}>
        {children}
      </View>
    ) : editable ? (
      <TextInput
        style={styles.addressInput}
        value={value?.toString() || ""}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#888"
        keyboardType={keyboardType}
      />
    ) : (
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
        {value || "—"}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  scrollContainer: { paddingBottom: 90, padding: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  centerInfo: { alignItems: 'center', marginTop: 5 },
  nameText: { fontSize: 18, fontWeight: '700', color: 'white', textAlign: 'center' },
  emailText: { fontSize: 14, fontWeight: '500', color: '#f0f0f0', textAlign: 'center', opacity: 0.9 },
  infoSection: { marginTop: 10, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 6 },
  button: { backgroundColor: '#067425', padding: 15, borderRadius: 30, marginTop: 20, marginHorizontal: 20, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  addressInput: { fontSize: 16, borderBottomWidth: 1, borderColor: "#ccc", paddingVertical: 6, fontWeight: "600", color: "#000", marginBottom: 10 },
});

export default Profile;
