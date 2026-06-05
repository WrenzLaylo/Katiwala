import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AuthService } from '../../lib/auth';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+63');
  const [role, setRole] = useState<'CUSTOMER' | 'TRADESMAN'>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (phone.length < 12) {
      Alert.alert('Invalid', 'Please enter a valid Philippine mobile number');
      return;
    }

    setLoading(true);
    try {
      await AuthService.sendOtp(phone);
      router.push({ pathname: '/(auth)/verify', params: { phone, role } });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>KATIWALA</Text>
        <Text style={styles.tagline}>Katiwala Mo Sa Serbisyo</Text>

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          keyboardType="phone-pad"
          maxLength={13}
          onChangeText={setPhone}
          placeholder="+639XXXXXXXXX"
          placeholderTextColor="#999"
          style={styles.input}
          value={phone}
        />

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {(['CUSTOMER', 'TRADESMAN'] as const).map((currentRole) => (
            <TouchableOpacity
              key={currentRole}
              onPress={() => setRole(currentRole)}
              style={[styles.roleBtn, role === currentRole && styles.roleBtnActive]}>
              <Text
                style={[
                  styles.roleBtnText,
                  role === currentRole && styles.roleBtnTextActive,
                ]}>
                {currentRole === 'CUSTOMER' ? 'Customer' : 'Tradesman'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={handleSendOtp}
          style={[styles.btn, loading && styles.btnDisabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1A3FB0',
    textAlign: 'center',
    letterSpacing: 2,
  },
  tagline: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  roleRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  roleBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: '#1A3FB0', backgroundColor: '#EEF2FF' },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  roleBtnTextActive: { color: '#1A3FB0' },
  btn: {
    backgroundColor: '#1A3FB0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
