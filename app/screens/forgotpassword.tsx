import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import Ionicons from '@expo/vector-icons/Ionicons';
import bcrypt from 'bcryptjs';

// ✅ Set fallback for React Native
bcrypt.setRandomFallback((len) => {
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  const handleCheckEmail = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) {
        Alert.alert('Email Not Found', 'No account found with that email.');
        return;
      }

      setUserId(data.id);
      setStep(2);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong. Try again later.');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      // ✅ Hash the new password safely
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', userId);

      if (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to reset password.');
        return;
      }

      Alert.alert('Success', 'Your password has been reset successfully!', [
        { text: 'OK', onPress: () => router.push('./login') },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/icons/images.png')} style={styles.icon} />

      {step === 1 && (
        <>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email to verify your account.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.button} onPress={handleCheckEmail}>
            <Text style={styles.buttonText}>Verify Email</Text>
          </TouchableOpacity>

          <View style={styles.bottomLinks}>
            <TouchableOpacity onPress={() => router.push('./login')}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter and confirm your new password.</Text>

          {/* New Password */}
          <View style={[styles.inputGroup, styles.passwordContainer]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#067425"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputGroup, styles.passwordContainer]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#067425"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>

          <View style={styles.bottomLinks}>
            <TouchableOpacity onPress={() => router.push('./login')}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  icon: { width: 100, height: 100, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 15, marginBottom: 20, textAlign: 'center', color: '#666' },
  inputGroup: { marginBottom: 16 },
  input: { width: 300, height: 45, borderWidth: 1, borderColor: '#067425', paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', width: 300 },
  eyeIcon: { position: 'absolute', right: 12, padding: 5 },
  button: { width: '90%', backgroundColor: '#067425', padding: 15, borderRadius: 8, marginTop: 10, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  bottomLinks: { marginTop: 25, flexDirection: 'row', justifyContent: 'space-between', width: '90%' },
  link: { color: '#007BFF', fontSize: 14 },
});
