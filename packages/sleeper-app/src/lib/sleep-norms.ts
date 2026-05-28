// Tabela referencyjna normy snu na dobe (24h) wg wieku dziecka.
//
// Zrodlo: WHO + AAP hybrid (decyzja Fazy 0 ui-redesign, zatwierdzona 2026-05-28):
// - 0-3m:  14-17h (AAP "newborn")
// - 4-12m: 12-16h (AAP "infant")
// - 1-2y:  11-14h (AAP "toddler")
// - 3-5y:  10-13h (AAP "preschool")
//
// Granice wiekowe w pelnych miesiacach od daty urodzenia. 1 miesiac = 30 dni
// (jak w `lib/time.ts > targetWakeWindowMinutes`) — wystarczajaca precyzja
// dla rekomendacji snu, nie potrzebujemy kalendarzowej dokladnosci.

const MS_PER_SECOND = 1000;
const SEC_PER_MINUTE = 60;
const MIN_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const MS_PER_MONTH =
  MS_PER_SECOND * SEC_PER_MINUTE * MIN_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH;

export interface SleepNorm {
  minHours: number;
  maxHours: number;
  // Etykieta UI w polskim — np. "13-15g/dobe" (lub uzyc minHours/maxHours bezposrednio).
  label: string;
  // Bucket name dla debugowania / testow — nie do wyswietlania.
  bucket: 'newborn' | 'infant' | 'toddler' | 'preschool' | 'school';
}

interface NormBucket {
  // Max wiek w miesiacach dla tego bucketu (exclusive). null = open-ended.
  maxMonthsExclusive: number | null;
  norm: Omit<SleepNorm, 'label'>;
}

const NORM_BUCKETS: NormBucket[] = [
  {
    maxMonthsExclusive: 4,
    norm: { minHours: 14, maxHours: 17, bucket: 'newborn' },
  },
  {
    maxMonthsExclusive: 13,
    norm: { minHours: 12, maxHours: 16, bucket: 'infant' },
  },
  {
    maxMonthsExclusive: 36,
    norm: { minHours: 11, maxHours: 14, bucket: 'toddler' },
  },
  {
    maxMonthsExclusive: 72,
    norm: { minHours: 10, maxHours: 13, bucket: 'preschool' },
  },
  // Fallback dla dzieci 6+ lat — AAP "school" 9-12h. Out-of-scope dla MVP
  // (dziecko aplikacji ma <3 lata), ale zapewniamy domknieta funkcje.
  {
    maxMonthsExclusive: null,
    norm: { minHours: 9, maxHours: 12, bucket: 'school' },
  },
];

function ageInMonths(birthDate: Date, now: Date): number {
  const ageMs = now.getTime() - birthDate.getTime();
  return ageMs / MS_PER_MONTH;
}

function formatLabel(min: number, max: number): string {
  return `${min}-${max}g/dobe`;
}

// Zwraca norme snu (min/max godziny na dobe + label) dla dziecka o dacie
// urodzenia `birthDate` w chwili `now`. `now` opcjonalny (default = teraz).
//
// Funkcja jest pure — daje sie testowac bez mockow przez przekazanie
// kontrolowanego `now`.
export function getNormForChild(birthDate: Date, now: Date = new Date()): SleepNorm {
  const months = ageInMonths(birthDate, now);
  for (const bucket of NORM_BUCKETS) {
    if (bucket.maxMonthsExclusive === null || months < bucket.maxMonthsExclusive) {
      return {
        ...bucket.norm,
        label: formatLabel(bucket.norm.minHours, bucket.norm.maxHours),
      };
    }
  }
  // Unreachable — ostatni bucket ma maxMonthsExclusive=null. TS exhaustiveness.
  const fallback = NORM_BUCKETS[NORM_BUCKETS.length - 1].norm;
  return { ...fallback, label: formatLabel(fallback.minHours, fallback.maxHours) };
}
