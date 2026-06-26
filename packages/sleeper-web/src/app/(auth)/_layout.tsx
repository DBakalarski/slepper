import { Redirect, Stack } from 'expo-router';

import { AppLoader } from '@/components/AppLoader';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMinElapsedSinceAppStart } from '@/lib/use-min-loader-time';

export default function AuthLayout() {
  const { status } = useAuth();
  const minLoaderElapsed = useMinElapsedSinceAppStart();

  if (status === 'loading') {
    return <AppLoader />;
  }

  if (status === 'signed_in') {
    // Redirect natychmiast — bez minimalnego czasu (nie opozniamy wejscia do appki).
    return <Redirect href="/" />;
  }

  // signed_out: trzymaj loader minimum ~1s od startu, zeby formularz logowania
  // nie mignal po blyskawicznym auth-check (np. brak sesji w cache).
  if (!minLoaderElapsed) {
    return <AppLoader />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
