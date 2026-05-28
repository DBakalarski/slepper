import { Hours } from './types.js';
import type { AgeMonths, AgeYears } from './types.js';

export type AgeBucket =
  | '0-2mo'
  | '3mo'
  | '6mo'
  | '9mo'
  | '12mo'
  | '12-24mo'
  | '24-36mo';

export type AgeProfile = {
  readonly bucket: AgeBucket;
  readonly totalSleep: Hours;
  readonly totalSleepLow: Hours;
  readonly totalSleepHigh: Hours;
  readonly naps: number;
  readonly longestSleep: Hours;
  readonly nightWakings: number;
};

export const AGE_PROFILES: Readonly<Record<AgeBucket, AgeProfile>> = {
  '0-2mo': {
    bucket: '0-2mo',
    totalSleep: Hours(14.6),
    totalSleepLow: Hours(9.3),
    totalSleepHigh: Hours(20.0),
    naps: 3.1,
    longestSleep: Hours(5.7),
    nightWakings: 1.7,
  },
  '3mo': {
    bucket: '3mo',
    totalSleep: Hours(13.6),
    totalSleepLow: Hours(9.4),
    totalSleepHigh: Hours(17.8),
    naps: 3.1,
    longestSleep: Hours(5.7),
    nightWakings: 0.8,
  },
  '6mo': {
    bucket: '6mo',
    totalSleep: Hours(12.9),
    totalSleepLow: Hours(8.8),
    totalSleepHigh: Hours(17.0),
    naps: 2.2,
    longestSleep: Hours(8.3),
    nightWakings: 0.8,
  },
  '9mo': {
    bucket: '9mo',
    totalSleep: Hours(12.6),
    totalSleepLow: Hours(9.4),
    totalSleepHigh: Hours(15.8),
    naps: 2.2,
    longestSleep: Hours(8.3),
    nightWakings: 1.1,
  },
  '12mo': {
    bucket: '12mo',
    totalSleep: Hours(12.9),
    totalSleepLow: Hours(10.1),
    totalSleepHigh: Hours(15.8),
    naps: 1.2,
    longestSleep: Hours(8.3),
    nightWakings: 1.1,
  },
  '12-24mo': {
    bucket: '12-24mo',
    totalSleep: Hours(12.6),
    totalSleepLow: Hours(9.0),
    totalSleepHigh: Hours(15.2),
    naps: 1.2,
    longestSleep: Hours(8.3),
    nightWakings: 0.7,
  },
  '24-36mo': {
    bucket: '24-36mo',
    totalSleep: Hours(12.0),
    totalSleepLow: Hours(9.7),
    totalSleepHigh: Hours(14.2),
    naps: 1.0,
    longestSleep: Hours(10.5),
    nightWakings: 0.3,
  },
};

// Galland 2012 Fig. 4 — best-fit equations. Each panel uses a different age unit:
// A in years (0–12y span), B/C/D in months (0–24mo span). Read panel labels carefully.

// Eq. A (R²=0.89): total sleep duration. Age in YEARS.
// Handles age=0 naturally (sqrt(0)=0, no singularity).
export function gallandSleepDurationByYears(years: AgeYears): Hours {
  const x = years / 10;
  return Hours(10.49 - 5.56 * (Math.sqrt(x) - 0.71));
}

// Eq. B (R²=0.58): number of night wakings. Age in MONTHS.
// Uses (age/10)^-0.5 → singular at age=0 → clamp to safeAge = max(1, months).
export function gallandNightWakingsByMonths(months: AgeMonths): number {
  const safeAge = Math.max(1, months);
  const x = safeAge / 10;
  return 0.84 + 0.56 * (Math.pow(x, -0.5) - 1.1);
}

// Eq. C (R²=0.96): longest sleep period in hours. Age in MONTHS.
// Uses ln(age/10) → singular at age=0 → clamp to safeAge = max(1, months).
export function gallandLongestSleepByMonths(months: AgeMonths): Hours {
  const safeAge = Math.max(1, months);
  const x = safeAge / 10;
  return Hours(7.79 + 1.32 * (Math.log(x) + 0.22));
}

// Eq. D (R²=0.98): number of daytime naps. Age in MONTHS.
// PDF figure shows ambiguous bracket placement; the parallel form to Eqs A/B/C
// `2.02 − 2.19 × [(age/10)^0.5 − 0.99]` is used here as it (a) is structurally
// consistent with the other three equations and (b) produces values within the
// Galland Table 3 95% CI across all measured age points (0-5mo, 6-11mo, 1-2y).
// The literal-OCR alternative `2.02 − [2.19·(age/10)^0.5 − 0.99]` produces
// negative naps for 24mo, which contradicts the table.
export function gallandNapsByMonths(months: AgeMonths): number {
  const x = months / 10;
  const raw = 2.02 - 2.19 * (Math.sqrt(x) - 0.99);
  return Math.max(0, raw);
}
