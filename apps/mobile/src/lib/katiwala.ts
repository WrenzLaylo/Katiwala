import { api } from './api';

export interface Service {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  basePrice: number;
  unit: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode?: string | null;
  isDefault: boolean;
}

export interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  notes?: string | null;
  totalAmount: number;
  isEmergency: boolean;
  address?: Address;
  items: Array<{ id: string; quantity: number; subtotal: number; service: Service }>;
  customer?: { firstName: string; lastName: string; user?: { phone: string } };
  tradesman?: TradesmanProfile | null;
  payment?: { id: string; method: string; status: string; amount: number; paidAt?: string | null } | null;
  photos?: Array<{ id: string; signedUrl?: string | null; type: string }>;
}

export interface TradesmanProfile {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  status: string;
  availability: string;
  averageRating: number;
  totalJobs: number;
  user?: { phone: string };
  skills: Array<{ id: string; category: string; yearsExp: number; isVerified: boolean }>;
}

export interface MeResponse {
  user: {
    id: string;
    phone: string;
    role: 'CUSTOMER' | 'TRADESMAN' | 'ADMIN' | 'DISPATCHER';
    status: string;
    customerProfile?: any;
    tradesmanProfile?: TradesmanProfile | null;
    adminProfile?: any;
  };
}

export const KatiwalaApi = {
  async me() {
    const res = await api.get<MeResponse>('/me');
    return res.data.user;
  },

  async services() {
    const res = await api.get<{ services: Service[] }>('/services');
    return res.data.services;
  },

  async addresses() {
    const res = await api.get<{ addresses: Address[] }>('/addresses');
    return res.data.addresses;
  },

  async createAddress(input: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) {
    const res = await api.post<{ address: Address }>('/addresses', input);
    return res.data.address;
  },

  async createBooking(input: {
    addressId: string;
    serviceId: string;
    quantity: number;
    scheduledAt: string;
    notes?: string;
    isEmergency?: boolean;
  }) {
    const res = await api.post<{ booking: Booking }>('/bookings', {
      addressId: input.addressId,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
      isEmergency: input.isEmergency,
      items: [{ serviceId: input.serviceId, quantity: input.quantity }],
    });
    return res.data.booking;
  },

  async uploadBookingPhoto(bookingId: string, asset: { uri: string; fileName?: string | null; mimeType?: string }) {
    const form = new FormData();
    form.append('photo', {
      uri: asset.uri,
      name: asset.fileName || `booking-${bookingId}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    } as any);

    const res = await api.post(`/bookings/${bookingId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.photo;
  },

  async bookings(status?: string) {
    const res = await api.get<{ bookings: Booking[] }>('/bookings', { params: { status } });
    return res.data.bookings;
  },

  async updateBookingStatus(id: string, status: string) {
    const res = await api.patch<{ booking: Booking }>(`/bookings/${id}/status`, { status });
    return res.data.booking;
  },

  async onboardTradesman(input: {
    firstName: string;
    lastName: string;
    bio?: string;
    skills: Array<{ category: string; yearsExp: number }>;
  }) {
    const res = await api.patch<{ profile: TradesmanProfile }>('/me/tradesman', input);
    return res.data.profile;
  },

  async dispatcherBookings(status?: string) {
    const res = await api.get<{ bookings: Booking[] }>('/dispatcher/bookings', { params: { status } });
    return res.data.bookings;
  },

  async dispatcherTradesmen(status?: string) {
    const res = await api.get<{ tradesmen: TradesmanProfile[] }>('/dispatcher/tradesmen', {
      params: { status },
    });
    return res.data.tradesmen;
  },

  async verifyTradesman(id: string) {
    const res = await api.patch<{ tradesman: TradesmanProfile }>(`/dispatcher/tradesmen/${id}/verify`, {
      status: 'VERIFIED',
    });
    return res.data.tradesman;
  },

  async assignBooking(bookingId: string, tradesmanId: string) {
    const res = await api.patch<{ booking: Booking }>(`/dispatcher/bookings/${bookingId}/assign`, {
      tradesmanId,
    });
    return res.data.booking;
  },

  async markPaid(bookingId: string) {
    const res = await api.patch(`/dispatcher/bookings/${bookingId}/payment/mark-paid`);
    return res.data.payment;
  },
};
