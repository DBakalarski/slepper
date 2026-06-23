import type { PlanEntry } from 'sleeper-machine';
import type { AgeBucket } from './lookup.js';

const MS_PER_HOUR = 3_600_000;

/**
 * Forward pass — czysta funkcja generująca harmonogram dnia.
 *
 * Algorytm:
 * 1. Startuje od morningWake (pobudka rano).
 * 2. Dla każdej drzemki: plannedStart = lastWake + wakeWindowsHours[i], plannedEnd = plannedStart + napLengths[i].
 * 3. Ostatni entry to NIGHT: plannedStart = lastWakeAfterLastNap + wakeWindowsHours[last].
 *
 * Drzemki mogą mieć różne długości (przewodnik: na 3 drzemkach ostatnia celowo
 * ~30 min). `napLengths[i]` to długość i-tej drzemki w godzinach; gdy indeks
 * wykracza poza tablicę, używana jest ostatnia wartość (fallback 0).
 *
 * @param morningWake - Data i czas pobudki rannej (pure Date, bez new Date() w src/)
 * @param bucket - AgeBucket z wartościami lookup table
 * @param napLengths - Długości kolejnych drzemek w godzinach (długość = typicalNaps)
 * @returns PlanEntry[] zawierający NAP × typicalNaps + 1 × NIGHT
 */
export function forwardPass(
  morningWake: Date,
  bucket: AgeBucket,
  napLengths: readonly number[],
): PlanEntry[] {
  const plan: PlanEntry[] = [];
  let lastWakeMs = morningWake.getTime();

  for (let i = 0; i < bucket.typicalNaps; i++) {
    const ww = bucket.wakeWindowsHours[i] ?? bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
    const napLenHours = napLengths[i] ?? napLengths[napLengths.length - 1] ?? 0;
    const napStart = new Date(lastWakeMs + ww * MS_PER_HOUR);
    const napEnd = new Date(napStart.getTime() + napLenHours * MS_PER_HOUR);
    plan.push({ plannedStart: napStart, plannedEnd: napEnd, type: 'NAP' });
    lastWakeMs = napEnd.getTime();
  }

  // NIGHT entry: lastWake + ostatnie okno aktywności
  const nightWw = bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
  const nightStart = new Date(lastWakeMs + nightWw * MS_PER_HOUR);
  plan.push({ plannedStart: nightStart, type: 'NIGHT' });

  return plan;
}
