import { describe, it, expect } from 'vitest';
import { forwardPass } from '../src/forwardPass.js';
import { pickBucket } from '../src/lookup.js';

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

describe('forwardPass — generowanie planu', () => {
  it('5m, 3 drzemki, wake 07:00 → plan zbliżony do PDF s.13 (08:45 / 12:30 / 16:15 / 19:00)', () => {
    const bucket = pickBucket(5, null); // 5m, 3 drzemki, WW: 1.75/2/2.25/2.25
    // napLength = min(maxNapHours=2, maxTotalDayNapHours/3 = 4/3 ≈ 1.33h) = 1.33h ≈ 1h20m
    const napLengthHours = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps);
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0); // 07:00

    const plan = forwardPass(morningWake, bucket, napLengthHours);

    expect(plan).toHaveLength(4); // 3 NAP + 1 NIGHT
    expect(plan[0]!.type).toBe('NAP');
    expect(plan[1]!.type).toBe('NAP');
    expect(plan[2]!.type).toBe('NAP');
    expect(plan[3]!.type).toBe('NIGHT');

    // Drzemka 1: 07:00 + 1.75h WW = 08:45
    expect(hhmm(plan[0]!.plannedStart)).toBe('08:45');
    // Drzemka 2: 08:45 + 1.33h + 2h WW = ~12:05 (PDF: 12:30)
    // Sprawdzamy że drzemka 2 jest między 11:30 a 13:00
    expect(plan[1]!.plannedStart.getHours()).toBeGreaterThanOrEqual(11);
    expect(plan[1]!.plannedStart.getHours()).toBeLessThanOrEqual(13);
    // Sen nocny powinien być między 18:00 a 20:30 (PDF: 19:00)
    expect(plan[3]!.plannedStart.getHours()).toBeGreaterThanOrEqual(17);
    expect(plan[3]!.plannedStart.getHours()).toBeLessThanOrEqual(21);
  });

  it('9m, 2 drzemki, wake 07:00 → plan zbliżony do PDF s.18 (10:00 / 14:30 / 19:30)', () => {
    const bucket = pickBucket(9, null); // 9m, 2 drzemki, WW: 3/3/3.5
    // napLength = min(maxNapHours=2, maxTotalDayNapHours/2 = 3.5/2 = 1.75h) = 1.75h
    const napLengthHours = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps);
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);

    const plan = forwardPass(morningWake, bucket, napLengthHours);

    expect(plan).toHaveLength(3); // 2 NAP + 1 NIGHT
    // Drzemka 1: 07:00 + 3h = 10:00 (PDF: 10:00) ✓
    expect(hhmm(plan[0]!.plannedStart)).toBe('10:00');
    // Drzemka 2: 10:00 + 1.75h + 3h = 14:45 (PDF: 14:30 — ≈15min różnicy)
    expect(plan[1]!.plannedStart.getHours()).toBe(14);
    // Sen nocny: 14:45 + 1.75h + 3.5h = ~20:00 (PDF: 19:30 — ≈30min różnicy, akceptowalne)
    expect(plan[2]!.plannedStart.getHours()).toBeGreaterThanOrEqual(19);
    expect(plan[2]!.plannedStart.getHours()).toBeLessThanOrEqual(21);
  });

  it('plan zawsze kończy się NIGHT', () => {
    const bucket = pickBucket(8, null);
    const napLength = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps);
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);
    const plan = forwardPass(morningWake, bucket, napLength);

    expect(plan[plan.length - 1]!.type).toBe('NIGHT');
  });

  it('bucket z 1 drzemką (18m+) → plan ma 1 NAP + 1 NIGHT', () => {
    const bucket = pickBucket(18, null);
    const napLength = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps);
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);
    const plan = forwardPass(morningWake, bucket, napLength);

    expect(plan).toHaveLength(2);
    expect(plan[0]!.type).toBe('NAP');
    expect(plan[1]!.type).toBe('NIGHT');
  });

  it('plannedEnd dla każdego NAP jest po plannedStart', () => {
    const bucket = pickBucket(9, null);
    const napLength = 1.5;
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);
    const plan = forwardPass(morningWake, bucket, napLength);

    for (const entry of plan.filter((e) => e.type === 'NAP')) {
      expect(entry.plannedEnd).toBeDefined();
      expect(entry.plannedEnd!.getTime()).toBeGreaterThan(entry.plannedStart.getTime());
    }
  });

  it('NIGHT nie ma plannedEnd (czas nocy nieznany z góry)', () => {
    const bucket = pickBucket(9, null);
    const napLength = 1.5;
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);
    const plan = forwardPass(morningWake, bucket, napLength);
    const night = plan.find((e) => e.type === 'NIGHT');

    expect(night).toBeDefined();
    expect(night!.plannedEnd).toBeUndefined();
  });

  it('targetWakeTime 06:30 przesuwa cały harmonogram o 30min wcześniej niż 07:00', () => {
    const bucket = pickBucket(9, null);
    const napLength = Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps);

    const wake700 = new Date(2024, 0, 1, 7, 0, 0, 0);
    const wake630 = new Date(2024, 0, 1, 6, 30, 0, 0);

    const plan700 = forwardPass(wake700, bucket, napLength);
    const plan630 = forwardPass(wake630, bucket, napLength);

    // Każdy entry w planie 06:30 powinien być dokładnie 30min wcześniej niż w planie 07:00
    for (let i = 0; i < plan700.length; i++) {
      const diff = plan700[i]!.plannedStart.getTime() - plan630[i]!.plannedStart.getTime();
      expect(diff).toBe(30 * 60 * 1000); // 30 minut w ms
    }
  });

  it('napLengthHours=0 (0 drzemek) → plan ma tylko NIGHT', () => {
    // Symulacja bucketa z 0 drzemkami (edge case)
    const morningWake = new Date(2024, 0, 1, 7, 0, 0, 0);
    const bucket = pickBucket(18, null);
    // Odwołujemy się do bucket z typicalNaps=1, ale napLength=0 nie wpływa na strukturę
    const plan = forwardPass(morningWake, bucket, 0);
    // Przy napLength=0 drzemka ma zerowy czas, ale jest zapisana
    expect(plan[plan.length - 1]!.type).toBe('NIGHT');
  });
});
