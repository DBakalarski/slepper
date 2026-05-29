import { describe, it, expect } from 'vitest';
import { recommendKotkiDwa } from '../src/recommender.js';
import type { ChildProfile, State } from 'sleeper-machine';

const MS_PER_DAY = 86_400_000;

function hhmm(date: Date | null): string {
  if (date === null) return 'null';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Tworzy dateOfBirth na podstawie ageMonths (przybliżone 30.4 dni/miesiąc) */
function dobForAge(now: Date, ageMonths: number): Date {
  return new Date(now.getTime() - ageMonths * 30.4 * MS_PER_DAY);
}

describe('recommendKotkiDwa — walidacja inputu', () => {
  it('invalid targetWakeTime → throw', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 5),
      targetWakeTime: { hour: 25, minute: 0 }, // invalid
    };
    const state: State = { now, history: [] };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('invalid targetWakeTime');
  });

  it('invalid preferredBedtime → throw', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      preferredBedtime: { hour: 30, minute: 0 }, // invalid
    };
    const state: State = { now, history: [] };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('invalid preferredBedtime');
  });

  it('invalid state.now → throw', () => {
    const profile: ChildProfile = {
      dateOfBirth: new Date(2023, 0, 1),
    };
    const state: State = { now: new Date('invalid'), history: [] };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('state.now must be a valid Date');
  });

  it('invalid dateOfBirth → throw', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: new Date('invalid'),
    };
    const state: State = { now, history: [] };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('profile.dateOfBirth must be a valid Date');
  });

  it('preferredNapsCount=6 → throw', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      preferredNapsCount: 6,
    };
    const state: State = { now, history: [] };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('preferredNapsCount must be integer 0-5');
  });

  it('SleepSession z end <= start → throw', () => {
    const now = new Date(2024, 0, 15, 10, 0, 0, 0);
    const start = new Date(2024, 0, 15, 9, 0, 0, 0);
    const end = new Date(2024, 0, 15, 8, 0, 0, 0); // end before start
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 9) };
    const state: State = {
      now,
      history: [{ start, end, type: 'NAP' }],
    };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('must be after start');
  });
});

