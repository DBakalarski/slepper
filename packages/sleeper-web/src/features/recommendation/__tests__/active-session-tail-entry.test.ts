import { describe, expect, it } from 'vitest';

import type { ChildProfile, State } from 'sleeper-machine';
import { recommendKotkiDwa } from 'sleeper-machine-kotki';

import { computeDayForecast } from '@/lib/day-forecast';
import type { SleepSession as AppSleepSession } from '@/features/sessions/hooks';

import { computeDayTimelineGeometry } from '../day-timeline-segments';
import { buildActiveSessionTailEntry, withActiveSessionTail } from '../active-session-tail-entry';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MS_PER_DAY = 86_400_000;

// Helper: sesja app (identycznie jak day-forecast.test.ts / day-timeline-segments.test.ts).
function appSession(type: 'nap' | 'night_sleep', start: Date, end: Date | null): AppSleepSession {
  return {
    id: `${type}-${start.toISOString()}`,
    child_id: 'c1',
    type,
    start_at: start.toISOString(),
    end_at: end ? end.toISOString() : null,
    notes: null,
    tags: [],
    created_by: 'u1',
    created_at: start.toISOString(),
  };
}

describe('buildActiveSessionTailEntry / withActiveSessionTail', () => {
  const now = new Date(2026, 5, 15, 10, 0, 0, 0);
  const predictedEnd = new Date(2026, 5, 15, 11, 45, 0, 0);

  it('zwraca null gdy activeSessionPredictedEnd jest undefined (Galland nie ustawia pola)', () => {
    const sessions = [appSession('nap', now, null)];
    expect(buildActiveSessionTailEntry(sessions, undefined, now)).toBeNull();
  });

  it('zwraca null gdy activeSessionPredictedEnd jest null (brak sesji w toku w Kotki Dwa)', () => {
    const sessions: AppSleepSession[] = [];
    expect(buildActiveSessionTailEntry(sessions, null, now)).toBeNull();
  });

  it('zwraca null gdy w sessions brak sesji w toku (end_at !== null wszedzie) mimo podanego predictedEnd', () => {
    const sessions = [appSession('nap', now, predictedEnd)];
    expect(buildActiveSessionTailEntry(sessions, predictedEnd, now)).toBeNull();
  });

  it('syntetyzuje PlanEntry { plannedStart: now, plannedEnd: predictedEnd, type: NAP } dla drzemki w toku', () => {
    const sessions = [appSession('nap', now, null)];
    const entry = buildActiveSessionTailEntry(sessions, predictedEnd, now);
    expect(entry).toEqual({ plannedStart: now, plannedEnd: predictedEnd, type: 'NAP' });
  });

  it('mapuje night_sleep na NIGHT', () => {
    const sessions = [appSession('night_sleep', now, null)];
    const entry = buildActiveSessionTailEntry(sessions, predictedEnd, now);
    expect(entry?.type).toBe('NIGHT');
  });

  it('withActiveSessionTail zwraca oryginalny plan bez zmian gdy brak sesji w toku', () => {
    const plan = [{ plannedStart: now, type: 'NAP' as const }];
    const result = withActiveSessionTail(plan, [], undefined, now);
    expect(result).toBe(plan);
  });

  it('withActiveSessionTail dokleja ogon na poczatku planu gdy sesja w toku', () => {
    const plan = [{ plannedStart: predictedEnd, type: 'NIGHT' as const }];
    const sessions = [appSession('nap', now, null)];
    const result = withActiveSessionTail(plan, sessions, predictedEnd, now);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ plannedStart: now, plannedEnd: predictedEnd, type: 'NAP' });
    expect(result[1]).toBe(plan[0]);
  });
});

