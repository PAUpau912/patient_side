import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeContext } from "@/ThemeContext";
import Ionicons from '@expo/vector-icons/Ionicons'; // ✅ Add this

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const Login = () => {
  const router = useRouter();
  const { loadUserPreferences } = useThemeContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 👁️ toggle visibility
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !user) {
        alert('Invalid credentials');
        setLoading(false);
        return;
      }

      let patientData = null;
      if (user.role === 'patient') {
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select(`*, users(email)`)
          .eq('user_id', user.id)
          .single();

        if (!patientError) {
          patientData = patient;
        }
      }

      const combinedData = {
        ...user,
        ...patientData,
        email: user.email,
      };

      await AsyncStorage.setItem('user', JSON.stringify(combinedData));
      await loadUserPreferences();

      if (user.role === 'patient') {
        router.push('/(tabs)/dashboard');
      } else {
        alert('Only patients can access this dashboard.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Error logging in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ICON */}
      <Image
        source={require('../../assets/icons/images.png')}
        style={styles.icon}
      />

      {/* Title */}
      <Text style={styles.title}>Welcome to Diabetic App</Text>

      {/* Email Input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password Input */}
      <View style={[styles.inputGroup, styles.passwordContainer]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword} // 👁️ Toggle visibility
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#067425"
          />
        </TouchableOpacity>
      </View>

      {/* Forgot Password */}
      <View style={styles.PassContainer}>
        <TouchableOpacity onPress={() => router.push('/screens/forgotpassword')}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* LOGIN BUTTON */}
      <TouchableOpacity style={styles.Btn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.LoginText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#067425',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    width: 300,
    height: 45,
    borderWidth: 1,
    borderColor: '#067425',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 300,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 5,
  },
  Btn: {
    width: '90%',
    backgroundColor: '#067425',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  LoginText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  PassContainer: {
    width: '90%',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  link: {
    fontSize: 13,
    color: '#007bff',
  },
});

export default Login;
