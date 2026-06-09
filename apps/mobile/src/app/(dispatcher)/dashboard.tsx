import { useCallback, useEffect, useState } from 'react';
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
  View,
} from 'react-native';

import { Brand, formatPeso, humanizeCategory, statusColor } from '../../constants/brand';
import { Booking, KatiwalaApi, TradesmanProfile } from '../../lib/katiwala';

const kLogo = require('@/assets/images/katiwala-k.png');

export default function DispatcherDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tradesmen, setTradesmen] = useState<TradesmanProfile[]>([]);
  const [tab, setTab] = useState<'queue' | 'tradesmen'>('queue');

  const load = useCallback(async () => {
    const [bookingList, tradesmanList] = await Promise.all([
      KatiwalaApi.dispatcherBookings(),
      KatiwalaApi.dispatcherTradesmen(),
    ]);

    setBookings(bookingList);
    setTradesmen(tradesmanList);
  }, []);

  useEffect(() => {
    load()
      .catch((err: any) => Alert.alert('Could not load dispatch', err.response?.data?.error || err.message))
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

  const assign = async (bookingId: string, tradesmanId: string) => {
    try {
      await KatiwalaApi.assignBooking(bookingId, tradesmanId);
      await refresh();
    } catch (err: any) {
      Alert.alert('Assignment failed', err.response?.data?.error || err.message);
    }
  };

  const verifyTradesman = async (tradesmanId: string) => {
    try {
      await KatiwalaApi.verifyTradesman(tradesmanId);
      await refresh();
    } catch (err: any) {
      Alert.alert('Verification failed', err.response?.data?.error || err.message);
    }
  };

  const markPaid = async (bookingId: string) => {
    try {
      await KatiwalaApi.markPaid(bookingId);
      await refresh();
    } catch (err: any) {
      Alert.alert('Payment update failed', err.response?.data?.error || err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.blue} size="large" />
      </View>
    );
  }

  const verifiedTradesmen = tradesmen.filter((tradesman) => tradesman.status === 'VERIFIED');
  const pendingTradesmen = tradesmen.filter((tradesman) => tradesman.status === 'PENDING_VERIFICATION');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <Image source={kLogo} resizeMode="contain" style={styles.headerLogo} />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Dispatcher</Text>
            <Text style={styles.headerTitle}>Operations queue</Text>
          </View>
        </View>

        <View style={styles.flagBar}>
          <View style={[styles.flagSegment, { backgroundColor: Brand.blue }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.red }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.yellow }]} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab('queue')}
            style={[styles.tabButton, tab === 'queue' && styles.tabButtonActive]}>
            <Text style={[styles.tabText, tab === 'queue' && styles.tabTextActive]}>Bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('tradesmen')}
            style={[styles.tabButton, tab === 'tradesmen' && styles.tabButtonActive]}>
            <Text style={[styles.tabText, tab === 'tradesmen' && styles.tabTextActive]}>Tradesmen</Text>
          </Pressable>
        </View>

        {tab === 'queue' ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{bookings.filter((item) => item.status === 'PENDING').length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{verifiedTradesmen.length}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{bookings.filter((item) => item.payment?.status !== 'PAID').length}</Text>
                <Text style={styles.statLabel}>Unpaid</Text>
              </View>
            </View>

            {bookings.length === 0 ? (
              <Text style={styles.emptyText}>No bookings yet.</Text>
            ) : (
              bookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingTop}>
                    <Text style={styles.bookingTitle}>{booking.items[0]?.service.name || 'Service booking'}</Text>
                    <Text style={[styles.pill, { color: statusColor(booking.status) }]}>{booking.status}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {booking.customer?.user?.phone || 'Customer'} - {booking.address?.barangay},{' '}
                    {booking.address?.city}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(booking.scheduledAt).toLocaleString('en-PH')} - {formatPeso(booking.totalAmount)}
                  </Text>
                  {!!booking.notes && <Text style={styles.notes}>{booking.notes}</Text>}

                  {booking.status === 'PENDING' && (
                    <View style={styles.assignBlock}>
                      <Text style={styles.assignTitle}>Assign verified tradesman</Text>
                      {verifiedTradesmen.length === 0 ? (
                        <Text style={styles.emptyText}>No verified tradesmen yet.</Text>
                      ) : (
                        verifiedTradesmen.map((tradesman) => (
                          <Pressable
                            key={tradesman.id}
                            onPress={() => assign(booking.id, tradesman.id)}
                            style={styles.optionButton}>
                            <Text style={styles.optionTitle}>
                              {tradesman.firstName || 'Tradesman'} {tradesman.lastName}
                            </Text>
                            <Text style={styles.optionBody}>
                              {tradesman.skills.map((skill) => humanizeCategory(skill.category)).join(', ') ||
                                'General service'}
                            </Text>
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}

                  {booking.payment?.status !== 'PAID' && (
                    <Pressable onPress={() => markPaid(booking.id)} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Mark cash paid</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Pending verification</Text>
            {pendingTradesmen.length === 0 ? (
              <Text style={styles.emptyText}>No pending tradesmen.</Text>
            ) : (
              pendingTradesmen.map((tradesman) => (
                <View key={tradesman.id} style={styles.tradesmanCard}>
                  <Text style={styles.bookingTitle}>
                    {tradesman.firstName || 'New'} {tradesman.lastName || 'Tradesman'}
                  </Text>
                  <Text style={styles.meta}>{tradesman.user?.phone}</Text>
                  <Text style={styles.meta}>
                    {tradesman.skills.map((skill) => humanizeCategory(skill.category)).join(', ') ||
                      'No skills yet'}
                  </Text>
                  <Pressable onPress={() => verifyTradesman(tradesman.id)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Verify tradesman</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Verified network</Text>
            {verifiedTradesmen.map((tradesman) => (
              <View key={tradesman.id} style={styles.tradesmanCard}>
                <View style={styles.bookingTop}>
                  <Text style={styles.bookingTitle}>
                    {tradesman.firstName || 'Tradesman'} {tradesman.lastName}
                  </Text>
                  <Text style={[styles.pill, { color: statusColor(tradesman.status) }]}>
                    {tradesman.status}
                  </Text>
                </View>
                <Text style={styles.meta}>{tradesman.totalJobs} jobs completed</Text>
                <Text style={styles.meta}>
                  {tradesman.skills.map((skill) => humanizeCategory(skill.category)).join(', ') ||
                    'General service'}
                </Text>
              </View>
            ))}
          </>
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
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    paddingVertical: 12,
  },
  tabButtonActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  tabText: { color: Brand.slate, fontWeight: '900' },
  tabTextActive: { color: Brand.white },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
  emptyText: { color: Brand.slate, fontWeight: '700' },
  bookingCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: Brand.white,
  },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  bookingTitle: { flex: 1, color: Brand.ink, fontSize: 16, fontWeight: '900' },
  pill: { fontSize: 11, fontWeight: '900' },
  meta: { color: Brand.slate, fontSize: 13, fontWeight: '700', marginTop: 6 },
  notes: { color: Brand.ink, fontSize: 13, lineHeight: 19, marginTop: 10 },
  assignBlock: { gap: 8, marginTop: 12 },
  assignTitle: { color: Brand.ink, fontSize: 13, fontWeight: '900' },
  optionButton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FCFCFD',
  },
  optionTitle: { color: Brand.blue, fontSize: 14, fontWeight: '900' },
  optionBody: { color: Brand.slate, fontSize: 12, fontWeight: '700', marginTop: 4 },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.red,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  secondaryButtonText: { color: Brand.red, fontWeight: '900' },
  sectionTitle: { color: Brand.ink, fontSize: 18, fontWeight: '900', marginBottom: 12, marginTop: 6 },
  tradesmanCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: Brand.white,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blue,
    borderRadius: 8,
    minHeight: 48,
    marginTop: 12,
  },
  primaryButtonText: { color: Brand.white, fontSize: 15, fontWeight: '900' },
});
