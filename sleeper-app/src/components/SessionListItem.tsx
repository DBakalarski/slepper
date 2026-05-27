import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { SleepSession } from '@/features/sessions/hooks';
import { formatDuration, formatRange } from '@/lib/time';

interface SessionListItemProps {
  session: SleepSession;
  // Domyslnie tap otwiera ekran edycji. Niektore konteksty (np. przyszla lista
  // read-only w statystykach) moga to wylaczyc.
  disableNavigation?: boolean;
}

const TYPE_LABELS: Record<SleepSession['type'], string> = {
  nap: 'Drzemka',
  night_sleep: 'Sen nocny',
};

export function SessionListItem({ session, disableNavigation = false }: SessionListItemProps) {
  const start = new Date(session.start_at);
  const end = session.end_at ? new Date(session.end_at) : null;
  const isActive = end === null;
  const durationMs = end ? end.getTime() - start.getTime() : 0;

  const content = (
    <View className="flex-row items-center justify-between rounded-xl bg-white px-4 py-3 dark:bg-dark-card">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-navy dark:text-cream">{TYPE_LABELS[session.type]}</Text>
        <Text className="mt-0.5 text-xs text-purple">{formatRange(start, end)}</Text>
      </View>
      <Text className={`text-sm font-semibold ${isActive ? 'text-orange' : 'text-navy dark:text-cream'}`}>
        {isActive ? 'trwa' : formatDuration(durationMs)}
      </Text>
    </View>
  );

  if (disableNavigation) return content;

  return (
    <Link
      href={{ pathname: '/session/[id]', params: { id: session.id } }}
      asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edytuj sesje ${TYPE_LABELS[session.type]}`}>
        {content}
      </Pressable>
    </Link>
  );
}
