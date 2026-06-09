import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Chip, FlagBar, Input, Screen } from '@/components/ui';
import { Brand } from '@/constants/brand';
import { AuthService } from '../../lib/auth';

const fullLogo = require('@/assets/images/katiwala-logo.png');

const ROLES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'TRADESMAN', label: 'Tradesman' },
] as const;

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+63');
  const [role, setRole] = useState<'CUSTOMER' | 'TRADESMAN'>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const logoHeight = Math.min(Math.max(width * 0.5, 150), 260);

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
    <Screen centered>
      <FlagBar style={styles.flag} />

      <Image source={fullLogo} resizeMode="contain" style={[styles.logo, { height: logoHeight }]} />

      <Text style={styles.title}>Trusted hands for every job.</Text>
      <Text style={styles.subtitle}>
        Book verified Filipino tradesmen for home service work.
      </Text>

      <Input
        containerStyle={styles.field}
        keyboardType="phone-pad"
        label="Mobile number"
        maxLength={13}
        onChangeText={setPhone}
        placeholder="+639XXXXXXXXX"
        value={phone}
      />

      <Text style={styles.label}>Continue as</Text>
      <View style={styles.roleRow}>
        {ROLES.map((option) => (
          <Chip
            key={option.value}
            active={role === option.value}
            label={option.label}
            onPress={() => setRole(option.value)}
            style={styles.roleChip}
          />
        ))}
      </View>

      <Button
        loading={loading}
        onPress={handleSendOtp}
        style={styles.submit}
        title="Send OTP"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { marginBottom: 24 },
  logo: { width: '100%', marginBottom: 10 },
  title: {
    color: Brand.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
    textAlign: 'center',
  },
  subtitle: {
    color: Brand.slate,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  field: { marginTop: 4 },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleChip: { flex: 1, alignItems: 'center' },
  submit: { marginTop: 28 },
});
