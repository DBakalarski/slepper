import { addDays } from 'date-fns';
import { useMemo } from 'react';

import { useSessions } from '@/features/sessions/hooks';
import { dailySleepTotalsMs } from '@/lib/sleep-aggregation';
import { dayKeyInAppTz, startOfDayInAppTz } from '@/lib/time';

// Hook agregujacy sredni sen dziecka z ostatnich N pelnych dni (default 7).
// Reuse istniejacego `useSessions(childId, rangeStart, rangeEnd)` — query klucz
// jest stabilny dla tej samej pary dat (toISOString w hooku), aproksymacja
// memoizacji wystarczy bo komponent renderuje karta Profilu rzadko.
//
// Output:
//   `avgMs` — srednia ze SUMY snu (nap + night_sleep) per dzien w ostatnich
//             `daysCovered` dniach. 0 gdy brak sesji.
//   `daysCovered` — liczba pelnych dni od najwczesniejszej sesji do dzisiaj
//                   (max RANGE_DAYS). Gdy brak sesji w ogole -> 0.

const RANGE_DAYS = 7;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface AvgSleep7d {
  avgMs: number;
  daysCovered: number;
}

// Day-split cross-midnight wydzielony do `lib/sleep-aggregation.ts`
// (single source of truth — reuse przez dashboard). Tu tylko srednia 7d.

export function useAvgSleep7d(childId: string | null): AvgSleep7d {
  // Range stabilny dla danego dnia — `dayKeyInAppTz(new Date())` zwraca te sama
  // wartosc w obrebie doby, wiec `useMemo` ufndza referencje rangeStart/rangeEnd
  // miedzy renderami (zapobiega nieskonczonemu refetchowi po `now.toISOString()`
  // w queryKey w `useSessions`).
  const todayKey = dayKeyInAppTz(new Date());
  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDayInAppTz(today);
    return {
      rangeStart: startOfDayInAppTz(addDays(todayStart, -RANGE_DAYS)),
      rangeEnd: todayStart,
    };
    // Re-liczymy gdy zmieni sie dzien (przekroczenie polnocy) — wczesniejszy
    // memo ma stabilna referencje dla calej doby.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const query = useSessions(childId, rangeStart, rangeEnd);
  const sessions = query.data ?? [];

  const dailyTotals = dailySleepTotalsMs(sessions);

  // daysCovered = min(RANGE_DAYS, ile faktycznych dni mamy dane). Jesli sesje
  // istnieja, czytamy `min(RANGE_DAYS, days since first session)`. Brak sesji -> 0.
  let daysCovered = 0;
  if (dailyTotals.size > 0) {
    // Liczba unikalnych dni w mapie — max RANGE_DAYS bo range jest 7-dniowy.
    daysCovered = Math.min(RANGE_DAYS, dailyTotals.size);
  }

  let sumMs = 0;
  for (const ms of dailyTotals.values()) sumMs += ms;
  const avgMs = daysCovered > 0 ? sumMs / daysCovered : 0;

  return { avgMs, daysCovered };
}

// Eksportowany helper na potrzeby renderowania ProgressBar (avgMs / norm.maxHours).
// Zwraca 0..1 (clamp).
export function avgSleepProgressRatio(avgMs: number, maxHours: number): number {
  if (maxHours <= 0) return 0;
  const maxMs = maxHours * MS_PER_HOUR;
  const ratio = avgMs / maxMs;
  if (Number.isNaN(ratio) || ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

// Procent normy (np. "85% normy"). Liczony wzgledem maxHours normy snu.
export function avgSleepPercentOfNorm(avgMs: number, maxHours: number): number {
  if (maxHours <= 0) return 0;
  const maxMs = maxHours * MS_PER_HOUR;
  return Math.round((avgMs / maxMs) * 100);
}

// Re-export staly aby konsumenci nie duplikowali wartosci.
export const SLEEP_STATS_RANGE_DAYS = RANGE_DAYS;
export const SLEEP_STATS_MS_PER_DAY = MS_PER_DAY;
