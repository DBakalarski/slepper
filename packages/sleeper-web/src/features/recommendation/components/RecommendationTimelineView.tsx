import { Text, View } from 'react-native';
import type { Recommendation } from 'sleeper-machine';

import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { SleepSession } from '@/features/sessions/hooks';
import { computeDayForecast, type DayForecast } from '@/lib/day-forecast';
import { formatDuration } from '@/lib/time';

import { hasCompletedNightSessionToday, nextSleepEmptyCopy } from '../next-sleep-copy';
import { DayTimeline } from './DayTimeline';

interface RecommendationTimelineViewProps {
  readonly recommendation: Recommendation;
  readonly sessions: readonly SleepSession[];
  readonly now: Date;
  readonly birthDate: Date;
  readonly hasPreferredWakeTime: boolean;
}

// Copy prognozy wg specyfikacji Taska 5: 'within' -> "w normie (min–max g)",
// 'below'/'above' -> delta ze znakiem wzgledem najblizszej krawedzi normy.
function forecastLabel(forecast: DayForecast): string {
  if (forecast.verdict === 'within') {
    return `w normie (${forecast.norm.minHours}–${forecast.norm.maxHours} g)`;
  }
  const delta = formatDuration(forecast.deltaMs);
  return forecast.verdict === 'below' ? `−${delta} do normy` : `+${delta} ponad normę`;
}

function forecastVariant(verdict: DayForecast['verdict']): BadgeVariant {
  return verdict === 'within' ? 'success' : 'orange';
}

// Widok "oś" karty rekomendacji — DayTimeline (fakty + plan + "teraz") +
// linia prognozy bilansu (day-forecast) + warunkowa nota o domyślnej
// pobudce 07:00. `nextSleepAt === null` z sesją nocną w toku to POPRAWNY
// stan (dziecko śpi na noc) — patrz next-sleep-copy.ts.
export function RecommendationTimelineView({
  recommendation,
  sessions,
  now,
  birthDate,
  hasPreferredWakeTime,
}: RecommendationTimelineViewProps) {
  const plan = recommendation.remainingNapsToday;
  const forecast = computeDayForecast(sessions, plan, now, birthDate);
  const showDefaultWakeNote = !hasPreferredWakeTime && !hasCompletedNightSessionToday(sessions);

  return (
    <View className="gap-3">
      <DayTimeline sessions={sessions} plan={plan} now={now} />

      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Bilans dnia
        </Text>
        <Badge label={forecastLabel(forecast)} variant={forecastVariant(forecast.verdict)} />
      </View>

      {recommendation.nextSleepAt === null ? (
        <Text className="text-sm text-text-muted">{nextSleepEmptyCopy(sessions)}</Text>
      ) : null}

      {showDefaultWakeNote ? (
        <Text className="text-xs text-text-muted">
          Przyjęto domyślną godzinę pobudki 07:00 — ustaw własną w profilu dziecka, aby prognoza była
          dokładniejsza.
        </Text>
      ) : null}

      {recommendation.warnings.length > 0 ? (
        <View className="gap-1">
          {recommendation.warnings.map((message, i) => (
            <Text key={i} className="text-xs text-orange">
              {message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
