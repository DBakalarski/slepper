import type { PlanEntry } from 'sleeper-machine';
import type { AgeBucket } from './lookup.js';

const MS_PER_HOUR = 3_600_000;

/**
 * Forward pass — czysta funkcja generująca harmonogram dnia.
 *
 * Algorytm:
 * 1. Startuje od morningWake (pobudka rano).
 * 2. Dla każdej drzemki: plannedStart = lastWake + wakeWindowsHours[i], plannedEnd = plannedStart + napLengthHours.
 * 3. Ostatni entry to NIGHT: plannedStart = lastWakeAfterLastNap + wakeWindowsHours[last].
 *
 * @param morningWake - Data i czas pobudki rannej (pure Date, bez new Date() w src/)
 * @param bucket - AgeBucket z wartościami lookup table
 * @param napLengthHours - Długość każdej drzemki w godzinach (np. maxTotalDayNapHours / typicalNaps)
 * @returns PlanEntry[] zawierający NAP × typicalNaps + 1 × NIGHT
 */
export function forwardPass(
  morningWake: Date,
  bucket: AgeBucket,
  napLengthHours: number,
): PlanEntry[] {
  const plan: PlanEntry[] = [];
  let lastWakeMs = morningWake.getTime();

  for (let i = 0; i < bucket.typicalNaps; i++) {
    const ww = bucket.wakeWindowsHours[i] ?? bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
    const napStart = new Date(lastWakeMs + ww * MS_PER_HOUR);
    const napEnd = new Date(napStart.getTime() + napLengthHours * MS_PER_HOUR);
    plan.push({ plannedStart: napStart, plannedEnd: napEnd, type: 'NAP' });
    lastWakeMs = napEnd.getTime();
  }

  // NIGHT entry: lastWake + ostatnie okno aktywności
  const nightWw = bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
  const nightStart = new Date(lastWakeMs + nightWw * MS_PER_HOUR);
  plan.push({ plannedStart: nightStart, type: 'NIGHT' });

  return plan;
}
