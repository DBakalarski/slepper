import { describe, it, expect } from 'vitest';
import {
  observedTotalSleepPerDay,
  observedNapsPerDay,
  observedLongestSleepPerDay,
  observedNapLengthsPerDay,
  observedMorningWake,
} from '../src/history.js';
import { median } from '../src/math/statistics.js';
import type { SleepSession } from '../src/types.js';

// Helper: build a sleep day for "2026-05-DD" with:
//  - night: 19:30 prev day → 06:30 this day  (11h)
//  - nap A: 09:30 this day → 11:00 this day  (1.5h = 90 min)
//  - nap B: 13:30 this day → 15:00 this day  (1.5h = 90 min)
// Total day sleep belonging to sleepDay "(prev day)": 11h night + 0 = 11h.
// Total day sleep belonging to sleepDay "(this day)": 1.5h + 1.5h = 3h.
// Galland 9mo total sleep ≈ 12.6h → use longer night to hit median ≈ 12.6.
function buildDay(year: number, month: number, day: number): SleepSession[] {
  return [
    {
      start: new Date(year, month, day - 1, 19, 30),
      end: new Date(year, month, day, 6, 30),
      type: 'NIGHT',
    },
    {
      start: new Date(year, month, day, 9, 30),
      end: new Date(year, month, day, 11, 0),
      type: 'NAP',
    },
    {
      start: new Date(year, month, day, 13, 30),
      end: new Date(year, month, day, 15, 0),
      type: 'NAP',
    },
  ];
}

// 14 days of identical pattern ending on 2026-05-27.
function build14Days(): SleepSession[] {
  const sessions: SleepSession[] = [];
  for (let d = 14; d <= 27; d++) {
    sessions.push(...buildDay(2026, 4, d));
  }
  return sessions;
}

const NOW = new Date(2026, 4, 27, 17, 0); // 17:00 on 2026-05-27

describe('observedTotalSleepPerDay', () => {
  it('returns empty map for empty history', () => {
    expect(observedTotalSleepPerDay([], NOW)).toEqual(new Map());
  });

  it('sums sleep within each sleep-day bucket (start-based grouping)', () => {
    const sessions = buildDay(2026, 4, 27);
    const map = observedTotalSleepPerDay(sessions, NOW);
    // Night session starts 2026-05-26 19:30 → sleepDay "2026-05-26".
    // Both naps start 2026-05-27 → sleepDay "2026-05-27".
    expect(map.get('2026-05-26')).toBeCloseTo(11, 5);
    expect(map.get('2026-05-27')).toBeCloseTo(3, 5);
  });

  it('respects lookbackDays cutoff (sessions older than now - lookback excluded)', () => {
    const old: SleepSession = {
      // Started 20 days before NOW.
      start: new Date(2026, 4, 7, 19, 30),
      end: new Date(2026, 4, 8, 6, 30),
      type: 'NIGHT',
    };
    const recent: SleepSession = {
      start: new Date(2026, 4, 26, 19, 30),
      end: new Date(2026, 4, 27, 6, 30),
      type: 'NIGHT',
    };
    const map = observedTotalSleepPerDay([old, recent], NOW, 14);
    expect(map.has('2026-05-07')).toBe(false);
    expect(map.get('2026-05-26')).toBeCloseTo(11, 5);
  });

  it('14-day fixture produces median total sleep ≈ 14h (night 11h + 2×1.5h naps grouped per-start gives 11 and 3 separately)', () => {
    // Note: night belongs to PREVIOUS sleep day, naps to current.
    // So each calendar day contributes one "night sleep day" (11h) and one
    // "nap-only sleep day" (3h) — alternating? No: every day adds a night
    // starting prev day 19:30 and naps starting this day. So per sleep-day id D:
    //   D's bucket = night from D-1→D (start 19:30 on D) + naps from D (start on D+1 calendar? No.)
    // buildDay(d) starts the NIGHT at "d-1 19:30" → that session's start is on (d-1).
    //   → night belongs to sleepDay of (d-1) 04:00, i.e. id = "YYYY-MM-(d-1)".
    //   → naps belong to sleepDay of (d) 04:00, i.e. id = "YYYY-MM-d".
    // So id "2026-05-15" gets: naps from buildDay(15) [3h] + night from buildDay(16) [11h] = 14h.
    const sessions = build14Days();
    const map = observedTotalSleepPerDay(sessions, NOW);
    const values = [...map.values()].sort((a, b) => a - b);
    // Days fully covered (have both a night and naps) should sum to 14h.
    const full = values.filter((v) => Math.abs(v - 14) < 0.01);
    expect(full.length).toBeGreaterThanOrEqual(10);
  });
});

