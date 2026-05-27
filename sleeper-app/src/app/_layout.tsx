import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { configureNotificationHandler } from '@/lib/notifications';
import { queryClient, setupFocusManager } from '@/lib/query-client';

// Wolane modulowo (raz) — handler musi byc skonfigurowany przed pierwsza
// notyfikacja, niezaleznie od momentu permission request (Faza 5).
configureNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    return setupFocusManager();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
