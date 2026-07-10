import { describe, it, expect } from 'vitest';
import { resolveChainAnchor, buildChain, hasChainBedtimeCollision } from '../src/chain.js';
import { pickBucket } from '../src/lookup.js';

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

describe('resolveChainAnchor — kaskada kotwicy łańcucha', () => {
  it('brak activeSession → anchor = lastRealWakeMs, startIndex = napsDoneCount', () => {
    const lastRealWakeMs = new Date(2024, 0, 15, 11, 30).getTime();
    const morningWakeMs = new Date(2024, 0, 15, 7, 0).getTime();
    const anchor = resolveChainAnchor({
      now: new Date(2024, 0, 15, 12, 0),
      activeSession: undefined,
      napsDoneCount: 1,
      lastRealWakeMs,
      morningWakeMs,
      napLengths: [1.75, 1.75],
    });
    expect(anchor.anchorMs).toBe(lastRealWakeMs);
    expect(anchor.startIndex).toBe(1);
  });

  it('activeSession NAP, now przed przewidywanym końcem → anchor = przewidywany koniec drzemki', () => {
    const napStart = new Date(2024, 0, 15, 10, 0);
    const anchor = resolveChainAnchor({
      now: new Date(2024, 0, 15, 11, 0), // przed 11:45
      activeSession: { start: napStart, type: 'NAP' },
      napsDoneCount: 0,
      lastRealWakeMs: new Date(2024, 0, 15, 7, 0).getTime(),
      morningWakeMs: new Date(2024, 0, 15, 7, 0).getTime(),
      napLengths: [1.75, 1.75],
    });
    expect(hhmm(new Date(anchor.anchorMs))).toBe('11:45');
    expect(anchor.startIndex).toBe(1);
  });

  it('activeSession NAP, now po przewidywanym końcu (drzemka się przeciąga) → anchor = now', () => {
    const napStart = new Date(2024, 0, 15, 10, 0);
    const anchor = resolveChainAnchor({
      now: new Date(2024, 0, 15, 12, 30), // po 11:45
      activeSession: { start: napStart, type: 'NAP' },
      napsDoneCount: 0,
      lastRealWakeMs: new Date(2024, 0, 15, 7, 0).getTime(),
      morningWakeMs: new Date(2024, 0, 15, 7, 0).getTime(),
      napLengths: [1.75, 1.75],
    });
    expect(hhmm(new Date(anchor.anchorMs))).toBe('12:30');
    expect(anchor.startIndex).toBe(1);
  });

  it('activeSession NIGHT zaczęta dziś wieczorem (morningWake <= now) → null (pusty łańcuch, dziecko śpi na noc)', () => {
    const anchor = resolveChainAnchor({
      now: new Date(2024, 0, 15, 22, 0),
      activeSession: { start: new Date(2024, 0, 15, 19, 30), type: 'NIGHT' },
      napsDoneCount: 2, // historia sprzed nocy — ma być zignorowana
      lastRealWakeMs: new Date(2024, 0, 15, 16, 0).getTime(),
      morningWakeMs: new Date(2024, 0, 15, 7, 0).getTime(), // dzisiejsza pobudka — już przeszłość
      napLengths: [1.75, 1.75],
    });
    expect(anchor).toBeNull();
  });

  it('activeSession NIGHT z wczoraj, now w środku nocy (morningWake > now) → anchor = morningWakeMs, startIndex = 0', () => {
    const anchor = resolveChainAnchor({
      now: new Date(2024, 0, 15, 2, 0),
      activeSession: { start: new Date(2024, 0, 14, 19, 30), type: 'NIGHT' },
      napsDoneCount: 0,
      lastRealWakeMs: new Date(2024, 0, 15, 7, 0).getTime(),
      morningWakeMs: new Date(2024, 0, 15, 7, 0).getTime(), // pobudka przed nami
      napLengths: [1.75, 1.75],
    });
    expect(anchor).not.toBeNull();
    expect(anchor?.anchorMs).toBe(new Date(2024, 0, 15, 7, 0).getTime());
    expect(anchor?.startIndex).toBe(0);
  });
});

