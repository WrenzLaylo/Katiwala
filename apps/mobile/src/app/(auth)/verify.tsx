import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, FlagBar, Screen } from '@/components/ui';
import { Brand } from '../../constants/brand';
import { AuthService } from '../../lib/auth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { phone, role } = useLocalSearchParams<{ phone: string; role: string }>();

  const digits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, i) => otp[i] ?? ''),
    [otp],
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submit = async (code: string) => {
    setLoading(true);
    try {
      const user = await AuthService.verifyOtp(phone, code, role);

      if (user.role === 'TRADESMAN') {
        router.replace('/(tradesman)/dashboard');
      } else if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
        router.replace('/(dispatcher)/dashboard');
      } else {
        router.replace('/(customer)/home');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    if (cleaned.length === OTP_LENGTH) {
      submit(cleaned);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await AuthService.sendOtp(phone);
      setOtp('');
      setSecondsLeft(RESEND_SECONDS);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen centered>
      <FlagBar style={styles.flag} />

      <Text style={styles.title}>Enter your code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.phone}>{phone}</Text>
      </Text>

      <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
        {digits.map((digit, index) => {
          const isActive = index === otp.length;
          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                digit !== '' && styles.otpBoxFilled,
                isActive && styles.otpBoxActive,
              ]}>
              <Text style={styles.otpDigit}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        autoFocus
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        onChangeText={handleChange}
        style={styles.hiddenInput}
        value={otp}
      />

      <Button
        disabled={otp.length !== OTP_LENGTH}
        loading={loading}
        onPress={() => submit(otp)}
        style={styles.submit}
        title="Verify & continue"
      />

      <View style={styles.resendRow}>
        {secondsLeft > 0 ? (
          <Text style={styles.resendMuted}>Resend code in {secondsLeft}s</Text>
        ) : (
          <Pressable disabled={resending} onPress={handleResend}>
            <Text style={styles.resendLink}>
              {resending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Change number</Text>
      </Pressable>

      {__DEV__ && <Text style={styles.devHint}>Dev mode: use code 123456</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { marginBottom: 28 },
  title: { color: Brand.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: Brand.slate, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 32 },
  phone: { color: Brand.ink, fontWeight: '800' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 54,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.white,
  },
  otpBoxFilled: { borderColor: Brand.blue, backgroundColor: '#EEF4FF' },
  otpBoxActive: { borderColor: Brand.blue },
  otpDigit: { color: Brand.ink, fontSize: 26, fontWeight: '800' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  submit: { marginTop: 32 },
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendMuted: { color: Brand.slate, fontSize: 14, fontWeight: '600' },
  resendLink: { color: Brand.blue, fontSize: 14, fontWeight: '800' },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backText: { color: Brand.slate, fontSize: 14, fontWeight: '700' },
  devHint: {
    color: Brand.warning,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 28,
  },
});
