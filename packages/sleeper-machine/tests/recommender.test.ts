import { describe, it, expect } from 'vitest';
import { recommend } from '../src/recommender.js';
import { loadFixture } from './fixtures/loader.js';
import {
  buildHistory,
  buildState,
  PATTERN_9MO,
  PATTERN_4MO,
  PATTERN_14MO_TRANSITION,
  PATTERN_9MO_DEFICIT,
  type DayPattern,
} from './fixtures/builders.js';
import type { State, ChildProfile, SleepSession } from '../src/types.js';

const END_Y = 2026;
const END_M = 4; // May
const END_D = 27;
const NOW_DEFAULT = new Date(END_Y, END_M, END_D, 15, 0); // 2026-05-27 15:00

// === Scenariusz 1 — Cold start (4mo, brak history) ===
describe('Scenario 1 — Cold start (4mo, no history)', () => {
  const { state, profile } = loadFixture('cold-start');
  const rec = recommend(state, profile);

  it('confidence = "low"', () => {
    expect(rec.confidence).toBe('low');
  });

  it('emits low-confidence warning', () => {
    expect(rec.warnings.some((w) => /normy wiekowe|Galland/.test(w))).toBe(true);
  });

  it('emits "brak kotwicy" warning (no targetWakeTime, no history)', () => {
    expect(rec.warnings.some((w) => /kotwic/.test(w))).toBe(true);
  });

  it('nextSleepAt is null (no anchor to compute from)', () => {
    expect(rec.nextSleepAt).toBeNull();
  });

  it('remainingNapsToday is empty', () => {
    expect(rec.remainingNapsToday).toHaveLength(0);
  });

  it('nextSleepShiftMinutes is null (Galland nie ma planu-baseline)', () => {
    expect(rec.nextSleepShiftMinutes).toBeNull();
  });
});

// === Scenariusz 2 — Walidacja z Galland Fig. 4 (9mo) ===
describe('Scenario 2 — Galland 9mo validation', () => {
  const dateOfBirth = new Date(2025, 7, 27); // 9 months before NOW
  const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('confidence = "high" (14 days)', () => {
    expect(rec.confidence).toBe('high');
  });

  it('nextSleepAt is defined (has anchor)', () => {
    expect(rec.nextSleepAt).not.toBeNull();
  });

  it('remainingNapsToday makes sense for 9mo (1-2 future entries expected)', () => {
    expect(rec.remainingNapsToday.length).toBeGreaterThanOrEqual(1);
    expect(rec.remainingNapsToday.length).toBeLessThanOrEqual(3);
  });

  it('no transition warning (observed = baseline 2 naps)', () => {
    expect(rec.warnings.some((w) => /transition/.test(w))).toBe(false);
  });
});

// === Scenariusz 3 — Stała historia 14 dni (zbieżność EWMA) ===
describe('Scenario 3 — Stable 14-day history (EWMA convergence)', () => {
  // Build pattern where observed total sleep is 10 min LONGER than 9mo baseline (~12.6h).
  // Galland 9mo baseline: totalSleep ≈ 12.6h. Observed = 12.6h + 10min ≈ 12.77h.
  // With α=0.3 (14d full history): adapted = 0.3 × baseline + 0.7 × observed
  //   ≈ baseline + 0.7 × 10min ≈ baseline + 7 min.
  const longerPattern: DayPattern = {
    nightStart: { hour: 19, minute: 30 },
    nightDurationH: 10.5 + 10 / 60, // night +10 min
    naps: PATTERN_9MO.naps,
  };
  const dateOfBirth = new Date(2025, 7, 27);
  const history = buildHistory(END_Y, END_M, END_D, 14, longerPattern);
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('confidence = "high"', () => {
    expect(rec.confidence).toBe('high');
  });

  it('no chronic deficit warning (observed slightly above baseline)', () => {
    expect(rec.warnings.some((w) => /deficyt/.test(w))).toBe(false);
  });
});

// === Scenariusz 4 — Alignment do targetWakeTime ===
describe('Scenario 4 — Alignment to targetWakeTime', () => {
  const dateOfBirth = new Date(2025, 7, 27);
  const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('no alignment warning (target within ±20% budget)', () => {
    expect(rec.warnings.some((w) => /20%|zakres/i.test(w))).toBe(false);
  });

  it('bedtime is in evening (17:00–22:30 today, reasonable for aligned 9mo)', () => {
    const bedtime = rec.remainingNapsToday[rec.remainingNapsToday.length - 1];
    expect(bedtime).toBeDefined();
    expect(bedtime!.type).toBe('NIGHT');
    const h = bedtime!.plannedStart.getHours();
    const min = bedtime!.plannedStart.getMinutes();
    const totalMin = h * 60 + min;
    expect(totalMin).toBeGreaterThanOrEqual(17 * 60);
    expect(totalMin).toBeLessThanOrEqual(22 * 60 + 30);
    expect(bedtime!.plannedStart.getDate()).toBe(END_D); // today
  });
});

