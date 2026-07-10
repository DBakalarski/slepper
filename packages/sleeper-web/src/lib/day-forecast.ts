import type { PlanEntry } from 'sleeper-machine';

import type { SleepSession } from '@/features/sessions/hooks';
import { durationWithinWindow } from '@/lib/sleep-aggregation';
import { getNormForChild, type SleepNorm } from '@/lib/sleep-norms';
import { endOfDayInAppTz, startOfDayInAppTz } from '@/lib/time';

// Prognoza bilansu snu na koniec doby (fakty + plan) vs norma wiekowa.
// Pure, bez I/O, bez Date.now() — `now` wchodzi argumentem.
//
// Fakty: suma sesji (w tym sesja w toku, `end_at === null` -> liczona do
// `now`) obciete do [startOfDayInAppTz(now), now]. Plan: suma `PlanEntry[]`
// obciete do (now, endOfDayInAppTz(now)] — wpis bez `plannedEnd` (typowo NIGHT
// w toku bez znanej pobudki) liczony do konca doby. Granica `now` jest wspolna
// dla obu okien, wiec z konstrukcji nie ma podwojnego liczenia (punkt `now` ma
// zerowa miare w obu przedzialach).

const MS_PER_HOUR = 60 * 60 * 1000;

export type DayForecastVerdict = 'below' | 'within' | 'above';

export interface DayForecast {
  actualMs: number;
  plannedMs: number;
  predictedTotalMs: number;
  norm: SleepNorm;
  verdict: DayForecastVerdict;
  deltaMs: number;
}

// Koniec sesji dla potrzeb faktow — sesja w toku (`end_at === null`) liczona
// od startu do `now`.
function factualSessionEnd(session: SleepSession, now: Date): Date {
  return session.end_at ? new Date(session.end_at) : now;
}

// Suma faktycznego snu (ms) obcieta do [startOfDayInAppTz(now), now].
function actualSleepMs(sessions: readonly SleepSession[], now: Date): number {
  const dayStart = startOfDayInAppTz(now);
  let total = 0;
  for (const session of sessions) {
    const start = new Date(session.start_at);
    const end = factualSessionEnd(session, now);
    total += durationWithinWindow(start, end, dayStart, now);
  }
  return total;
}

// Suma planowanego snu (ms) obcieta do (now, endOfDayInAppTz(now)]. Wpis bez
// `plannedEnd` (typowo NIGHT w toku bez znanej pobudki) liczony do konca doby.
function plannedSleepMs(plan: readonly PlanEntry[], now: Date): number {
  const dayEnd = endOfDayInAppTz(now);
  let total = 0;
  for (const entry of plan) {
    const end = entry.plannedEnd ?? dayEnd;
    total += durationWithinWindow(entry.plannedStart, end, now, dayEnd);
  }
  return total;
}

// Klasyfikacja prognozy wzgledem przedzialu normy [minHours, maxHours].
// Wewnatrz przedzialu -> 'within', deltaMs 0. Poza -> delta do najblizszej
// krawedzi przedzialu.
function classifyVerdict(
  predictedTotalMs: number,
  norm: SleepNorm,
): { verdict: DayForecastVerdict; deltaMs: number } {
  const minMs = norm.minHours * MS_PER_HOUR;
  const maxMs = norm.maxHours * MS_PER_HOUR;
  if (predictedTotalMs < minMs) return { verdict: 'below', deltaMs: minMs - predictedTotalMs };
  if (predictedTotalMs > maxMs) return { verdict: 'above', deltaMs: predictedTotalMs - maxMs };
  return { verdict: 'within', deltaMs: 0 };
}

// Prognoza bilansu snu na koniec biezacej doby (app tz) dla dziecka.
export function computeDayForecast(
  sessions: readonly SleepSession[],
  plan: readonly PlanEntry[],
  now: Date,
  birthDate: Date,
): DayForecast {
  const actualMs = actualSleepMs(sessions, now);
  const plannedMs = plannedSleepMs(plan, now);
  const predictedTotalMs = actualMs + plannedMs;
  const norm = getNormForChild(birthDate, now);
  const { verdict, deltaMs } = classifyVerdict(predictedTotalMs, norm);
  return { actualMs, plannedMs, predictedTotalMs, norm, verdict, deltaMs };
}
