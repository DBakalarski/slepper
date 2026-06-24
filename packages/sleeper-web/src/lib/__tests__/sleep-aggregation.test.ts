import { describe, expect, it } from 'vitest';

import {
  averageNapCount,
  averageSleepMs,
  averageSleepMsLastDays,
  bedtimeRegularityMinutes,
  dailySleepSeries,
  morningWakeRange,
  sleepForm,
} from '@/lib/sleep-aggregation';
import type { SleepSession } from '@/features/sessions/hooks';

const HOUR = 60 * 60 * 1000;

// Helper: sesja w UTC. App tz = Europe/Warsaw (lato = UTC+2). Czasy dobieram tak,
// by konwersja do app tz byla jednoznaczna (z dala od polnocy).
function session(
  type: 'nap' | 'night_sleep',
  startIso: string,
  endIso: string | null,
): SleepSession {
  return {
    id: `${type}-${startIso}`,
    child_id: 'c1',
    type,
    start_at: startIso,
    end_at: endIso,
    notes: null,
    created_by: 'u1',
    created_at: startIso,
  };
}

describe('dailySleepSeries', () => {
  // Zakres: 2 dni [2026-06-20, 2026-06-22) w app tz.
  const rangeStart = new Date('2026-06-20T00:00:00+02:00');
  const rangeEnd = new Date('2026-06-22T00:00:00+02:00');

  it('sumuje sen i liczy drzemki per dzien; dzien bez snu = 0', () => {
    const sessions = [
      session('nap', '2026-06-20T10:00:00+02:00', '2026-06-20T11:00:00+02:00'),
      session('nap', '2026-06-20T14:00:00+02:00', '2026-06-20T15:30:00+02:00'),
    ];
    const series = dailySleepSeries(sessions, rangeStart, rangeEnd);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ dayKey: '2026-06-20', totalSleepMs: 2.5 * HOUR, napCount: 2 });
    expect(series[1]).toEqual({ dayKey: '2026-06-21', totalSleepMs: 0, napCount: 0 });
  });

  it('dzieli sesje cross-midnight proporcjonalnie miedzy dni', () => {
    // Sen nocny 23:00 -> 06:00 (1h dnia 20., 6h dnia 21.).
    const sessions = [
      session('night_sleep', '2026-06-20T23:00:00+02:00', '2026-06-21T06:00:00+02:00'),
    ];
    const series = dailySleepSeries(sessions, rangeStart, rangeEnd);
    expect(series[0].totalSleepMs).toBe(1 * HOUR);
    expect(series[1].totalSleepMs).toBe(6 * HOUR);
    // night_sleep nie liczy sie do napCount
    expect(series[0].napCount).toBe(0);
  });

  it('pomija sesje w toku (end_at null)', () => {
    const sessions = [session('nap', '2026-06-20T10:00:00+02:00', null)];
    const series = dailySleepSeries(sessions, rangeStart, rangeEnd);
    expect(series[0].totalSleepMs).toBe(0);
    expect(series[0].napCount).toBe(0);
  });
});

describe('bedtimeRegularityMinutes', () => {
  it('null gdy brak snu nocnego', () => {
    const sessions = [session('nap', '2026-06-20T10:00:00+02:00', '2026-06-20T11:00:00+02:00')];
    expect(bedtimeRegularityMinutes(sessions)).toBeNull();
  });

  it('stdDev = 0 dla jednej probki, mean = pora zasypiania', () => {
    const sessions = [
      session('night_sleep', '2026-06-20T20:00:00+02:00', '2026-06-21T06:00:00+02:00'),
    ];
    const result = bedtimeRegularityMinutes(sessions);
    expect(result).not.toBeNull();
    expect(result?.stdDevMinutes).toBe(0);
    expect(result?.meanMinutes).toBe(20 * 60); // 20:00 = 1200 min
    expect(result?.count).toBe(1);
  });

  it('liczy odchylenie dla zasypiania 20:00 i 21:00 (mean 20:30, sd 30)', () => {
    const sessions = [
      session('night_sleep', '2026-06-20T20:00:00+02:00', '2026-06-21T06:00:00+02:00'),
      session('night_sleep', '2026-06-21T21:00:00+02:00', '2026-06-22T06:00:00+02:00'),
    ];
    const result = bedtimeRegularityMinutes(sessions);
    expect(result?.meanMinutes).toBe(20 * 60 + 30); // 20:30
    expect(result?.stdDevMinutes).toBe(30);
  });
});

describe('morningWakeRange', () => {
  it('zwraca min/max pobudki z end_at snu nocnego', () => {
    const sessions = [
      session('night_sleep', '2026-06-20T20:00:00+02:00', '2026-06-21T06:10:00+02:00'),
      session('night_sleep', '2026-06-21T20:00:00+02:00', '2026-06-22T07:05:00+02:00'),
    ];
    const result = morningWakeRange(sessions);
    expect(result?.earliestMinutes).toBe(6 * 60 + 10);
    expect(result?.latestMinutes).toBe(7 * 60 + 5);
    expect(result?.count).toBe(2);
  });

  it('null gdy brak snu nocnego', () => {
    expect(morningWakeRange([])).toBeNull();
  });
});

describe('averages', () => {
  const series = [
    { dayKey: '2026-06-20', totalSleepMs: 12 * HOUR, napCount: 3 },
    { dayKey: '2026-06-21', totalSleepMs: 0, napCount: 0 }, // dzien bez danych pomijany
    { dayKey: '2026-06-22', totalSleepMs: 14 * HOUR, napCount: 1 },
  ];

  it('averageSleepMs liczy tylko dni z danymi', () => {
    expect(averageSleepMs(series)).toBe(13 * HOUR);
  });

  it('averageNapCount liczy tylko dni z danymi', () => {
    expect(averageNapCount(series)).toBe(2);
  });

  it('averageSleepMsLastDays bierze ostatnie n dni z danymi', () => {
    expect(averageSleepMsLastDays(series, 1)).toBe(14 * HOUR);
    expect(averageSleepMsLastDays(series, 2)).toBe(13 * HOUR);
  });

  it('zwraca 0 dla pustej serii', () => {
    expect(averageSleepMs([])).toBe(0);
    expect(averageNapCount([])).toBe(0);
    expect(averageSleepMsLastDays([], 3)).toBe(0);
  });
});

describe('sleepForm', () => {
  const norm = { minHours: 11, maxHours: 14 };

  it('good gdy w pasmie normy', () => {
    expect(sleepForm(12, norm)).toBe('good');
    expect(sleepForm(11, norm)).toBe('good');
    expect(sleepForm(14, norm)).toBe('good');
  });

  it('ok gdy lekko poza pasmem (do 15% krawedzi)', () => {
    expect(sleepForm(10.5, norm)).toBe('ok'); // min 11, okFloor = 11*0.85 = 9.35
    expect(sleepForm(15, norm)).toBe('ok'); // max 14, okCeil = 14*1.15 = 16.1
  });

  it('poor gdy daleko poza pasmem lub brak danych', () => {
    expect(sleepForm(9, norm)).toBe('poor'); // < okFloor 9.35
    expect(sleepForm(17, norm)).toBe('poor'); // > okCeil 16.1
    expect(sleepForm(0, norm)).toBe('poor'); // brak danych
  });
});
