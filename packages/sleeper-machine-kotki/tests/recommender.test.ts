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

  it('activeSession z invalid start (NaN Date) → throw', () => {
    const now = new Date(2024, 0, 15, 10, 0, 0, 0);
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 9) };
    const state: State = {
      now,
      history: [],
      activeSession: { start: new Date('invalid'), type: 'NAP' },
    };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('activeSession.start must be a valid Date');
  });

  it('activeSession.start w przyszłości względem now → throw', () => {
    const now = new Date(2024, 0, 15, 10, 0, 0, 0);
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 9) };
    const state: State = {
      now,
      history: [],
      activeSession: { start: new Date(2024, 0, 15, 11, 0, 0, 0), type: 'NAP' },
    };
    expect(() => recommendKotkiDwa(state, profile)).toThrow('must not be after state.now');
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

describe('recommendKotkiDwa — nextSleepShiftMinutes', () => {
  // 9m bucket: WW [3, 3, 3.5], typicalNaps 2, napLength = min(2, 3.5/2) = 1.75h.
  // morningWake 7:00 → plan: nap1 10:00–11:45, nap2 14:45–16:30, noc 20:00.
  const profile9m = (now: Date): ChildProfile => ({
    dateOfBirth: dobForAge(now, 9),
    targetWakeTime: { hour: 7, minute: 0 },
  });

  it('brak historii (slot zgodny z planem) → shift = 0', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const rec = recommendKotkiDwa({ now, history: [] }, profile9m(now));

    expect(rec.nextSleepShiftMinutes).toBe(0);
  });

  it('krótsza drzemka o 30 min → shift dodatni (+30, wcześniej)', () => {
    const now = new Date(2024, 0, 15, 12, 0, 0, 0);
    // Ideał nap1 11:45; realnie 10:00–11:15 (krótsza o 30 min).
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 11, 15, 0, 0);
    const rec = recommendKotkiDwa(
      { now, history: [{ start: nap1Start, end: nap1End, type: 'NAP' }] },
      profile9m(now),
    );

    // nextSleepAt = 11:15 + 3h = 14:15; ideał slotu = 14:45 → +30.
    expect(rec.nextSleepShiftMinutes).toBe(30);
  });

  it('dłuższa drzemka o 30 min → shift ujemny (-30, później)', () => {
    const now = new Date(2024, 0, 15, 13, 0, 0, 0);
    // Ideał nap1 11:45; realnie 10:00–12:15 (dłuższa o 30 min).
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 12, 15, 0, 0);
    const rec = recommendKotkiDwa(
      { now, history: [{ start: nap1Start, end: nap1End, type: 'NAP' }] },
      profile9m(now),
    );

    // nextSleepAt = 12:15 + 3h = 15:15; ideał slotu = 14:45 → -30.
    expect(rec.nextSleepShiftMinutes).toBe(-30);
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

  it('5m (3 drzemki): ostatnia drzemka w planie trwa 30 min (reguła przewodnika)', () => {
    const now = new Date(2024, 0, 15, 7, 15, 0, 0); // tuż po pobudce — pełny plan przed nami
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 5),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const rec = recommendKotkiDwa({ now, history: [] }, profile);

    const naps = rec.remainingNapsToday.filter((e) => e.type === 'NAP');
    expect(naps).toHaveLength(3);
    const lastNap = naps[2]!;
    const lastNapMin = (lastNap.plannedEnd!.getTime() - lastNap.plannedStart.getTime()) / 60_000;
    expect(lastNapMin).toBe(30);
    // Wcześniejsze drzemki dłuższe niż ostatnia
    const firstNapMin = (naps[0]!.plannedEnd!.getTime() - naps[0]!.plannedStart.getTime()) / 60_000;
    expect(firstNapMin).toBeGreaterThan(lastNapMin);
  });
});

