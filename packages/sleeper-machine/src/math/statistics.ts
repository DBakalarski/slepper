export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('median: empty array');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('mean: empty array');
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`clamp: min (${min}) > max (${max})`);
  }
  return Math.min(Math.max(value, min), max);
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    throw new Error('percentile: empty array');
  }
  if (p < 0 || p > 1) {
    throw new Error(`percentile: p must be in [0, 1], got ${p}`);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = p * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) {
    return sorted[lo]!;
  }
  const weight = index - lo;
  return sorted[lo]! * (1 - weight) + sorted[hi]! * weight;
}
