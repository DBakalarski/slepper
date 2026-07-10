import type { PlanEntry } from 'sleeper-machine';
import type { AgeBucket } from './lookup.js';

const MS_PER_HOUR = 3_600_000;

/**
 * Forward pass — czysta funkcja generująca harmonogram dnia (lub jego resztę).
 *
 * Algorytm:
 * 1. Startuje od `anchor` (domyślnie pobudka rano, indeks 0).
 * 2. Dla każdej drzemki od `startIndex`: plannedStart = lastWake + wakeWindowsHours[i], plannedEnd = plannedStart + napLengths[i].
 * 3. Ostatni entry to NIGHT: plannedStart = lastWakeAfterLastNap + wakeWindowsHours[last].
 *
 * Drzemki mogą mieć różne długości (przewodnik: na 3 drzemkach ostatnia celowo
 * ~30 min). `napLengths[i]` to długość i-tej drzemki w godzinach; gdy indeks
 * wykracza poza tablicę, używana jest ostatnia wartość (fallback 0).
 *
 * `startIndex` (domyślnie 0) pozwala re-kotwiczyć łańcuch od dowolnego slotu —
 * używane przez `chain.ts` do przeliczenia PLANU pozostałych drzemek od realnej
 * kotwicy (np. koniec ostatniej drzemki), a nie zawsze od morningWake. Gdy
 * `startIndex >= bucket.typicalNaps`, plan zawiera wyłącznie wpis NIGHT (bez
 * "drzemki widmo").
 *
 * @param anchor - Punkt startowy łańcucha: pobudka rano (startIndex=0) lub
 *   dowolna re-kotwiczona kotwica (startIndex>0) — pure Date, bez new Date() w src/
 * @param bucket - AgeBucket z wartościami lookup table
 * @param napLengths - Długości kolejnych drzemek w godzinach (długość = typicalNaps)
 * @param startIndex - Indeks pierwszej drzemki do wygenerowania (domyślnie 0)
 * @returns PlanEntry[] zawierający NAP × (typicalNaps - startIndex) + 1 × NIGHT
 */
export function forwardPass(
  anchor: Date,
  bucket: AgeBucket,
  napLengths: readonly number[],
  startIndex = 0,
): PlanEntry[] {
  const plan: PlanEntry[] = [];
  let lastWakeMs = anchor.getTime();

  for (let i = startIndex; i < bucket.typicalNaps; i++) {
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
