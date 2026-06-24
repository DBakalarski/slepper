import { makeMinutes } from 'sleeper-machine';
import type {
  ChildProfile,
  Minutes,
  PlanEntry,
  Recommendation,
  State,
  TimeOfDay,
} from 'sleeper-machine';
import { pickBucket, type AgeBucket } from './lookup.js';
import { forwardPass } from './forwardPass.js';

const MS_PER_DAY = 86_400_000;
const MS_PER_MIN = 60_000;

// Przewodnik: na 3+ drzemkach ostatnia drzemka celowo jest krótka (~30 min)
// — "Jak ustalić harmonogram dnia": "Wyjątkiem jest dziecko na 3 drzemkach,
// gdzie ostatnia drzemka celowo ma być max. 30min".
const LAST_NAP_HOURS_3PLUS = 0.5;

/**
 * Długości kolejnych drzemek (h) dla danego bucketa.
 * - Plany 3+ drzemkowe: ostatnia drzemka = 0.5h, wcześniejsze dzielą resztę
 *   dziennego limitu po równo (capped maxNapHours).
 * - Plany 1-2 drzemkowe: równy podział dziennego limitu (capped maxNapHours).
 */
function computeNapLengths(bucket: AgeBucket): number[] {
  const n = bucket.typicalNaps;
  if (n <= 0) return [];
  if (n >= 3) {
    const earlier = Math.min(
      bucket.maxNapHours,
      Math.max(0, bucket.maxTotalDayNapHours - LAST_NAP_HOURS_3PLUS) / (n - 1),
    );
    return [...Array<number>(n - 1).fill(earlier), LAST_NAP_HOURS_3PLUS];
  }
  const equal = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / n);
  return Array<number>(n).fill(equal);
}

function validateInput(state: State, profile: ChildProfile): void {
  if (!(state.now instanceof Date) || Number.isNaN(state.now.getTime())) {
    throw new Error('recommendKotkiDwa: state.now must be a valid Date');
  }
  if (!(profile.dateOfBirth instanceof Date) || Number.isNaN(profile.dateOfBirth.getTime())) {
    throw new Error('recommendKotkiDwa: profile.dateOfBirth must be a valid Date');
  }
  if (profile.targetWakeTime !== undefined) {
    const { hour, minute } = profile.targetWakeTime;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(
        `recommendKotkiDwa: invalid targetWakeTime (${hour}:${minute})`,
      );
    }
  }
  if (profile.preferredNapsCount !== undefined) {
    const n = profile.preferredNapsCount;
    if (!Number.isInteger(n) || n < 0 || n > 5) {
      throw new Error(
        `recommendKotkiDwa: preferredNapsCount must be integer 0-5 (got ${n})`,
      );
    }
  }
  if (profile.preferredBedtime !== undefined) {
    const { hour, minute } = profile.preferredBedtime;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(
        `recommendKotkiDwa: invalid preferredBedtime (${hour}:${minute})`,
      );
    }
  }
  for (const s of state.history) {
    if (s.end.getTime() <= s.start.getTime()) {
      throw new Error(
        `recommendKotkiDwa: SleepSession end (${s.end.toISOString()}) must be after start (${s.start.toISOString()})`,
      );
    }
  }
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function napsDoneToday(history: State['history'], now: Date): State['history'][number][] {
  return history.filter(
    (s) => s.type === 'NAP' && sameCalendarDay(s.start, now) && s.end.getTime() <= now.getTime(),
  );
}

function buildMorningWake(now: Date, wakeTime: TimeOfDay): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    wakeTime.hour,
    wakeTime.minute,
    0,
    0,
  );
}

/**
 * Realna pobudka poranna = koniec snu nocnego, który zakończył się dziś rano.
 * To jest właściwa kotwica okna aktywności — dziecko wstaje, gdy faktycznie
 * skończyło spać, nie o docelowej godzinie. targetWakeTime to tylko fallback,
 * gdy brak takiej sesji (np. świeże dziecko, dzień bez zalogowanego snu nocnego).
 *
 * Zwraca najpóźniejszy koniec sesji NIGHT, który wypada w kalendarzowym dniu
 * `now` i nie jest w przyszłości. null gdy brak.
 */
function findRealMorningWake(history: State['history'], now: Date): Date | null {
  let latest: Date | null = null;
  for (const s of history) {
    if (
      s.type === 'NIGHT' &&
      sameCalendarDay(s.end, now) &&
      s.end.getTime() <= now.getTime() &&
      (latest === null || s.end.getTime() > latest.getTime())
    ) {
      latest = s.end;
    }
  }
  return latest;
}