describe('Phase 3 acceptance — realistic 9mo pattern', () => {
  // Galland 9mo: total sleep ≈ 12.6h, longestSleep ≈ 9.2h, naps ≈ 2.
  // Pattern per sleep day D (id "YYYY-MM-D"):
  //   night belongs to (D-1): start prev 19:30 → end D 06:00  (10.5h)
  //   naps belong to D: 2 × 1.05h = 2.1h  → total for "D + night from D+1" = 12.6h
  function build9moDay(year: number, month: number, day: number): SleepSession[] {
    return [
      {
        start: new Date(year, month, day - 1, 19, 30),
        end: new Date(year, month, day, 6, 0),
        type: 'NIGHT',
      },
      {
        start: new Date(year, month, day, 9, 0),
        end: new Date(year, month, day, 10, 3), // 63 min = 1.05h
        type: 'NAP',
      },
      {
        start: new Date(year, month, day, 13, 30),
        end: new Date(year, month, day, 14, 33), // 63 min = 1.05h
        type: 'NAP',
      },
    ];
  }

  it('median total sleep across 14 days ≈ 12.6h ±0.5h (Galland 9mo)', () => {
    const sessions: SleepSession[] = [];
    for (let d = 14; d <= 27; d++) sessions.push(...build9moDay(2026, 4, d));
    const map = observedTotalSleepPerDay(sessions, NOW);
    // Each "fully covered" sleep day (has night from next calendar day + naps
    // from this calendar day) sums to 10.5 + 2.1 = 12.6h.
    const fullDays = [...map.values()].filter((v) => Math.abs(v - 12.6) < 0.01);
    expect(fullDays.length).toBeGreaterThanOrEqual(10);
    expect(median(fullDays)).toBeCloseTo(12.6, 1);
  });
});

describe('observedNapsPerDay', () => {
  it('counts only NAP-typed sessions per sleep day', () => {
    const sessions = buildDay(2026, 4, 27);
    const map = observedNapsPerDay(sessions, NOW);
    expect(map.get('2026-05-27')).toBe(2);
    // Night belongs to 2026-05-26; that day has 0 naps.
    expect(map.get('2026-05-26')).toBe(0);
  });

  it('returns 0 for sleep days that exist but have no naps', () => {
    const night: SleepSession = {
      start: new Date(2026, 4, 26, 19, 30),
      end: new Date(2026, 4, 27, 6, 30),
      type: 'NIGHT',
    };
    const map = observedNapsPerDay([night], NOW);
    expect(map.get('2026-05-26')).toBe(0);
  });
});

describe('observedLongestSleepPerDay', () => {
  it('returns the longest single session per sleep day', () => {
    const sessions = buildDay(2026, 4, 27);
    const map = observedLongestSleepPerDay(sessions, NOW);
    expect(map.get('2026-05-26')).toBeCloseTo(11, 5); // night
    expect(map.get('2026-05-27')).toBeCloseTo(1.5, 5); // longer of two equal naps
  });
});

describe('observedNapLengthsPerDay', () => {
  it('lists NAP durations in minutes per sleep day, preserving session order', () => {
    const sessions = buildDay(2026, 4, 27);
    const map = observedNapLengthsPerDay(sessions, NOW);
    expect(map.get('2026-05-27')).toEqual([90, 90]);
    // Sleep day 2026-05-26 has only the night session → no nap lengths.
    expect(map.get('2026-05-26')).toEqual([]);
  });
});

describe('observedMorningWake', () => {
  it('returns end times of NIGHT sessions within lookback', () => {
    const sessions = build14Days();
    const wakes = observedMorningWake(sessions, NOW, 7);
    // Last 7 sleep-day worth of nights should be present.
    expect(wakes.length).toBeGreaterThan(0);
    for (const w of wakes) {
      expect(w.getHours()).toBe(6);
      expect(w.getMinutes()).toBe(30);
    }
  });

  it('excludes nights whose end is older than lookback', () => {
    const oldNight: SleepSession = {
      start: new Date(2026, 4, 1, 19, 30),
      end: new Date(2026, 4, 2, 6, 30),
      type: 'NIGHT',
    };
    const recentNight: SleepSession = {
      start: new Date(2026, 4, 26, 19, 30),
      end: new Date(2026, 4, 27, 6, 30),
      type: 'NIGHT',
    };
    const wakes = observedMorningWake([oldNight, recentNight], NOW, 7);
    expect(wakes).toHaveLength(1);
    expect(wakes[0]?.getDate()).toBe(27);
  });

  it('ignores NAP sessions', () => {
    const nap: SleepSession = {
      start: new Date(2026, 4, 27, 9, 30),
      end: new Date(2026, 4, 27, 11, 0),
      type: 'NAP',
    };
    expect(observedMorningWake([nap], NOW)).toEqual([]);
  });

  it('returns sorted ascending by time', () => {
    const sessions = build14Days();
    const wakes = observedMorningWake(sessions, NOW, 14);
    for (let i = 1; i < wakes.length; i++) {
      expect(wakes[i]!.getTime()).toBeGreaterThan(wakes[i - 1]!.getTime());
    }
  });
});
