import { AgeMonths, monthsToYears } from './types.js';
import type { ChildProfile, DateTime, Hours } from './types.js';
import {
  AGE_PROFILES,
  gallandSleepDurationByYears,
  gallandNapsByMonths,
  gallandLongestSleepByMonths,
  gallandNightWakingsByMonths,
} from './profiles.js';

export type Baseline = {
  readonly ageMonths: AgeMonths;
  readonly totalSleep: Hours;
  readonly naps: number;
  readonly longestSleep: Hours;
  readonly nightWakings: number;
  readonly source: 'equation' | 'table';
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_MONTH = 30.44;

export function ageMonthsFromProfile(
  profile: ChildProfile,
  now: DateTime,
): AgeMonths {
  const days = (now.getTime() - profile.dateOfBirth.getTime()) / MS_PER_DAY;
  return AgeMonths(days / DAYS_PER_MONTH);
}

export function getBaseline(
  profile: ChildProfile,
  now: DateTime,
): Baseline {
  const ageMonths = ageMonthsFromProfile(profile, now);

  if (ageMonths < 0) {
    const fallback = AGE_PROFILES['0-2mo'];
    return {
      ageMonths: AgeMonths(0),
      totalSleep: fallback.totalSleep,
      naps: fallback.naps,
      longestSleep: fallback.longestSleep,
      nightWakings: fallback.nightWakings,
      source: 'table',
    };
  }

  return {
    ageMonths,
    totalSleep: gallandSleepDurationByYears(monthsToYears(ageMonths)),
    naps: gallandNapsByMonths(ageMonths),
    longestSleep: gallandLongestSleepByMonths(ageMonths),
    nightWakings: gallandNightWakingsByMonths(ageMonths),
    source: 'equation',
  };
}
