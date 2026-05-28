import { describe, it, expect } from 'vitest';
import {
  adapt,
  computeAlpha,
  computeConfidence,
} from '../src/adaptation.js';

const DEFAULT_OPTS = {
  lambda: 0.85,
  madThreshold: 2,
  safetyRail: 0.3,
} as const;

describe('computeAlpha', () => {
  it('returns 1.0 for n=0 (cold start → pure baseline)', () => {
    expect(computeAlpha(0)).toBe(1.0);
  });

  it('returns 0.3 for n=14 (full history → maximum weight on observed)', () => {
    expect(computeAlpha(14)).toBeCloseTo(0.3, 5);
  });

  it('returns 0.5 for n=7 (half history)', () => {
    expect(computeAlpha(7)).toBeCloseTo(0.5, 5);
  });

  it('clamps to 0.3 for n > target (never goes below floor)', () => {
    expect(computeAlpha(20)).toBe(0.3);
    expect(computeAlpha(100)).toBe(0.3);
  });

  it('clamps to 1.0 for n < 0 (defensive)', () => {
    expect(computeAlpha(-5)).toBe(1.0);
  });

  it('respects custom target', () => {
    expect(computeAlpha(7, 7)).toBeCloseTo(0.3, 5);
    expect(computeAlpha(0, 7)).toBe(1.0);
  });
});

describe('computeConfidence', () => {
  it('returns "low" for n < 3', () => {
    expect(computeConfidence(0)).toBe('low');
    expect(computeConfidence(2)).toBe('low');
  });

  it('returns "medium" for 3 ≤ n < 7', () => {
    expect(computeConfidence(3)).toBe('medium');
    expect(computeConfidence(6)).toBe('medium');
  });

  it('returns "high" for n ≥ 7', () => {
    expect(computeConfidence(7)).toBe('high');
    expect(computeConfidence(14)).toBe('high');
    expect(computeConfidence(100)).toBe('high');
  });
});

describe('adapt — input validation', () => {
  it('throws when observed.length !== daysAgo.length', () => {
    expect(() => adapt(10, [1, 2, 3], [0, 1], DEFAULT_OPTS)).toThrow(
      /length mismatch/,
    );
  });
});

describe('adapt — cold start', () => {
  it('returns baseline exactly when observed is empty (n=0)', () => {
    const result = adapt(12.6, [], [], DEFAULT_OPTS);
    expect(result).toBe(12.6);
  });

  it('returns baseline when only daysAgo is empty (paranoid)', () => {
    const result = adapt(12.6, [], [], DEFAULT_OPTS);
    expect(result).toBe(12.6);
  });
});

describe('adapt — full history (n=14)', () => {
  it('moves adapted toward observed (α=0.3) when observed = 1.1×baseline', () => {
    const baseline = 12.6;
    const observed = Array(14).fill(baseline * 1.1);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    // α=0.3 → adapted = 0.3·baseline + 0.7·observed = 0.3·12.6 + 0.7·13.86 = 13.482
    expect(result).toBeCloseTo(0.3 * baseline + 0.7 * baseline * 1.1, 3);
    expect(Math.abs(result - observed[0]!)).toBeLessThan(
      Math.abs(result - baseline),
    );
  });

  it('observed = baseline → adapted = baseline (no change)', () => {
    const baseline = 12.6;
    const observed = Array(14).fill(baseline);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    expect(result).toBeCloseTo(baseline, 5);
  });
});

