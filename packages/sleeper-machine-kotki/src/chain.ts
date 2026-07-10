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

/** Ostatnie okno czuwania bucketa (przed nocą). Fallback 0 — BUCKETS nigdy nie ma pustej tablicy. */
function lastWakeWindow(bucket: AgeBucket): number {
  return bucket.wakeWindowsHours[bucket.wakeWindowsHours.length - 1] ?? 0;
}

/**
 * Kaskada kotwicy re-kotwiczonego łańcucha planu (Task 1, feat/plan-dnia-os-24h).
 *
 * Priorytet:
 * 1. Sesja NAP w toku → kotwica = max(now, przewidywany koniec tej drzemki
 *    wg długości dla jej slotu). Ta drzemka liczy się jako "zrobiona" po swoim
 *    przewidywanym końcu — kolejny slot łańcucha zaczyna się o napsDoneCount+1.
 * 2. Sesja NIGHT w toku:
 *    - pobudka (morningWake) przed nami (`morningWakeMs > now`, np. now = 02:00
 *      w środku nocy z wczoraj) → kotwica = morningWake, plan dnia jak cold start;
 *    - pobudka już za nami (`morningWakeMs <= now`, noc zaczęta dziś wieczorem)
 *      → `null` = pusty łańcuch. Dziecko śpi na noc — plan drzemek na dziś jest
 *      zamknięty; bez tego clamp-do-now generowałby fantomowe drzemki w środku nocy.
 * 3. Brak sesji w toku → kotwica = realny koniec ostatniej ukończonej drzemki
 *    dziś (lub morningWake, gdy brak drzemek).
 *
 * Zwraca `null`, gdy łańcuch na dziś ma być pusty (wyłącznie przypadek 2b).
 */
export function resolveChainAnchor(params: {
  readonly now: Date;
  readonly activeSession: ActiveSleepSession | undefined;
  readonly napsDoneCount: number;
  readonly lastRealWakeMs: number;
  readonly morningWakeMs: number;
  readonly napLengths: readonly number[];
}): ChainAnchor | null {
  const { now, activeSession, napsDoneCount, lastRealWakeMs, morningWakeMs, napLengths } = params;

  if (activeSession?.type === 'NAP') {
    const idx = napsDoneCount;
    const napLenHours = napLengths[idx] ?? napLengths[napLengths.length - 1] ?? 0;
    const predictedEndMs = activeSession.start.getTime() + napLenHours * MS_PER_HOUR;
    return { anchorMs: Math.max(now.getTime(), predictedEndMs), startIndex: idx + 1 };
  }

  if (activeSession?.type === 'NIGHT') {
    if (morningWakeMs <= now.getTime()) return null;
    return { anchorMs: morningWakeMs, startIndex: 0 };
  }

  return { anchorMs: lastRealWakeMs, startIndex: napsDoneCount };
}

/**
 * Buduje re-kotwiczony łańcuch pozostałego planu (NAP × pozostałe + 1 × NIGHT)
 * od podanej kotwicy. `anchor = null` (noc w toku zaczęta dziś wieczorem) →
 * pusty łańcuch — plan drzemek na dziś jest zamknięty.
 *
 * Pierwszy wpis, który wypadłby w przeszłości względem `now` (okno czuwania
 * przekroczone), jest clampowany do `now` — jego długość (dla NAP) jest
 * zachowana, a kolejne wpisy liczą się dalej od tego punktu, bez nakładania się.
 * Uwaga: po clampie późne wpisy łańcucha mogą przekraczać północ — UI przycina
 * je do końca doby. W gałęzi NIGHT-in-progress clamp nigdy nie zachodzi:
 * kotwica (morningWake) jest tam z definicji w przyszłości względem `now`.
 */
export function buildChain(
  anchor: ChainAnchor | null,
  now: Date,
  bucket: AgeBucket,
  napLengths: readonly number[],
): PlanEntry[] {
  if (anchor === null) return [];

  const plan: PlanEntry[] = [];
  const nowMs = now.getTime();
  let lastWakeMs = anchor.anchorMs;
  let clamped = false;

  for (let i = anchor.startIndex; i < bucket.typicalNaps; i++) {
    const ww = bucket.wakeWindowsHours[i] ?? lastWakeWindow(bucket);
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

  const nightWw = lastWakeWindow(bucket);
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

  const projectedNightStartMs = lastNap.plannedEnd.getTime() + lastWakeWindow(bucket) * MS_PER_HOUR;
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
