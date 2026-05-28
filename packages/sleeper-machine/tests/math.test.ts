import { describe, it, expect } from 'vitest';
import { median, mean, clamp, percentile } from '../src/math/statistics.js';
import { medianAbsoluteDeviation, trimByMAD } from '../src/math/mad.js';
import { ewmaWeighted } from '../src/math/ewma.js';

describe('median', () => {
  it('returns middle value for odd-length array', () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  it('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('works with single element', () => {
    expect(median([42])).toBe(42);
  });

  it('does not require pre-sorted input', () => {
    expect(median([5, 1, 3, 2, 4])).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(median([-3, -1, -2])).toBe(-2);
  });

  it('throws on empty array', () => {
    expect(() => median([])).toThrow(/empty/);
  });
});

describe('mean', () => {
  it('computes arithmetic mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('works with single element', () => {
    expect(mean([7])).toBe(7);
  });

  it('handles floating point', () => {
    expect(mean([1.5, 2.5])).toBeCloseTo(2.0);
  });

  it('throws on empty', () => {
    expect(() => mean([])).toThrow(/empty/);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('throws when min > max', () => {
    expect(() => clamp(5, 10, 0)).toThrow();
  });
});

describe('percentile', () => {
  it('returns first value at p=0', () => {
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
  });

  it('returns last value at p=1', () => {
    expect(percentile([1, 2, 3, 4], 1)).toBe(4);
  });

  it('returns median at p=0.5 for odd-length', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it('interpolates linearly between values', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
  });

  it('throws on out-of-range p (high)', () => {
    expect(() => percentile([1, 2, 3], 1.5)).toThrow();
  });

  it('throws on out-of-range p (negative)', () => {
    expect(() => percentile([1, 2, 3], -0.1)).toThrow();
  });

  it('throws on empty array', () => {
    expect(() => percentile([], 0.5)).toThrow(/empty/);
  });
});

describe('medianAbsoluteDeviation', () => {
  it('returns zero for all-equal values', () => {
    expect(medianAbsoluteDeviation([5, 5, 5, 5])).toBe(0);
  });

  it('computes MAD for symmetric data (median=3, devs=[2,1,0,1,2], MAD=1)', () => {
    expect(medianAbsoluteDeviation([1, 2, 3, 4, 5])).toBe(1);
  });

  it('is robust to a single extreme outlier', () => {
    // median([10,11,12,13,1000]) = 12, devs = [2,1,0,1,988], median = 1
    expect(medianAbsoluteDeviation([10, 11, 12, 13, 1000])).toBe(1);
  });

  it('throws on empty', () => {
    expect(() => medianAbsoluteDeviation([])).toThrow();
  });
});

describe('trimByMAD', () => {
  it('removes extreme outlier from clustered data', () => {
    const trimmed = trimByMAD([10, 11, 12, 13, 14, 100], 2);
    expect(trimmed).not.toContain(100);
    expect(trimmed.length).toBe(5);
  });

  it('keeps all values when MAD=0 (constant data)', () => {
    expect(trimByMAD([5, 5, 5, 5])).toEqual([5, 5, 5, 5]);
  });

  it('returns empty for empty input', () => {
    expect(trimByMAD([])).toEqual([]);
  });

  it('preserves order of remaining values', () => {
    const trimmed = trimByMAD([10, 11, 1000, 12, 13], 2);
    expect(trimmed).toEqual([10, 11, 12, 13]);
  });

  it('throws on non-positive threshold', () => {
    expect(() => trimByMAD([1, 2, 3], 0)).toThrow();
    expect(() => trimByMAD([1, 2, 3], -1)).toThrow();
  });
});

describe('ewmaWeighted', () => {
  it('returns the single value regardless of lambda', () => {
    expect(ewmaWeighted([10], [0], 0.85)).toBe(10);
  });

  it('reduces to arithmetic mean when all daysAgo are equal', () => {
    expect(ewmaWeighted([2, 4, 6], [0, 0, 0], 0.85)).toBe(4);
  });

  it('weights recent samples more heavily than older ones', () => {
    // day 0: value 10 (full weight), day 5: value 0 (weight ≈ 0.44)
    const result = ewmaWeighted([10, 0], [0, 5], 0.85);
    const arithmetic = (10 + 0) / 2;
    expect(result).toBeGreaterThan(arithmetic);
  });

  it('approaches most recent value as lambda → 0', () => {
    // Very low lambda → older samples nearly ignored; weight of day-1 is 0.01
    const result = ewmaWeighted([100, 1], [0, 1], 0.01);
    expect(result).toBeGreaterThan(99);
  });

  it('approaches arithmetic mean as lambda → 1', () => {
    const result = ewmaWeighted([10, 20], [0, 1], 1.0);
    expect(result).toBe(15);
  });

  it('throws on length mismatch', () => {
    expect(() => ewmaWeighted([1, 2], [0], 0.85)).toThrow(/length mismatch/);
  });

  it('throws on empty', () => {
    expect(() => ewmaWeighted([], [], 0.85)).toThrow(/empty/);
  });

  it('throws on lambda ≤ 0', () => {
    expect(() => ewmaWeighted([1], [0], 0)).toThrow(/lambda/);
    expect(() => ewmaWeighted([1], [0], -0.5)).toThrow(/lambda/);
  });

  it('throws on lambda > 1', () => {
    expect(() => ewmaWeighted([1], [0], 1.5)).toThrow(/lambda/);
  });

  it('throws on negative daysAgo', () => {
    expect(() => ewmaWeighted([1, 2], [0, -1], 0.85)).toThrow(/daysAgo/);
  });
});
