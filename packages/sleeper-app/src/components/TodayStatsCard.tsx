import { Text, View } from 'react-native';

import { ProgressBarStacked } from '@/components/ui/ProgressBarStacked';
import { ProgressRing } from '@/components/ui/ProgressRing';
import type { SleepSession } from '@/features/sessions/hooks';
import { endOfDayInAppTz, formatDuration } from '@/lib/time';

interface TodayStatsCardProps {
  sessions: SleepSession[];
  // Sesja w toku do uwzglednienia w sumie. Liczona do "now".
  activeSession: SleepSession | null;
  now: Date;
  // Poczatek dnia w app tz — granica dla obciecia sesji ktore przeciagaja sie z poprzedniego dnia.
  startOfDay: Date;
  // Zalecane godziny snu na dobe (placeholder = 13g/dobe wg design.md). W przyszlosci
  // podlaczymy `getNormForChild(birthDate).maxHours` (out of scope Fazy 3 — data flow
  // nie jest tu modyfikowany, plan eksplicytnie zaznacza reuse istniejacych props).
  recommendedHours?: number;
}

interface Aggregates {
  nightSleepMs: number;
  napsMs: number;
  napsCount: number;
  longestAwakeMs: number;
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function durationWithinDay(
  start: Date,
  end: Date,
  startOfDay: Date,
  endOfDay: Date,
): number {
  const clampedStart = start < startOfDay ? startOfDay : start;
  const clampedEnd = end > endOfDay ? endOfDay : end;
  if (clampedEnd <= clampedStart) return 0;
  return clampedEnd.getTime() - clampedStart.getTime();
}

function computeAggregates(
  sessions: SleepSession[],
  activeSession: SleepSession | null,
  now: Date,
  startOfDay: Date,
): Aggregates {
  let nightSleepMs = 0;
  let napsMs = 0;
  let napsCount = 0;

  // DST-safe: koniec dnia = poczatek nastepnego w app tz, nie start + 24h.
  const endOfDay = endOfDayInAppTz(startOfDay);

  for (const session of sessions) {
    const start = new Date(session.start_at);
    const end = session.end_at ? new Date(session.end_at) : now;
    const ms = durationWithinDay(start, end, startOfDay, endOfDay);
    if (ms === 0) continue;
    if (session.type === 'night_sleep') {
      nightSleepMs += ms;
    } else {
      napsMs += ms;
      napsCount += 1;
    }
  }

  // Aktywna sesja moze juz byc w `sessions` (z `useSessions`) — nie dubluj.
  const alreadyCounted =
    activeSession !== null && sessions.some((s) => s.id === activeSession.id);
  if (activeSession && !alreadyCounted) {
    const start = new Date(activeSession.start_at);
    const ms = durationWithinDay(start, now, startOfDay, endOfDay);
    if (activeSession.type === 'night_sleep') nightSleepMs += ms;
    else {
      napsMs += ms;
      napsCount += 1;
    }
  }

  // Najdluzsze okno aktywnosci dnia = najdluzsza luka miedzy sasiednimi
  // sesjami (przyciete do dnia). Sortujemy po start.
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );
  let longestAwakeMs = 0;
  let cursor = startOfDay;
  for (const s of sorted) {
    const sStart = new Date(s.start_at);
    if (sStart > cursor) {
      const gap = Math.min(sStart.getTime(), endOfDay.getTime()) - cursor.getTime();
      if (gap > longestAwakeMs) longestAwakeMs = gap;
    }
    const sEnd = s.end_at ? new Date(s.end_at) : now;
    if (sEnd > cursor) cursor = sEnd > endOfDay ? endOfDay : sEnd;
  }
  // Ogon: od konca ostatniej sesji do now (jesli now mieci sie w dniu).
  if (now > cursor && now <= endOfDay) {
    const gap = now.getTime() - cursor.getTime();
    if (gap > longestAwakeMs) longestAwakeMs = gap;
  }

  return { nightSleepMs, napsMs, napsCount, longestAwakeMs };
}

export function TodayStatsCard({
  sessions,
  activeSession,
  now,
  startOfDay,
  recommendedHours = 13,
}: TodayStatsCardProps) {
  const agg = computeAggregates(sessions, activeSession, now, startOfDay);
  const totalSleepMs = agg.nightSleepMs + agg.napsMs;
  const recommendedMs = recommendedHours * MS_PER_HOUR;
  const ringProgress = recommendedMs > 0 ? totalSleepMs / recommendedMs : 0;
  const pctLabel = `${Math.round(Math.min(1, ringProgress) * 100)}%`;

  // Stacked bar: udzialy doby (24h) — Sen nocny + Drzemki + Aktywnosc (longest).
  // Reszta doby (= sen utajony / brak sesji) zostawiamy jako puste track.
  const segments = [
    { value: agg.nightSleepMs / MS_PER_DAY, className: 'bg-purple' },
    { value: agg.napsMs / MS_PER_DAY, className: 'bg-orange' },
    { value: agg.longestAwakeMs / MS_PER_DAY, className: 'bg-success' },
  ];

  return (
    <View className="rounded-card bg-white p-5 shadow-card dark:bg-dark-card">
      <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Dzisiaj
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className="font-display text-3xl font-bold text-navy dark:text-cream"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(totalSleepMs)}
          </Text>
          <Text className="mt-1 text-sm text-text-muted">
            z {recommendedHours}g zalecanych
          </Text>
        </View>
        <ProgressRing value={ringProgress} size={64} strokeWidth={6} label={pctLabel} />
      </View>

      <View className="mt-4">
        <ProgressBarStacked segments={segments} />
      </View>

      <View className="mt-4 flex-row gap-3">
        <MiniStat
          dotClassName="bg-purple"
          label="Sen nocny"
          value={formatDuration(agg.nightSleepMs)}
        />
        <MiniStat
          dotClassName="bg-orange"
          label="Drzemki"
          value={`${agg.napsCount} · ${formatDuration(agg.napsMs)}`}
        />
        <MiniStat
          dotClassName="bg-success"
          label="Aktywność"
          value={formatDuration(agg.longestAwakeMs)}
        />
      </View>
    </View>
  );
}

interface MiniStatProps {
  dotClassName: string;
  label: string;
  value: string;
}

function MiniStat({ dotClassName, label, value }: MiniStatProps) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5">
        <View className={`h-2 w-2 rounded-pill ${dotClassName}`} />
        <Text className="text-xs text-text-muted">{label}</Text>
      </View>
      <Text
        className="mt-1 text-sm font-semibold text-navy dark:text-cream"
        style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}
