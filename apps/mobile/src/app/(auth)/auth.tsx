import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { Brand, Radius } from '@/constants/brand';
import { AuthService, type User } from '../../lib/auth';

const logo = require('@/assets/images/katiwala-logo.png');

type Mode = 'login' | 'signup';
type Role = 'CUSTOMER' | 'TRADESMAN';

const TRUST_BADGES = [
  { icon: 'shield-checkmark', label: 'Verified Professionals' },
  { icon: 'home', label: 'Trusted by Homeowners' },
  { icon: 'lock-closed', label: 'Secure Bookings' },
] as const;

function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Logo scales with screen width but stays compact so the form fits on screen.
  const logoHeight = Math.min(Math.max(width * 0.28, 92), 150);
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('CUSTOMER');

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // login
  const [rememberMe, setRememberMe] = useState(true);

  // signup
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+63');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const routeByRole = (user: User) => {
    if (user.role === 'TRADESMAN') router.replace('/(tradesman)/dashboard');
    else if (user.role === 'ADMIN' || user.role === 'DISPATCHER')
      router.replace('/(dispatcher)/dashboard');
    else router.replace('/(customer)/home');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await AuthService.loginEmail(email.trim(), password);
      routeByRole(user);
    } catch (err: any) {
      Alert.alert('Login failed', err.response?.data?.error || 'Could not log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!fullName || !phone || !email || !password) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }
    if (phone.length < 12) {
      Alert.alert('Invalid number', 'Enter a valid Philippine mobile number.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords differ', 'Password and confirmation do not match.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Terms required', 'Please agree to the Terms & Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      const user = await AuthService.signupEmail({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        role,
      });
      // Providers complete a second onboarding step (skills/verification).
      if (user.role === 'TRADESMAN') {
        router.replace('/(tradesman)/onboarding');
      } else {
        routeByRole(user);
      }
    } catch (err: any) {
      Alert.alert('Sign up failed', err.response?.data?.error || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    Alert.alert('Coming soon', 'Google sign-in will be available shortly.');
  };

  const eye = (visible: boolean, toggle: () => void) => (
    <Pressable hitSlop={8} onPress={toggle}>
      <Ionicons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={Brand.slate}
      />
    </Pressable>
  );

  return (
    <Screen>
      <Image source={logo} resizeMode="contain" style={[styles.logo, { height: logoHeight }]} />

      <View style={styles.badges}>
        {TRUST_BADGES.map((badge) => (
          <View key={badge.label} style={styles.badge}>
            <Ionicons name={badge.icon} size={13} color={Brand.blue} />
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        ))}
      </View>

      <Card style={styles.card}>
        <SegmentedControl
          options={[
            { value: 'login', label: 'Login' },
            { value: 'signup', label: 'Sign Up' },
          ]}
          value={mode}
          onChange={(value) => setMode(value as Mode)}
        />

        {mode === 'signup' && (
          <SegmentedControl
            variant="primary"
            options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'TRADESMAN', label: 'Service Provider' },
            ]}
            value={role}
            onChange={(value) => setRole(value as Role)}
          />
        )}

        {mode === 'login' ? (
          <>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email Address"
              value={email}
            />
            <Input
              onChangeText={setPassword}
              placeholder="Password"
              rightElement={eye(showPassword, () => setShowPassword((v) => !v))}
              secureTextEntry={!showPassword}
              value={password}
            />
            <View style={styles.row}>
              <Checkbox checked={rememberMe} label="Remember me" onChange={setRememberMe} />
              <Pressable onPress={() => Alert.alert('Reset password', 'Coming soon.')}>
                <Text style={styles.link}>forgot password?</Text>
              </Pressable>
            </View>
            <Button loading={loading} onPress={handleLogin} title="Login" />
          </>
        ) : (
          <>
            <Input onChangeText={setFullName} placeholder="Full Name" value={fullName} />
            <Input
              keyboardType="phone-pad"
              maxLength={13}
              onChangeText={setPhone}
              placeholder="Mobile Number"
              value={phone}
            />
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email Address"
              value={email}
            />
            <Input
              onChangeText={setPassword}
              placeholder="Password"
              rightElement={eye(showPassword, () => setShowPassword((v) => !v))}
              secureTextEntry={!showPassword}
              value={password}
            />
            <Input
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              rightElement={eye(showConfirm, () => setShowConfirm((v) => !v))}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
            />
            <Checkbox checked={agreeTerms} onChange={setAgreeTerms}>
              <Text style={styles.terms}>
                Agree to the <Text style={styles.termsBold}>Terms</Text> &{' '}
                <Text style={styles.termsBold}>Privacy Policy</Text>
              </Text>
            </Checkbox>
            <Button
              loading={loading}
              onPress={handleSignup}
              title={role === 'TRADESMAN' ? 'Next' : 'Create Account'}
            />
          </>
        )}

        <Divider label="OR" />

        <Pressable onPress={handleGoogle} style={styles.google}>
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        {mode === 'login' && (
          <Pressable onPress={() => setMode('signup')} style={styles.switchRow}>
            <Text style={styles.switchText}>
              Don&apos;t have an account? <Text style={styles.link}>Sign Up</Text>
            </Text>
          </Pressable>
        )}
      </Card>

      {mode === 'login' && (
        <View style={styles.stats}>
          <StatCard
            icon={<Ionicons name="star" size={16} color={Brand.yellow} />}
            value="0.0"
            label="Customer Rating"
          />
          <StatCard
            icon={<MaterialCommunityIcons name="hard-hat" size={16} color={Brand.blue} />}
            value="000"
            label="Verified Pros"
          />
          <StatCard
            icon={<Ionicons name="home" size={16} color={Brand.red} />}
            value="000"
            label="Jobs Completed"
          />
        </View>
      )}

      <Pressable onPress={() => router.push('/(auth)/phone')} style={styles.phoneLink}>
        <Text style={styles.phoneLinkText}>Use phone number instead</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: '100%', marginTop: 0 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7D7F5',
    backgroundColor: Brand.blueSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  badgeText: { color: Brand.blue, fontSize: 12, fontWeight: '700' },
  card: {
    borderColor: '#ECEFF4',
    padding: 14,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 11,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: Brand.blue, fontSize: 13, fontWeight: '800' },
  terms: { color: Brand.slate, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  termsBold: { color: Brand.blue, fontWeight: '800' },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    backgroundColor: Brand.white,
  },
  googleText: { color: Brand.ink, fontSize: 15, fontWeight: '800' },
  switchRow: { alignItems: 'center', marginTop: 2 },
  switchText: { color: Brand.slate, fontSize: 13, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    gap: 1,
  },
  statValue: { color: Brand.ink, fontSize: 16, fontWeight: '900', marginTop: 1 },
  statLabel: { color: Brand.slate, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  phoneLink: { alignItems: 'center', marginTop: 12 },
  phoneLinkText: { color: Brand.slate, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
