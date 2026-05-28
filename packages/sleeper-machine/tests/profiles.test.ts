import { describe, it, expect } from 'vitest';
import {
  AGE_PROFILES,
  gallandSleepDurationByYears,
  gallandNapsByMonths,
  gallandLongestSleepByMonths,
  gallandNightWakingsByMonths,
} from '../src/profiles.js';
import { bucketOf } from '../src/ageBucket.js';
import { getBaseline, ageMonthsFromProfile } from '../src/baseline.js';
import { AgeMonths, AgeYears, monthsToYears } from '../src/types.js';

describe('gallandSleepDurationByYears (Galland Eq. A, years)', () => {
  it('returns ~13.6h for 3-month-old (Galland Table 2 mean=13.6, CI 9.4-17.8)', () => {
    const h = gallandSleepDurationByYears(monthsToYears(AgeMonths(3)));
    expect(h).toBeGreaterThan(12.5);
    expect(h).toBeLessThan(14.5);
  });

  it('returns ~12.9h for 6-month-old (Galland Table 2 mean=12.9, CI 8.8-17.0)', () => {
    const h = gallandSleepDurationByYears(monthsToYears(AgeMonths(6)));
    expect(h).toBeGreaterThan(12.0);
    expect(h).toBeLessThan(13.8);
  });

  it('returns ~12.6h for 9-month-old (Galland Table 2 mean=12.6, CI 9.4-15.8)', () => {
    const h = gallandSleepDurationByYears(monthsToYears(AgeMonths(9)));
    expect(h).toBeGreaterThan(11.5);
    expect(h).toBeLessThan(13.5);
  });

  it('returns ~12.9h for 12-month-old (Galland Table 2 mean=12.9, CI 10.1-15.8)', () => {
    const h = gallandSleepDurationByYears(monthsToYears(AgeMonths(12)));
    expect(h).toBeGreaterThan(11.8);
    expect(h).toBeLessThan(13.5);
  });

  it('returns ~12.0h for 24-month-old (Galland Table 2 mean=12.0, CI 9.7-14.2)', () => {
    const h = gallandSleepDurationByYears(monthsToYears(AgeMonths(24)));
    expect(h).toBeGreaterThan(11.0);
    expect(h).toBeLessThan(13.0);
  });

  it('decreases monotonically across infancy', () => {
    const at3 = gallandSleepDurationByYears(monthsToYears(AgeMonths(3)));
    const at6 = gallandSleepDurationByYears(monthsToYears(AgeMonths(6)));
    const at12 = gallandSleepDurationByYears(monthsToYears(AgeMonths(12)));
    const at24 = gallandSleepDurationByYears(monthsToYears(AgeMonths(24)));
    expect(at3).toBeGreaterThan(at6);
    expect(at6).toBeGreaterThan(at12);
    expect(at12).toBeGreaterThan(at24);
  });

  it('handles age=0 without NaN (newborn baseline)', () => {
    const h = gallandSleepDurationByYears(AgeYears(0));
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeGreaterThan(13);
    expect(h).toBeLessThan(16);
  });
});

describe('gallandNapsByMonths (Galland Eq. D, months)', () => {
  it('handles age=0 without NaN (newborn)', () => {
    const n = gallandNapsByMonths(AgeMonths(0));
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(2);
  });

  it('matches 3-month naps in Galland Table 3 (0-5mo: mean 3.1, CI 1.2-5.0)', () => {
    const n = gallandNapsByMonths(AgeMonths(3));
    expect(n).toBeGreaterThan(1.2);
    expect(n).toBeLessThan(5.0);
  });

  it('matches 9-month naps in Galland Table 3 (6-11mo: mean 2.2, CI 0.9-3.5)', () => {
    const n = gallandNapsByMonths(AgeMonths(9));
    expect(n).toBeGreaterThan(0.9);
    expect(n).toBeLessThan(3.5);
  });

  it('matches 18-month naps in Galland Table 3 (1-2y: mean 1.2, CI 0.4-2.1)', () => {
    const n = gallandNapsByMonths(AgeMonths(18));
    expect(n).toBeGreaterThan(0.4);
    expect(n).toBeLessThan(2.1);
  });

  it('decreases monotonically across infancy', () => {
    const at3 = gallandNapsByMonths(AgeMonths(3));
    const at12 = gallandNapsByMonths(AgeMonths(12));
    const at24 = gallandNapsByMonths(AgeMonths(24));
    expect(at3).toBeGreaterThan(at12);
    expect(at12).toBeGreaterThan(at24);
  });

  it('never returns negative even at very old ages', () => {
    expect(gallandNapsByMonths(AgeMonths(36))).toBeGreaterThanOrEqual(0);
    expect(gallandNapsByMonths(AgeMonths(120))).toBeGreaterThanOrEqual(0);
  });
});