describe('recommendKotkiDwa — Faza 4 Test: scenariusze PDF', () => {
  it('Test: 5m, 3 drzemki, wake 07:00, brak historii → harmonogram zbliżony do PDF s.13 (08:45 / 12:30 / 16:15 / 19:00)', () => {
    const now = new Date(2024, 0, 15, 7, 30, 0, 0); // 07:30, pierwsza drzemka jeszcze przed nami
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 5),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    // confidence zawsze high
    expect(rec.confidence).toBe('high');
    // plan ma 3 NAP + 1 NIGHT w remainingNapsToday
    expect(rec.remainingNapsToday.length).toBeGreaterThanOrEqual(3);
    // Drzemka 1 powinna być ~08:45
    const nap1 = rec.remainingNapsToday.find((e) => e.type === 'NAP');
    expect(nap1).toBeDefined();
    expect(hhmm(nap1!.plannedStart)).toBe('08:45');
    // Sen nocny między 18:00 a 20:30
    const night = rec.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(night).toBeDefined();
    expect(night!.plannedStart.getHours()).toBeGreaterThanOrEqual(17);
    expect(night!.plannedStart.getHours()).toBeLessThanOrEqual(21);
  });

  it('Test: 9m, 2 drzemki, wake 07:00 → zbliżony do PDF s.18 (10:00 / 14:30 / 19:30)', () => {
    const now = new Date(2024, 0, 15, 7, 30, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    expect(rec.confidence).toBe('high');
    // Drzemka 1: 07:00 + 3h = 10:00 (dokładnie jak w PDF)
    const nap1 = rec.remainingNapsToday.find((e) => e.type === 'NAP');
    expect(nap1).toBeDefined();
    expect(hhmm(nap1!.plannedStart)).toBe('10:00');
    // Sen nocny między 19:00 a 21:00
    const night = rec.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(night).toBeDefined();
    expect(night!.plannedStart.getHours()).toBeGreaterThanOrEqual(19);
    expect(night!.plannedStart.getHours()).toBeLessThanOrEqual(21);
  });

  it('Test: 6m, preferredNapsCount=2 vs 3 → różne buckets, różne harmonogramy', () => {
    const now = new Date(2024, 0, 15, 7, 30, 0, 0);
    const dob = dobForAge(now, 6);

    const rec2 = recommendKotkiDwa(
      { now, history: [] },
      { dateOfBirth: dob, targetWakeTime: { hour: 7, minute: 0 }, preferredNapsCount: 2 },
    );
    const rec3 = recommendKotkiDwa(
      { now, history: [] },
      { dateOfBirth: dob, targetWakeTime: { hour: 7, minute: 0 }, preferredNapsCount: 3 },
    );

    // 2 drzemki → mniej wpisów w pozostalyn planie
    const naps2 = rec2.remainingNapsToday.filter((e) => e.type === 'NAP').length;
    const naps3 = rec3.remainingNapsToday.filter((e) => e.type === 'NAP').length;
    expect(naps2).toBeLessThan(naps3);

    // Harmonogramy różnią się (inna godzina nocna)
    const night2 = rec2.remainingNapsToday.find((e) => e.type === 'NIGHT');
    const night3 = rec3.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(night2!.plannedStart.getTime()).not.toBe(night3!.plannedStart.getTime());
  });

  it('Test: preferredBedtime={hour:18,minute:30} → ostatni NIGHT entry o 18:30', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
      preferredBedtime: { hour: 18, minute: 30 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    const night = rec.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(night).toBeDefined();
    expect(hhmm(night!.plannedStart)).toBe('18:30');
  });

  it('Test: targetWakeTime={hour:06,minute:30} → cały dzień przesunięty o 30min wcześniej', () => {
    const now = new Date(2024, 0, 15, 7, 0, 0, 0);
    const dob = dobForAge(now, 9);

    const rec700 = recommendKotkiDwa(
      { now, history: [] },
      { dateOfBirth: dob, targetWakeTime: { hour: 7, minute: 0 } },
    );
    const rec630 = recommendKotkiDwa(
      { now, history: [] },
      { dateOfBirth: dob, targetWakeTime: { hour: 6, minute: 30 } },
    );

    // Pierwsza drzemka w rec700 musi być 30min później niż w rec630
    const nap700 = rec700.remainingNapsToday.find((e) => e.type === 'NAP');
    const nap630 = rec630.remainingNapsToday.find((e) => e.type === 'NAP');
    expect(nap700).toBeDefined();
    expect(nap630).toBeDefined();
    expect(nap700!.plannedStart.getTime() - nap630!.plannedStart.getTime()).toBe(30 * 60 * 1000);
  });

  it('Test: currentWakeWindowDuration po 0 drzemkach w historii dnia', () => {
    const now = new Date(2024, 0, 15, 7, 30, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    // 9m bucket WW[0] = 3h = 180 minut
    expect(rec.currentWakeWindowDuration).toBe(180);
  });

  it('Test: currentWakeWindowDuration po 1 drzemce w historii dnia', () => {
    const now = new Date(2024, 0, 15, 12, 0, 0, 0);
    const napStart = new Date(2024, 0, 15, 10, 0, 0, 0);
    const napEnd = new Date(2024, 0, 15, 11, 30, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = {
      now,
      history: [{ start: napStart, end: napEnd, type: 'NAP' }],
    };

    const rec = recommendKotkiDwa(state, profile);

    // 9m bucket WW[1] = 3h = 180 minut (przed drzemką 2)
    expect(rec.currentWakeWindowDuration).toBe(180);
  });

  it('Test: currentWakeWindowDuration po 2 drzemkach → WW ostatnie (przed nocą)', () => {
    const now = new Date(2024, 0, 15, 17, 0, 0, 0);
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 11, 30, 0, 0);
    const nap2Start = new Date(2024, 0, 15, 14, 30, 0, 0);
    const nap2End = new Date(2024, 0, 15, 16, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = {
      now,
      history: [
        { start: nap1Start, end: nap1End, type: 'NAP' },
        { start: nap2Start, end: nap2End, type: 'NAP' },
      ],
    };

    const rec = recommendKotkiDwa(state, profile);

    // 9m bucket WW[2] = 3.5h = 210 minut (ostatnie okno przed nocą)
    expect(rec.currentWakeWindowDuration).toBe(210);
  });

  it('Test: smoke check — import i call zwraca Recommendation z wymaganymi polami', () => {
    const now = new Date(2024, 0, 15, 10, 0, 0, 0);
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 7) };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    // Sprawdzamy strukturę Recommendation
    expect(typeof rec.currentWakeWindowDuration).toBe('number');
    expect(Array.isArray(rec.remainingNapsToday)).toBe(true);
    expect(Array.isArray(rec.warnings)).toBe(true);
    expect(['low', 'medium', 'high']).toContain(rec.confidence);
    // Kotki Dwa zawsze zwraca 'high'
    expect(rec.confidence).toBe('high');
    // nextSleepAt jest Date lub null
    if (rec.nextSleepAt !== null) {
      expect(rec.nextSleepAt instanceof Date).toBe(true);
    }
  });
});

describe('recommendKotkiDwa — zachowania dodatkowe', () => {
  it('warning "ryzyko przemęczenia" gdy elapsed > 1.2 × currentWakeWindowDuration', () => {
    const now = new Date(2024, 0, 15, 12, 0, 0, 0); // 5h po pobudce 07:00
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 5),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    // 5m WW[0] = 1.75h = 105 min. Elapsed = 5h = 300 min > 1.2 × 105 = 126 min
    expect(rec.warnings).toContain('ryzyko przemęczenia');
  });

  it('brak historii → nextSleepAt jest Date (nie null)', () => {
    const now = new Date(2024, 0, 15, 7, 30, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };

    const rec = recommendKotkiDwa(state, profile);

    expect(rec.nextSleepAt).not.toBeNull();
    expect(rec.nextSleepAt instanceof Date).toBe(true);
  });

  it('preferredBedtime nie nadpisuje NIGHT gdy już wszystkie drzemki — nextSleepAt = bedtime', () => {
    const now = new Date(2024, 0, 15, 17, 0, 0, 0);
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 11, 30, 0, 0);
    const nap2Start = new Date(2024, 0, 15, 14, 30, 0, 0);
    const nap2End = new Date(2024, 0, 15, 16, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 9),
      targetWakeTime: { hour: 7, minute: 0 },
      preferredBedtime: { hour: 19, minute: 0 },
    };
    const state: State = {
      now,
      history: [
        { start: nap1Start, end: nap1End, type: 'NAP' },
        { start: nap2Start, end: nap2End, type: 'NAP' },
      ],
    };

    const rec = recommendKotkiDwa(state, profile);

    // Po 2 drzemkach nextSleepAt = preferredBedtime = 19:00
    expect(rec.nextSleepAt).not.toBeNull();
    expect(hhmm(rec.nextSleepAt)).toBe('19:00');
  });
});
