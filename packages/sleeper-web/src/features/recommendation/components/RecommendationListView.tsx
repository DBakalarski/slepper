import { Text, View } from 'react-native';
import type { Recommendation } from 'sleeper-machine';

import type { SleepSession } from '@/features/sessions/hooks';
import { formatDuration, formatTime } from '@/lib/time';

import { nextSleepEmptyCopy } from '../next-sleep-copy';

// currentWakeWindowDuration jest w minutach; formatDuration oczekuje ms.
const MINUTE_MS = 60 * 1000;

interface RecommendationListViewProps {
  readonly recommendation: Recommendation;
  readonly sessions: readonly SleepSession[];
}

// Widok "lista" karty rekomendacji — dotychczasowy render (bez zmian
// merytorycznych poza copy dla `nextSleepAt === null`, patrz next-sleep-copy.ts).
export function RecommendationListView({ recommendation, sessions }: RecommendationListViewProps) {
  const { nextSleepAt, currentWakeWindowDuration, remainingNapsToday, warnings } = recommendation;

  return (
    <View>
      {nextSleepAt ? (
        <>
          <Text className="mt-2 text-xs text-text-muted">Następny sen</Text>
          <Text
            className="font-display text-6xl font-semibold text-navy dark:text-cream"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatTime(nextSleepAt)}
          </Text>
          <Text className="mt-1 text-sm text-text-muted">
            Okno czuwania: {formatDuration(currentWakeWindowDuration * MINUTE_MS)}
          </Text>
        </>
      ) : (
        <Text className="mt-3 text-base text-text-muted">{nextSleepEmptyCopy(sessions)}</Text>
      )}

      {remainingNapsToday.length > 0 ? (
        <View className="mt-4 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Plan reszty dnia
          </Text>
          {remainingNapsToday.map((entry) => {
            const time = formatTime(entry.plannedStart);
            const endTime = entry.plannedEnd ? formatTime(entry.plannedEnd) : null;
            const label = entry.type === 'NIGHT' ? 'Sen nocny' : 'Drzemka';
            return (
              <Text key={entry.plannedStart.toISOString()} className="text-sm text-navy dark:text-cream">
                {label} · {time}
                {endTime ? ` – ${endTime}` : ''}
              </Text>
            );
          })}
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View className="mt-4 gap-1">
          {warnings.map((message, i) => (
            <Text key={i} className="text-xs text-orange">
              {message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