describe('buildChain — generowanie re-kotwiczonego łańcucha', () => {
  const bucket9m = pickBucket(9, null); // WW [3, 3, 3.5], typicalNaps 2
  const napLengths = [1.75, 1.75];

  it('startIndex=0 od anchor 07:00 → identyczne z forwardPass (nap1 10:00, night 20:00)', () => {
    const now = new Date(2024, 0, 15, 7, 30);
    const anchor = { anchorMs: new Date(2024, 0, 15, 7, 0).getTime(), startIndex: 0 };
    const chain = buildChain(anchor, now, bucket9m, napLengths);

    expect(chain).toHaveLength(3);
    expect(hhmm(chain[0]!.plannedStart)).toBe('10:00');
    expect(hhmm(chain[2]!.plannedStart)).toBe('20:00');
  });

  it('startIndex >= typicalNaps → tylko NIGHT (bez drzemki widmo)', () => {
    const now = new Date(2024, 0, 15, 17, 0);
    const anchor = { anchorMs: new Date(2024, 0, 15, 16, 0).getTime(), startIndex: 2 };
    const chain = buildChain(anchor, now, bucket9m, napLengths);

    expect(chain).toHaveLength(1);
    expect(chain[0]!.type).toBe('NIGHT');
  });

  it('pierwszy wpis w przeszłości (okno czuwania przekroczone) → clamp do now', () => {
    const now = new Date(2024, 0, 15, 12, 0);
    // anchor 07:00 + WW[0]=3h = 10:00, ale now=12:00 → clamp do 12:00.
    const anchor = { anchorMs: new Date(2024, 0, 15, 7, 0).getTime(), startIndex: 0 };
    const chain = buildChain(anchor, now, bucket9m, napLengths);

    expect(chain[0]!.plannedStart.getTime()).toBe(now.getTime());
    // Długość drzemki zachowana mimo clampu (1.75h = 105 min).
    const napMin = (chain[0]!.plannedEnd!.getTime() - chain[0]!.plannedStart.getTime()) / 60_000;
    expect(napMin).toBe(105);
  });

  it('clamp dotyczy wyłącznie pierwszego wpisu — kolejne liczą się dalej bez nakładania', () => {
    const now = new Date(2024, 0, 15, 12, 0);
    const anchor = { anchorMs: new Date(2024, 0, 15, 7, 0).getTime(), startIndex: 0 };
    const chain = buildChain(anchor, now, bucket9m, napLengths);

    // nap1 clamped: start 12:00, end 13:45. nap2 = 13:45 + WW[1]=3h = 16:45 (nie nakłada się).
    expect(chain[1]!.plannedStart.getTime()).toBeGreaterThan(chain[0]!.plannedEnd!.getTime());
  });

  it('anchor = null (noc w toku zaczęta wieczorem) → pusty łańcuch', () => {
    const now = new Date(2024, 0, 15, 22, 15);
    const chain = buildChain(null, now, bucket9m, napLengths);

    expect(chain).toHaveLength(0);
  });
});

describe('hasChainBedtimeCollision — kolizja łańcucha z preferredBedtime', () => {
  const bucket9m = pickBucket(9, null);

  it('projekcja NIGHT po ostatniej drzemce późniejsza niż bedtime → kolizja', () => {
    const chain = [
      {
        plannedStart: new Date(2024, 0, 15, 13, 0),
        plannedEnd: new Date(2024, 0, 15, 14, 45),
        type: 'NAP' as const,
      },
      { plannedStart: new Date(2024, 0, 15, 18, 0), type: 'NIGHT' as const },
    ];
    const bedtimeMs = new Date(2024, 0, 15, 18, 0).getTime();

    expect(hasChainBedtimeCollision(chain, bedtimeMs, bucket9m)).toBe(true);
  });

  it('projekcja NIGHT wcześniejsza niż bedtime → brak kolizji', () => {
    const chain = [
      {
        plannedStart: new Date(2024, 0, 15, 10, 0),
        plannedEnd: new Date(2024, 0, 15, 11, 45),
        type: 'NAP' as const,
      },
      { plannedStart: new Date(2024, 0, 15, 20, 0), type: 'NIGHT' as const },
    ];
    const bedtimeMs = new Date(2024, 0, 15, 20, 0).getTime();

    expect(hasChainBedtimeCollision(chain, bedtimeMs, bucket9m)).toBe(false);
  });

  it('brak drzemek w łańcuchu (tylko NIGHT) → brak kolizji', () => {
    const chain = [{ plannedStart: new Date(2024, 0, 15, 19, 0), type: 'NIGHT' as const }];
    const bedtimeMs = new Date(2024, 0, 15, 19, 0).getTime();

    expect(hasChainBedtimeCollision(chain, bedtimeMs, bucket9m)).toBe(false);
  });
});
