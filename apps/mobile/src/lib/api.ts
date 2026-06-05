import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { tokenStorage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://YOUR_LOCAL_IP:3000';

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
