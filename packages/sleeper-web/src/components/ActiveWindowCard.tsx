import { Text, View } from 'react-native';
import type { Recommendation } from 'sleeper-machine';

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, formatTime } from '@/lib/time';

interface ActiveWindowCardProps {
  // Czas zakonczenia ostatniej sesji. Jesli null = brak sesji w historii dziecka.
  readonly lastSleepEndAt: Date | null;
  // Rekomendacja z sleeper-machine. Null = brak kotwicy / loading / swieze dziecko.
  readonly recommendation: Recommendation | null;
  // Aktualny czas — tick rzadzony przez parent (useNow w ActiveChildSection).
  readonly now: Date;
}

const MINUTE_MS = 60 * 1000;

// Pomaranczowa karta z mockupu #1: ile trwa okno aktywnosci + age-based
// rekomendacja kolejnej drzemki. Wszystkie wartosci docelowe pochodza
// z `recommendation` (sleeper-machine.recommend()), zadnych hardcode placeholderow.
export function ActiveWindowCard({
  lastSleepEndAt,
  recommendation,
  now,
}: ActiveWindowCardProps) {
  const nowMs = now.getTime();
  const sinceMs = lastSleepEndAt ? Math.max(0, nowMs - lastSleepEndAt.getTime()) : null;

  const targetMs = recommendation ? recommendation.currentWakeWindowDuration * MINUTE_MS : null;

  const remainingMs = recommendation?.nextSleepAt
    ? recommendation.nextSleepAt.getTime() - nowMs
    : null;

  const progressValue =
    sinceMs !== null && targetMs !== null && targetMs > 0
      ? Math.min(1, sinceMs / targetMs)
      : null;

  return (
    <View className="rounded-card bg-orange-soft p-5">
      {/* Header: kropka + label "OKNO AKTYWNOŚCI" */}
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-pill bg-orange" />
        <Text className="text-xs font-semibold uppercase tracking-wide text-orange">
          Okno aktywności
        </Text>
      </View>

      {sinceMs === null ? (
        <>
          <Text
            className="mt-3 font-display text-6xl font-semibold text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            Nowy dzień
          </Text>
          <Text className="mt-2 text-sm text-text-muted">Brak sesji w historii.</Text>
        </>
      ) : (
        <>
          <Text
            className="mt-3 font-display text-6xl font-semibold text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(sinceMs)}
          </Text>
          {/* Wrapper holds space (h-2 = 8pt) even when progressValue is null,
              preventing layout shift when recommendation loads/unloads. */}
          <View className="mt-4 h-2">
            {progressValue !== null ? (
              <ProgressBar
                value={progressValue}
                tintClassName="bg-orange"
                trackClassName="bg-white/70"
              />
            ) : null}
          </View>
          {lastSleepEndAt ? (
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-text-muted">
                Pobudka o {formatTime(lastSleepEndAt)}
              </Text>
              {remainingMs === null ? null : remainingMs > 0 ? (
                <Badge label={`Drzemka za ~${formatDuration(remainingMs)}`} variant="orange" />
              ) : (
                <Badge
                  label={`Przekroczono okno o ~${formatDuration(-remainingMs)}`}
                  variant="orange"
                />
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
