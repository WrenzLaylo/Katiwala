import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthService } from '../lib/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AuthService.isLoggedIn().then((loggedIn) => {
      if (loggedIn) {
        AuthService.getUser().then((user) => {
          if (user?.role === 'TRADESMAN') {
            router.replace('/(tradesman)/dashboard');
          } else if (user?.role === 'ADMIN' || user?.role === 'DISPATCHER') {
            router.replace('/(dispatcher)/dashboard');
          } else {
            router.replace('/(customer)/home');
          }
        });
      } else {
        router.replace('/(auth)/auth');
      }
    });
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#1A3FB0" size="large" />
    </View>
  );
}