export function recommendKotkiDwa(state: State, profile: ChildProfile): Recommendation {
  validateInput(state, profile);

  const wakeTime: TimeOfDay = profile.targetWakeTime ?? { hour: 7, minute: 0 };

  // Wiek w miesiącach (przybliżony przez 30.4 dni/miesiąc)
  const ageMonths = Math.floor(
    (state.now.getTime() - profile.dateOfBirth.getTime()) / (30.4 * MS_PER_DAY),
  );

  const bucket = pickBucket(ageMonths, profile.preferredNapsCount ?? null);

  // Kotwica okna aktywności: realny koniec snu nocnego z dziś rano ma priorytet
  // nad targetWakeTime/default. Dziecko, które wstało o 05:45, ma liczone okno od
  // 05:45, nie od docelowych 07:00. Fallback na targetWakeTime gdy brak sesji.
  const morningWake = findRealMorningWake(state.history, state.now) ?? buildMorningWake(state.now, wakeTime);

  // Długości kolejnych drzemek (3+ drzemek → ostatnia ~30 min, patrz przewodnik).
  const napLengths = computeNapLengths(bucket);

  let plan: PlanEntry[] = forwardPass(morningWake, bucket, napLengths);

  // Override preferredBedtime → nadpisz ostatni NIGHT entry
  let bedtimeOverride: Date | null = null;
  if (profile.preferredBedtime !== undefined) {
    const { hour, minute } = profile.preferredBedtime;
    bedtimeOverride = new Date(
      state.now.getFullYear(),
      state.now.getMonth(),
      state.now.getDate(),
      hour,
      minute,
      0,
      0,
    );
    const idx = plan.length - 1;
    const last = plan[idx];
    if (last !== undefined && last.type === 'NIGHT') {
      const replaced: PlanEntry =
        last.plannedEnd !== undefined
          ? { plannedStart: bedtimeOverride, plannedEnd: last.plannedEnd, type: 'NIGHT' }
          : { plannedStart: bedtimeOverride, type: 'NIGHT' };
      const mutable = [...plan];
      mutable[idx] = replaced;
      plan = mutable;
    }
  }

  // Krok 8 — currentWakeWindowDuration + nextSleepAt + remainingNapsToday
  const napsDone = napsDoneToday(state.history, state.now);
  const i = Math.min(napsDone.length, bucket.wakeWindowsHours.length - 1);
  const currentWwHours = bucket.wakeWindowsHours[i] ?? bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
  const currentWakeWindowDuration = makeMinutes(currentWwHours * 60);

  // lastWake = morningWake lub koniec ostatniej drzemki dziś
  let lastWakeMs = morningWake.getTime();
  for (const nap of napsDone) {
    if (nap.end.getTime() > lastWakeMs) {
      lastWakeMs = nap.end.getTime();
    }
  }

  let nextSleepAt: Date | null = new Date(lastWakeMs + currentWakeWindowDuration * MS_PER_MIN);

  // Gdy bedtimeOverride i wszystkie drzemki zrobione — nextSleepAt = bedtime
  if (bedtimeOverride !== null && napsDone.length >= bucket.typicalNaps) {
    nextSleepAt = bedtimeOverride;
  }

  const remainingNapsToday = plan.filter(
    (e) => e.plannedStart.getTime() > state.now.getTime(),
  );

  // Przesunięcie najbliższego snu względem idealnego planu.
  // Idealny czas dla tego samego slotu = plan[napsDone.length] (forwardPass liczy
  // plan od morningWake + stałych długości drzemek). nextSleepAt jest kotwiczony
  // na REALNYM końcu ostatniej drzemki, więc krótsza drzemka → wcześniej → dodatnie.
  // Znak: dodatnie = wcześniej niż plan, ujemne = później. null gdy slot poza planem.
  const idealNextStart = plan[napsDone.length]?.plannedStart;
  const nextSleepShiftMinutes =
    nextSleepAt !== null && idealNextStart !== undefined
      ? Math.round((idealNextStart.getTime() - nextSleepAt.getTime()) / MS_PER_MIN)
      : null;

  // Warnings
  const warnings: string[] = [];
  const elapsedMin = (state.now.getTime() - lastWakeMs) / MS_PER_MIN;
  if (currentWakeWindowDuration > 0 && elapsedMin > 1.2 * currentWakeWindowDuration) {
    warnings.push('ryzyko przemęczenia');
  }

  // Sprawdź czy preferredBedtime powoduje za krótką lub za długą noc
  if (profile.preferredBedtime !== undefined && profile.targetWakeTime !== undefined) {
    const bedMin = profile.preferredBedtime.hour * 60 + profile.preferredBedtime.minute;
    const wakeMin = profile.targetWakeTime.hour * 60 + profile.targetWakeTime.minute;
    const nightMin = wakeMin > bedMin ? wakeMin - bedMin : wakeMin + 24 * 60 - bedMin;
    const nightH = nightMin / 60;
    const [nightMin_, nightMax_] = bucket.nightHoursRange;
    if (nightH < (nightMin_ ?? 10) - 0.5 || nightH > (nightMax_ ?? 12) + 0.5) {
      warnings.push(
        `preferowana godzina nocnego snu daje niezdrową długość nocy (${nightH.toFixed(1)}h) względem targetWakeTime`,
      );
    }
  }

  return {
    nextSleepAt,
    currentWakeWindowDuration,
    remainingNapsToday,
    nextSleepShiftMinutes,
    confidence: 'high',
    warnings,
  };
}

// Eksportuj pomocniczo — używane w testach do debugowania czasów planu
export function _buildMorningWakeForTest(now: Date, wakeTime: TimeOfDay): Date {
  return buildMorningWake(now, wakeTime);
}

// Eksportuj ageMonths helper dla testów
export function _computeAgeMonths(now: Date, dateOfBirth: Date): number {
  return Math.floor(
    (now.getTime() - dateOfBirth.getTime()) / (30.4 * MS_PER_DAY),
  );
}
