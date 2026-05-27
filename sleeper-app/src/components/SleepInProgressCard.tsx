import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { useSessionTimer } from '@/features/sessions/useSessionTimer';
import type { SessionType } from '@/features/sessions/hooks';

interface SleepInProgressCardProps {
  // ISO string z bazy (stable po deepEqual, useSessionTimer parsuje wewnatrz).
  startAt: string;
  type: SessionType;
}

const TYPE_LABELS: Record<SessionType, string> = {
  nap: 'Drzemka w toku',
  night_sleep: 'Sen nocny w toku',
};

// Granatowa karta z mockupu #2: timer biegnacej sesji + przycisk pelnoekranowy.
export function SleepInProgressCard({ startAt, type }: SleepInProgressCardProps) {
  const { display, short } = useSessionTimer(startAt);

  return (
    <View className="rounded-2xl bg-navy p-5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-cream/70">
        {TYPE_LABELS[type]}
      </Text>
      <Text className="mt-2 font-mono text-4xl font-semibold text-cream">{display}</Text>
      <Text className="mt-1 text-sm text-cream/80">{short}</Text>

      <Link
        href="/sleep-fullscreen"
        className="mt-4 self-start rounded-xl bg-cream/15 px-4 py-2 text-sm font-semibold text-cream">
        Pelny ekran
      </Link>
    </View>
  );
}
