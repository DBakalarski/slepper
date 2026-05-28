import type { AgeMonths } from './types.js';
import type { AgeBucket } from './profiles.js';

export function bucketOf(months: AgeMonths): AgeBucket {
  if (months < 3) return '0-2mo';
  if (months < 5) return '3mo';
  if (months < 8) return '6mo';
  if (months < 11) return '9mo';
  if (months < 13) return '12mo';
  if (months < 24) return '12-24mo';
  return '24-36mo';
}
