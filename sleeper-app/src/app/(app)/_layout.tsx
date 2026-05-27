import { Redirect, Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useRealtimeSessions } from '@/features/sessions/useRealtimeSessions';

export default function AppTabsLayout() {
  const { status } = useAuth();
  const { activeChildId } = useActiveChild();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Realtime sync: subskrypcja na poziomie layoutu, zeby zyla niezaleznie od
  // tego ktora zakladka jest aktywna. Event invaliduje ['sessions'] -> TanStack
  // refetchuje to co aktualnie observowane.
  useRealtimeSessions(activeChildId);

  if (status === 'loading') {
    return null;
  }

  if (status === 'signed_out') {
    return <Redirect href="/sign-in" />;
  }

  // Tabs API expo-router nie obsluguje className — kolorystyka dark/light
  // przekazana przez screenOptions w zaleznosci od systemowego color scheme.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#F5F0E8' : '#1E1B4B',
        tabBarInactiveTintColor: isDark ? '#7C6BAD' : '#7C6BAD',
        tabBarStyle: isDark
          ? { backgroundColor: '#0F0D26', borderTopColor: '#2A2660' }
          : undefined,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dzisiaj' }} />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statystyki' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      {/* sleep-fullscreen poza tab barem — dostepny przez router.push */}
      <Tabs.Screen name="sleep-fullscreen" options={{ href: null }} />
      {/* session/[id] — ekran edycji, dostepny przez Link z listy sesji */}
      <Tabs.Screen name="session/[id]" options={{ href: null }} />
    </Tabs>
  );
}
