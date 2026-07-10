import { describe, expect, it } from 'vitest';

import type { PlanEntry } from 'sleeper-machine';

import { computeDayForecast } from '@/lib/day-forecast';
import type { SleepSession } from '@/features/sessions/hooks';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

// Helper: sesja app w UTC. App tz = Europe/Warsaw.
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
    tags: [],
    created_by: 'u1',
    created_at: startIso,
  };
}

// Helper: wpis planu (sleeper-machine `PlanEntry`).
function planEntry(type: 'NAP' | 'NIGHT', startIso: string, endIso?: string): PlanEntry {
  return {
    plannedStart: new Date(startIso),
    plannedEnd: endIso ? new Date(endIso) : undefined,
    type,
  };
}

// birthDate dobrany tak, zeby dziecko bylo w buckecie "infant" (12-16h/dobe)
// wzgledem podanego `now`.
const INFANT_BIRTH = new Date('2026-01-01T00:00:00Z'); // ~6mo przed czerwcowymi testami

describe('computeDayForecast', () => {
  it('liczy tylko czesc nocy w dobie (ogon cross-midnight) + drzemke; plan sumuje dalsze wpisy', () => {
    const now = new Date('2026-06-15T10:00:00+02:00'); // 10:00 Warsaw
    const sessions = [
      session('night_sleep', '2026-06-14T22:00:00+02:00', '2026-06-15T06:30:00+02:00'),
      session('nap', '2026-06-15T07:00:00+02:00', '2026-06-15T08:00:00+02:00'),
    ];
    const plan: PlanEntry[] = [
      planEntry('NAP', '2026-06-15T12:00:00+02:00', '2026-06-15T13:30:00+02:00'),
      planEntry('NAP', '2026-06-15T16:00:00+02:00', '2026-06-15T17:00:00+02:00'),
      planEntry('NIGHT', '2026-06-15T19:00:00+02:00', '2026-06-16T06:00:00+02:00'), // cross-midnight
    ];

    const forecast = computeDayForecast(sessions, plan, now, INFANT_BIRTH);

    // Noc liczy sie tylko od 00:00 do 06:30 (6.5h), nie od 22:00 dnia poprzedniego.
    expect(forecast.actualMs).toBe(6.5 * HOUR + 1 * HOUR);
    // Plan nocny obciety do konca doby (19:00 -> 24:00 = 5h), nie do 06:00 nastepnego dnia.
    expect(forecast.plannedMs).toBe(1.5 * HOUR + 1 * HOUR + 5 * HOUR);
    expect(forecast.predictedTotalMs).toBe(forecast.actualMs + forecast.plannedMs);
  });

  it('sesja w toku liczona start->now w faktach; plan clampowany od now', () => {
    const now = new Date('2026-06-15T13:25:00+02:00'); // 13:25 Warsaw
    const sessions = [session('nap', '2026-06-15T13:00:00+02:00', null)]; // 13:00 start, w toku
    const plan: PlanEntry[] = [
      // Prognoza konca tej samej drzemki o 14:00 -> od `now` do 14:00 = 35 min.
      planEntry('NAP', '2026-06-15T13:00:00+02:00', '2026-06-15T14:00:00+02:00'),
    ];

    const forecast = computeDayForecast(sessions, plan, now, INFANT_BIRTH);

    expect(forecast.actualMs).toBe(25 * MINUTE);
    expect(forecast.plannedMs).toBe(35 * MINUTE);
  });

  it('noc w toku o 2:00 -> fakt liczony 00:00->02:00, plan do pobudki, verdict bez absurdalnego minusa', () => {
    const now = new Date('2026-06-15T02:00:00+02:00'); // 02:00 Warsaw
    const sessions = [session('night_sleep', '2026-06-14T21:00:00+02:00', null)]; // start wczoraj 21:00, w toku
    const plan: PlanEntry[] = [
      // Ta sama noc, plan do pobudki o 07:00.
      planEntry('NIGHT', '2026-06-14T21:00:00+02:00', '2026-06-15T07:00:00+02:00'),
    ];
    // Newborn (14-17h/dobe) -> total 7h wyraznie ponizej minimum, ale delta ma
    // byc skonczona i dodatnia (nie absurdalny ujemny wynik z podwojnego liczenia).
    const newbornBirth = new Date('2026-05-20T00:00:00Z');

    const forecast = computeDayForecast(sessions, plan, now, newbornBirth);

    expect(forecast.actualMs).toBe(2 * HOUR); // 00:00 -> 02:00
    expect(forecast.plannedMs).toBe(5 * HOUR); // 02:00 -> 07:00
    expect(forecast.predictedTotalMs).toBe(7 * HOUR);
    expect(forecast.verdict).toBe('below');
    expect(forecast.deltaMs).toBeGreaterThan(0);
    expect(forecast.deltaMs).toBe(forecast.norm.minHours * HOUR - 7 * HOUR);
  });

  it('verdict: within (delta 0), below (delta do min), above (delta do max)', () => {
    const now = new Date('2026-06-15T08:00:00+02:00'); // 08:00 Warsaw
    // Norma infant: 12-16h/dobe.

    const within = computeDayForecast(
      [],
      [planEntry('NIGHT', now.toISOString(), addHours(now, 14).toISOString())],
      now,
      INFANT_BIRTH,
    );
    expect(within.verdict).toBe('within');
    expect(within.deltaMs).toBe(0);

    const below = computeDayForecast(
      [],
      [planEntry('NIGHT', now.toISOString(), addHours(now, 10).toISOString())],
      now,
      INFANT_BIRTH,
    );
    expect(below.verdict).toBe('below');
    expect(below.deltaMs).toBe(2 * HOUR); // norm min 12h, prognoza 10h

    // Reszta doby od `now` (08:00) do polnocy to tylko 16h (== max normy),
    // wiec samym planem nie da sie przekroczyc gornej granicy w obrebie doby.
    // Dokladamy 1h juz przespana dzisiaj + plan na cala reszte doby (16h).
    const aboveSessions = [session('nap', '2026-06-15T04:00:00+02:00', '2026-06-15T05:00:00+02:00')];
    const above = computeDayForecast(
      aboveSessions,
      [planEntry('NIGHT', now.toISOString(), '2026-06-16T00:00:00+02:00')],
      now,
      INFANT_BIRTH,
    );
    expect(above.actualMs).toBe(1 * HOUR);
    expect(above.plannedMs).toBe(16 * HOUR);
    expect(above.verdict).toBe('above');
    expect(above.deltaMs).toBe(1 * HOUR); // norm max 16h, prognoza 17h
  });

  it('dzien zmiany czasu marzec (doba 23h) -> plan liczony do realnego konca doby, nie +24h', () => {
    // Warszawa: 2026-03-29 -> zmiana z CET (+1) na CEST (+2) o 02:00. Doba ma 23h:
    // startOfDay = 2026-03-28T23:00:00Z, endOfDay = 2026-03-29T22:00:00Z.
    const now = new Date('2026-03-29T12:00:00Z');
    const plan: PlanEntry[] = [planEntry('NIGHT', now.toISOString())]; // brak plannedEnd -> do konca doby

    const forecast = computeDayForecast([], plan, now, INFANT_BIRTH);

    // Realny koniec doby to 22:00Z (nie 23:00Z, co dalby naiwny +24h od dayStart).
    expect(forecast.plannedMs).toBe(10 * HOUR);
  });

  it('dzien zmiany czasu pazdziernik (doba 25h) -> plan liczony do realnego konca doby', () => {
    // Warszawa: 2026-10-25 -> zmiana z CEST (+2) na CET (+1) o 03:00. Doba ma 25h:
    // startOfDay = 2026-10-24T22:00:00Z, endOfDay = 2026-10-25T23:00:00Z.
    const now = new Date('2026-10-25T10:00:00Z');
    const plan: PlanEntry[] = [planEntry('NIGHT', now.toISOString())]; // brak plannedEnd -> do konca doby

    const forecast = computeDayForecast([], plan, now, INFANT_BIRTH);

    // Realny koniec doby to 23:00Z (nie 22:00Z, co dalby naiwny +24h od dayStart).
    expect(forecast.plannedMs).toBe(13 * HOUR);
  });

  it('pusty dzien (cold start, brak sesji) -> prognoza = sam plan', () => {
    const now = new Date('2026-06-15T08:00:00+02:00'); // 08:00 Warsaw
    const plan: PlanEntry[] = [planEntry('NIGHT', now.toISOString(), addHours(now, 13).toISOString())];

    const forecast = computeDayForecast([], plan, now, INFANT_BIRTH);

    expect(forecast.actualMs).toBe(0);
    expect(forecast.predictedTotalMs).toBe(forecast.plannedMs);
    expect(forecast.plannedMs).toBe(13 * HOUR);
  });

  it('sesja z uszkodzonymi danymi (end_at przed start_at) nie liczy sie na minus', () => {
    const now = new Date('2026-06-15T08:00:00+02:00');
    const sessions = [session('nap', '2026-06-15T09:00:00+02:00', '2026-06-15T08:30:00+02:00')];

    const forecast = computeDayForecast(sessions, [], now, INFANT_BIRTH);

    expect(forecast.actualMs).toBe(0);
  });
});

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR);
}
