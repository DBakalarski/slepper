import type { ChildProfile, SleepSession, State, TimeOfDay } from '../../src/types.js';

export type DayPattern = {
  // NIGHT session belonging to the PREVIOUS sleep day (start in prev calendar day).
  readonly nightStart: { hour: number; minute: number };
  readonly nightDurationH: number;
  // NAP sessions starting on the given calendar day.
  readonly naps: ReadonlyArray<{
    readonly start: { hour: number; minute: number };
    readonly durationMin: number;
  }>;
};

export function buildDay(
  year: number,
  month: number,
  day: number,
  pattern: DayPattern,
): SleepSession[] {
  const sessions: SleepSession[] = [];
  const nightEnd = new Date(year, month, day, pattern.nightStart.hour, pattern.nightStart.minute);
  // Wait — `nightStart` is the START time on the PREVIOUS day. End is on `day`.
  // Recompute: nightStart on (day - 1), nightEnd = nightStart + duration on day.
  const nightStartDate = new Date(
    year,
    month,
    day - 1,
    pattern.nightStart.hour,
    pattern.nightStart.minute,
  );
  const nightEndDate = new Date(nightStartDate.getTime() + pattern.nightDurationH * 3_600_000);
  sessions.push({ start: nightStartDate, end: nightEndDate, type: 'NIGHT' });
  // Suppress unused var.
  void nightEnd;

  for (const nap of pattern.naps) {
    const napStart = new Date(year, month, day, nap.start.hour, nap.start.minute);
    const napEnd = new Date(napStart.getTime() + nap.durationMin * 60_000);
    sessions.push({ start: napStart, end: napEnd, type: 'NAP' });
  }
  return sessions;
}

export function buildHistory(
  endYear: number,
  endMonth: number,
  endDay: number,
  numDays: number,
  pattern: DayPattern,
): SleepSession[] {
  const sessions: SleepSession[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth, endDay - i);
    sessions.push(...buildDay(d.getFullYear(), d.getMonth(), d.getDate(), pattern));
  }
  return sessions;
}

export function buildState(opts: {
  now: Date;
  dateOfBirth: Date;
  targetWakeTime?: TimeOfDay;
  history: SleepSession[];
}): { state: State; profile: ChildProfile } {
  const state: State = { now: opts.now, history: opts.history };
  const profile: ChildProfile = opts.targetWakeTime
    ? { dateOfBirth: opts.dateOfBirth, targetWakeTime: opts.targetWakeTime }
    : { dateOfBirth: opts.dateOfBirth };
  return { state, profile };
}

// Canonical patterns matching Galland 2012 norms.
export const PATTERN_4MO: DayPattern = {
  nightStart: { hour: 19, minute: 30 },
  nightDurationH: 10,
  naps: [
    { start: { hour: 8, minute: 30 }, durationMin: 60 },
    { start: { hour: 11, minute: 30 }, durationMin: 60 },
    { start: { hour: 14, minute: 30 }, durationMin: 60 },
    { start: { hour: 17, minute: 0 }, durationMin: 30 }, // brief evening cat-nap, ~3.5h total naps
  ],
};

export const PATTERN_9MO: DayPattern = {
  nightStart: { hour: 19, minute: 30 },
  nightDurationH: 10.5, // 10h 30min
  naps: [
    { start: { hour: 9, minute: 0 }, durationMin: 63 }, // 1.05h
    { start: { hour: 13, minute: 30 }, durationMin: 63 },
  ],
};

export const PATTERN_14MO_TRANSITION: DayPattern = {
  // 14mo Galland baseline.naps ≈ round(1.5) = 2, observed only 1 nap (transition).
  nightStart: { hour: 19, minute: 30 },
  nightDurationH: 11,
  naps: [{ start: { hour: 12, minute: 30 }, durationMin: 90 }],
};

export const PATTERN_9MO_DEFICIT: DayPattern = {
  // 9mo target ≈ 12.6h. 85% × 12.6 ≈ 10.7h sleep / 13.3h awake. Build 10.5h sleep.
  nightStart: { hour: 19, minute: 30 },
  nightDurationH: 9, // shorter night
  naps: [
    { start: { hour: 9, minute: 0 }, durationMin: 45 },
    { start: { hour: 13, minute: 30 }, durationMin: 45 },
  ],
};
