import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'signed_in') {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
