import { describe, expect, it } from 'vitest';

import type { SleepSession } from '@/features/sessions/hooks';
import { computeGapsBetweenSessions } from '@/lib/session-gaps';

// Buduje minimalna sesje — pola nieuzywane przez computeGapsBetweenSessions
// wypelniamy sensownymi domyslnymi wartosciami.
function session(
  id: string,
  type: SleepSession['type'],
  startAt: string,
  endAt: string | null,
): SleepSession {
  return {
    id,
    child_id: 'child-1',
    type,
    start_at: startAt,
    end_at: endAt,
    notes: null,
    tags: [],
    created_by: 'user-1',
    created_at: startAt,
  };
}

// Uwaga: czasy podajemy w UTC z offsetem tak, aby po konwersji do Europe/Warsaw
// (+02:00 latem) wychodzily "ladne" godziny lokalne. 2026-07-20 to lato (CEST).
describe('computeGapsBetweenSessions', () => {
  it('liczy gap aktywnosci miedzy dwiema drzemkami tego samego dnia', () => {
    // Drzemka 09:33–10:46, potem drzemka 13:35 (Europe/Warsaw).
    const sessions = [
      session('nap-1', 'nap', '2026-07-20T07:33:00Z', '2026-07-20T08:46:00Z'),
      session('nap-2', 'nap', '2026-07-20T11:35:00Z', '2026-07-20T12:24:00Z'),
    ];

    const gaps = computeGapsBetweenSessions(sessions);

    // 10:46 -> 13:35 = 2h49m.
    expect(gaps.get('nap-2')).toBe((2 * 60 + 49) * 60 * 1000);
    // Pierwsza sesja nie ma poprzednika.
    expect(gaps.has('nap-1')).toBe(false);
  });

  it('liczy gap od konca snu nocnego do pierwszej drzemki (przez granice dnia)', () => {
    // Sen nocny zaczyna sie wieczorem 19.07, konczy rano 20.07 o 05:50.
    // Pierwsza drzemka 20.07 o 09:33 — poprzednik jest z innego dnia
    // kalendarzowego (start), ale konczy sie TEGO SAMEGO poranka co start drzemki.
    const sessions = [
      session('night-1', 'night_sleep', '2026-07-19T18:25:00Z', '2026-07-20T03:50:00Z'),
      session('nap-1', 'nap', '2026-07-20T07:33:00Z', '2026-07-20T08:46:00Z'),
    ];

    const gaps = computeGapsBetweenSessions(sessions);

    // 05:50 -> 09:33 = 3h43m — to jest wlasnie "pierwsza aktywnosc od snu nocnego".
    expect(gaps.get('nap-1')).toBe((3 * 60 + 43) * 60 * 1000);
  });

  it('NIE liczy gapu gdy poprzednia sesja skonczyla sie innego dnia app tz', () => {
    // Sen nocny konczy sie rano 19.07, a nastepna sesja jest dopiero 20.07 po
    // poludniu — brakuje nocy z 19->20. Roznica dni app tz => gap pomijamy,
    // zeby nie pokazac fikcyjnej wielogodzinnej "aktywnosci".
    const sessions = [
      session('night-1', 'night_sleep', '2026-07-18T18:25:00Z', '2026-07-19T03:50:00Z'),
      session('nap-1', 'nap', '2026-07-20T11:35:00Z', '2026-07-20T12:24:00Z'),
    ];

    const gaps = computeGapsBetweenSessions(sessions);

    expect(gaps.has('nap-1')).toBe(false);
  });

  it('pomija gap gdy poprzednia sesja jeszcze trwa (end_at = null)', () => {
    const sessions = [
      session('active-1', 'nap', '2026-07-20T07:33:00Z', null),
      session('nap-2', 'nap', '2026-07-20T11:35:00Z', '2026-07-20T12:24:00Z'),
    ];

    const gaps = computeGapsBetweenSessions(sessions);

    expect(gaps.has('nap-2')).toBe(false);
  });

  it('dziala niezaleznie od kolejnosci wejscia (sortuje wewnetrznie)', () => {
    // Ta sama para co w tescie cross-day, ale podana malejaco po start_at.
    const sessions = [
      session('nap-1', 'nap', '2026-07-20T07:33:00Z', '2026-07-20T08:46:00Z'),
      session('night-1', 'night_sleep', '2026-07-19T18:25:00Z', '2026-07-20T03:50:00Z'),
    ];

    const gaps = computeGapsBetweenSessions(sessions);

    expect(gaps.get('nap-1')).toBe((3 * 60 + 43) * 60 * 1000);
  });

  it('zwraca pusta mape dla mniej niz 2 sesji', () => {
    expect(computeGapsBetweenSessions([]).size).toBe(0);
    expect(
      computeGapsBetweenSessions([
        session('nap-1', 'nap', '2026-07-20T07:33:00Z', '2026-07-20T08:46:00Z'),
      ]).size,
    ).toBe(0);
  });
});
