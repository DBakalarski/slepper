import { describe, it, expect } from 'vitest';
import {
  resolveMorningWake,
  forwardPass,
  alignToTargetWake,
} from '../src/planner.js';
import { Hours, Minutes } from '../src/types.js';
import type { ChildProfile, SleepSession, State, TimeOfDay } from '../src/types.js';

const TODAY = new Date(2026, 4, 27, 15, 0); // 2026-05-27 15:00 local
const DOB_9MO = new Date(2025, 7, 27); // 9 months before TODAY

function nightSession(
  endY: number, endM: number, endD: number, endH: number, endMin: number,
  durationH = 11,
): SleepSession {
  const end = new Date(endY, endM, endD, endH, endMin);
  const start = new Date(end.getTime() - durationH * 3600_000);
  return { start, end, type: 'NIGHT' };
}

describe('resolveMorningWake — priority chain', () => {
  it('returns end of most recent NIGHT ending today (calendar day)', () => {
    const lastNight = nightSession(2026, 4, 27, 6, 30);
    const state: State = { now: TODAY, history: [lastNight] };
    const profile: ChildProfile = { dateOfBirth: DOB_9MO };
    const result = resolveMorningWake(state, profile, []);
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(6);
    expect(result!.getMinutes()).toBe(30);
    expect(result!.getDate()).toBe(27);
  });

  it('prefers later NIGHT.end when multiple sessions end today', () => {
    const earlier = nightSession(2026, 4, 27, 5, 45);
    const later = nightSession(2026, 4, 27, 7, 15);
    const state: State = { now: TODAY, history: [earlier, later] };
    const result = resolveMorningWake(state, { dateOfBirth: DOB_9MO }, []);
    expect(result!.getHours()).toBe(7);
    expect(result!.getMinutes()).toBe(15);
  });

  it('ignores NIGHT sessions ending on other calendar days', () => {
    const yesterdayMorning = nightSession(2026, 4, 26, 6, 30);
    const state: State = { now: TODAY, history: [yesterdayMorning] };
    // Fallback to observedMornings (provided non-empty).
    const observed = [
      new Date(2026, 4, 25, 6, 30),
      new Date(2026, 4, 26, 6, 50),
    ];
    const result = resolveMorningWake(state, { dateOfBirth: DOB_9MO }, observed);
    expect(result!.getDate()).toBe(27); // projected onto today
    expect(result!.getHours()).toBe(6);
  });

  it('falls back to median of observedMornings (projected onto today) when no NIGHT ended today', () => {
    const state: State = { now: TODAY, history: [] };
    const observed = [
      new Date(2026, 4, 20, 6, 30),
      new Date(2026, 4, 21, 7, 0),
      new Date(2026, 4, 22, 6, 45),
    ];
    // Sorted times: 06:30, 06:45, 07:00 → median = 06:45.
    const result = resolveMorningWake(state, { dateOfBirth: DOB_9MO }, observed);
    expect(result!.getDate()).toBe(27);
    expect(result!.getHours()).toBe(6);
    expect(result!.getMinutes()).toBe(45);
  });

  it('falls back to targetWakeTime when no NIGHT today and no observedMornings', () => {
    const state: State = { now: TODAY, history: [] };
    const profile: ChildProfile = {
      dateOfBirth: DOB_9MO,
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const result = resolveMorningWake(state, profile, []);
    expect(result!.getDate()).toBe(27);
    expect(result!.getHours()).toBe(7);
    expect(result!.getMinutes()).toBe(0);
  });

  it('returns null when no NIGHT today, no observedMornings, no targetWakeTime', () => {
    const state: State = { now: TODAY, history: [] };
    const result = resolveMorningWake(state, { dateOfBirth: DOB_9MO }, []);
    expect(result).toBeNull();
  });

  it('ignores NAP sessions ending today (only NIGHT counts as morning wake)', () => {
    const todayNap: SleepSession = {
      start: new Date(2026, 4, 27, 10, 0),
      end: new Date(2026, 4, 27, 11, 30),
      type: 'NAP',
    };
    const state: State = { now: TODAY, history: [todayNap] };
    const profile: ChildProfile = {
      dateOfBirth: DOB_9MO,
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const result = resolveMorningWake(state, profile, []);
    // NAP rejected → fall through observed (empty) → targetWakeTime.
    expect(result!.getHours()).toBe(7);
    expect(result!.getMinutes()).toBe(0);
  });

  it('returns null cold start (no history, no observed, no target)', () => {
    const state: State = { now: TODAY, history: [] };
    expect(resolveMorningWake(state, { dateOfBirth: DOB_9MO }, [])).toBeNull();
  });
});

describe('forwardPass — basic 9mo case', () => {
  // Round numbers: totalSleep=12h, longestSleep=10h, naps=2.
  // wakeWindows: 12h awake / weights [1,1,1.3] sum=3.3 → 218.18, 218.18, 283.64 min
  // napLengths: 120min/2 = 60 each
  const morningWake = new Date(2026, 4, 27, 7, 0);
  const wakeWindows = [
    Minutes(720 / 3.3),
    Minutes(720 / 3.3),
    Minutes((720 / 3.3) * 1.3),
  ];
  const napLengths = [Minutes(60), Minutes(60)];

  it('produces napsToday + 1 entries (2 naps + 1 bedtime)', () => {
    const plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday: 2 });
    expect(plan).toHaveLength(3);
    expect(plan[0]!.type).toBe('NAP');
    expect(plan[1]!.type).toBe('NAP');
    expect(plan[2]!.type).toBe('NIGHT');
  });

  it('NAP entries have plannedEnd; NIGHT entry omits it', () => {
    const plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday: 2 });
    expect(plan[0]!.plannedEnd).toBeDefined();
    expect(plan[1]!.plannedEnd).toBeDefined();
    expect(plan[2]!.plannedEnd).toBeUndefined();
  });

  it('plan is chronologically consistent (start_{i+1} > end_i)', () => {
    const plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday: 2 });
    for (let i = 1; i < plan.length; i++) {
      const prevEnd = plan[i - 1]!.plannedEnd ?? plan[i - 1]!.plannedStart;
      expect(plan[i]!.plannedStart.getTime()).toBeGreaterThan(prevEnd.getTime());
    }
  });

  it('first NAP starts at morningWake + wakeWindows[0] (±1 ms tolerance for float→ms truncation)', () => {
    const plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday: 2 });
    const expected = morningWake.getTime() + wakeWindows[0]! * 60_000;
    expect(Math.abs(plan[0]!.plannedStart.getTime() - expected)).toBeLessThanOrEqual(1);
  });

  it('full 24h budget: bedtime + night = next morning ≈ same time as morningWake (±5 min)', () => {
    const plan = forwardPass({ morningWake, wakeWindows, napLengths, napsToday: 2 });
    const bedtime = plan[plan.length - 1]!.plannedStart;
    const nightHours = Hours(10);
    const nextMorningMs = bedtime.getTime() + nightHours * 3600_000;
    const oneDayLaterMs = morningWake.getTime() + 24 * 3600_000;
    expect(Math.abs(nextMorningMs - oneDayLaterMs)).toBeLessThanOrEqual(5 * 60_000);
  });

  it('napsToday=0 → only bedtime entry, starts at morningWake + wakeWindows[0]', () => {
    const plan = forwardPass({
      morningWake,
      wakeWindows: [Minutes(720)],
      napLengths: [],
      napsToday: 0,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]!.type).toBe('NIGHT');
    expect(plan[0]!.plannedStart.getTime()).toBe(morningWake.getTime() + 720 * 60_000);
  });

  it('throws when napLengths.length !== napsToday', () => {
    expect(() =>
      forwardPass({ morningWake, wakeWindows, napLengths: [Minutes(60)], napsToday: 2 }),
    ).toThrow(/napLengths/);
  });

  it('throws when wakeWindows.length !== napsToday + 1', () => {
    expect(() =>
      forwardPass({
        morningWake,
        wakeWindows: [Minutes(200), Minutes(200)],
        napLengths,
        napsToday: 2,
      }),
    ).toThrow(/wakeWindows/);
  });

  it('throws when napsToday < 0', () => {
    expect(() =>
      forwardPass({ morningWake, wakeWindows: [], napLengths: [], napsToday: -1 }),
    ).toThrow(/napsToday/);
  });
});

