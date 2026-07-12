import type { PlanEntry } from 'sleeper-machine';

import type { SleepSession } from '@/features/sessions/hooks';

import { toLibType } from './adapter';

/**
 * Syntetyzuje "ogon" sesji w toku jako `PlanEntry { plannedStart: now,
 * plannedEnd: activeSessionPredictedEnd, type }` (finding C2, review finalne
 * feat/plan-dnia-os-24h).
 *
 * `remainingNapsToday` (silnik) zwraca WYŁĄCZNIE przyszłe sloty — podczas
 * sesji w toku jej przewidywany "ogon" (now → przewidywany koniec/pobudka)
 * nie jest ani faktem (fakty kończą się na `now`), ani częścią łańcucha. Bez
 * tego wpisu prognoza (`computeDayForecast`) i oś (`DayTimeline`) miały
 * dziurę/skok bilansu przy starcie sesji i przy nocy w toku.
 *
 * Pure: brak I/O, brak `Date.now()` — `now` i `activeSessionPredictedEnd`
 * wchodzą argumentem. Clamp do doby dzieje się niżej w konsumentach
 * (`day-forecast.plannedSleepMs`, `day-timeline-segments.buildPlanSegments`)
 * — ten moduł tylko syntetyzuje surowy wpis.
 *
 * Zwraca `null` gdy brak sesji w toku lub silnik nie zwrócił przewidywanego
 * końca (Galland — pole zawsze `undefined`; brak activeSession w Kotki Dwa —
 * `null`).
 */
export function buildActiveSessionTailEntry(
  sessions: readonly SleepSession[],
  activeSessionPredictedEnd: Date | null | undefined,
  now: Date,
): PlanEntry | null {
  if (!activeSessionPredictedEnd) return null;
  const active = sessions.find((s) => s.end_at === null);
  if (!active) return null;
  return {
    plannedStart: now,
    plannedEnd: activeSessionPredictedEnd,
    type: toLibType(active.type),
  };
}

/**
 * `plan` (`remainingNapsToday`) z dołączonym ogonem sesji w toku na
 * początku (chronologicznie pierwszy) — pojedyncze źródło prawdy dla
 * konsumentów (`computeDayForecast`, `DayTimeline`), żeby oba widziały ten
 * sam rozszerzony plan.
 */
export function withActiveSessionTail(
  plan: readonly PlanEntry[],
  sessions: readonly SleepSession[],
  activeSessionPredictedEnd: Date | null | undefined,
  now: Date,
): readonly PlanEntry[] {
  const tail = buildActiveSessionTailEntry(sessions, activeSessionPredictedEnd, now);
  return tail ? [tail, ...plan] : plan;
}
