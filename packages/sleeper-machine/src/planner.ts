import { median } from './math/statistics.js';
import { Minutes } from './types.js';
import type {
  ChildProfile,
  DateTime,
  Hours,
  PlanEntry,
  State,
  TimeOfDay,
} from './types.js';

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;

function sameCalendarDay(a: DateTime, b: DateTime): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function projectTimeOntoDate(anchor: DateTime, hour: number, minute: number): DateTime {
  const result = new Date(anchor.getTime());
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function resolveMorningWake(
  state: State,
  profile: ChildProfile,
  observedMornings: readonly DateTime[],
): DateTime | null {
  // 1. Most recent NIGHT.end that falls on today's calendar day.
  let todayWake: DateTime | null = null;
  for (const s of state.history) {
    if (s.type !== 'NIGHT') continue;
    if (!sameCalendarDay(s.end, state.now)) continue;
    if (todayWake === null || s.end.getTime() > todayWake.getTime()) {
      todayWake = s.end;
    }
  }
  if (todayWake !== null) return todayWake;

  // 2. Median time-of-day from observedMornings, projected onto today.
  if (observedMornings.length > 0) {
    const minutesOfDay = observedMornings.map((d) => d.getHours() * 60 + d.getMinutes());
    const med = median(minutesOfDay);
    const h = Math.floor(med / 60);
    const m = Math.round(med - h * 60);
    return projectTimeOntoDate(state.now, h, m);
  }

  // 3. targetWakeTime projected onto today.
  if (profile.targetWakeTime) {
    return projectTimeOntoDate(state.now, profile.targetWakeTime.hour, profile.targetWakeTime.minute);
  }

  return null;
}

export type ForwardPassInput = {
  readonly morningWake: DateTime;
  readonly wakeWindows: readonly Minutes[];
  readonly napLengths: readonly Minutes[];
  readonly napsToday: number;
};

export function forwardPass(input: ForwardPassInput): PlanEntry[] {
  const { morningWake, wakeWindows, napLengths, napsToday } = input;
  if (napsToday < 0) {
    throw new Error(`forwardPass: napsToday must be ≥ 0, got ${napsToday}`);
  }
  if (napLengths.length !== napsToday) {
    throw new Error(
      `forwardPass: napLengths.length (${napLengths.length}) must equal napsToday (${napsToday})`,
    );
  }
  if (wakeWindows.length !== napsToday + 1) {
    throw new Error(
      `forwardPass: wakeWindows.length (${wakeWindows.length}) must equal napsToday + 1 (${napsToday + 1})`,
    );
  }

  const plan: PlanEntry[] = [];
  let cursorMs = morningWake.getTime();
  for (let i = 0; i < napsToday; i++) {
    const napStartMs = cursorMs + wakeWindows[i]! * MS_PER_MIN;
    const napEndMs = napStartMs + napLengths[i]! * MS_PER_MIN;
    plan.push({
      plannedStart: new Date(napStartMs),
      plannedEnd: new Date(napEndMs),
      type: 'NAP',
    });
    cursorMs = napEndMs;
  }
  const bedtimeMs = cursorMs + wakeWindows[napsToday]! * MS_PER_MIN;
  plan.push({ plannedStart: new Date(bedtimeMs), type: 'NIGHT' });
  return plan;
}

export type AlignResult = {
  readonly plan: readonly PlanEntry[];
  readonly warning?: string;
};

export function alignToTargetWake(
  morningWake: DateTime,
  wakeWindows: readonly Minutes[],
  napLengths: readonly Minutes[],
  targetWakeTime: TimeOfDay,
  longestSleep: Hours,
  budget = 0.2,
): AlignResult {
  const napsToday = napLengths.length;

  // Initial pass to find current bedtime.
  const initial = forwardPass({ morningWake, wakeWindows, napLengths, napsToday });
  const currentBedtime = initial[initial.length - 1]!.plannedStart;

  // Target = tomorrow's morningWake. Tomorrow = morningWake + 1 day @ target time.
  const nextDay = new Date(morningWake.getTime());
  nextDay.setDate(nextDay.getDate() + 1);
  const targetWakeMs = projectTimeOntoDate(nextDay, targetWakeTime.hour, targetWakeTime.minute).getTime();
  const desiredBedtimeMs = targetWakeMs - longestSleep * MS_PER_HOUR;
  const deltaMs = desiredBedtimeMs - currentBedtime.getTime();

  const totalAwakeMin = wakeWindows.reduce((s, w) => s + w, 0);
  const maxBudgetMs = budget * totalAwakeMin * MS_PER_MIN;

  let warning: string | undefined;
  let appliedDeltaMs = deltaMs;
  if (Math.abs(deltaMs) > maxBudgetMs) {
    warning = `targetWakeTime poza zakresem ±${Math.round(budget * 100)}% bezpiecznej korekty`;
    appliedDeltaMs = Math.sign(deltaMs) * maxBudgetMs;
  }

  const appliedDeltaMin = appliedDeltaMs / MS_PER_MIN;
  const adjustedWindows: Minutes[] = wakeWindows.map((w) =>
    Minutes(w + appliedDeltaMin * (w / totalAwakeMin)),
  );

  const plan = forwardPass({
    morningWake,
    wakeWindows: adjustedWindows,
    napLengths,
    napsToday,
  });
  return warning === undefined ? { plan } : { plan, warning };
}