describe('alignToTargetWake', () => {
  const morningWake = new Date(2026, 4, 27, 7, 0);
  const wakeWindows = [
    Minutes(720 / 3.3),
    Minutes(720 / 3.3),
    Minutes((720 / 3.3) * 1.3),
  ];
  const napLengths = [Minutes(60), Minutes(60)];
  const longestSleep = Hours(10);

  it('target 07:00 next day → tiny delta, no warning, plan stays within ±20% of baseline windows', () => {
    const target: TimeOfDay = { hour: 7, minute: 0 };
    const result = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    expect(result.warning).toBeUndefined();
    const bedtime = result.plan[result.plan.length - 1]!.plannedStart;
    // Next morning wake from bedtime + longestSleep should be ≈ tomorrow 07:00.
    const nextWakeMs = bedtime.getTime() + longestSleep * 3600_000;
    const targetMs = new Date(2026, 4, 28, 7, 0).getTime();
    expect(Math.abs(nextWakeMs - targetMs)).toBeLessThanOrEqual(60_000);
  });

  it('moderate delta (within 20% budget): distributes correction, no warning', () => {
    // Move target 30 min earlier than what plan would naturally yield.
    // Natural bedtime ≈ 21:00 → next wake 07:00. Target 06:30 → bedtime 20:30 desired.
    // 30min ≪ 20% × 720min = 144min → fits.
    const target: TimeOfDay = { hour: 6, minute: 30 };
    const result = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    expect(result.warning).toBeUndefined();
    const bedtime = result.plan[result.plan.length - 1]!.plannedStart;
    const nextWakeMs = bedtime.getTime() + longestSleep * 3600_000;
    const targetMs = new Date(2026, 4, 28, 6, 30).getTime();
    expect(Math.abs(nextWakeMs - targetMs)).toBeLessThanOrEqual(60_000);
  });

  it('all adjusted windows stay within ±20% of original (safety on each window)', () => {
    const target: TimeOfDay = { hour: 6, minute: 30 };
    const result = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    // Compute adjusted windows from plan.
    const adjusted: number[] = [];
    let cursor = morningWake.getTime();
    for (const entry of result.plan) {
      adjusted.push((entry.plannedStart.getTime() - cursor) / 60_000);
      cursor = (entry.plannedEnd ?? entry.plannedStart).getTime();
    }
    for (let i = 0; i < adjusted.length; i++) {
      const ratio = adjusted[i]! / wakeWindows[i]!;
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
  });

  it('impossible target (delta > 20% budget): emits warning + clamps to max budget', () => {
    // morningWake 07:00 today. Natural bedtime ≈ 21:00 today, next wake ≈ 07:00 tomorrow.
    // Target 14:00 tomorrow → desired bedtime = 14:00 − 10h = 04:00 tomorrow.
    // delta = 04:00 tomorrow − 21:00 today = +7h = +420 min (we'd need to push bedtime LATER).
    // Max budget = 0.2 × 720 = 144 min. Clamped to +144 min → total awake = 720 + 144 = 864 min.
    const target: TimeOfDay = { hour: 14, minute: 0 };
    const result = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    expect(result.warning).toBeDefined();
    expect(result.warning).toMatch(/20%|budget|zakres/i);
    const totalAwakeMin = (() => {
      let cursor = morningWake.getTime();
      let sum = 0;
      for (const entry of result.plan) {
        sum += (entry.plannedStart.getTime() - cursor) / 60_000;
        cursor = (entry.plannedEnd ?? entry.plannedStart).getTime();
      }
      return sum;
    })();
    expect(totalAwakeMin).toBeCloseTo(864, 0);
  });

  it('returned plan has napsToday + 1 entries (same structure as forwardPass)', () => {
    const target: TimeOfDay = { hour: 7, minute: 0 };
    const result = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    expect(result.plan).toHaveLength(3);
  });
});

describe('integration — full plan day chronological consistency (Phase 6 acceptance)', () => {
  it('9mo full day: forwardPass + align produce plan with strictly increasing time anchors', () => {
    const morningWake = new Date(2026, 4, 27, 7, 0);
    const wakeWindows = [
      Minutes(720 / 3.3),
      Minutes(720 / 3.3),
      Minutes((720 / 3.3) * 1.3),
    ];
    const napLengths = [Minutes(60), Minutes(60)];
    const longestSleep = Hours(10);
    const target: TimeOfDay = { hour: 6, minute: 45 };
    const { plan } = alignToTargetWake(
      morningWake, wakeWindows, napLengths, target, longestSleep,
    );
    for (let i = 1; i < plan.length; i++) {
      const prevEnd = plan[i - 1]!.plannedEnd ?? plan[i - 1]!.plannedStart;
      expect(plan[i]!.plannedStart.getTime()).toBeGreaterThan(prevEnd.getTime());
    }
  });
});