// === Scenariusz 5 — Nap transition 2→1 (14mo, 7 dni z 1 drzemką) ===
describe('Scenario 5 — Nap transition (14mo, observed 1 nap, baseline 2)', () => {
  const dateOfBirth = new Date(2025, 2, 27); // ~14mo
  const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_14MO_TRANSITION);
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('emits nap-transition warning', () => {
    expect(rec.warnings.some((w) => /transition/.test(w))).toBe(true);
  });

  it('plan reflects 1 nap + bedtime (2 entries total in remainingNapsToday or fewer)', () => {
    // Plan = napsToday + 1 = 1 + 1 = 2. Some may be in the past relative to NOW.
    expect(rec.remainingNapsToday.length).toBeLessThanOrEqual(2);
  });
});

// === Scenariusz 6 — Outlier (jednodniowa choroba +50%) ===
describe('Scenario 6 — Outlier (single sick day +50% sleep)', () => {
  const dateOfBirth = new Date(2025, 7, 27);
  const normalDays = buildHistory(END_Y, END_M, END_D - 1, 13, PATTERN_9MO);
  // Add one "sick" day with much longer night for END_D.
  const sickPattern: DayPattern = {
    nightStart: { hour: 19, minute: 30 },
    nightDurationH: 16, // +50% from 10.5h ≈ 15.75h, use 16h
    naps: PATTERN_9MO.naps,
  };
  const sickDayHistory = buildHistory(END_Y, END_M, END_D, 1, sickPattern);
  const history = [...normalDays, ...sickDayHistory];
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('plan still computed (outlier does not break recommender)', () => {
    expect(rec.nextSleepAt).not.toBeNull();
  });

  // Galland 9mo baseline.totalSleep ≈ 12.6h. With 1 sick outlier, MAD trim should
  // keep adapted close to baseline. Adapted should NOT be clamped at 1.3× baseline.
  it('confidence high (14 days of data)', () => {
    expect(rec.confidence).toBe('high');
  });
});

// === Scenariusz 7 — Bardzo wczesna pobudka 04:30 ===
describe('Scenario 7 — Very early wake (04:30)', () => {
  const { state, profile } = loadFixture('early-wake');
  const rec = recommend(state, profile);

  it('nextSleepAt is computed from early wake', () => {
    expect(rec.nextSleepAt).not.toBeNull();
  });

  it('nextSleepAt occurs reasonably soon after 04:30 wake (before noon)', () => {
    // With 9mo wake window ≈ 3-4h and wake at 04:30, first nap ≈ 08:00-09:00.
    expect(rec.nextSleepAt!.getHours()).toBeLessThan(12);
  });
});

// === Scenariusz 8 — targetWakeTime nierealistyczne (>20% off) ===
describe('Scenario 8 — Unrealistic targetWakeTime (>20% from natural)', () => {
  const dateOfBirth = new Date(2025, 7, 27);
  const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);
  // Natural bedtime for 9mo ≈ 19:30 → wake 06:00. Target 14:00 → 7+h shift.
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 14, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('emits alignment-out-of-range warning', () => {
    expect(rec.warnings.some((w) => /20%|zakres|kor/.test(w))).toBe(true);
  });

  it('plan still produced (partial alignment within budget)', () => {
    expect(rec.remainingNapsToday.length).toBeGreaterThan(0);
  });
});

// === Scenariusz 9 — Chronic sleep debt (7 dni z 85% normy) ===
describe('Scenario 9 — Chronic sleep deficit (~85% of baseline for 7 days)', () => {
  const dateOfBirth = new Date(2025, 7, 27);
  // 7 days of deficit pattern then no history before → adapt sees only these 7.
  const history = buildHistory(END_Y, END_M, END_D, 7, PATTERN_9MO_DEFICIT);
  const { state, profile } = buildState({
    now: NOW_DEFAULT,
    dateOfBirth,
    targetWakeTime: { hour: 7, minute: 0 },
    history,
  });
  const rec = recommend(state, profile);

  it('emits chronic-deficit warning', () => {
    expect(rec.warnings.some((w) => /deficyt/.test(w))).toBe(true);
  });

  it('confidence at least medium (7 days)', () => {
    expect(['medium', 'high']).toContain(rec.confidence);
  });
});

// === Coverage: forwardPass path (morningWake exists, no targetWakeTime) ===
describe('Coverage — morningWake without targetWakeTime (pure forwardPass)', () => {
  it('produces plan via forwardPass when history anchors morning but no align target', () => {
    const dateOfBirth = new Date(2025, 7, 27);
    const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      // no targetWakeTime → recommender uses raw forwardPass.
      history,
    });
    const rec = recommend(state, profile);
    expect(rec.nextSleepAt).not.toBeNull();
    // No align warning possible (align not invoked).
    expect(rec.warnings.some((w) => /20%|zakres/i.test(w))).toBe(false);
  });
});

