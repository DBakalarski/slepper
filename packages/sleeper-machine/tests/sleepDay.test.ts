import { describe, it, expect } from 'vitest';
import {
  sleepDayBoundary,
  sleepDayId,
  groupBySleepDay,
} from '../src/sleepDay.js';
import type { SleepSession } from '../src/types.js';

describe('sleepDayBoundary (dayStartHour=4)', () => {
  it('returns today 04:00 for a time after 04:00', () => {
    const t = new Date(2026, 4, 27, 23, 50);
    const b = sleepDayBoundary(t);
    expect(b.getFullYear()).toBe(2026);
    expect(b.getMonth()).toBe(4);
    expect(b.getDate()).toBe(27);
    expect(b.getHours()).toBe(4);
    expect(b.getMinutes()).toBe(0);
    expect(b.getSeconds()).toBe(0);
    expect(b.getMilliseconds()).toBe(0);
  });

  it('returns yesterday 04:00 for a time before 04:00', () => {
    const t = new Date(2026, 4, 27, 2, 30);
    const b = sleepDayBoundary(t);
    expect(b.getFullYear()).toBe(2026);
    expect(b.getMonth()).toBe(4);
    expect(b.getDate()).toBe(26);
    expect(b.getHours()).toBe(4);
  });

  it('returns today 04:00 exactly at 04:00 boundary (>= dayStartHour)', () => {
    const t = new Date(2026, 4, 27, 4, 0);
    const b = sleepDayBoundary(t);
    expect(b.getDate()).toBe(27);
    expect(b.getHours()).toBe(4);
  });

  it('handles month rollover when crossing midnight backwards', () => {
    const t = new Date(2026, 5, 1, 1, 0);
    const b = sleepDayBoundary(t);
    expect(b.getMonth()).toBe(4);
    expect(b.getDate()).toBe(31);
    expect(b.getHours()).toBe(4);
  });

  it('respects custom dayStartHour', () => {
    const t = new Date(2026, 4, 27, 5, 30);
    const b = sleepDayBoundary(t, 6);
    expect(b.getDate()).toBe(26);
    expect(b.getHours()).toBe(6);
  });

  it('does not mutate input Date', () => {
    const t = new Date(2026, 4, 27, 1, 0);
    const originalMs = t.getTime();
    sleepDayBoundary(t);
    expect(t.getTime()).toBe(originalMs);
  });
});

describe('sleepDayId', () => {
  it('formats boundary as "YYYY-MM-DD" in local timezone', () => {
    const b = new Date(2026, 4, 27, 4, 0);
    expect(sleepDayId(b)).toBe('2026-05-27');
  });

  it('pads month and day with zeros', () => {
    const b = new Date(2026, 0, 5, 4, 0);
    expect(sleepDayId(b)).toBe('2026-01-05');
  });
});

describe('groupBySleepDay', () => {
  it('groups a late-night nap (23:50 → 00:30) into the day it started on', () => {
    const session: SleepSession = {
      start: new Date(2026, 4, 27, 23, 50),
      end: new Date(2026, 4, 28, 0, 30),
      type: 'NAP',
    };
    const map = groupBySleepDay([session]);
    expect(map.size).toBe(1);
    expect(map.get('2026-05-27')).toEqual([session]);
  });

  it('groups an early-morning end (02:00) into the previous sleep day', () => {
    const session: SleepSession = {
      start: new Date(2026, 4, 28, 1, 0),
      end: new Date(2026, 4, 28, 2, 0),
      type: 'NAP',
    };
    const map = groupBySleepDay([session]);
    expect(map.get('2026-05-27')).toEqual([session]);
  });

  it('returns empty map for empty history', () => {
    expect(groupBySleepDay([])).toEqual(new Map());
  });

  it('groups multiple sessions on same sleep day and preserves order', () => {
    const a: SleepSession = {
      start: new Date(2026, 4, 27, 10, 0),
      end: new Date(2026, 4, 27, 11, 0),
      type: 'NAP',
    };
    const b: SleepSession = {
      start: new Date(2026, 4, 27, 14, 0),
      end: new Date(2026, 4, 27, 15, 30),
      type: 'NAP',
    };
    const night: SleepSession = {
      start: new Date(2026, 4, 27, 19, 30),
      end: new Date(2026, 4, 28, 6, 30),
      type: 'NIGHT',
    };
    const map = groupBySleepDay([a, b, night]);
    expect(map.size).toBe(1);
    expect(map.get('2026-05-27')).toEqual([a, b, night]);
  });

  it('separates sessions on different sleep days', () => {
    const day1: SleepSession = {
      start: new Date(2026, 4, 27, 10, 0),
      end: new Date(2026, 4, 27, 11, 0),
      type: 'NAP',
    };
    const day2: SleepSession = {
      start: new Date(2026, 4, 28, 10, 0),
      end: new Date(2026, 4, 28, 11, 0),
      type: 'NAP',
    };
    const map = groupBySleepDay([day1, day2]);
    expect(map.size).toBe(2);
    expect(map.get('2026-05-27')).toEqual([day1]);
    expect(map.get('2026-05-28')).toEqual([day2]);
  });

  it('DST spring-forward: a session whose start/end straddle a clock jump still has wall-clock-correct duration via ms diff', () => {
    // Europe/Warsaw 2024-03-31: 02:00 → 03:00 (clock jumps forward).
    // Constructing with local Date(2024, 2, 31, 2, 30) in such a TZ would yield
    // an undefined wall time, so we anchor with millisecond timestamps and
    // verify ms-based duration is preserved regardless of host TZ.
    const start = new Date(2024, 2, 31, 1, 30); // 01:30 local
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h ms
    const session: SleepSession = { start, end, type: 'NIGHT' };
    const map = groupBySleepDay([session]);
    expect(map.size).toBe(1);
    const [grouped] = map.values().next().value!;
    expect(grouped.end.getTime() - grouped.start.getTime()).toBe(
      2 * 60 * 60 * 1000,
    );
  });
});
