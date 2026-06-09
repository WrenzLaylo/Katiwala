import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Brand, formatPeso, humanizeCategory, statusColor } from '../../constants/brand';
import { Address, Booking, KatiwalaApi, Service } from '../../lib/katiwala';

const kLogo = require('@/assets/images/katiwala-k.png');

function defaultScheduleText() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export default function CustomerHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleText());
  const [notes, setNotes] = useState('');
  const [isEmergency, setEmergency] = useState(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zipCode: '',
  });

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedQuantity = Math.max(1, Number(quantity || 1));
  const estimatedTotal = useMemo(() => {
    const base = (selectedService?.basePrice || 0) * selectedQuantity;
    return isEmergency ? base * 1.5 : base;
  }, [isEmergency, selectedQuantity, selectedService?.basePrice]);

  const load = useCallback(async () => {
    const [serviceList, addressList, bookingList] = await Promise.all([
      KatiwalaApi.services(),
      KatiwalaApi.addresses(),
      KatiwalaApi.bookings(),
    ]);

    setServices(serviceList);
    setAddresses(addressList);
    setBookings(bookingList);
    setSelectedServiceId((current) => current || serviceList[0]?.id || '');
    setSelectedAddressId((current) => current || addressList[0]?.id || '');
  }, []);

  useEffect(() => {
    load()
      .catch((err: any) => Alert.alert('Could not load Katiwala', err.response?.data?.error || err.message))
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

  const saveAddress = async () => {
    if (!addressForm.street || !addressForm.barangay || !addressForm.city || !addressForm.province) {
      Alert.alert('Address needed', 'Please complete street, barangay, city, and province.');
      return;
    }

    const address = await KatiwalaApi.createAddress({ ...addressForm, isDefault: addresses.length === 0 });
    setAddresses((current) => [address, ...current]);
    setSelectedAddressId(address.id);
    setAddressForm({ label: 'Home', street: '', barangay: '', city: '', province: '', zipCode: '' });
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a job photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.75,
    });

    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const createBooking = async () => {
    if (!selectedServiceId || !selectedAddressId) {
      Alert.alert('Missing details', 'Choose a service and address first.');
      return;
    }

    const schedule = new Date(scheduledAt.replace(' ', 'T'));
    if (Number.isNaN(schedule.getTime())) {
      Alert.alert('Invalid schedule', 'Use this format: YYYY-MM-DD HH:mm');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await KatiwalaApi.createBooking({
        addressId: selectedAddressId,
        serviceId: selectedServiceId,
        quantity: selectedQuantity,
        scheduledAt: schedule.toISOString(),
        notes,
        isEmergency,
      });

      if (photo) await KatiwalaApi.uploadBookingPhoto(booking.id, photo);

      setNotes('');
      setPhoto(null);
      setEmergency(false);
      await refresh();
      Alert.alert('Booking sent', 'Your request is waiting for dispatcher assignment.');
    } catch (err: any) {
      Alert.alert('Booking failed', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
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
            <Text style={styles.eyebrow}>Katiwala</Text>
            <Text style={styles.headerTitle}>Book trusted service</Text>
          </View>
        </View>

        <View style={styles.flagBar}>
          <View style={[styles.flagSegment, { backgroundColor: Brand.blue }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.red }]} />
          <View style={[styles.flagSegment, { backgroundColor: Brand.yellow }]} />
        </View>

        <Text style={styles.sectionTitle}>Choose a service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRow}>
          {services.map((service) => {
            const active = service.id === selectedServiceId;
            return (
              <Pressable
                key={service.id}
                onPress={() => setSelectedServiceId(service.id)}
                style={[styles.serviceCard, active && styles.serviceCardActive]}>
                <Text style={[styles.category, active && styles.activeText]}>
                  {humanizeCategory(service.category)}
                </Text>
                <Text style={[styles.serviceName, active && styles.activeText]}>{service.name}</Text>
                <Text style={[styles.price, active && styles.activeText]}>
                  {formatPeso(service.basePrice)} / {service.unit}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Service address</Text>
        {addresses.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressRow}>
            {addresses.map((address) => {
              const active = address.id === selectedAddressId;
              return (
                <Pressable
                  key={address.id}
                  onPress={() => setSelectedAddressId(address.id)}
                  style={[styles.addressChip, active && styles.addressChipActive]}>
                  <Text style={[styles.addressLabel, active && styles.activeText]}>{address.label}</Text>
                  <Text style={[styles.addressText, active && styles.activeText]}>
                    {address.barangay}, {address.city}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Add address</Text>
          <View style={styles.twoCol}>
            <TextInput
              value={addressForm.label}
              onChangeText={(label) => setAddressForm((current) => ({ ...current, label }))}
              placeholder="Label"
              placeholderTextColor="#98A2B3"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              value={addressForm.zipCode}
              onChangeText={(zipCode) => setAddressForm((current) => ({ ...current, zipCode }))}
              placeholder="ZIP"
              placeholderTextColor="#98A2B3"
              style={[styles.input, styles.halfInput]}
            />
          </View>
          {(['street', 'barangay', 'city', 'province'] as const).map((field) => (
            <TextInput
              key={field}
              value={addressForm[field]}
              onChangeText={(value) => setAddressForm((current) => ({ ...current, [field]: value }))}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              placeholderTextColor="#98A2B3"
              style={styles.input}
            />
          ))}
          <Pressable onPress={saveAddress} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Save address</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Booking details</Text>
        <View style={styles.panel}>
          <View style={styles.twoCol}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor="#98A2B3"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              value={scheduledAt}
              onChangeText={setScheduledAt}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor="#98A2B3"
              style={[styles.input, styles.halfInput]}
            />
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the issue, access notes, preferred details"
            placeholderTextColor="#98A2B3"
            style={[styles.input, styles.notesInput]}
            multiline
          />
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Emergency service</Text>
              <Text style={styles.switchBody}>Adds a 50% same-day premium.</Text>
            </View>
            <Switch
              value={isEmergency}
              onValueChange={setEmergency}
              trackColor={{ false: Brand.border, true: '#B2CCFF' }}
              thumbColor={isEmergency ? Brand.blue : Brand.white}
            />
          </View>

          {photo ? (
            <ImageBackground source={{ uri: photo.uri }} imageStyle={styles.photoImage} style={styles.photoPreview}>
              <Pressable onPress={() => setPhoto(null)} style={styles.photoRemove}>
                <Text style={styles.photoRemoveText}>Remove</Text>
              </Pressable>
            </ImageBackground>
          ) : (
            <Pressable onPress={choosePhoto} style={styles.photoButton}>
              <Text style={styles.photoButtonText}>Attach job photo</Text>
            </Pressable>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>{formatPeso(estimatedTotal)}</Text>
          </View>

          <Pressable
            disabled={submitting}
            onPress={createBooking}
            style={[styles.primaryButton, submitting && styles.disabled]}>
            {submitting ? (
              <ActivityIndicator color={Brand.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Book service</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Recent bookings</Text>
        {bookings.length === 0 ? (
          <Text style={styles.emptyText}>No bookings yet.</Text>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <Text style={styles.bookingTitle}>{booking.items[0]?.service.name || 'Service booking'}</Text>
                <Text style={[styles.pill, { color: statusColor(booking.status) }]}>{booking.status}</Text>
              </View>
              <Text style={styles.bookingMeta}>
                {booking.address?.barangay}, {booking.address?.city} - {formatPeso(booking.totalAmount)}
              </Text>
              <Text style={styles.bookingMeta}>
                {new Date(booking.scheduledAt).toLocaleString('en-PH')}
              </Text>
            </View>
          ))
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
  flagBar: { flexDirection: 'row', height: 5, borderRadius: 999, overflow: 'hidden', marginBottom: 24 },
  flagSegment: { flex: 1 },
  sectionTitle: { color: Brand.ink, fontSize: 18, fontWeight: '900', marginBottom: 12, marginTop: 10 },
  serviceRow: { gap: 12, paddingBottom: 4 },
  serviceCard: {
    width: 210,
    minHeight: 142,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: Brand.white,
  },
  serviceCardActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  category: { color: Brand.red, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  serviceName: { color: Brand.ink, fontSize: 17, fontWeight: '900', marginTop: 10, lineHeight: 21 },
  price: { color: Brand.slate, fontSize: 13, fontWeight: '700', marginTop: 'auto' },
  activeText: { color: Brand.white },
  addressRow: { gap: 10, paddingBottom: 4 },
  addressChip: {
    width: 165,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Brand.white,
  },
  addressChipActive: { backgroundColor: Brand.red, borderColor: Brand.red },
  addressLabel: { color: Brand.ink, fontWeight: '900', fontSize: 14 },
  addressText: { color: Brand.slate, fontWeight: '600', fontSize: 12, marginTop: 4 },
  panel: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#FCFCFD',
    gap: 10,
    marginBottom: 8,
  },
  panelTitle: { color: Brand.ink, fontSize: 15, fontWeight: '900' },
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
  notesInput: { minHeight: 94, textAlignVertical: 'top' },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.blue,
    borderRadius: 8,
    paddingVertical: 13,
  },
  secondaryButtonText: { color: Brand.blue, fontWeight: '900' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  switchTitle: { color: Brand.ink, fontWeight: '900', fontSize: 14 },
  switchBody: { color: Brand.slate, fontWeight: '600', fontSize: 12, marginTop: 2 },
  photoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 18,
    backgroundColor: Brand.white,
  },
  photoButtonText: { color: Brand.blue, fontWeight: '900' },
  photoPreview: { height: 160, overflow: 'hidden', borderRadius: 8, justifyContent: 'flex-end' },
  photoImage: { borderRadius: 8 },
  photoRemove: { alignSelf: 'flex-end', margin: 10, backgroundColor: Brand.white, borderRadius: 8, padding: 9 },
  photoRemoveText: { color: Brand.red, fontWeight: '900' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { color: Brand.slate, fontWeight: '800' },
  totalValue: { color: Brand.blue, fontWeight: '900', fontSize: 20 },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blue,
    borderRadius: 8,
    minHeight: 52,
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: Brand.white, fontWeight: '900', fontSize: 16 },
  emptyText: { color: Brand.slate, fontWeight: '700' },
  bookingCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: Brand.white,
  },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  bookingTitle: { flex: 1, color: Brand.ink, fontSize: 16, fontWeight: '900' },
  pill: { fontSize: 11, fontWeight: '900' },
  bookingMeta: { color: Brand.slate, fontSize: 13, fontWeight: '700', marginTop: 6 },
});
