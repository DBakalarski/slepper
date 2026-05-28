import { clamp, median } from './math/statistics.js';
import { ewmaWeighted } from './math/ewma.js';
import type { Confidence } from './types.js';

export type AdaptOptions = {
  readonly lambda: number;
  readonly madThreshold: number;
  readonly safetyRail: number;
};

export const DEFAULT_ADAPT_OPTIONS: AdaptOptions = {
  lambda: 0.85,
  madThreshold: 2,
  safetyRail: 0.3,
};

export function computeAlpha(n: number, target = 14): number {
  return clamp(1 - n / target, 0.3, 1.0);
}

export function computeConfidence(n: number): Confidence {
  if (n < 3) return 'low';
  if (n < 7) return 'medium';
  return 'high';
}

export function adapt(
  baseline: number,
  observed: readonly number[],
  daysAgo: readonly number[],
  options: AdaptOptions = DEFAULT_ADAPT_OPTIONS,
): number {
  if (observed.length !== daysAgo.length) {
    throw new Error(
      `adapt: length mismatch (observed=${observed.length}, daysAgo=${daysAgo.length})`,
    );
  }
  const n = observed.length;
  if (n === 0) {
    return baseline;
  }

  const med = median(observed);
  const deviations = observed.map((v) => Math.abs(v - med));
  const mad = median(deviations);

  const keptValues: number[] = [];
  const keptDaysAgo: number[] = [];
  // MAD=0 happens when the majority of samples are identical; in that case
  // any deviation from the median is an outlier and gets dropped.
  const tolerance = mad === 0 ? 0 : options.madThreshold * mad;
  for (let i = 0; i < observed.length; i++) {
    if (Math.abs(observed[i]! - med) <= tolerance) {
      keptValues.push(observed[i]!);
      keptDaysAgo.push(daysAgo[i]!);
    }
  }

  const observedX = ewmaWeighted(keptValues, keptDaysAgo, options.lambda);
  const alpha = computeAlpha(n);
  const mixed = alpha * baseline + (1 - alpha) * observedX;

  const lo = baseline * (1 - options.safetyRail);
  const hi = baseline * (1 + options.safetyRail);
  return clamp(mixed, Math.min(lo, hi), Math.max(lo, hi));
}
