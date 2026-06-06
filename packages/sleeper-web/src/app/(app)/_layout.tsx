import { Redirect, Tabs } from 'expo-router';
import { BarChart3, Calendar, Home, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { useRealtimeSessions } from '@/features/sessions/useRealtimeSessions';
import { COLORS } from '@/lib/colors';

// Faza 2 ui-redesign: tab bar z ikonami lucide + outlined chip dla active.
// Kolory pochodza z palety tailwind (purple-light/navy/cream/text-muted).
// Decyzja: bazuje na `useEffectiveTheme()` (nie raw `useColorScheme()`) — tab
// bar respektuje manual override z `useThemeStore` (Faza 1).
const ACTIVE_LIGHT = COLORS.navy;
const ACTIVE_DARK = COLORS.cream;
const INACTIVE_LIGHT = COLORS.textMuted;
const INACTIVE_DARK = COLORS.purpleLight;

type LucideIcon = ComponentType<{ color: string; size: number; strokeWidth?: number }>;

interface TabIconProps {
  Icon: LucideIcon;
  focused: boolean;
  color: string;
}

function TabIcon({ Icon, focused, color }: TabIconProps) {
  // Outlined chip dla focused (rounded-pill + border w kolorze active).
  // Bez focused: ikona bez ramki.
  if (!focused) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Icon color={color} size={22} strokeWidth={2} />
      </View>
    );
  }
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}>
      <Icon color={color} size={22} strokeWidth={2.25} />
    </View>
  );
}

export default function AppTabsLayout() {
  const { status } = useAuth();
  const { activeChildId } = useActiveChild();
  const effectiveTheme = useEffectiveTheme();
  const isDark = effectiveTheme === 'dark';
  // Safe-area insets — na webie czytane z CSS env() przez SafeAreaProvider (z root layout).
  // W iOS PWA standalone insets.bottom ~= 34 (home indicator). Bez tego tab bar siedzi na
  // 100dvh - 49px, a pod nim widac body bg cream do dolnej krawedzi ekranu.
  const insets = useSafeAreaInsets();

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

  const activeColor = isDark ? ACTIVE_DARK : ACTIVE_LIGHT;
  const inactiveColor = isDark ? INACTIVE_DARK : INACTIVE_LIGHT;

  // Tabs API expo-router nie obsluguje className — kolorystyka dark/light
  // przekazana przez screenOptions na bazie `effectiveTheme` (manual override).
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarShowLabel: false,
        // Explicit bg dla obu trybow + height/paddingBottom uwzgledniajaca iOS PWA
        // home indicator safe-area. react-navigation/bottom-tabs sam dodaje paddingBottom
        // z useSafeAreaInsets na natywie, ale na webie ta logika nie zawsze odpala (zalezy
        // od wersji). Robimy to jawnie zeby tab bar rozciagal sie do dolnej krawedzi
        // viewport-u na iOS PWA standalone.
        tabBarStyle: {
          ...(isDark
            ? { backgroundColor: '#0F0D26', borderTopColor: '#2A2660' }
            : { backgroundColor: '#F5F0E8', borderTopColor: '#E5DDD0' }),
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 6 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dzisiaj',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Home} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historia',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Calendar} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Statystyki',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={BarChart3} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={User} focused={focused} color={color} />
          ),
        }}
      />
      {/* sleep-fullscreen poza tab barem — dostepny przez router.push */}
      <Tabs.Screen name="sleep-fullscreen" options={{ href: null }} />
      {/* session/[id] — ekran edycji, dostepny przez Link z listy sesji */}
      <Tabs.Screen name="session/[id]" options={{ href: null }} />
      {/* settings — Rodzina + Wyloguj (Faza 5 ui-redesign), dostepny przez
          gear icon z Profilu. Ukryty w tab barze. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      {/* child/[id]/edit — ekran edycji dziecka, dostepny przez tap na
          ActiveChildCard z Profilu. Ukryty w tab barze. */}
      <Tabs.Screen name="child/[id]/edit" options={{ href: null }} />
    </Tabs>
  );
}