describe('gallandLongestSleepByMonths (Galland Eq. C, months)', () => {
  it('handles age=0 with safe clamp (no -Infinity from ln)', () => {
    const h = gallandLongestSleepByMonths(AgeMonths(0));
    expect(Number.isFinite(h)).toBe(true);
    expect(h).toBeGreaterThan(0);
  });

  it('matches 12-month longest sleep (Galland Table 3 6-24mo: mean 8.3, CI 3.0-13.7)', () => {
    const h = gallandLongestSleepByMonths(AgeMonths(12));
    expect(h).toBeGreaterThan(3.0);
    expect(h).toBeLessThan(13.7);
  });

  it('increases monotonically with age (consolidation)', () => {
    const at3 = gallandLongestSleepByMonths(AgeMonths(3));
    const at6 = gallandLongestSleepByMonths(AgeMonths(6));
    const at12 = gallandLongestSleepByMonths(AgeMonths(12));
    const at24 = gallandLongestSleepByMonths(AgeMonths(24));
    expect(at6).toBeGreaterThan(at3);
    expect(at12).toBeGreaterThan(at6);
    expect(at24).toBeGreaterThan(at12);
  });
});

describe('gallandNightWakingsByMonths (Galland Eq. B, months)', () => {
  it('handles age=0 with safe clamp (no Infinity from ^-0.5)', () => {
    const n = gallandNightWakingsByMonths(AgeMonths(0));
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });

  it('decreases with age (older = fewer wakings overall)', () => {
    const at3 = gallandNightWakingsByMonths(AgeMonths(3));
    const at24 = gallandNightWakingsByMonths(AgeMonths(24));
    expect(at3).toBeGreaterThan(at24);
  });
});

describe('AGE_PROFILES table', () => {
  it('contains all 7 expected buckets', () => {
    expect(Object.keys(AGE_PROFILES).length).toBe(7);
    expect(AGE_PROFILES['0-2mo']).toBeDefined();
    expect(AGE_PROFILES['24-36mo']).toBeDefined();
  });

  it('every bucket has positive totalSleep', () => {
    for (const profile of Object.values(AGE_PROFILES)) {
      expect(profile.totalSleep).toBeGreaterThan(0);
    }
  });

  it('every bucket: low ≤ mean ≤ high', () => {
    for (const profile of Object.values(AGE_PROFILES)) {
      expect(profile.totalSleepLow).toBeLessThanOrEqual(profile.totalSleep);
      expect(profile.totalSleep).toBeLessThanOrEqual(profile.totalSleepHigh);
    }
  });

  it('naps decline across buckets (rough monotonic check)', () => {
    expect(AGE_PROFILES['0-2mo'].naps).toBeGreaterThan(AGE_PROFILES['9mo'].naps);
    expect(AGE_PROFILES['9mo'].naps).toBeGreaterThan(AGE_PROFILES['24-36mo'].naps);
  });
});

