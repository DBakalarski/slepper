import { getBaseline } from './baseline.js';
import {
  observedTotalSleepPerDay,
  observedNapsPerDay,
  observedLongestSleepPerDay,
  observedMorningWake,
} from './history.js';
import { adapt, computeConfidence } from './adaptation.js';
import { decideNapsToday } from './napCount.js';
import { deriveWakeWindows } from './wakeWindows.js';
import {
  resolveMorningWake,
  forwardPass,
  alignToTargetWake,
} from './planner.js';
import { mean } from './math/statistics.js';
import { Hours, Minutes } from './types.js';
import type {
  ChildProfile,
  DateTime,
  PlanEntry,
  Recommendation,
  SleepSession,
  State,
} from './types.js';

const MS_PER_DAY = 86_400_000;
const MS_PER_MIN = 60_000;

function validateInput(state: State, profile: ChildProfile): void {
  if (!(state.now instanceof Date) || Number.isNaN(state.now.getTime())) {
    throw new Error('recommend: state.now must be a valid Date');
  }
  if (!(profile.dateOfBirth instanceof Date) || Number.isNaN(profile.dateOfBirth.getTime())) {
    throw new Error('recommend: profile.dateOfBirth must be a valid Date');
  }
  if (profile.targetWakeTime) {
    const { hour, minute } = profile.targetWakeTime;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(
        `recommend: invalid targetWakeTime (${hour}:${minute})`,
      );
    }
  }
  if (profile.preferredNapsCount !== undefined) {
    const n = profile.preferredNapsCount;
    if (!Number.isInteger(n) || n < 0 || n > 5) {
      throw new Error(
        `recommend: preferredNapsCount must be integer 0-5 (got ${n})`,
      );
    }
  }
  if (profile.preferredBedtime) {
    const { hour, minute } = profile.preferredBedtime;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(
        `recommend: invalid preferredBedtime (${hour}:${minute})`,
      );
    }
  }
  for (const s of state.history) {
    if (s.end.getTime() <= s.start.getTime()) {
      throw new Error(
        `recommend: SleepSession end (${s.end.toISOString()}) must be after start (${s.start.toISOString()})`,
      );
    }
  }
}

function sleepDayIdToDaysAgo(id: string, now: DateTime): number {
  // sleepDayId is "YYYY-MM-DD" representing the boundary date (dayStartHour=04:00 local).
  const parts = id.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const boundary = new Date(y, m, d, 4, 0, 0, 0);
  const diffMs = now.getTime() - boundary.getTime();
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
}

function sameCalendarDay(a: DateTime, b: DateTime): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function napsDoneToday(
  history: readonly SleepSession[],
  now: DateTime,
): SleepSession[] {
  return history.filter(
    (s) => s.type === 'NAP' && sameCalendarDay(s.start, now) && s.end.getTime() <= now.getTime(),
  );
}

function lastWakeMs(
  morningWake: DateTime,
  napsDone: readonly SleepSession[],
): number {
  let last = morningWake.getTime();
  for (const n of napsDone) {
    if (n.end.getTime() > last) last = n.end.getTime();
  }
  return last;
}

