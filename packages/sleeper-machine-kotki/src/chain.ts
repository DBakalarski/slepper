import type { ActiveSleepSession, PlanEntry } from 'sleeper-machine';
import type { AgeBucket } from './lookup.js';
import { forwardPass } from './forwardPass.js';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

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
 * Przewidywany koniec drzemki w toku wg długości dla jej slotu, nigdy
 * wcześniej niż `now` (drzemka, która się przeciąga, "kończy się" najwcześniej
 * teraz). Wspólna dla `resolveChainAnchor` (kaskada #1) i
 * `resolveActiveSessionPredictedEnd` — jedno miejsce liczące tę wartość.
 */
function predictedNapEndMs(
  napStartMs: number,
  napIndex: number,
  napLengths: readonly number[],
  now: Date,
): number {
  const napLenHours = napLengths[napIndex] ?? napLengths[napLengths.length - 1] ?? 0;
  const predictedEndMs = napStartMs + napLenHours * MS_PER_HOUR;
  return Math.max(now.getTime(), predictedEndMs);
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
    const anchorMs = predictedNapEndMs(activeSession.start.getTime(), idx, napLengths, now);
    return { anchorMs, startIndex: idx + 1 };
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

/**
 * Przewidywany koniec/pobudka sesji w toku (Task C2, review finalne
 * feat/plan-dnia-os-24h). `remainingNapsToday` (chain.ts) zwraca wyłącznie
 * PRZYSZŁE sloty — podczas sesji w toku jej przewidywany "ogon" (now →
 * przewidywany koniec) nie jest ani faktem (fakty kończą się na `now`), ani
 * częścią łańcucha. Bez tej wartości prognoza/oś na webie miały dziurę
 * (skok bilansu przy starcie sesji, "absurdalny minus" przy nocy w toku).
 *
 * - NAP w toku → kaskada #1 (jak `resolveChainAnchor`), przez wspólny
 *   `predictedNapEndMs` — bez duplikacji.
 * - NIGHT w toku, pobudka jeszcze przed nami (`morningWakeMs > now`, np.
 *   now=02:00 w środku nocy z wczoraj) → pobudka = `morningWake`.
 * - NIGHT w toku, noc zaczęta dziś wieczorem (`morningWakeMs <= now`) →
 *   pobudka JUTRO (`morningWakeMs + MS_PER_DAY`). Wartość ma tylko wykroczyć
 *   poza dzisiejszą dobę — web (day-forecast/day-timeline) przycina do końca
 *   doby, więc precyzja DST nie ma tu znaczenia (ta sama zasada "brak
 *   new Date() z zegara" — arytmetyka na już policzonym `morningWakeMs`).
 * - Brak sesji w toku → `null`.
 */
export function resolveActiveSessionPredictedEnd(params: {
  readonly now: Date;
  readonly activeSession: ActiveSleepSession | undefined;
  readonly napsDoneCount: number;
  readonly morningWakeMs: number;
  readonly napLengths: readonly number[];
}): Date | null {
  const { now, activeSession, napsDoneCount, morningWakeMs, napLengths } = params;

  if (activeSession?.type === 'NAP') {
    const endMs = predictedNapEndMs(activeSession.start.getTime(), napsDoneCount, napLengths, now);
    return new Date(endMs);
  }

  if (activeSession?.type === 'NIGHT') {
    const wakeMs = morningWakeMs > now.getTime() ? morningWakeMs : morningWakeMs + MS_PER_DAY;
    return new Date(wakeMs);
  }

  return null;
}
