import { addDays } from 'date-fns';
import { useMemo } from 'react';

import { useSessions } from '@/features/sessions/hooks';
import {
  averageNapCount,
  averageSleepMs,
  averageSleepMsLastDays,
  bedtimeRegularityMinutes,
  dailySleepSeries,
  morningWakeRange,
  tagSleepCorrelation,
  type BedtimeRegularity,
  type DailySleep,
  type TagCorrelation,
  type WakeRange,
} from '@/lib/sleep-aggregation';
import { dayKeyInAppTz, startOfDayInAppTz } from '@/lib/time';

export type StatsRange = 7 | 14 | 30;

// Okno (dni z danymi) dla formy snu — ostatnie 3 dni.
const FORM_WINDOW_DAYS = 3;

export interface SleepStats {
  series: DailySleep[];
  avgSleepMs: number;
  avgNapCount: number;
  avgSleepMsLast3: number;
  regularity: BedtimeRegularity | null;
  wakeRange: WakeRange | null;
  tagCorrelations: TagCorrelation[];
  daysCovered: number;
  isLoading: boolean;
  isError: boolean;
}

// Agregaty snu dla dashboardu w zakresie `rangeDays` (pelne doby, dzisiaj
// niepelne pomijane). Stabilny queryKey przez memo na `dayKey` (wzorzec
// anty-refetch z sleep-stats.ts) — `useSessions` dostaje stabilne rangeStart/End.
export function useSleepStats(childId: string | null, rangeDays: StatsRange): SleepStats {
  const todayKey = dayKeyInAppTz(new Date());
  const { rangeStart, rangeEnd } = useMemo(() => {
    const todayStart = startOfDayInAppTz(new Date());
    return {
      rangeStart: startOfDayInAppTz(addDays(todayStart, -rangeDays)),
      rangeEnd: todayStart,
    };
    // Re-liczymy gdy zmieni sie dzien lub zakres.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey, rangeDays]);

  const query = useSessions(childId, rangeStart, rangeEnd);
  const sessions = useMemo(() => query.data ?? [], [query.data]);

  const aggregates = useMemo(() => {
    const series = dailySleepSeries(sessions, rangeStart, rangeEnd);
    return {
      series,
      avgSleepMs: averageSleepMs(series),
      avgNapCount: averageNapCount(series),
      avgSleepMsLast3: averageSleepMsLastDays(series, FORM_WINDOW_DAYS),
      regularity: bedtimeRegularityMinutes(sessions),
      wakeRange: morningWakeRange(sessions),
      tagCorrelations: tagSleepCorrelation(sessions, rangeStart, rangeEnd),
      daysCovered: series.filter((day) => day.totalSleepMs > 0).length,
    };
  }, [sessions, rangeStart, rangeEnd]);

  return { ...aggregates, isLoading: query.isLoading, isError: query.isError };
}
