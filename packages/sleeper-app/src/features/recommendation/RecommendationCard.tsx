import { Text, View } from 'react-native';

import { formatTime } from '@/lib/time';
import { useSleepRecommendation } from './useSleepRecommendation';
import type { TimeOfDay } from 'sleeper-machine';

interface RecommendationCardProps {
  readonly childId: string;
  readonly birthDateIso: string;
  readonly now: Date;
  readonly targetWakeTime?: TimeOfDay;
}

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'Mała pewność',
  medium: 'Średnia pewność',
  high: 'Wysoka pewność',
};

const CONFIDENCE_DOT: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-orange',
  medium: 'bg-purple',
  high: 'bg-navy',
};

export function RecommendationCard({
  childId,
  birthDateIso,
  now,
  targetWakeTime,
}: RecommendationCardProps) {
  const { recommendation, isLoading, error } = useSleepRecommendation(
    childId,
    birthDateIso,
    now,
    targetWakeTime,
  );

  if (isLoading || !recommendation) return null;
  if (error) return null;

  const { nextSleepAt, currentWakeWindowDuration, remainingNapsToday, confidence, warnings } =
    recommendation;

  return (
    <View className="rounded-card bg-white p-5 shadow-card dark:bg-dark-card">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Rekomendacja
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-pill ${CONFIDENCE_DOT[confidence]}`} />
          <Text className="text-xs text-text-muted">{CONFIDENCE_LABEL[confidence]}</Text>
        </View>
      </View>

      {nextSleepAt ? (
        <>
          <Text className="mt-2 text-xs text-text-muted">Następny sen</Text>
          <Text
            className="font-display text-6xl font-semibold text-navy dark:text-cream"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatTime(nextSleepAt)}
          </Text>
          <Text className="mt-1 text-sm text-text-muted">
            Okno czuwania: {Math.round(currentWakeWindowDuration)} min
          </Text>
        </>
      ) : (
        <Text className="mt-3 text-base text-text-muted">
          Brak kotwicy — dodaj sesję snu nocnego lub ustaw godzinę pobudki.
        </Text>
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
