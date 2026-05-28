import { describe, it, expect } from 'vitest';
import { decideNapsToday } from '../src/napCount.js';

describe('decideNapsToday — cold start (no history)', () => {
  it('returns round(adapted) with no warning when observed7d is empty', () => {
    const r = decideNapsToday(2.1, 2, []);
    expect(r.naps).toBe(2);
    expect(r.transitionWarning).toBe(false);
  });

  it('rounds adapted up correctly', () => {
    const r = decideNapsToday(2.7, 3, []);
    expect(r.naps).toBe(3);
    expect(r.transitionWarning).toBe(false);
  });

  it('skips transition detection when < 3 samples (insufficient data)', () => {
    // [0] alone would otherwise look like a 2→0 transition vs baseline=2.
    const r1 = decideNapsToday(1.8, 2, [0]);
    expect(r1.transitionWarning).toBe(false);
    expect(r1.naps).toBe(2); // round(1.8)
    const r2 = decideNapsToday(1.8, 2, [0, 0]);
    expect(r2.transitionWarning).toBe(false);
  });

  it('engages transition detection at exactly 3 samples', () => {
    const r = decideNapsToday(1.8, 2, [1, 1, 1]);
    expect(r.transitionWarning).toBe(true);
    expect(r.naps).toBe(1);
  });
});

describe('decideNapsToday — stable schedule (no transition)', () => {
  it('no warning when observed median equals round(baseline)', () => {
    const r = decideNapsToday(2.1, 2, [2, 2, 2, 2, 2, 2, 2]);
    expect(r.naps).toBe(2);
    expect(r.transitionWarning).toBe(false);
  });

  it('no warning for small fluctuation (|median − baseline| < 1)', () => {
    const r = decideNapsToday(2.1, 2, [2, 3, 2, 1, 2, 2, 3]);
    // sorted: [1,2,2,2,2,3,3] → median=2 → |2−2|=0 → no transition
    expect(r.naps).toBe(2);
    expect(r.transitionWarning).toBe(false);
  });
});

describe('decideNapsToday — transition detection', () => {
  it('detects 2→1 transition (baseline=2, observed all 1)', () => {
    const r = decideNapsToday(1.8, 2, [1, 1, 1, 1, 1, 1, 1]);
    expect(r.naps).toBe(1);
    expect(r.transitionWarning).toBe(true);
  });

  it('detects 3→2 transition (baseline=3, observed all 2)', () => {
    const r = decideNapsToday(2.5, 3, [2, 2, 2, 2, 2, 2, 2]);
    expect(r.naps).toBe(2);
    expect(r.transitionWarning).toBe(true);
  });

  it('detects upward transition (1→2, baseline=1, observed all 2)', () => {
    const r = decideNapsToday(1.5, 1, [2, 2, 2, 2, 2, 2, 2]);
    expect(r.naps).toBe(2);
    expect(r.transitionWarning).toBe(true);
  });

  it('uses round(baseline) for transition check, not raw float', () => {
    // round(1.6)=2, median=1 → |1−2|=1 → transition
    const r = decideNapsToday(1.6, 1.6, [1, 1, 1, 1, 1, 1, 1]);
    expect(r.naps).toBe(1);
    expect(r.transitionWarning).toBe(true);
  });
});

describe('decideNapsToday — non-negative output', () => {
  it('clamps to 0 if median is somehow negative (defensive)', () => {
    const r = decideNapsToday(1, 1, [0, 0, 0, 0, 0, 0, 0]);
    expect(r.naps).toBe(0);
    expect(r.transitionWarning).toBe(true);
  });
});
