import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthService } from '../../lib/auth';

export default function VerifyScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { phone, role } = useLocalSearchParams<{ phone: string; role: string }>();

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const user = await AuthService.verifyOtp(phone, otp, role);

      if (user.role === 'TRADESMAN') {
        router.replace('/(tradesman)/dashboard');
      } else {
        router.replace('/(customer)/home');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        {phone}
      </Text>

      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setOtp}
        placeholder="------"
        placeholderTextColor="#ccc"
        style={styles.input}
        textAlign="center"
        value={otp}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleVerify}
        style={[styles.btn, loading && styles.btnDisabled]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Verify & Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Change number</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 40, lineHeight: 22 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 18,
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 12,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#1A3FB0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#1A3FB0', fontSize: 14 },
});