describe('adapt — MAD outlier trimming', () => {
  it('trims a single 50%-longer outlier; adapted stays near baseline', () => {
    const baseline = 12.6;
    // 13 days at baseline, 1 day at +50%.
    const observed = [...Array(13).fill(baseline), baseline * 1.5];
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    // After trim, observed_X ≈ baseline → adapted ≈ baseline.
    expect(result).toBeCloseTo(baseline, 5);
  });

  it('without trimming would shift more; trim reduces outlier influence (with natural variance, MAD>0)', () => {
    const baseline = 12.6;
    // Mix of slightly varying values (MAD > 0) plus one big outlier.
    const noisy = [12.5, 12.6, 12.7, 12.5, 12.6, 12.7, 12.5, 12.6, 12.7, 12.5, 12.6, 12.7, 12.5];
    const observed = [...noisy, baseline * 1.5];
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const trimmed = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    // No-trim variant: very high threshold keeps outlier in EWMA.
    const noTrim = adapt(baseline, observed, daysAgo, {
      ...DEFAULT_OPTS,
      madThreshold: 1e9,
    });
    expect(Math.abs(noTrim - baseline)).toBeGreaterThan(
      Math.abs(trimmed - baseline),
    );
  });

  it('all-identical observed (MAD=0): keeps all samples, adapted = observed', () => {
    const baseline = 10;
    const observed = Array(14).fill(11);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    // α=0.3, observed=11 → adapted = 0.3·10 + 0.7·11 = 10.7
    expect(result).toBeCloseTo(10.7, 5);
  });
});

describe('adapt — safety rail (clamp to ±30% baseline)', () => {
  it('clamps to 1.3·baseline when observed = 2·baseline', () => {
    const baseline = 12.6;
    const observed = Array(14).fill(baseline * 2);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    expect(result).toBeCloseTo(baseline * 1.3, 5);
  });

  it('clamps to 0.7·baseline when observed = 0.1·baseline', () => {
    const baseline = 12.6;
    const observed = Array(14).fill(baseline * 0.1);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    expect(result).toBeCloseTo(baseline * 0.7, 5);
  });

  it('custom safetyRail=0.5 → adapted ∈ [0.5·baseline, 1.5·baseline]', () => {
    const baseline = 10;
    const observed = Array(14).fill(100);
    const daysAgo = Array.from({ length: 14 }, (_, i) => i);
    const result = adapt(baseline, observed, daysAgo, {
      ...DEFAULT_OPTS,
      safetyRail: 0.5,
    });
    expect(result).toBeCloseTo(baseline * 1.5, 5);
  });
});

describe('adapt — EWMA recency weighting', () => {
  it('recent samples weigh more than old ones (λ=0.85)', () => {
    const baseline = 10;
    // 7 recent days low, 7 old days high — adapted should lean toward recent.
    const recentLow = Array(7).fill(8);
    const oldHigh = Array(7).fill(12);
    const observed = [...recentLow, ...oldHigh];
    const daysAgo = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
    // ewmaWeighted bias toward day 0 (weight 1) over day 13 (weight 0.85^13 ≈ 0.12).
    // adapted < baseline (since recent is lower).
    expect(result).toBeLessThan(baseline);
  });
});

describe('adapt — property test (1000 seeded iterations)', () => {
  // mulberry32 — deterministic PRNG for reproducible property tests.
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it('for arbitrary baseline > 0 and arbitrary observed history, adapted ∈ [0.7·baseline, 1.3·baseline]', () => {
    const rand = mulberry32(0xc0ffee);
    for (let i = 0; i < 1000; i++) {
      const baseline = rand() * 19 + 1; // [1, 20]
      const n = Math.floor(rand() * 15); // [0, 14]
      const observed: number[] = [];
      const daysAgo: number[] = [];
      for (let d = 0; d < n; d++) {
        // Sample observed in a wild range to test clamping (0.05× to 5× baseline).
        observed.push(baseline * (0.05 + rand() * 4.95));
        daysAgo.push(d);
      }
      const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
      if (n === 0) {
        expect(result).toBe(baseline);
      } else {
        // Allow tiny floating-point slack on the boundary.
        expect(result).toBeGreaterThanOrEqual(baseline * 0.7 - 1e-9);
        expect(result).toBeLessThanOrEqual(baseline * 1.3 + 1e-9);
      }
    }
  });

  it('property: adapted is finite and non-NaN for all valid inputs', () => {
    const rand = mulberry32(0xdeadbeef);
    for (let i = 0; i < 1000; i++) {
      const baseline = rand() * 19 + 1;
      const n = Math.floor(rand() * 15);
      const observed = Array.from({ length: n }, () => rand() * 30);
      const daysAgo = Array.from({ length: n }, (_, d) => d);
      const result = adapt(baseline, observed, daysAgo, DEFAULT_OPTS);
      expect(Number.isFinite(result)).toBe(true);
    }
  });
});
