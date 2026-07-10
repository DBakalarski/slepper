# ef1943c: feat(machine-kotki): re-kotwiczony łańcuch planu drzemek + sesja aktywna

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Unit 1 — Silnik kotki_dwa — re-kotwiczony łańcuch planu + sesja aktywna (plan `docs/plans/2026-07-10-001-feat-plan-dnia-os-24h-plan.md`)

## Co zostało zrobione

- `remainingNapsToday` w `recommendKotkiDwa` liczone teraz łańcuchowo od realnej kotwicy (koniec ostatniej ukończonej drzemki dziś / przewidywany koniec sesji w toku / plan od preferowanej pobudki gdy noc w toku), zamiast filtrowania idealnego planu z `forwardPass` — usunięty zgrzyt między `nextSleepAt` (liczony z realnej kotwicy) a `remainingNapsToday` (liczony z idealnego planu od `morningWake`).
- Dodano `State.activeSession?: { start: Date; type: 'NAP' | 'NIGHT' }` (opcjonalne, non-breaking) do `packages/sleeper-machine/src/types.ts` — reprezentuje sesję snu w toku (bez `end`). Galland (`recommend()`) pole ignoruje (test na niezmienność wyniku).
- `forwardPass()` przyjmuje opcjonalny `startIndex` (domyślnie 0) — pozwala generować plan od dowolnego slotu drzemki, nie tylko od `morningWake` (backward-compatible, domyślne wywołania bez zmian).
- Nowy moduł `packages/sleeper-machine-kotki/src/chain.ts`:
  - `resolveChainAnchor()` — kaskada kotwicy: (1) sesja NAP w toku → `max(now, start + długość drzemki wg slotu)`, kolejny slot = `napsDone.length + 1`; (2) sesja NIGHT w toku → kotwica = `morningWake` (jak cold start), `startIndex=0`; (3) brak sesji → realny koniec ostatniej ukończonej drzemki dziś.
  - `buildChain()` — generuje łańcuch z clampem pierwszego wpisu do `now`, gdy naturalny start wypadłby w przeszłości (długość NAP zachowana, kolejne wpisy liczą się dalej bez nakładania).
  - `hasChainBedtimeCollision()` — wykrywa kolizję naturalnej projekcji NIGHT z `preferredBedtime` (bedtime pozostaje stały, tylko warning).
  - `overrideNightEntry()`, `buildIdealPlan()`, `buildRemainingChain()` — pomocnicze, re-używane przez `recommender.ts` (idealPlan do liczenia `nextSleepShiftMinutes`, chain do `remainingNapsToday`/`nextSleepAt`).
- `recommender.ts`: `nextSleepAt = remainingNapsToday[0]?.plannedStart ?? null` — jedno źródło prawdy (invariant przetestowany w każdym scenariuszu). Warning "ryzyko przemęczenia" liczony tylko gdy brak sesji w toku (podczas snu pojęcie nie ma sensu). Nowy warning przy kolizji łańcucha z bedtime. Walidacja `activeSession` na boundary (`validateInput`): `start` musi być poprawnym `Date` i nie może być w przyszłości względem `now`.
- Refaktor: orchestrator `recommendKotkiDwa` skrócony z ~113 do ~60 linii przez wydzielenie `resolveBedtimeOverride`, `computeWarnings`, `resolveCurrentWindow` (recommender.ts) oraz `buildIdealPlan`, `buildRemainingChain` (chain.ts) — pliki pod limitem 300 linii.

## Zmienione pliki

- `packages/sleeper-machine/src/types.ts` — nowy typ `ActiveSleepSession`, opcjonalne `State.activeSession`.
- `packages/sleeper-machine/src/index.ts` — re-eksport `ActiveSleepSession`.
- `packages/sleeper-machine/tests/recommender.test.ts` — 2 nowe testy (Galland ignoruje `activeSession` dla NAP/NIGHT).
- `packages/sleeper-machine-kotki/src/chain.ts` — NOWY moduł (łańcuch + kaskada kotwicy + collision + helpery).
- `packages/sleeper-machine-kotki/src/forwardPass.ts` — parametr `startIndex`.
- `packages/sleeper-machine-kotki/src/recommender.ts` — orchestracja re-kotwiczonego łańcucha, walidacja `activeSession`, refaktor na mniejsze funkcje.
- `packages/sleeper-machine-kotki/src/index.ts` — re-eksport `ActiveSleepSession`.
- `packages/sleeper-machine-kotki/tests/chain.test.ts` — NOWY plik, 11 testów (`resolveChainAnchor`, `buildChain`, `hasChainBedtimeCollision`).
- `packages/sleeper-machine-kotki/tests/forwardPass.test.ts` — 2 nowe testy na `startIndex`.
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — 10 nowych testów (8 scenariuszy z briefu + 2 walidacja `activeSession`).

## Powód / kontekst

Task 1 z planu `feat/plan-dnia-os-24h` (fundament pod R1/R6). Przed zmianą `nextSleepAt` liczył się od realnego końca ostatniej drzemki, ale `remainingNapsToday` filtrował idealny plan z `forwardPass` (zawsze od `morningWake`) — dawało to niespójne dane przy odchyleniach od idealnego harmonogramu (krótsza/dłuższa drzemka, sesja w toku). Rozwiązanie: `remainingNapsToday` liczone tą samą kotwicą co `nextSleepAt`, jeden łańcuch = jedno źródło prawdy. Podejście z brief/global-constraints zrealizowane 1:1 (kaskada kotwicy, clamp, warning kolizji, invariant, brak drzemki widmo).

Odchylenie od literalnego brzmienia briefu: „sesja NIGHT w toku → plan od preferred_wake_time/7:00" zaimplementowane jako `anchorMs = morningWake` (reużycie istniejącej `buildMorningWake`/`findRealMorningWake`), nie osobna ścieżka — działa poprawnie dopóki `now` nie przekracza dnia kalendarzowego wstecz od `morningWake` (test dobrany na `now` w środku nocy, przed docelową pobudką, żeby uniknąć nieistniejącego wcześniej problemu z rollover kalendarzowym w `buildMorningWake` — poza scope tego zadania, nie dotknięte).

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-machine build`, `pnpm --filter sleeper-machine-kotki build` — oba `tsc` bez błędów)
- test: PASS — `pnpm --filter sleeper-machine test` (207/207), `pnpm --filter sleeper-machine-kotki test` (75/75, w tym 24 nowe: 11 chain.test.ts, 2 forwardPass.test.ts, 10 recommender.test.ts + 1 istniejący plik bez zmian)
- runtime: n/a (biblioteka, brak UI w tym zadaniu) — zweryfikowane przez testy jednostkowe z jawnym `now` (TDD: RED przed implementacją `chain.ts`/rozszerzeniem `State`/`forwardPass`, GREEN po; brak modyfikacji istniejących testów)
