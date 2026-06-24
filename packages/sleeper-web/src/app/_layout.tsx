import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { registerSW } from '@/features/pwa/registerSW';
import { SnackbarProvider } from '@/features/snackbar/SnackbarProvider';
import { ThemeProvider, useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { configureNotificationHandler } from '@/lib/notifications';
import { queryClient, setupFocusManager } from '@/lib/query-client';

// Wolane modulowo (raz) — na web `configureNotificationHandler` to no-op (web
// nie wspiera expo-notifications, mock w `lib/notifications.ts`). Zachowujemy
// wywolanie zeby zachowac parytet z sleeper-app _layout.tsx.
configureNotificationHandler();

function RootLayoutContent() {
  const effectiveTheme = useEffectiveTheme();
  return (
    <SafeAreaProvider>
      <SnackbarProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
      </SnackbarProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    return setupFocusManager();
  }, []);

  // PWA: register Service Worker on mount (post-hydration).
  // Idempotentny; browser deduplikuje. (IU11)
  useEffect(() => {
    registerSW();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
