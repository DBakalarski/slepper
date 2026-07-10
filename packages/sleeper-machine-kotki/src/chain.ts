import type { ActiveSleepSession, PlanEntry } from 'sleeper-machine';
import type { AgeBucket } from './lookup.js';
import { forwardPass } from './forwardPass.js';

const MS_PER_HOUR = 3_600_000;

export type ChainAnchor = {
  // Punkt startowy (ms) od którego liczony jest pierwszy WW w łańcuchu.
  readonly anchorMs: number;
  // Indeks pierwszej drzemki do wygenerowania (0-based, patrz forwardPass).
  readonly startIndex: number;
};

/**
 * Kaskada kotwicy re-kotwiczonego łańcucha planu (Task 1, feat/plan-dnia-os-24h).
 *
 * Priorytet:
 * 1. Sesja NAP w toku → kotwica = max(now, przewidywany koniec tej drzemki
 *    wg długości dla jej slotu). Ta drzemka liczy się jako "zrobiona" po swoim
 *    przewidywanym końcu — kolejny slot łańcucha zaczyna się o napsDoneCount+1.
 * 2. Sesja NIGHT w toku → kotwica = morningWake, jak przy cold starcie. Dziecko
 *    jeszcze nie wstało — cała historia sprzed nocy jest nieistotna dla planu
 *    kolejnego dnia.
 * 3. Brak sesji w toku → kotwica = realny koniec ostatniej ukończonej drzemki
 *    dziś (lub morningWake, gdy brak drzemek).
 */
export function resolveChainAnchor(params: {
  readonly now: Date;
  readonly activeSession: ActiveSleepSession | undefined;
  readonly napsDoneCount: number;
  readonly lastRealWakeMs: number;
  readonly morningWakeMs: number;
  readonly napLengths: readonly number[];
}): ChainAnchor {
  const { now, activeSession, napsDoneCount, lastRealWakeMs, morningWakeMs, napLengths } = params;

  if (activeSession?.type === 'NAP') {
    const idx = napsDoneCount;
    const napLenHours = napLengths[idx] ?? napLengths[napLengths.length - 1] ?? 0;
    const predictedEndMs = activeSession.start.getTime() + napLenHours * MS_PER_HOUR;
    return { anchorMs: Math.max(now.getTime(), predictedEndMs), startIndex: idx + 1 };
  }

  if (activeSession?.type === 'NIGHT') {
    return { anchorMs: morningWakeMs, startIndex: 0 };
  }

  return { anchorMs: lastRealWakeMs, startIndex: napsDoneCount };
}

/**
 * Buduje re-kotwiczony łańcuch pozostałego planu (NAP × pozostałe + 1 × NIGHT)
 * od podanej kotwicy. Pierwszy wpis, który wypadłby w przeszłości względem
 * `now` (okno czuwania przekroczone), jest clampowany do `now` — jego długość
 * (dla NAP) jest zachowana, a kolejne wpisy liczą się dalej od tego punktu,
 * bez nakładania się.
 */
export function buildChain(
  anchor: ChainAnchor,
  now: Date,
  bucket: AgeBucket,
  napLengths: readonly number[],
): PlanEntry[] {
  const plan: PlanEntry[] = [];
  const nowMs = now.getTime();
  let lastWakeMs = anchor.anchorMs;
  let clamped = false;

  for (let i = anchor.startIndex; i < bucket.typicalNaps; i++) {
    const ww = bucket.wakeWindowsHours[i] ?? bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
    const napLenHours = napLengths[i] ?? napLengths[napLengths.length - 1] ?? 0;
    let napStartMs = lastWakeMs + ww * MS_PER_HOUR;
    if (!clamped && napStartMs < nowMs) {
      napStartMs = nowMs;
      clamped = true;
    }
    const napEndMs = napStartMs + napLenHours * MS_PER_HOUR;
    plan.push({ plannedStart: new Date(napStartMs), plannedEnd: new Date(napEndMs), type: 'NAP' });
    lastWakeMs = napEndMs;
  }

  const nightWw = bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
  let nightStartMs = lastWakeMs + nightWw * MS_PER_HOUR;
  if (!clamped && nightStartMs < nowMs) {
    nightStartMs = nowMs;
  }
  plan.push({ plannedStart: new Date(nightStartMs), type: 'NIGHT' });

  return plan;
}

/**
 * Kolizja łańcucha z `preferredBedtime`: naturalna projekcja startu snu nocnego
 * (koniec ostatniej drzemki w łańcuchu + WW przed nocą) wypada później niż stały
 * bedtime. Bedtime NIE jest przesuwany w reakcji na kolizję — funkcja służy
 * wyłącznie do wygenerowania warninga.
 */
export function hasChainBedtimeCollision(
  chain: readonly PlanEntry[],
  bedtimeOverrideMs: number,
  bucket: AgeBucket,
): boolean {
  const lastNap = [...chain].reverse().find((e) => e.type === 'NAP');
  if (lastNap?.plannedEnd === undefined) return false;

  const nightWw = bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1]!;
  const projectedNightStartMs = lastNap.plannedEnd.getTime() + nightWw * MS_PER_HOUR;
  return projectedNightStartMs > bedtimeOverrideMs;
}

/** Nadpisuje ostatni wpis planu (musi być NIGHT) na stałą godzinę `bedtime`. */
export function overrideNightEntry(plan: readonly PlanEntry[], bedtime: Date): PlanEntry[] {
  const idx = plan.length - 1;
  const last = plan[idx];
  if (last === undefined || last.type !== 'NIGHT') return [...plan];
  const replaced: PlanEntry =
    last.plannedEnd !== undefined
      ? { plannedStart: bedtime, plannedEnd: last.plannedEnd, type: 'NIGHT' }
      : { plannedStart: bedtime, type: 'NIGHT' };
  const mutable = [...plan];
  mutable[idx] = replaced;
  return mutable;
}

/**
 * Idealizowany plan CAŁEGO dnia od `morningWake` (slot 0, bez re-kotwiczenia) —
 * baseline do liczenia `nextSleepShiftMinutes` w recommenderze.
 */
export function buildIdealPlan(
  morningWake: Date,
  bucket: AgeBucket,
  napLengths: readonly number[],
  bedtimeOverride: Date | null,
): PlanEntry[] {
  const idealPlan = forwardPass(morningWake, bucket, napLengths);
  return bedtimeOverride !== null ? overrideNightEntry(idealPlan, bedtimeOverride) : idealPlan;
}

/** Kaskada kotwicy (`resolveChainAnchor`) + generacja łańcucha (`buildChain`) w jednym wywołaniu. */
export function buildRemainingChain(params: {
  readonly now: Date;
  readonly activeSession: ActiveSleepSession | undefined;
  readonly napsDoneCount: number;
  readonly lastRealWakeMs: number;
  readonly morningWakeMs: number;
  readonly napLengths: readonly number[];
  readonly bucket: AgeBucket;
}): PlanEntry[] {
  const anchor = resolveChainAnchor(params);
  return buildChain(anchor, params.now, params.bucket, params.napLengths);
}
