import { addDays } from 'date-fns';

import type { SleepSession } from '@/features/sessions/hooks';
import {
  dayKeyInAppTz,
  endOfDayInAppTz,
  minutesOfDayInAppTz,
  startOfDayInAppTz,
} from '@/lib/time';

// Czysta logika agregacji snu dla dashboardu (ekran Statystyki). Bez I/O,
// bez Date.now() — `now`/zakres wchodza argumentem. Source-of-truth dla
// day-splitu cross-midnight (reuse przez sleep-stats.ts).

const MINUTES_PER_DAY = 24 * 60;
// Kotwica 18:00 dla regularnosci zasypiania — pory 18:00..02:00 mapuja sie na
// rosnacy ciag minut bez owijania polnocy (psujacego srednia/odchylenie).
const BEDTIME_ANCHOR_MIN = 18 * 60;
// Tolerancja poza pasmem normy dla formy "ok" (15% krawedzi pasma).
const FORM_OK_BAND = 0.15;

// Czas trwania sesji obcietej do okna `[windowStart, windowEnd)` (ms). Sesja
// przez polnoc liczy sie proporcjonalnie do obu dni.
export function durationWithinWindow(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const clampedStart = start < windowStart ? windowStart : start;
  const clampedEnd = end > windowEnd ? windowEnd : end;
  if (clampedEnd <= clampedStart) return 0;
  return clampedEnd.getTime() - clampedStart.getTime();
}

// Suma snu (ms) per dzien w app tz. Sesje cross-midnight dzielone miedzy dni.
// Pomija sesje w toku (`end_at === null`). Zwraca Map<dayKey, totalMs>.
export function dailySleepTotalsMs(sessions: SleepSession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (session.end_at === null) continue;
    const start = new Date(session.start_at);
    const end = new Date(session.end_at);
    if (end <= start) continue;

    let cursor = startOfDayInAppTz(start);
    while (cursor < end) {
      const dayEnd = endOfDayInAppTz(cursor);
      const ms = durationWithinWindow(start, end, cursor, dayEnd);
      if (ms > 0) {
        const key = dayKeyInAppTz(cursor);
        totals.set(key, (totals.get(key) ?? 0) + ms);
      }
      cursor = dayEnd;
    }
  }
  return totals;
}

export interface DailySleep {
  dayKey: string;
  totalSleepMs: number;
  napCount: number;
}

// Seria dzienna dla zakresu `[rangeStart, rangeEnd)` (rangeEnd ekskluzywny =
// poczatek dzisiaj; dzisiaj niepelne pomijamy). Dni bez snu = 0. `napCount` =
// liczba ZAKONCZONYCH drzemek zaczynajacych sie danego dnia.
export function dailySleepSeries(
  sessions: SleepSession[],
  rangeStart: Date,
  rangeEnd: Date,
): DailySleep[] {
  const totals = dailySleepTotalsMs(sessions);

  const napCounts = new Map<string, number>();
  for (const session of sessions) {
    if (session.type !== 'nap' || session.end_at === null) continue;
    const key = dayKeyInAppTz(new Date(session.start_at));
    napCounts.set(key, (napCounts.get(key) ?? 0) + 1);
  }

  const series: DailySleep[] = [];
  let cursor = startOfDayInAppTz(rangeStart);
  const endExclusive = startOfDayInAppTz(rangeEnd);
  while (cursor < endExclusive) {
    const key = dayKeyInAppTz(cursor);
    series.push({
      dayKey: key,
      totalSleepMs: totals.get(key) ?? 0,
      napCount: napCounts.get(key) ?? 0,
    });
    cursor = startOfDayInAppTz(addDays(cursor, 1));
  }
  return series;
}

export interface BedtimeRegularity {
  meanMinutes: number; // pora zasypiania jako minuty od polnocy (0..1439)
  stdDevMinutes: number; // odchylenie standardowe (populacyjne)
  count: number;
}

