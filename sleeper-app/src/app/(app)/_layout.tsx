import { Tabs } from 'expo-router';

export default function AppTabsLayout() {
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
    </Tabs>
  );
}
