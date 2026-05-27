import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

export default function AppTabsLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'signed_out') {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E1B4B',
        tabBarInactiveTintColor: '#7C6BAD',
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dzisiaj' }} />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statystyki' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      {/* sleep-fullscreen poza tab barem — dostepny przez router.push */}
      <Tabs.Screen name="sleep-fullscreen" options={{ href: null }} />
    </Tabs>
  );
}