describe('bucketOf', () => {
  it('maps months to expected buckets at category boundaries', () => {
    expect(bucketOf(AgeMonths(0))).toBe('0-2mo');
    expect(bucketOf(AgeMonths(2))).toBe('0-2mo');
    expect(bucketOf(AgeMonths(3))).toBe('3mo');
    expect(bucketOf(AgeMonths(4))).toBe('3mo');
    expect(bucketOf(AgeMonths(6))).toBe('6mo');
    expect(bucketOf(AgeMonths(7))).toBe('6mo');
    expect(bucketOf(AgeMonths(9))).toBe('9mo');
    expect(bucketOf(AgeMonths(11))).toBe('12mo');
    expect(bucketOf(AgeMonths(12))).toBe('12mo');
    expect(bucketOf(AgeMonths(13))).toBe('12-24mo');
    expect(bucketOf(AgeMonths(18))).toBe('12-24mo');
    expect(bucketOf(AgeMonths(24))).toBe('24-36mo');
    expect(bucketOf(AgeMonths(30))).toBe('24-36mo');
  });
});

describe('ageMonthsFromProfile', () => {
  it('computes ~6 months from a 6-month gap', () => {
    const dob = new Date('2025-01-01T00:00:00Z');
    const now = new Date('2025-07-01T00:00:00Z');
    const months = ageMonthsFromProfile({ dateOfBirth: dob }, now);
    expect(months).toBeGreaterThan(5.5);
    expect(months).toBeLessThan(6.5);
  });

  it('returns 0 at birth', () => {
    const dob = new Date('2026-05-27T00:00:00Z');
    const now = new Date('2026-05-27T00:00:00Z');
    const months = ageMonthsFromProfile({ dateOfBirth: dob }, now);
    expect(months).toBe(0);
  });

  it('returns negative for prenatal dob (now < dob)', () => {
    const dob = new Date('2027-01-01T00:00:00Z');
    const now = new Date('2026-05-27T00:00:00Z');
    const months = ageMonthsFromProfile({ dateOfBirth: dob }, now);
    expect(months).toBeLessThan(0);
  });
});

describe('getBaseline', () => {
  it('returns equation-source baseline for valid age', () => {
    const dob = new Date('2025-08-27T00:00:00Z');
    const now = new Date('2026-05-27T00:00:00Z');
    const baseline = getBaseline({ dateOfBirth: dob }, now);
    expect(baseline.source).toBe('equation');
    expect(baseline.ageMonths).toBeGreaterThan(8.5);
    expect(baseline.ageMonths).toBeLessThan(9.5);
  });

  it('falls back to table for prenatal/future dob', () => {
    const dob = new Date('2027-01-01T00:00:00Z');
    const now = new Date('2026-05-27T00:00:00Z');
    const baseline = getBaseline({ dateOfBirth: dob }, now);
    expect(baseline.source).toBe('table');
    expect(baseline.ageMonths).toBe(0);
    expect(baseline.totalSleep).toBe(14.6);
  });

  it('matches Galland Fig. 4 for 9-month-old (full sanity check)', () => {
    const dob = new Date('2025-08-27T00:00:00Z');
    const now = new Date('2026-05-27T00:00:00Z');
    const baseline = getBaseline({ dateOfBirth: dob }, now);

    // Galland Table 2: 9mo totalSleep mean=12.6, CI 9.4-15.8
    expect(baseline.totalSleep).toBeGreaterThan(9.4);
    expect(baseline.totalSleep).toBeLessThan(15.8);

    // Galland Table 3: 6-11mo longestSleep mean=8.3, CI 3.0-13.7
    expect(baseline.longestSleep).toBeGreaterThan(3.0);
    expect(baseline.longestSleep).toBeLessThan(13.7);

    // Galland Table 3: 6-11mo naps mean=2.2, CI 0.9-3.5
    expect(baseline.naps).toBeGreaterThan(0.9);
    expect(baseline.naps).toBeLessThan(3.5);

    // Galland Table 3: 7-11mo night wakings mean=1.1, CI 0-3.1
    expect(baseline.nightWakings).toBeGreaterThan(0);
    expect(baseline.nightWakings).toBeLessThan(3.1);
  });
});
