import { Text, View } from 'react-native';

import type { SleepSession } from '@/features/sessions/hooks';
import { endOfDayInAppTz, formatDuration } from '@/lib/time';

interface TodayStatsCardProps {
  sessions: SleepSession[];
  // Sesja w toku do uwzglednienia w sumie. Liczona do "now".
  activeSession: SleepSession | null;
  now: Date;
  // Poczatek dnia w app tz — granica dla obciecia sesji ktore przeciagaja sie z poprzedniego dnia.
  startOfDay: Date;
}

interface Aggregates {
  nightSleepMs: number;
  napsMs: number;
  napsCount: number;
  longestAwakeMs: number;
}

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
}: TodayStatsCardProps) {
  const agg = computeAggregates(sessions, activeSession, now, startOfDay);

  return (
    <View className="rounded-2xl bg-white p-5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-purple">Dzisiaj</Text>
      <View className="mt-3 flex-row gap-4">
        <StatItem label="Sen nocny" value={formatDuration(agg.nightSleepMs)} />
        <StatItem label="Drzemki" value={`${formatDuration(agg.napsMs)} (${agg.napsCount})`} />
        <StatItem label="Najdl. aktywnosc" value={formatDuration(agg.longestAwakeMs)} />
      </View>
    </View>
  );
}

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <View className="flex-1">
      <Text className="text-xs text-purple">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-navy">{value}</Text>
    </View>
  );
}