// === Coverage: overtired warning ===
describe('Coverage — overtired warning (elapsed > 1.2 × current window)', () => {
  it('emits "ryzyko przemęczenia" when now is far past last wake', () => {
    const dateOfBirth = new Date(2025, 7, 27);
    // History: NIGHT ending 04:30 today (very early wake).
    // 9mo first window ≈ 3.5h → 1.2× ≈ 4.2h → if now = 04:30 + 5h = 09:30, overtired triggers.
    const nightEnd = new Date(END_Y, END_M, END_D, 4, 30);
    const nightStart = new Date(nightEnd.getTime() - 10 * 3_600_000);
    const history: SleepSession[] = [
      { start: nightStart, end: nightEnd, type: 'NIGHT' },
    ];
    const now = new Date(END_Y, END_M, END_D, 11, 30); // 7h after wake — well past 1.2× window
    const { state, profile } = buildState({
      now,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const rec = recommend(state, profile);
    expect(rec.warnings.some((w) => /przemęczen/.test(w))).toBe(true);
  });
});

// === Coverage: public index.ts re-export ===
describe('Coverage — public API surface via src/index.ts', () => {
  it('exports `recommend` and works end-to-end', async () => {
    const api = await import('../src/index.js');
    const { state, profile } = loadFixture('cold-start');
    const rec = api.recommend(state, profile);
    expect(rec.confidence).toBe('low');
  });
});

// === User preferences override (preferredNapsCount + preferredBedtime) ===
describe('user preferences override', () => {
  const dateOfBirth = new Date(2025, 7, 27); // 9mo at NOW_DEFAULT
  const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);

  it('preferredNapsCount overrides baseline (1 nap for 9mo baby)', () => {
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const baseRec = recommend(state, profile);
    const overrideRec = recommend(state, { ...profile, preferredNapsCount: 1 });
    // Baseline 9mo daje ~2 drzemki; override wymusza 1. Plan musi miec mniej entries.
    expect(overrideRec.remainingNapsToday.length).toBeLessThanOrEqual(
      baseRec.remainingNapsToday.length,
    );
    // Warning informujacy o rozjezdzie z rekomendacja.
    expect(
      overrideRec.warnings.some((w) => /preferowana liczba drzemek/.test(w)),
    ).toBe(true);
  });

  it('preferredNapsCount = 0 produces plan with only NIGHT entry', () => {
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const rec = recommend(state, { ...profile, preferredNapsCount: 0 });
    // remainingNapsToday filtruje > now (NOW_DEFAULT=15:00); bedtime jest po now,
    // wiec powinien byc widoczny. Wszystkie pozostale entries powinny byc NIGHT.
    for (const e of rec.remainingNapsToday) {
      expect(e.type).toBe('NIGHT');
    }
  });

  it('preferredBedtime sets nextSleepAt when all naps done', () => {
    // Historia z 14 dni + dzisiaj 2 drzemki zrobione (do godz NOW_DEFAULT=15:00).
    // 9mo PATTERN_9MO ma drzemki o 9:00 i 13:30 — obie zakonczone przed 15:00.
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const rec = recommend(state, {
      ...profile,
      preferredBedtime: { hour: 19, minute: 30 },
    });
    expect(rec.nextSleepAt).not.toBeNull();
    expect(rec.nextSleepAt!.getHours()).toBe(19);
    expect(rec.nextSleepAt!.getMinutes()).toBe(30);
    expect(rec.nextSleepAt!.getDate()).toBe(END_D);
  });

  it('preferredBedtime + targetWakeTime: warning when night too short', () => {
    // bedtime 23:00, wake 06:00 -> noc = 7h (<8h) -> warning.
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 6, minute: 0 },
      history,
    });
    const rec = recommend(state, {
      ...profile,
      preferredBedtime: { hour: 23, minute: 0 },
    });
    expect(rec.warnings.some((w) => /niezdrową długość nocy/.test(w))).toBe(true);
  });

  it('preferredBedtime + targetWakeTime: healthy night does not warn', () => {
    // bedtime 19:30, wake 07:00 -> noc = 11.5h -> OK.
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const rec = recommend(state, {
      ...profile,
      preferredBedtime: { hour: 19, minute: 30 },
    });
    expect(rec.warnings.some((w) => /niezdrową długość nocy/.test(w))).toBe(false);
  });

  it('invalid preferredNapsCount throws', () => {
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    expect(() => recommend(state, { ...profile, preferredNapsCount: -1 })).toThrow(
      /preferredNapsCount/,
    );
    expect(() => recommend(state, { ...profile, preferredNapsCount: 6 })).toThrow(
      /preferredNapsCount/,
    );
    expect(() => recommend(state, { ...profile, preferredNapsCount: 2.5 })).toThrow(
      /preferredNapsCount/,
    );
  });

  it('invalid preferredBedtime throws', () => {
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    expect(() =>
      recommend(state, { ...profile, preferredBedtime: { hour: 25, minute: 0 } }),
    ).toThrow(/preferredBedtime/);
    expect(() =>
      recommend(state, { ...profile, preferredBedtime: { hour: 12, minute: 99 } }),
    ).toThrow(/preferredBedtime/);
  });

  it('both fields undefined → behavior identical to before (regression)', () => {
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth,
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });
    const recA = recommend(state, profile);
    const recB = recommend(state, {
      ...profile,
      preferredNapsCount: undefined,
      preferredBedtime: undefined,
    });
    expect(recB.nextSleepAt?.getTime() ?? null).toBe(recA.nextSleepAt?.getTime() ?? null);
    expect(recB.remainingNapsToday.length).toBe(recA.remainingNapsToday.length);
    expect(recB.warnings).toEqual(recA.warnings);
  });
});

