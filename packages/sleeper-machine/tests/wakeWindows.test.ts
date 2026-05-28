import { describe, it, expect } from 'vitest';
import { deriveWakeWindows } from '../src/wakeWindows.js';
import { AgeMonths, Hours } from '../src/types.js';

const HOURS_IN_DAY_MIN = 24 * 60;

describe('deriveWakeWindows — Phase 5 acceptance (9mo, 2 naps)', () => {
  it('9mo (totalSleep=12.6, longestSleep=9.2, 2 naps) → 3 windows summing to ≈11.4h awake', () => {
    const windows = deriveWakeWindows({
      totalSleep: Hours(12.6),
      longestSleep: Hours(9.2),
      napsToday: 2,
      ageMonths: AgeMonths(9),
    });
    expect(windows).toHaveLength(3);
    const totalAwakeMin = windows.reduce((s, w) => s + w, 0);
    // 24h − 12.6h = 11.4h = 684 min
    expect(totalAwakeMin).toBeCloseTo(684, 0);
  });

  it('full 24h budget check: awake + naps + night ≈ 24h (±5 min)', () => {
    const totalSleep = Hours(12.6);
    const longestSleep = Hours(9.2);
    const napsToday = 2;
    const windows = deriveWakeWindows({
      totalSleep,
      longestSleep,
      napsToday,
      ageMonths: AgeMonths(9),
    });
    const totalAwakeMin = windows.reduce((s, w) => s + w, 0);
    const nightMin = longestSleep * 60;
    const napSleepMin = Math.max(0, (totalSleep - longestSleep) * 60);
    const dayTotalMin = totalAwakeMin + nightMin + napSleepMin;
    expect(Math.abs(dayTotalMin - HOURS_IN_DAY_MIN)).toBeLessThanOrEqual(5);
  });
});

describe('deriveWakeWindows — window count', () => {
  it('number of windows = napsToday + 1', () => {
    for (const naps of [0, 1, 2, 3, 4]) {
      const w = deriveWakeWindows({
        totalSleep: Hours(12),
        longestSleep: Hours(9),
        napsToday: naps,
        ageMonths: AgeMonths(12),
      });
      expect(w).toHaveLength(naps + 1);
    }
  });

  it('napsToday=0 → single window covering all awake time', () => {
    const totalSleep = Hours(10);
    const w = deriveWakeWindows({
      totalSleep,
      longestSleep: Hours(9),
      napsToday: 0,
      ageMonths: AgeMonths(36),
    });
    expect(w).toHaveLength(1);
    expect(w[0]).toBeCloseTo((24 - totalSleep) * 60, 5);
  });

  it('clamps negative napsToday to 0 (defensive)', () => {
    const w = deriveWakeWindows({
      totalSleep: Hours(12),
      longestSleep: Hours(9),
      napsToday: -1,
      ageMonths: AgeMonths(12),
    });
    expect(w).toHaveLength(1);
  });
});

describe('deriveWakeWindows — last window is longest (weight 1.3)', () => {
  it('all naps-day windows are equal length, last is 30% longer', () => {
    const w = deriveWakeWindows({
      totalSleep: Hours(12.6),
      longestSleep: Hours(9.2),
      napsToday: 2,
      ageMonths: AgeMonths(9),
    });
    expect(w[0]).toBeCloseTo(w[1]!, 5);
    expect(w[2]! / w[0]!).toBeCloseTo(1.3, 3);
  });

  it('for 3 naps: first three equal, last 1.3× longer', () => {
    const w = deriveWakeWindows({
      totalSleep: Hours(13.5),
      longestSleep: Hours(10),
      napsToday: 3,
      ageMonths: AgeMonths(6),
    });
    expect(w).toHaveLength(4);
    expect(w[0]).toBeCloseTo(w[1]!, 5);
    expect(w[1]).toBeCloseTo(w[2]!, 5);
    expect(w[3]! / w[0]!).toBeCloseTo(1.3, 3);
  });
});

describe('deriveWakeWindows — night derivation by age', () => {
  it('ageMonths < 6 (0-5mo): night = totalSleep × 0.5 (no consolidated longest sleep yet)', () => {
    const totalSleep = Hours(15); // typical 3mo
    const w = deriveWakeWindows({
      totalSleep,
      longestSleep: Hours(6), // ignored for young infants
      napsToday: 3,
      ageMonths: AgeMonths(3),
    });
    const totalAwakeMin = w.reduce((s, sum) => s + sum, 0);
    const nightMin = totalSleep * 0.5 * 60;
    const napSleepMin = Math.max(0, (totalSleep - totalSleep * 0.5) * 60);
    expect(Math.abs(totalAwakeMin + nightMin + napSleepMin - HOURS_IN_DAY_MIN)).toBeLessThanOrEqual(5);
  });

  it('ageMonths = 5: still uses totalSleep × 0.5', () => {
    const totalSleep = Hours(14);
    const longestSleep = Hours(8); // would be used if ≥6
    const w = deriveWakeWindows({
      totalSleep,
      longestSleep,
      napsToday: 3,
      ageMonths: AgeMonths(5),
    });
    const napSleepMin = Math.max(0, (totalSleep - totalSleep * 0.5) * 60);
    const totalAwakeMin = w.reduce((s, sum) => s + sum, 0);
    expect(totalAwakeMin + totalSleep * 0.5 * 60 + napSleepMin).toBeCloseTo(HOURS_IN_DAY_MIN, 0);
  });

  it('ageMonths = 6: boundary uses longestSleep', () => {
    const totalSleep = Hours(13);
    const longestSleep = Hours(8);
    const w = deriveWakeWindows({
      totalSleep,
      longestSleep,
      napsToday: 3,
      ageMonths: AgeMonths(6),
    });
    const napSleepMin = Math.max(0, (totalSleep - longestSleep) * 60);
    const totalAwakeMin = w.reduce((s, sum) => s + sum, 0);
    expect(totalAwakeMin + longestSleep * 60 + napSleepMin).toBeCloseTo(HOURS_IN_DAY_MIN, 0);
  });
});

describe('deriveWakeWindows — edge cases', () => {
  it('totalSleep ≥ 24h (degenerate): wake windows clamp to 0 minutes', () => {
    const w = deriveWakeWindows({
      totalSleep: Hours(25),
      longestSleep: Hours(10),
      napsToday: 2,
      ageMonths: AgeMonths(9),
    });
    const totalAwakeMin = w.reduce((s, sum) => s + sum, 0);
    expect(totalAwakeMin).toBe(0);
  });

  it('longestSleep > totalSleep (data corruption): napSleep clamped to 0', () => {
    const w = deriveWakeWindows({
      totalSleep: Hours(10),
      longestSleep: Hours(12),
      napsToday: 2,
      ageMonths: AgeMonths(9),
    });
    // Awake = 24 - 10 = 14h = 840 min
    const totalAwakeMin = w.reduce((s, sum) => s + sum, 0);
    expect(totalAwakeMin).toBeCloseTo(840, 0);
  });
});
