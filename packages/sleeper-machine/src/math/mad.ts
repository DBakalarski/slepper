import { median } from './statistics.js';

export function medianAbsoluteDeviation(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('medianAbsoluteDeviation: empty array');
  }
  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

export function trimByMAD(
  values: readonly number[],
  threshold = 2,
): number[] {
  if (values.length === 0) {
    return [];
  }
  if (threshold <= 0) {
    throw new Error(`trimByMAD: threshold must be > 0, got ${threshold}`);
  }
  const med = median(values);
  const mad = medianAbsoluteDeviation(values);
  if (mad === 0) {
    return [...values];
  }
  return values.filter((v) => Math.abs(v - med) <= threshold * mad);
}