describe('recommendKotkiDwa — kotwica = realna pobudka (koniec snu nocnego)', () => {
  it('Wojtek 8m: pobudka 05:45 (koniec NIGHT) → pierwsza drzemka 08:45, nie 10:00', () => {
    // Regression: algorytm liczył okno od targetWakeTime/07:00, ignorując realny
    // koniec snu nocnego. 8m WW[0]=3h. Realnie: 05:45 + 3h = 08:45.
    const now = new Date(2026, 5, 24, 6, 34, 0, 0);
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 8) }; // brak targetWakeTime
    const state: State = {
      now,
      history: [
        { start: new Date(2026, 5, 23, 17, 59), end: new Date(2026, 5, 24, 5, 45), type: 'NIGHT' },
      ],
    };
    const rec = recommendKotkiDwa(state, profile);
    expect(hhmm(rec.nextSleepAt)).toBe('08:45');
    expect(rec.remainingNapsToday[0]?.type).toBe('NAP');
    expect(hhmm(rec.remainingNapsToday[0]?.plannedStart ?? null)).toBe('08:45');
  });

  it('realna pobudka ma priorytet nad targetWakeTime', () => {
    // targetWakeTime=07:00, ale dziecko wstało 05:45 → kotwica = 05:45.
    const now = new Date(2026, 5, 24, 6, 34, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 8),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = {
      now,
      history: [
        { start: new Date(2026, 5, 23, 17, 59), end: new Date(2026, 5, 24, 5, 45), type: 'NIGHT' },
      ],
    };
    const rec = recommendKotkiDwa(state, profile);
    expect(hhmm(rec.nextSleepAt)).toBe('08:45');
  });

  it('brak snu nocnego dziś → fallback na targetWakeTime', () => {
    const now = new Date(2026, 5, 24, 8, 0, 0, 0);
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 8),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const state: State = { now, history: [] };
    const rec = recommendKotkiDwa(state, profile);
    // 07:00 + 3h = 10:00 (fallback bez realnej pobudki)
    expect(hhmm(rec.nextSleepAt)).toBe('10:00');
  });
});

