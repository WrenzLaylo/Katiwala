import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand, formatPeso, humanizeCategory, statusColor } from '../../constants/brand';
import { Booking, KatiwalaApi, Service, TradesmanProfile } from '../../lib/katiwala';

const kLogo = require('@/assets/images/katiwala-k.png');

function nextAction(status: string) {
  if (status === 'ASSIGNED') return { label: 'Accept job', next: 'ACCEPTED' };
  if (status === 'ACCEPTED') return { label: 'Start work', next: 'IN_PROGRESS' };
  if (status === 'IN_PROGRESS') return { label: 'Mark complete', next: 'COMPLETED' };
  return null;
}

export default function TradesmanDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TradesmanProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(
    () => Array.from(new Set(services.map((service) => service.category))).slice(0, 12),
    [services],
  );

  const load = useCallback(async () => {
    const [me, serviceList, bookingList] = await Promise.all([
      KatiwalaApi.me(),
      KatiwalaApi.services(),
      KatiwalaApi.bookings(),
    ]);

    setProfile(me.tradesmanProfile || null);
    setServices(serviceList);
    setBookings(bookingList);
    setFirstName(me.tradesmanProfile?.firstName || '');
    setLastName(me.tradesmanProfile?.lastName || '');
    setBio(me.tradesmanProfile?.bio || '');
    setSelectedCategories(me.tradesmanProfile?.skills?.map((skill) => skill.category) || []);
  }, []);

  useEffect(() => {
    load()
      .catch((err: any) => Alert.alert('Could not load dashboard', err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const submitOnboarding = async () => {
    if (!firstName || !lastName || selectedCategories.length === 0) {
      Alert.alert('Profile needed', 'Add your name and at least one skill.');
      return;
    }

    setSaving(true);
    try {
      const updated = await KatiwalaApi.onboardTradesman({
        firstName,
        lastName,
        bio,
        skills: selectedCategories.map((category) => ({ category, yearsExp: 1 })),
      });
      setProfile(updated);
      Alert.alert('Profile submitted', 'A dispatcher can now verify your account.');
    } catch (err: any) {
      Alert.alert('Could not save profile', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      await KatiwalaApi.updateBookingStatus(bookingId, status);
      await refresh();
    } catch (err: any) {
      Alert.alert('Status update failed', err.response?.data?.error || err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <Image source={kLogo} resizeMode="contain" style={styles.headerLogo} />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Tradesman</Text>
            <Text style={styles.headerTitle}>Job dashboard</Text>
          </View>
        </View>

        <View style={styles.flagBar}>
          <View style={[styles.flagSegment, { backgroundColor: Brand.blue }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.red }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.yellow }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.totalJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: statusColor(profile?.status || 'PENDING') }]}>
              {profile?.status === 'VERIFIED' ? 'OK' : 'PENDING'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {profile?.status !== 'VERIFIED' && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Complete tradesman profile</Text>
            <View style={styles.twoCol}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.halfInput]}
              />
            </View>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Short work background"
              placeholderTextColor="#98A2B3"
              multiline
              style={[styles.input, styles.bioInput]}
            />
            <Text style={styles.label}>Skills</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const active = selectedCategories.includes(category);
                return (
                  <Pressable
                    key={category}
                    onPress={() => toggleCategory(category)}
                    style={[styles.skillChip, active && styles.skillChipActive]}>
                    <Text style={[styles.skillText, active && styles.skillTextActive]}>
                      {humanizeCategory(category)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              disabled={saving}
              onPress={submitOnboarding}
              style={[styles.primaryButton, saving && styles.disabled]}>
              {saving ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit for verification</Text>
              )}
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionTitle}>Assigned jobs</Text>
        {bookings.length === 0 ? (
          <Text style={styles.emptyText}>No assigned jobs yet.</Text>
        ) : (
          bookings.map((booking) => {
            const action = nextAction(booking.status);
            return (
              <View key={booking.id} style={styles.jobCard}>
                <View style={styles.jobTop}>
                  <Text style={styles.jobTitle}>{booking.items[0]?.service.name || 'Service job'}</Text>
                  <Text style={[styles.pill, { color: statusColor(booking.status) }]}>{booking.status}</Text>
                </View>
                <Text style={styles.jobMeta}>
                  {booking.address?.street}, {booking.address?.barangay}, {booking.address?.city}
                </Text>
                <Text style={styles.jobMeta}>
                  {new Date(booking.scheduledAt).toLocaleString('en-PH')} - {formatPeso(booking.totalAmount)}
                </Text>
                {!!booking.notes && <Text style={styles.notes}>{booking.notes}</Text>}
                {action && (
                  <Pressable onPress={() => updateStatus(booking.id, action.next)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{action.label}</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.white },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.white },
  content: { padding: 20, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headerLogo: { width: 52, height: 52 },
  headerText: { flex: 1 },
  eyebrow: { color: Brand.red, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  headerTitle: { color: Brand.ink, fontSize: 28, fontWeight: '900', lineHeight: 32 },
  flagBar: { flexDirection: 'row', height: 5, borderRadius: 999, overflow: 'hidden', marginBottom: 18 },
  flagSegment: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FCFCFD',
  },
  statValue: { color: Brand.blue, fontSize: 22, fontWeight: '900' },
  statLabel: { color: Brand.slate, fontSize: 12, fontWeight: '800', marginTop: 4 },
  panel: { borderWidth: 1, borderColor: Brand.border, borderRadius: 8, padding: 14, gap: 10, marginBottom: 18 },
  sectionTitle: { color: Brand.ink, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Brand.ink,
    fontSize: 14,
    backgroundColor: Brand.white,
  },
  halfInput: { flex: 1 },
  bioInput: { minHeight: 86, textAlignVertical: 'top' },
  label: { color: Brand.ink, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  skillChipActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  skillText: { color: Brand.slate, fontSize: 12, fontWeight: '900' },
  skillTextActive: { color: Brand.white },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blue,
    borderRadius: 8,
    minHeight: 50,
    marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: Brand.white, fontSize: 15, fontWeight: '900' },
  emptyText: { color: Brand.slate, fontWeight: '700' },
  jobCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: Brand.white,
  },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  jobTitle: { flex: 1, color: Brand.ink, fontSize: 16, fontWeight: '900' },
  pill: { fontSize: 11, fontWeight: '900' },
  jobMeta: { color: Brand.slate, fontSize: 13, fontWeight: '700', marginTop: 6 },
  notes: { color: Brand.ink, fontSize: 13, lineHeight: 19, marginTop: 10 },
});
