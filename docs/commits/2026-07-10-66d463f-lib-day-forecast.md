# 66d463f: feat(web): lib day-forecast — prognoza bilansu dnia

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** plan-dnia-os-24h — Task 2 (Web lib — prognoza bilansu dnia)

## Co zostalo zrobione
- Nowy czysty moduł `computeDayForecast()` liczący prognozę snu na koniec biężącej doby (fakty + plan) i klasyfikujący wynik względem przedziału normy wiekowej.
- Fakty: suma sesji (w tym sesja w toku, `end_at === null` liczona do `now`) obcięta do `[startOfDayInAppTz(now), now]`.
- Plan: suma `PlanEntry[]` (z `sleeper-machine`) obcięta do `(now, endOfDayInAppTz(now)]`; wpis bez `plannedEnd` (typowo NIGHT w toku bez znanej pobudki) liczony do końca doby.
- Verdict: `'below' | 'within' | 'above'` względem przedziału `[minHours, maxHours]` z `getNormForChild`, delta do najbliższej krawędzi.
- 8 testów jednostkowych pokrywających wszystkie scenariusze z briefu: cross-midnight ogon nocy, sesja w toku (drzemka), noc w toku o 2:00, within/below/above, DST marzec (doba 23h) i październik (doba 25h), cold start, plus edge case uszkodzonych danych (end < start).

## Zmienione pliki
- `packages/sleeper-web/src/lib/day-forecast.ts` — nowy moduł, `computeDayForecast()` (created)
- `packages/sleeper-web/src/lib/__tests__/day-forecast.test.ts` — testy jednostkowe (created)

## Powod / kontekst
Task 2 z planu `plan-dnia-os-24h` (kontrakt: `docs/plans/2026-07-10-001-feat-plan-dnia-os-24h-plan.md`). Moduł budowany równolegle z Task 1 (kotki_dwa chain), bez zależności — kontrakt wejścia to sesje app (`SleepSession` z `@/features/sessions/hooks`, wzorzec zgodny z `sleep-aggregation.ts`/`csv-export.ts`/`session-gaps.ts`) i `PlanEntry[]` z `sleeper-machine`. Reuse `durationWithinWindow` (sleep-aggregation.ts) zamiast duplikować logikę okna czasowego — konstrukcja z granicą `now` wspólną dla obu okien (fakty kończą się na `now`, plan zaczyna się na `now`) eliminuje podwójne liczenie bez dodatkowej logiki.

Moduł jeszcze nie podpięty do UI (to zrobi kolejny task w planie) — commit oznaczony `[no-changelog]`, brak zmiany user-facing.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów)
- test: PASS (8/8 nowy plik; 288/288 cała suita `pnpm --filter sleeper-web test`)
- lint: PASS (`pnpm --filter sleeper-web lint` — 0 errors)
- runtime: n/a — czysta funkcja bez UI, zweryfikowana testami jednostkowymi
