/**
 * Lookup table — dane ze źródła Kotki Dwa (tabela "Zapotrzebowanie na sen").
 *
 * Jednostki: wszystkie wartości godzinowe są w Hours (liczby dziesiętne).
 * 0.25 = 15 min, 0.5 = 30 min, 0.75 = 45 min.
 *
 * wakeWindowsHours: tablica długości (typicalNaps + 1).
 *   wakeWindowsHours[0] = WW przed drzemką 1 (od pobudki rano)
 *   wakeWindowsHours[1] = WW przed drzemką 2 (jeśli 2+ drzemek)
 *   wakeWindowsHours[n] = WW przed snem nocnym (ostatni element)
 */

export type AgeBucket = {
  readonly id: string;
  readonly minMonths: number;
  readonly maxMonths: number;
  readonly typicalNaps: number;
  // Długość = typicalNaps + 1 (ostatni element = WW przed nocą)
  readonly wakeWindowsHours: readonly number[];
  // Maksymalny czas jednej drzemki (h)
  readonly maxNapHours: number;
  // Maksymalny łączny czas drzemek w ciągu dnia (h)
  readonly maxTotalDayNapHours: number;
  // Zalecana długość nocy [min, max] w h
  readonly nightHoursRange: readonly [number, number];
};

/**
 * Buckets posortowane rosnąco po minMonths.
 * Dla wieku 6m i 12m istnieją dwa warianty (3/2 drzemki) — wybór przez pickBucket().
 */
export const BUCKETS: readonly AgeBucket[] = [
  {
    id: '5m',
    minMonths: 5,
    maxMonths: 5,
    typicalNaps: 3,
    wakeWindowsHours: [1.75, 2.0, 2.25, 2.25],
    maxNapHours: 2,
    maxTotalDayNapHours: 4,
    nightHoursRange: [11, 12],
  },
  {
    id: '6m-3naps',
    minMonths: 6,
    maxMonths: 6,
    typicalNaps: 3,
    wakeWindowsHours: [2.0, 2.5, 2.5, 2.5],
    maxNapHours: 2,
    maxTotalDayNapHours: 3.5,
    nightHoursRange: [11, 12],
  },
  {
    id: '6m-2naps',
    minMonths: 6,
    maxMonths: 6,
    typicalNaps: 2,
    wakeWindowsHours: [2.5, 2.5, 2.5],
    maxNapHours: 2,
    maxTotalDayNapHours: 3.5,
    nightHoursRange: [11, 12],
  },
  {
    id: '7m',
    minMonths: 7,
    maxMonths: 7,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 3.0, 3.0],
    maxNapHours: 2,
    maxTotalDayNapHours: 4,
    nightHoursRange: [11, 12],
  },
  {
    id: '8m',
    minMonths: 8,
    maxMonths: 8,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 3.0, 3.25],
    maxNapHours: 2,
    maxTotalDayNapHours: 3.75,
    nightHoursRange: [11, 12],
  },
  {
    id: '9m',
    minMonths: 9,
    maxMonths: 9,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 3.0, 3.5],
    maxNapHours: 2,
    maxTotalDayNapHours: 3.5,
    nightHoursRange: [11, 12],
  },
  {
    id: '10m',
    minMonths: 10,
    maxMonths: 10,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 3.5, 3.5],
    maxNapHours: 2,
    maxTotalDayNapHours: 3,
    nightHoursRange: [10, 12],
  },
  {
    id: '11m',
    minMonths: 11,
    maxMonths: 11,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 3.5, 4.0],
    maxNapHours: 1,
    maxTotalDayNapHours: 2.5,
    nightHoursRange: [10, 12],
  },
  {
    id: '12m-2naps',
    minMonths: 12,
    maxMonths: 13,
    typicalNaps: 2,
    wakeWindowsHours: [3.0, 4.0, 4.0],
    maxNapHours: 1,
    maxTotalDayNapHours: 2,
    nightHoursRange: [10, 12],
  },
  {
    id: '12m-1nap',
    minMonths: 12,
    maxMonths: 17,
    typicalNaps: 1,
    wakeWindowsHours: [5.0, 5.5],
    maxNapHours: 3,
    maxTotalDayNapHours: 2.5,
    nightHoursRange: [10, 12],
  },
  {
    id: '18m+',
    minMonths: 18,
    maxMonths: 36,
    typicalNaps: 1,
    wakeWindowsHours: [6.0, 5.5],
    maxNapHours: 2,
    maxTotalDayNapHours: 1.75,
    nightHoursRange: [10, 12],
  },
] as const;

/**
 * Wybiera bucket na podstawie wieku i opcjonalnego override liczby drzemek.
 *
 * Logika:
 * 1. Jeśli preferredNaps podane, szukaj bucketa dla danego wieku z matching typicalNaps.
 * 2. Jeśli brak pasującego lub preferredNaps === null, wybierz domyślny bucket (najniższy typicalNaps dla wieku ≥7m, 3 drzemki dla 5-6m bez override).
 *
 * Dla wieku poza zakresem (< 5m lub > 36m) zwraca najbliższy bucket.
 */
export function pickBucket(ageMonths: number, preferredNaps: number | null): AgeBucket {
  const clampedAge = Math.max(5, Math.min(36, Math.floor(ageMonths)));

  // Znajdź kandydatów dla danego wieku
  const candidates = BUCKETS.filter(
    (b) => clampedAge >= b.minMonths && clampedAge <= b.maxMonths,
  );

  if (candidates.length === 0) {
    // Fallback: najbliższy bucket
    const sorted = [...BUCKETS].sort(
      (a, b) => Math.abs(a.minMonths - clampedAge) - Math.abs(b.minMonths - clampedAge),
    );
    return sorted[0] ?? BUCKETS[BUCKETS.length - 1]!;
  }

  // Jeśli preferredNaps podane, szukaj bucketa z typicalNaps === preferredNaps
  if (preferredNaps !== null) {
    const match = candidates.find((b) => b.typicalNaps === preferredNaps);
    if (match !== undefined) return match;
  }

  // Domyślnie:
  // - <7m → więcej drzemek (5m=3, 6m=3)
  // - 7-13m → mniej drzemek (typically 2), ale preferuj ≥2 przed 1
  // - 14-17m → 1 drzemka (12m-1nap bucket)
  // - 18m+ → 1 drzemka
  if (clampedAge < 7) {
    // Preferuj więcej drzemek dla 5-6m
    return candidates.sort((a, b) => b.typicalNaps - a.typicalNaps)[0]!;
  }
  if (clampedAge <= 13) {
    // Dla 7-13m: preferuj 2 drzemki nad 1
    const twoNaps = candidates.find((b) => b.typicalNaps === 2);
    if (twoNaps !== undefined) return twoNaps;
  }
  // Dla 14m+ preferuj mniej drzemek (1 drzemka)
  return candidates.sort((a, b) => a.typicalNaps - b.typicalNaps)[0]!;
}
