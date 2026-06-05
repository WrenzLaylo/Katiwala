import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const useSecureStore = Platform.OS !== 'web';

export const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (useSecureStore) {
      return SecureStore.getItemAsync(key);
    }

    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (useSecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },
};
