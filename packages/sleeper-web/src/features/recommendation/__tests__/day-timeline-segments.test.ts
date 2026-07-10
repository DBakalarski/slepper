import { describe, expect, it } from 'vitest';

import type { PlanEntry } from 'sleeper-machine';

import { computeDayTimelineGeometry } from '@/features/recommendation/day-timeline-segments';
import type { SleepSession } from '@/features/sessions/hooks';

// Helper: sesja app w UTC (identycznie jak day-forecast.test.ts).
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

function planEntry(type: 'NAP' | 'NIGHT', startIso: string, endIso?: string): PlanEntry {
  return {
    plannedStart: new Date(startIso),
    plannedEnd: endIso ? new Date(endIso) : undefined,
    type,
  };
}

describe('computeDayTimelineGeometry', () => {
  it('noc 22:00->6:30 przycieta do doby: tylko czesc 0:00-6:30 dzisiaj', () => {
    const now = new Date('2026-06-15T10:00:00+02:00'); // 10:00 Warsaw
    const sessions = [
      session('night_sleep', '2026-06-14T22:00:00+02:00', '2026-06-15T06:30:00+02:00'),
    ];

    const geometry = computeDayTimelineGeometry(sessions, [], now);

    expect(geometry.factSegments).toHaveLength(1);
    const [segment] = geometry.factSegments;
    expect(segment.kind).toBe('fact-night');
    // Zaczyna sie dokladnie na starcie doby (0%).
    expect(segment.leftPct).toBeCloseTo(0, 6);
    // 6.5h z 24h doby.
    expect(segment.widthPct).toBeCloseTo((6.5 / 24) * 100, 6);
    // Ogon nocy sprzed poczatku doby nie wycieka na "wczorajsza" strone (brak
    // ujemnego leftPct, brak dodatkowego segmentu).
    expect(segment.leftPct).toBeGreaterThanOrEqual(0);
  });

  it('sesja w toku od 13:00, now 13:25 -> fakt konczy sie dokladnie na pozycji now', () => {
    const now = new Date('2026-06-15T13:25:00+02:00');
    const sessions = [session('nap', '2026-06-15T13:00:00+02:00', null)];

    const geometry = computeDayTimelineGeometry(sessions, [], now);

    expect(geometry.factSegments).toHaveLength(1);
    const [segment] = geometry.factSegments;
    const segmentEndPct = segment.leftPct + segment.widthPct;
    expect(segmentEndPct).toBeCloseTo(geometry.nowPct, 6);
  });

  it('defensywnie: end_at z przyszlosci przycina fakt do now', () => {
    const now = new Date('2026-06-15T13:25:00+02:00');
    const sessions = [session('nap', '2026-06-15T13:00:00+02:00', '2026-06-15T23:00:00+02:00')];

    const geometry = computeDayTimelineGeometry(sessions, [], now);

    expect(geometry.factSegments).toHaveLength(1);
    const [segment] = geometry.factSegments;
    const segmentEndPct = segment.leftPct + segment.widthPct;
    expect(segmentEndPct).toBeCloseTo(geometry.nowPct, 6);
  });

  it('plan NIGHT bez plannedEnd -> segment do 100%', () => {
    const now = new Date('2026-06-15T19:00:00+02:00');
    const plan: PlanEntry[] = [planEntry('NIGHT', '2026-06-15T19:00:00+02:00')];

    const geometry = computeDayTimelineGeometry([], plan, now);

    expect(geometry.planSegments).toHaveLength(1);
    const [segment] = geometry.planSegments;
    expect(segment.kind).toBe('plan-night');
    expect(segment.leftPct + segment.widthPct).toBeCloseTo(100, 6);
  });

  it('wpis planu zaczynajacy sie przed now (clamp z silnika) startuje od now, nie nachodzi na fakty', () => {
    const now = new Date('2026-06-15T13:25:00+02:00');
    // Plan "spoznione" wzgledem now — silnik moglby zwrocic start < now.
    const plan: PlanEntry[] = [
      planEntry('NAP', '2026-06-15T13:00:00+02:00', '2026-06-15T14:00:00+02:00'),
    ];

    const geometry = computeDayTimelineGeometry([], plan, now);

    expect(geometry.planSegments).toHaveLength(1);
    const [segment] = geometry.planSegments;
    expect(segment.leftPct).toBeCloseTo(geometry.nowPct, 6);
    expect(segment.leftPct).toBeGreaterThanOrEqual(geometry.nowPct - 1e-6);
  });

  it('dzien DST marca (doba 23h) -> fakt + plan sumuja sie do 100% wzgledem realnej doby', () => {
    // Warszawa: 2026-03-29 zmiana czasu, doba 23h. startOfDay = 2026-03-28T23:00:00Z,
    // endOfDay = 2026-03-29T22:00:00Z (patrz day-forecast.test.ts).
    const now = new Date('2026-03-29T12:00:00Z');
    const sessions = [session('night_sleep', '2026-03-29T00:00:00Z', '2026-03-29T08:00:00Z')];
    const plan: PlanEntry[] = [planEntry('NAP', now.toISOString())]; // do konca doby (brak plannedEnd)

    const geometry = computeDayTimelineGeometry(sessions, plan, now);

    expect(geometry.factSegments).toHaveLength(1);
    expect(geometry.planSegments).toHaveLength(1);
    const factEndPct = geometry.factSegments[0].leftPct + geometry.factSegments[0].widthPct;
    const planEndPct = geometry.planSegments[0].leftPct + geometry.planSegments[0].widthPct;
    // Plan idzie do konca doby -> 100%.
    expect(planEndPct).toBeCloseTo(100, 6);
    // Fakt konczy sie przed now, plan zaczyna sie na now -> brak nakladania,
    // a caly pas (0 -> factEnd, nowPct -> 100) miesci sie w [0, 100].
    expect(factEndPct).toBeGreaterThan(0);
    expect(factEndPct).toBeLessThanOrEqual(geometry.nowPct + 1e-6);
  });

  it('dzien DST pazdziernika (doba 25h) -> geometria nadal spojna wzgledem realnej doby', () => {
    // Warszawa: 2026-10-25 zmiana czasu, doba 25h. startOfDay = 2026-10-24T22:00:00Z,
    // endOfDay = 2026-10-25T23:00:00Z.
    const now = new Date('2026-10-25T10:00:00Z');
    const plan: PlanEntry[] = [planEntry('NIGHT', now.toISOString())]; // do konca doby 25h

    const geometry = computeDayTimelineGeometry([], plan, now);

    expect(geometry.planSegments).toHaveLength(1);
    const [segment] = geometry.planSegments;
    // 13h pozostale z 25h doby (patrz day-forecast.test.ts: plannedMs 13h).
    expect(segment.widthPct).toBeCloseTo((13 / 25) * 100, 6);
    expect(segment.leftPct + segment.widthPct).toBeCloseTo(100, 6);
  });

  it('segment o zerowej/ujemnej szerokosci po clampie jest pomijany', () => {
    const now = new Date('2026-06-15T13:25:00+02:00');
    // Sesja zakonczona przed swoim startem (uszkodzone dane) — zero szerokosci.
    const sessions = [session('nap', '2026-06-15T09:00:00+02:00', '2026-06-15T08:30:00+02:00')];
    // Wpis planu, ktorego caly zakres jest juz w przeszlosci wzgledem now.
    const plan: PlanEntry[] = [
      planEntry('NAP', '2026-06-15T10:00:00+02:00', '2026-06-15T11:00:00+02:00'),
    ];

    const geometry = computeDayTimelineGeometry(sessions, plan, now);

    expect(geometry.factSegments).toHaveLength(0);
    expect(geometry.planSegments).toHaveLength(0);
  });

  it('brak sesji i planu -> puste segmenty, nowPct wyliczony', () => {
    const now = new Date('2026-06-15T13:25:00+02:00');

    const geometry = computeDayTimelineGeometry([], [], now);

    expect(geometry.factSegments).toHaveLength(0);
    expect(geometry.planSegments).toHaveLength(0);
    expect(geometry.nowPct).toBeGreaterThan(0);
    expect(geometry.nowPct).toBeLessThan(100);
  });
});