// === Input validation (boundary) ===
describe('recommend — input validation', () => {
  const validProfile: ChildProfile = { dateOfBirth: new Date(2025, 7, 27) };

  it('throws on invalid state.now', () => {
    const bad: State = { now: new Date(NaN), history: [] };
    expect(() => recommend(bad, validProfile)).toThrow(/state\.now/);
  });

  it('throws on invalid dateOfBirth', () => {
    expect(() =>
      recommend({ now: NOW_DEFAULT, history: [] }, { dateOfBirth: new Date(NaN) }),
    ).toThrow(/dateOfBirth/);
  });

  it('throws on invalid targetWakeTime', () => {
    expect(() =>
      recommend(
        { now: NOW_DEFAULT, history: [] },
        { dateOfBirth: new Date(2025, 7, 27), targetWakeTime: { hour: 25, minute: 0 } },
      ),
    ).toThrow(/targetWakeTime/);
  });

  it('throws on SleepSession with end ≤ start', () => {
    const badSession: SleepSession = {
      start: new Date(2026, 4, 27, 10, 0),
      end: new Date(2026, 4, 27, 10, 0),
      type: 'NAP',
    };
    expect(() =>
      recommend({ now: NOW_DEFAULT, history: [badSession] }, validProfile),
    ).toThrow(/end.*start|SleepSession/);
  });
});

// === Task 1 (feat/plan-dnia-os-24h): State.activeSession jest non-breaking dla Gallanda ===
// Galland nie zna pojęcia "łańcucha re-kotwiczonego" (to jest koncepcja Kotki Dwa) —
// pole musi być całkowicie ignorowane, wynik identyczny z/bez niego.
describe('recommend — State.activeSession jest ignorowane (non-breaking)', () => {
  it('wynik identyczny z i bez activeSession (NAP w toku)', () => {
    const history = buildHistory(END_Y, END_M, END_D, 14, PATTERN_9MO);
    const { state, profile } = buildState({
      now: NOW_DEFAULT,
      dateOfBirth: new Date(2025, 7, 27),
      targetWakeTime: { hour: 7, minute: 0 },
      history,
    });

    const withoutSession = recommend(state, profile);
    const withSession = recommend(
      { ...state, activeSession: { start: new Date(2026, 4, 27, 14, 0), type: 'NAP' } },
      profile,
    );

    expect(withSession).toEqual(withoutSession);
  });

  it('wynik identyczny z i bez activeSession (NIGHT w toku)', () => {
    const { state, profile } = loadFixture('cold-start');

    const withoutSession = recommend(state, profile);
    const withSession = recommend(
      { ...state, activeSession: { start: new Date(2026, 4, 27, 19, 30), type: 'NIGHT' } },
      profile,
    );

    expect(withSession).toEqual(withoutSession);
  });

  it('activeSessionPredictedEnd pozostaje undefined niezależnie od activeSession (Galland nie liczy ogona, Task C2)', () => {
    const { state, profile } = loadFixture('cold-start');

    const withoutSession = recommend(state, profile);
    const withNapSession = recommend(
      { ...state, activeSession: { start: new Date(2026, 4, 27, 14, 0), type: 'NAP' } },
      profile,
    );
    const withNightSession = recommend(
      { ...state, activeSession: { start: new Date(2026, 4, 27, 19, 30), type: 'NIGHT' } },
      profile,
    );

    expect(withoutSession.activeSessionPredictedEnd).toBeUndefined();
    expect(withNapSession.activeSessionPredictedEnd).toBeUndefined();
    expect(withNightSession.activeSessionPredictedEnd).toBeUndefined();
  });
});
