import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { tokenStorage } from './storage';

const API_PORT = 3000;

// Loopback/emulator-only hosts that won't work from a physical phone. When the
// configured URL points at one of these, we fall back to auto-detection.
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '10.0.2.2', 'YOUR_LOCAL_IP'];

function isLoopback(url?: string | null): boolean {
  return !url || LOOPBACK_HOSTS.some((host) => url.includes(host));
}

/**
 * Resolve the API base URL so login works everywhere with zero hand-editing:
 *  1. An explicit, non-loopback EXPO_PUBLIC_API_URL always wins (e.g. prod).
 *  2. Otherwise derive the dev machine's LAN IP from the Metro host that is
 *     already serving this bundle — correct for physical devices over Wi-Fi.
 *  3. Android emulator can't see the host LAN IP, so use its 10.0.2.2 alias.
 *  4. Last resort: localhost (iOS simulator / web).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && !isLoopback(fromEnv)) {
    return fromEnv;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri ? String(hostUri).split(':')[0] : undefined;

  if (host && !LOOPBACK_HOSTS.includes(host)) {
    return `http://${host}:${API_PORT}`;
  }

  if (Platform.OS === 'android') {
    // A physical device over USB reaches the host through `adb reverse` at
    // localhost; the emulator uses its special 10.0.2.2 host alias.
    return Device.isDevice
      ? `http://localhost:${API_PORT}`
      : `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log(`[katiwala] API base URL → ${API_URL}`);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && error.config) {
      const refreshToken = await tokenStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = res.data;

          await tokenStorage.setItem('accessToken', accessToken);
          error.config.headers.Authorization = `Bearer ${accessToken}`;

          return axios(error.config);
        } catch {
          await tokenStorage.deleteItem('accessToken');
          await tokenStorage.deleteItem('refreshToken');
          await tokenStorage.deleteItem('user');
        }
      }
    }

    return Promise.reject(error);
  },
);