export function recommend(state: State, profile: ChildProfile): Recommendation {
  validateInput(state, profile);

  const baseline = getBaseline(profile, state.now);

  const totalsByDay = observedTotalSleepPerDay(state.history, state.now);
  const napsByDay = observedNapsPerDay(state.history, state.now);
  const longestByDay = observedLongestSleepPerDay(state.history, state.now);
  const morningsArr = observedMorningWake(state.history, state.now);

  const dayIds = [...totalsByDay.keys()].sort();
  const daysAgo = dayIds.map((id) => sleepDayIdToDaysAgo(id, state.now));
  const totals = dayIds.map((id) => totalsByDay.get(id)!);
  const napsObs = dayIds.map((id) => napsByDay.get(id) ?? 0);
  const longests = dayIds.map((id) => longestByDay.get(id) ?? 0);

  const adaptedTotal = adapt(baseline.totalSleep, totals, daysAgo);
  const adaptedNaps = adapt(baseline.naps, napsObs, daysAgo);
  const adaptedLongest = adapt(baseline.longestSleep, longests, daysAgo);

  const n = dayIds.length;
  const confidence = computeConfidence(n);

  const last7Naps = napsObs.slice(-7);
  const napDecision = decideNapsToday(adaptedNaps, baseline.naps, last7Naps);
  // Twardy override: gdy user wpisal preferowana liczbe drzemek, ignorujemy
  // baseline + adaptacje. wakeWindows ponizej rzeczywiscie respektuje napsToday,
  // wiec okna proporcjonalnie sie skaluja.
  const napsToday =
    profile.preferredNapsCount !== undefined ? profile.preferredNapsCount : napDecision.naps;

  const ageMonthsNum = baseline.ageMonths;
  const wakeWindows = deriveWakeWindows({
    totalSleep: Hours(adaptedTotal),
    longestSleep: Hours(adaptedLongest),
    napsToday,
    ageMonths: ageMonthsNum,
  });

  // Night vs nap-sleep partition (PLAN.md Krok 5): <6mo uses 0.5×total, ≥6mo uses longestSleep.
  const nightHours = ageMonthsNum < 6 ? adaptedTotal * 0.5 : adaptedLongest;
  const napSleepHours = Math.max(0, adaptedTotal - nightHours);
  const avgNapMin = napsToday > 0 ? (napSleepHours * 60) / napsToday : 0;
  const napLengths: Minutes[] = Array.from({ length: napsToday }, () => Minutes(avgNapMin));

  const morningWake = resolveMorningWake(state, profile, morningsArr);

  const warnings: string[] = [];
  let plan: readonly PlanEntry[] = [];

  if (morningWake !== null) {
    if (profile.targetWakeTime) {
      const result = alignToTargetWake(
        morningWake,
        wakeWindows,
        napLengths,
        profile.targetWakeTime,
        Hours(nightHours),
      );
      plan = result.plan;
      if (result.warning) warnings.push(result.warning);
    } else {
      plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday });
    }
  } else {
    warnings.push(
      'brak kotwicy czasowej (cold start bez targetWakeTime i bez historii) — nie można wyznaczyć nextSleepAt',
    );
  }

  // Override bedtime — nadpisz ostatni PlanEntry typu NIGHT na podana godzine.
  // To wykonujemy PRZED Krokiem 8, zeby nextSleepAt mogl korzystac z nadpisanej wartosci.
  let bedtimeOverride: DateTime | null = null;
  if (profile.preferredBedtime && morningWake !== null) {
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
    const last = idx >= 0 ? plan[idx] : undefined;
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

  // Krok 8 — current wake window + nextSleepAt + remaining naps.
  let nextSleepAt: DateTime | null = null;
  let currentWakeWindowDuration: Minutes = Minutes(0);
  let remainingNapsToday: readonly PlanEntry[] = [];

  if (morningWake !== null) {
    const napsDone = napsDoneToday(state.history, state.now);
    const i = Math.min(napsDone.length, wakeWindows.length - 1);
    currentWakeWindowDuration = wakeWindows[i] ?? Minutes(0);
    const lastWake = lastWakeMs(morningWake, napsDone);
    nextSleepAt = new Date(lastWake + currentWakeWindowDuration * MS_PER_MIN);
    // Gdy preferredBedtime jest ustawione i wszystkie drzemki dnia zrobione,
    // nextSleepAt to bedtime — uzytkownik chce nadpisac naturalna pobudke.
    if (bedtimeOverride !== null && napsDone.length >= napsToday) {
      nextSleepAt = bedtimeOverride;
    }
    remainingNapsToday = plan.filter(
      (e) => e.plannedStart.getTime() > state.now.getTime(),
    );
  }

  // Krok 9 — warnings.
  if (napDecision.transitionWarning) {
    warnings.push('possible nap transition detected — schedule may be unstable');
  }
  if (confidence === 'low') {
    warnings.push(
      'rekomendacje oparte głównie o normy wiekowe (Galland 2012) — dodaj więcej dni danych',
    );
  }
  if (dayIds.length > 0) {
    const last7Totals = totals.slice(-7);
    if (mean(last7Totals) < 0.85 * adaptedTotal) {
      warnings.push('przewlekły deficyt snu w ostatnim tygodniu');
    }
  }
  if (morningWake !== null && currentWakeWindowDuration > 0) {
    const napsDone = napsDoneToday(state.history, state.now);
    const lastWake = lastWakeMs(morningWake, napsDone);
    const elapsedMin = (state.now.getTime() - lastWake) / MS_PER_MIN;
    if (elapsedMin > 1.2 * currentWakeWindowDuration) {
      warnings.push('ryzyko przemęczenia');
    }
  }

  // Override warnings — informuja usera o rozjazdach miedzy preferencja a algorytmem.
  if (
    profile.preferredNapsCount !== undefined &&
    Math.abs(napDecision.naps - profile.preferredNapsCount) >= 1
  ) {
    warnings.push(
      `preferowana liczba drzemek (${profile.preferredNapsCount}) różni się od rekomendowanej (${napDecision.naps})`,
    );
  }
  if (profile.preferredBedtime && profile.targetWakeTime) {
    // nightHours = (target wake - bedtime), z handlingiem cross-midnight.
    const bedMin = profile.preferredBedtime.hour * 60 + profile.preferredBedtime.minute;
    const wakeMin = profile.targetWakeTime.hour * 60 + profile.targetWakeTime.minute;
    const nightMin = wakeMin > bedMin ? wakeMin - bedMin : wakeMin + 24 * 60 - bedMin;
    const nightH = nightMin / 60;
    if (nightH < 8 || nightH > 13) {
      warnings.push(
        `preferowana godzina nocnego snu daje niezdrową długość nocy (${nightH.toFixed(1)}h) względem targetWakeTime`,
      );
    }
  }

  return {
    nextSleepAt,
    currentWakeWindowDuration,
    remainingNapsToday,
    // Galland nie ma stałego planu-baseline (okna są pochodną historii, nie
    // tabelą) — przesunięcie względem planu jest niezdefiniowane.
    nextSleepShiftMinutes: null,
    confidence,
    warnings,
  };
}
