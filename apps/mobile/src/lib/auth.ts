import { api } from './api';
import { tokenStorage } from './storage';

export interface User {
  id: string;
  phone: string;
  role: 'CUSTOMER' | 'TRADESMAN' | 'ADMIN' | 'DISPATCHER';
  status: string;
}

export interface EmailSignupInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'TRADESMAN';
}

async function persistSession(data: {
  accessToken: string;
  refreshToken: string;
  user: User;
}) {
  await tokenStorage.setItem('accessToken', data.accessToken);
  await tokenStorage.setItem('refreshToken', data.refreshToken);
  await tokenStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export const AuthService = {
  async sendOtp(phone: string) {
    const res = await api.post('/auth/send-otp', { phone });
    return res.data;
  },

  async signupEmail(input: EmailSignupInput) {
    const res = await api.post('/auth/signup-email', input);
    return persistSession(res.data);
  },

  async loginEmail(email: string, password: string) {
    const res = await api.post('/auth/login-email', { email, password });
    return persistSession(res.data);
  },

  async verifyOtp(phone: string, token: string, role: string) {
    const res = await api.post('/auth/verify-otp', { phone, token, role });
    const { accessToken, refreshToken, user } = res.data;

    await tokenStorage.setItem('accessToken', accessToken);
    await tokenStorage.setItem('refreshToken', refreshToken);
    await tokenStorage.setItem('user', JSON.stringify(user));

    return user as User;
  },

  async getUser(): Promise<User | null> {
    const user = await tokenStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  async logout() {
    await tokenStorage.deleteItem('accessToken');
    await tokenStorage.deleteItem('refreshToken');
    await tokenStorage.deleteItem('user');
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await tokenStorage.getItem('accessToken');
    return Boolean(token);
  },
};