// Seam-testy (finding C2, review finalne feat/plan-dnia-os-24h): plan
// PRODUKOWANY przez `recommendKotkiDwa` (nie recznie skonstruowany), z i bez
// `withActiveSessionTail`, karmi `computeDayForecast`/`computeDayTimelineGeometry`.
// Wszystkie daty w czerwcu (brak DST) — `now` budowany lokalnymi komponentami
// Date, spojnie z tym jak `sleeper-machine-kotki` czyta `now` (biblioteka jest
// tz-agnostyczna, patrz packages/sleeper-machine-kotki/CLAUDE.md); srodowisko
// deweloperskie/CI tego repo dziala w Europe/Warsaw.
describe('seam: recommendKotkiDwa -> withActiveSessionTail -> computeDayForecast/computeDayTimelineGeometry', () => {
  function dobForAge(now: Date, ageMonths: number): Date {
    return new Date(now.getTime() - ageMonths * 30.4 * MS_PER_DAY);
  }

  // 9m bucket: WW [3, 3, 3.5]h, typicalNaps 2, napLength 1.75h/drzemke.
  function profile9m(now: Date): ChildProfile {
    return { dateOfBirth: dobForAge(now, 9), targetWakeTime: { hour: 7, minute: 0 } };
  }

  it('(a) drzemka w toku: prognoza ciagla przy START, bez skoku o dlugosc drzemki', () => {
    const napStart = new Date(2026, 5, 15, 10, 0, 0, 0);
    const beforeStart = new Date(napStart.getTime() - MINUTE); // 09:59, tuz przed startem

    const profile = profile9m(beforeStart);

    // Tuz przed startem: brak sesji w toku, plan zawiera nadchodzaca drzemke 1.
    const recBefore = recommendKotkiDwa({ now: beforeStart, history: [] }, profile);
    const planBefore = withActiveSessionTail(
      recBefore.remainingNapsToday,
      [],
      recBefore.activeSessionPredictedEnd,
      beforeStart,
    );
    const forecastBefore = computeDayForecast([], planBefore, beforeStart, profile.dateOfBirth);

    // W momencie startu: drzemka 1 w toku, silnik re-kotwicza lancuch od jej
    // przewidywanego konca -> remainingNapsToday NIE zawiera juz drzemki 1.
    const sessionsAfter = [appSession('nap', napStart, null)];
    const recAfter = recommendKotkiDwa(
      { now: napStart, history: [], activeSession: { start: napStart, type: 'NAP' } },
      profile,
    );

    const planWithTail = withActiveSessionTail(
      recAfter.remainingNapsToday,
      sessionsAfter,
      recAfter.activeSessionPredictedEnd,
      napStart,
    );
    const forecastWithTail = computeDayForecast(sessionsAfter, planWithTail, napStart, profile.dateOfBirth);

    // Ciaglosc: 1 minuta uplynela, prognoza calodniowa praktycznie sie nie zmienia.
    expect(Math.abs(forecastWithTail.predictedTotalMs - forecastBefore.predictedTotalMs)).toBeLessThanOrEqual(
      MINUTE,
    );

    // Regresja (bug ktory C2 naprawia): bez ogona (surowe remainingNapsToday,
    // pomijajace w toku bedaca drzemke 1) prognoza spada dokladnie o dlugosc
    // drzemki 1 (1.75h) w momencie STARTu — sztuczny skok w dol.
    const forecastNaive = computeDayForecast(
      sessionsAfter,
      recAfter.remainingNapsToday,
      napStart,
      profile.dateOfBirth,
    );
    const napLenMs = 1.75 * HOUR;
    expect(forecastBefore.predictedTotalMs - forecastNaive.predictedTotalMs).toBe(napLenMs);
  });

  it('(b) noc w toku o 2:00: bez dziury na osi i bez utraconych 5h w prognozie', () => {
    const now = new Date(2026, 5, 15, 2, 0, 0, 0); // 02:00, noc zaczeta wczoraj wieczorem
    const nightStart = new Date(2026, 5, 14, 20, 0, 0, 0);
    const profile = profile9m(now);

    const sessionsNow = [appSession('night_sleep', nightStart, null)];
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: nightStart, type: 'NIGHT' } },
      profile,
    );

    // Przewidywana pobudka = dzisiejsza morningWake (07:00) — kaskada kotwicy #2a.
    expect(rec.activeSessionPredictedEnd?.getTime()).toBe(new Date(2026, 5, 15, 7, 0, 0, 0).getTime());

    const planWithTail = withActiveSessionTail(rec.remainingNapsToday, sessionsNow, rec.activeSessionPredictedEnd, now);

    // Os: brak dziury miedzy koncem faktu (noc do `now`) a poczatkiem planu
    // (ogon od `now`) — oba stykaja sie dokladnie w punkcie `nowPct`.
    const geometry = computeDayTimelineGeometry(sessionsNow, planWithTail, now);
    const lastFact = geometry.factSegments[geometry.factSegments.length - 1];
    const firstPlan = geometry.planSegments[0];
    expect(lastFact).toBeDefined();
    expect(firstPlan).toBeDefined();
    expect(lastFact!.leftPct + lastFact!.widthPct).toBeCloseTo(geometry.nowPct, 6);
    expect(firstPlan!.leftPct).toBeCloseTo(geometry.nowPct, 6);

    // Prognoza: bez ogona plannedMs traci dokladnie 5h (02:00 -> 07:00) — to
    // jest "-5h" z opisu findingu C2.
    const forecastWithTail = computeDayForecast(sessionsNow, planWithTail, now, profile.dateOfBirth);
    const forecastNaive = computeDayForecast(sessionsNow, rec.remainingNapsToday, now, profile.dateOfBirth);
    expect(forecastWithTail.plannedMs - forecastNaive.plannedMs).toBe(5 * HOUR);

    // Prognoza z ogonem ma skonczona, nieujemna delte (brak "absurdalnego minusa").
    expect(forecastWithTail.deltaMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(forecastWithTail.deltaMs)).toBe(true);
  });

  it('(c) wieczor po polozeniu (noc w toku zaczeta dzisiaj): bez falszywego pogorszenia "below" przy STARCIE', () => {
    const profileNow = new Date(2026, 5, 15, 19, 0, 0, 0); // do wyliczenia profilu/wieku
    const profile = profile9m(profileNow);

    // Dziecko odbylo obie drzemki dokladnie wg lancucha 9m: 10:00-11:45, 14:45-16:30.
    const nap1 = { start: new Date(2026, 5, 15, 10, 0), end: new Date(2026, 5, 15, 11, 45) };
    const nap2 = { start: new Date(2026, 5, 15, 14, 45), end: new Date(2026, 5, 15, 16, 30) };
    const libHistory: State['history'] = [
      { start: nap1.start, end: nap1.end, type: 'NAP' },
      { start: nap2.start, end: nap2.end, type: 'NAP' },
    ];
    const appHistory = [
      appSession('nap', nap1.start, nap1.end),
      appSession('nap', nap2.start, nap2.end),
    ];

    // Tuz przed polozeniem (bedtime naturalny lancucha = 16:30 + WW[2]=3.5h = 20:00).
    const beforeBedtime = new Date(2026, 5, 15, 19, 59, 0, 0);
    const recBefore = recommendKotkiDwa({ now: beforeBedtime, history: libHistory }, profile);
    const forecastBefore = computeDayForecast(appHistory, recBefore.remainingNapsToday, beforeBedtime, profile.dateOfBirth);

    // 5 minut po polozeniu: sesja NIGHT w toku, zaczeta dzisiaj wieczorem.
    const now = new Date(2026, 5, 15, 20, 5, 0, 0);
    const bedtime = new Date(2026, 5, 15, 20, 0, 0, 0);
    const sessionsNow = [...appHistory, appSession('night_sleep', bedtime, null)];
    const rec = recommendKotkiDwa(
      { now, history: libHistory, activeSession: { start: bedtime, type: 'NIGHT' } },
      profile,
    );

    // napsDone >= typicalNaps -> plan pozostaje pusty (kontrakt: zero drzemek widmo).
    expect(rec.remainingNapsToday).toHaveLength(0);

    const planWithTail = withActiveSessionTail(rec.remainingNapsToday, sessionsNow, rec.activeSessionPredictedEnd, now);
    const forecastWithTail = computeDayForecast(sessionsNow, planWithTail, now, profile.dateOfBirth);
    const forecastNaive = computeDayForecast(sessionsNow, rec.remainingNapsToday, now, profile.dateOfBirth);

    // Ciaglosc: prognoza calodniowa (i jej delta do normy) tuz przed i tuz po
    // polozeniu jest ta sama — polozenie sie o czasie nie pogarsza bilansu.
    expect(forecastWithTail.predictedTotalMs).toBe(forecastBefore.predictedTotalMs);
    expect(forecastWithTail.deltaMs).toBe(forecastBefore.deltaMs);
    expect(forecastWithTail.verdict).toBe(forecastBefore.verdict);

    // Falszywy "below": bez ogona plannedMs spada do 0 (chain pusty), wiec
    // delta do normy nagle wyglada znaczaco gorzej niz 5 minut wczesniej —
    // mimo ze dziecko po prostu zasnelo zgodnie z planem.
    expect(forecastNaive.deltaMs).toBeGreaterThan(forecastWithTail.deltaMs);
  });
});