// Task 1 (feat/plan-dnia-os-24h): re-kotwiczony łańcuch planu + sesja aktywna.
// Wzorzec 'Faza 4 Test: scenariusze PDF' — fixtures scenariuszowe, jawny `now`.
describe('recommendKotkiDwa — re-kotwiczony łańcuch (Task 1)', () => {
  // 9m bucket: WW [3, 3, 3.5], typicalNaps 2, napLength = 1.75h każda.
  // Ideał od 07:00: nap1 10:00–11:45, nap2 14:45–16:30, noc 20:00.
  const profile9m = (now: Date): ChildProfile => ({
    dateOfBirth: dobForAge(now, 9),
    targetWakeTime: { hour: 7, minute: 0 },
  });

  it('krótsza drzemka (30 min zamiast 105) → cały łańcuch przesunięty wcześniej; nextSleepAt == pierwszy wpis', () => {
    const now = new Date(2024, 0, 15, 10, 45, 0, 0);
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 10, 30, 0, 0); // 30 min zamiast 105
    const rec = recommendKotkiDwa(
      { now, history: [{ start: nap1Start, end: nap1End, type: 'NAP' }] },
      profile9m(now),
    );

    // nap2 re-kotwiczona od 10:30 (nie od idealnych 11:45): 10:30 + WW[1]=3h = 13:30.
    const nap2 = rec.remainingNapsToday.find((e) => e.type === 'NAP');
    expect(nap2).toBeDefined();
    expect(hhmm(nap2!.plannedStart)).toBe('13:30');
    // Noc też wcześniej niż ideał 20:00.
    const night = rec.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(night!.plannedStart.getTime()).toBeLessThan(new Date(2024, 0, 15, 20, 0).getTime());
    // Invariant: nextSleepAt === pierwszy wpis łańcucha.
    expect(rec.nextSleepAt?.getTime()).toBe(rec.remainingNapsToday[0]?.plannedStart.getTime());
  });

  it('dłuższa drzemka → łańcuch później; bedtime niezmienny; kolizja → warning', () => {
    const now = new Date(2024, 0, 15, 13, 0, 0, 0);
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const nap1End = new Date(2024, 0, 15, 13, 0, 0, 0); // 3h zamiast 1h45m
    const profile: ChildProfile = { ...profile9m(now), preferredBedtime: { hour: 18, minute: 0 } };
    const rec = recommendKotkiDwa(
      { now, history: [{ start: nap1Start, end: nap1End, type: 'NAP' }] },
      profile,
    );

    // nap2 re-kotwiczona od 13:00: 13:00 + 3h = 16:00 (później niż ideał 14:45).
    const nap2 = rec.remainingNapsToday.find((e) => e.type === 'NAP');
    expect(nap2).toBeDefined();
    expect(hhmm(nap2!.plannedStart)).toBe('16:00');
    // Bedtime STAŁY — mimo że naturalna projekcja (16:00+1:45+3:30=21:15) koliduje z 18:00.
    const night = rec.remainingNapsToday.find((e) => e.type === 'NIGHT');
    expect(hhmm(night!.plannedStart)).toBe('18:00');
    expect(rec.warnings.length).toBeGreaterThan(0);
    expect(rec.warnings.some((w) => /koliduje|kolizj/.test(w))).toBe(true);
  });

  it('drzemka w toku, now < przewidywany koniec → kotwica = przewidywany koniec drzemki', () => {
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const now = new Date(2024, 0, 15, 11, 0, 0, 0); // przed przewidywanym końcem 11:45
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: nap1Start, type: 'NAP' } },
      profile9m(now),
    );

    // Kotwica = 11:45 (przewidywany koniec), nap2 = 11:45 + 3h = 14:45 (zgodnie z ideałem).
    expect(hhmm(rec.remainingNapsToday[0]!.plannedStart)).toBe('14:45');
    expect(rec.remainingNapsToday[0]!.type).toBe('NAP');
  });

  it('drzemka w toku, now > przewidywany koniec (przeciąga się) → kotwica = now', () => {
    const nap1Start = new Date(2024, 0, 15, 10, 0, 0, 0);
    const now = new Date(2024, 0, 15, 12, 30, 0, 0); // po przewidywanym końcu 11:45
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: nap1Start, type: 'NAP' } },
      profile9m(now),
    );

    // Kotwica = now (12:30), nap2 = 12:30 + 3h = 15:30.
    expect(hhmm(rec.remainingNapsToday[0]!.plannedStart)).toBe('15:30');
  });

  it('noc w toku → plan od preferowanej pobudki; brak wpisów nocnych poza finalnym NIGHT', () => {
    // now = 02:00 w trakcie nocy (noc zaczęła się poprzedniego wieczoru) — plan
    // od preferowanej pobudki (07:00) jest wciąż w przyszłości względem now.
    const now = new Date(2024, 0, 15, 2, 0, 0, 0);
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: new Date(2024, 0, 14, 19, 30), type: 'NIGHT' } },
      profile9m(now),
    );

    // Plan od 07:00 (jak cold start), niezależnie od tego że "now" jest wieczorem.
    const naps = rec.remainingNapsToday.filter((e) => e.type === 'NAP');
    const nights = rec.remainingNapsToday.filter((e) => e.type === 'NIGHT');
    expect(naps).toHaveLength(2);
    expect(nights).toHaveLength(1); // dokładnie jeden NIGHT — na końcu łańcucha
    expect(hhmm(naps[0]!.plannedStart)).toBe('10:00');
  });

  it('noc w toku zaczęta dziś wieczorem (wake <= now) → pusty plan, nextSleepAt = null (bez fantomowych drzemek)', () => {
    // Regression (review Task 1): NIGHT start 22:00, now 22:15, wake 07:00 DZIŚ
    // (przeszłość) — stary kod clampował pierwszy wpis do now i generował
    // drzemki w środku nocy. Dziecko śpi na noc → plan drzemek na dziś pusty.
    const now = new Date(2024, 0, 15, 22, 15, 0, 0);
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: new Date(2024, 0, 15, 22, 0), type: 'NIGHT' } },
      profile9m(now),
    );

    expect(rec.remainingNapsToday).toHaveLength(0);
    expect(rec.nextSleepAt).toBeNull();
    expect(rec.warnings).not.toContain('ryzyko przemęczenia');
  });

  it('sesja w toku tłumi warning "ryzyko przemęczenia" (dziecko śpi — pojęcie nie ma sensu)', () => {
    // NAP w toku od 10:00, now 15:00 — dawno po przewidywanym końcu 11:45.
    // Bez tłumienia elapsed od lastWake (07:00) = 8h >> 1.2 × WW → fałszywy warning.
    const now = new Date(2024, 0, 15, 15, 0, 0, 0);
    const rec = recommendKotkiDwa(
      { now, history: [], activeSession: { start: new Date(2024, 0, 15, 10, 0), type: 'NAP' } },
      profile9m(now),
    );

    expect(rec.warnings).not.toContain('ryzyko przemęczenia');
  });

  it('kontrolnie: te same warunki BEZ sesji w toku → warning "ryzyko przemęczenia" obecny', () => {
    const now = new Date(2024, 0, 15, 15, 0, 0, 0); // 8h po pobudce 07:00, WW=3h
    const rec = recommendKotkiDwa({ now, history: [] }, profile9m(now));

    expect(rec.warnings).toContain('ryzyko przemęczenia');
  });

  it('napsDone > typicalNaps → tylko NIGHT (bez drzemki widmo)', () => {
    const now = new Date(2024, 0, 15, 18, 0, 0, 0);
    // 9m bucket: typicalNaps=2. Symulujemy 3 ukończone drzemki (przekroczenie).
    const history: State['history'] = [
      { start: new Date(2024, 0, 15, 9, 0), end: new Date(2024, 0, 15, 10, 0), type: 'NAP' },
      { start: new Date(2024, 0, 15, 11, 0), end: new Date(2024, 0, 15, 12, 0), type: 'NAP' },
      { start: new Date(2024, 0, 15, 13, 0), end: new Date(2024, 0, 15, 14, 0), type: 'NAP' },
    ];
    const rec = recommendKotkiDwa({ now, history }, profile9m(now));

    expect(rec.remainingNapsToday).toHaveLength(1);
    expect(rec.remainingNapsToday[0]!.type).toBe('NIGHT');
    expect(rec.nextSleepAt?.getTime()).toBe(rec.remainingNapsToday[0]!.plannedStart.getTime());
  });

  it('okno czuwania przekroczone (plan w przeszłości) → pierwszy wpis od now + warning "ryzyko przemęczenia"', () => {
    const now = new Date(2024, 0, 15, 12, 0, 0, 0); // 5h po pobudce 07:00 (5m bucket, WW[0]=105min)
    const profile: ChildProfile = {
      dateOfBirth: dobForAge(now, 5),
      targetWakeTime: { hour: 7, minute: 0 },
    };
    const rec = recommendKotkiDwa({ now, history: [] }, profile);

    expect(rec.warnings).toContain('ryzyko przemęczenia');
    // Pierwszy wpis łańcucha clampowany do `now` (naturalny start był w przeszłości).
    expect(rec.remainingNapsToday[0]!.plannedStart.getTime()).toBe(now.getTime());
    expect(rec.nextSleepAt?.getTime()).toBe(now.getTime());
  });

  it('cold start bez historii i bez preferencji → plan od 7:00 (bez throw)', () => {
    const now = new Date(2024, 0, 15, 8, 0, 0, 0);
    const profile: ChildProfile = { dateOfBirth: dobForAge(now, 9) };

    expect(() => recommendKotkiDwa({ now, history: [] }, profile)).not.toThrow();
    const rec = recommendKotkiDwa({ now, history: [] }, profile);
    expect(rec.nextSleepAt).not.toBeNull();
    expect(hhmm(rec.remainingNapsToday[0]!.plannedStart)).toBe('10:00'); // 07:00 default + WW[0]=3h
  });
});