// Regularnosc pory zasypiania = odchylenie standardowe startow snu nocnego,
// liczone w przestrzeni zakotwiczonej na 18:00. null gdy brak snu nocnego.
export function bedtimeRegularityMinutes(sessions: SleepSession[]): BedtimeRegularity | null {
  const anchored: number[] = [];
  for (const session of sessions) {
    if (session.type !== 'night_sleep') continue;
    const startMin = minutesOfDayInAppTz(new Date(session.start_at));
    anchored.push((startMin - BEDTIME_ANCHOR_MIN + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  }
  if (anchored.length === 0) return null;

  const mean = anchored.reduce((sum, m) => sum + m, 0) / anchored.length;
  const variance = anchored.reduce((sum, m) => sum + (m - mean) ** 2, 0) / anchored.length;
  const stdDev = Math.sqrt(variance);
  const meanClock = (BEDTIME_ANCHOR_MIN + mean) % MINUTES_PER_DAY;

  return {
    meanMinutes: Math.round(meanClock),
    stdDevMinutes: Math.round(stdDev),
    count: anchored.length,
  };
}

export interface WakeRange {
  earliestMinutes: number;
  latestMinutes: number;
  count: number;
}

// Zakres porannych pobudek = min/max `end_at` snu nocnego (minuty od polnocy).
export function morningWakeRange(sessions: SleepSession[]): WakeRange | null {
  const mins: number[] = [];
  for (const session of sessions) {
    if (session.type !== 'night_sleep' || session.end_at === null) continue;
    mins.push(minutesOfDayInAppTz(new Date(session.end_at)));
  }
  if (mins.length === 0) return null;
  return {
    earliestMinutes: Math.min(...mins),
    latestMinutes: Math.max(...mins),
    count: mins.length,
  };
}

function daysWithData(series: DailySleep[]): DailySleep[] {
  return series.filter((day) => day.totalSleepMs > 0);
}

// Srednia suma snu (ms) po dniach z danymi. 0 gdy brak.
export function averageSleepMs(series: DailySleep[]): number {
  const withData = daysWithData(series);
  if (withData.length === 0) return 0;
  return withData.reduce((sum, day) => sum + day.totalSleepMs, 0) / withData.length;
}

// Srednia liczba drzemek po dniach z danymi. 0 gdy brak.
export function averageNapCount(series: DailySleep[]): number {
  const withData = daysWithData(series);
  if (withData.length === 0) return 0;
  return withData.reduce((sum, day) => sum + day.napCount, 0) / withData.length;
}

// Srednia suma snu (ms) z ostatnich `n` dni Z DANYMI (dla formy snu).
export function averageSleepMsLastDays(series: DailySleep[], n: number): number {
  const lastN = daysWithData(series).slice(-n);
  if (lastN.length === 0) return 0;
  return lastN.reduce((sum, day) => sum + day.totalSleepMs, 0) / lastN.length;
}

export type SleepForm = 'good' | 'ok' | 'poor';

// Jakosciowa forma snu na bazie sredniego snu (godziny) vs norma wiekowa:
//  good  — w pasmie [min, max]
//  ok    — lekko poza pasmem (do 15% ponizej min lub powyzej max)
//  poor  — daleko poza pasmem (lub brak danych)
export function sleepForm(
  avgHours: number,
  norm: { minHours: number; maxHours: number },
): SleepForm {
  if (avgHours <= 0) return 'poor';
  if (avgHours >= norm.minHours && avgHours <= norm.maxHours) return 'good';
  const okFloor = norm.minHours * (1 - FORM_OK_BAND);
  const okCeil = norm.maxHours * (1 + FORM_OK_BAND);
  if (avgHours >= okFloor && avgHours <= okCeil) return 'ok';
  return 'poor';
}

export interface TagCorrelation {
  slug: string;
  taggedDays: number;
  avgTaggedMs: number;
  avgUntaggedMs: number;
  deltaMs: number; // avgTagged - avgUntagged (ujemne = krocej w dni z tagiem)
}

// Korelacja tag -> sredni dzienny sen. Atrybucja na poziomie DNIA: dzien „ma
// tag X" jesli ktoras sesja zaczynajaca sie tego dnia ma X. Porownuje sredni
// dzienny sen (dni z danymi) w dni-z-X vs dni-bez-X. Zwraca tylko tagi z OBIEMA
// grupami (≥1 dzien z i bez), posortowane malejaco po |delta|.
export function tagSleepCorrelation(
  sessions: SleepSession[],
  rangeStart: Date,
  rangeEnd: Date,
): TagCorrelation[] {
  const series = dailySleepSeries(sessions, rangeStart, rangeEnd);
  const sleepByDay = new Map(
    series.filter((day) => day.totalSleepMs > 0).map((day) => [day.dayKey, day.totalSleepMs]),
  );

  const tagsByDay = new Map<string, Set<string>>();
  for (const session of sessions) {
    if (session.tags.length === 0) continue;
    const key = dayKeyInAppTz(new Date(session.start_at));
    if (!sleepByDay.has(key)) continue;
    const set = tagsByDay.get(key) ?? new Set<string>();
    for (const tag of session.tags) set.add(tag);
    tagsByDay.set(key, set);
  }

  const allTags = new Set<string>();
  for (const set of tagsByDay.values()) {
    for (const tag of set) allTags.add(tag);
  }

  const result: TagCorrelation[] = [];
  for (const slug of allTags) {
    const tagged: number[] = [];
    const untagged: number[] = [];
    for (const [day, ms] of sleepByDay) {
      if (tagsByDay.get(day)?.has(slug)) tagged.push(ms);
      else untagged.push(ms);
    }
    if (tagged.length === 0 || untagged.length === 0) continue;
    const avgTaggedMs = tagged.reduce((sum, ms) => sum + ms, 0) / tagged.length;
    const avgUntaggedMs = untagged.reduce((sum, ms) => sum + ms, 0) / untagged.length;
    result.push({
      slug,
      taggedDays: tagged.length,
      avgTaggedMs,
      avgUntaggedMs,
      deltaMs: avgTaggedMs - avgUntaggedMs,
    });
  }
  return result.sort((a, b) => Math.abs(b.deltaMs) - Math.abs(a.deltaMs));
}
