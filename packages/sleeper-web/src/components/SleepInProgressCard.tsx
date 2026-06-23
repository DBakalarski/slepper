import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSessionTimer } from '@/features/sessions/useSessionTimer';
import type { SessionType } from '@/features/sessions/hooks';

interface SleepInProgressCardProps {
  // ID aktywnej sesji — tap na timer prowadzi do ekranu edycji startu.
  sessionId: string;
  // ISO string z bazy (stable po deepEqual, useSessionTimer parsuje wewnatrz).
  startAt: string;
  type: SessionType;
}

const TYPE_LABELS: Record<SessionType, string> = {
  nap: 'Drzemka w toku',
  night_sleep: 'Sen nocny w toku',
};

// Granatowa karta z mockupu #2: timer biegnacej sesji + przycisk pelnoekranowy.
// Tap na obszar timera -> edycja sesji (mozliwosc poprawienia godziny startu w
// trakcie snu). "Pelny ekran" zostaje osobnym przyciskiem (sibling, bez
// zagniezdzenia Pressable — uniknac double-fire na web).
export function SleepInProgressCard({ sessionId, startAt, type }: SleepInProgressCardProps) {
  const router = useRouter();
  const { display, short } = useSessionTimer(startAt);

  return (
    <View className="rounded-2xl bg-navy p-5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edytuj start sesji"
        onPress={() => router.push({ pathname: '/session/[id]', params: { id: sessionId } })}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <Text className="text-xs font-semibold uppercase tracking-wide text-cream/70">
          {TYPE_LABELS[type]}
        </Text>
        <Text
          className="mt-2 font-mono text-4xl font-semibold text-cream"
          style={{ fontVariant: ['tabular-nums'] }}>
          {display}
        </Text>
        <Text
          className="mt-1 text-sm text-cream/80"
          style={{ fontVariant: ['tabular-nums'] }}>
          {short}
        </Text>
      </Pressable>

      <Link
        href="/sleep-fullscreen"
        className="mt-4 self-start rounded-xl bg-cream/15 px-4 py-2 text-sm font-semibold text-cream">
        Pelny ekran
      </Link>
    </View>
  );
}
