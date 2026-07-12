# 83d669b: feat(machine-kotki): activeSessionPredictedEnd — przewidywany koniec sesji w toku

**Data:** 2026-07-12
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Fix C2 (silnik) — finalne review feat/plan-dnia-os-24h

## Co zostało zrobione

- Kontynuacja przerwanej pracy (poprzedni agent zostawił niezcommitowane zmiany na engine side, +222/−5 linii) — zweryfikowano, uzupełniono i scommitowano.
- Nowe pole `Recommendation.activeSessionPredictedEnd?: Date | null` w `packages/sleeper-machine/src/types.ts` — opcjonalne, non-breaking. Reprezentuje przewidywany koniec (NAP w toku) lub pobudkę (NIGHT w toku) sesji aktywnej (`state.activeSession`), której `remainingNapsToday` nie obejmuje (łańcuch zwraca wyłącznie przyszłe sloty).
- `resolveActiveSessionPredictedEnd()` w `packages/sleeper-machine-kotki/src/chain.ts`:
  - NAP w toku → `max(now, start + długość drzemki wg bucketa)` — przez wspólny helper `predictedNapEndMs`, reużywany też przez `resolveChainAnchor` (kaskada kotwicy #1), bez duplikacji logiki.
  - NIGHT w toku, pobudka jeszcze przed nami (`morningWake > now`, np. `now`=02:00) → `morningWake`.
  - NIGHT w toku, noc zaczęta dziś wieczorem (`morningWake <= now`) → pobudka JUTRO (`morningWake + 24h`) — wartość celowo wykracza poza dzisiejszą dobę, web (day-forecast/day-timeline) przycina do końca doby.
  - Brak sesji w toku → `null`.
- `recommender.ts` (kotki): wywołuje `resolveActiveSessionPredictedEnd` i ustawia pole na `Recommendation`, bez wpływu na `remainingNapsToday`/`nextSleepAt`.
- Galland (`recommend()`, sleeper-machine) nie ustawia pola (zawsze `undefined`) — dodany brakujący test niezmienniczości (`recommender.test.ts`, sleeper-machine): `activeSessionPredictedEnd` pozostaje `undefined` niezależnie od `state.activeSession` (NAP/NIGHT/brak).

## Zmienione pliki

- `packages/sleeper-machine/src/types.ts` — nowe pole `Recommendation.activeSessionPredictedEnd`.
- `packages/sleeper-machine/tests/recommender.test.ts` — dodany test niezmienniczości Galland (brakujący w zastanym stanie, uzupełniony w tej sesji).
- `packages/sleeper-machine-kotki/src/chain.ts` — `predictedNapEndMs` (wspólny helper), `resolveActiveSessionPredictedEnd`.
- `packages/sleeper-machine-kotki/src/recommender.ts` — wywołanie + podpięcie pola do `Recommendation`.
- `packages/sleeper-machine-kotki/tests/chain.test.ts` — 5 nowych testów `resolveActiveSessionPredictedEnd` (brak sesji, NAP w toku przed/po przewidywanym końcu, NIGHT o 2:00, NIGHT wieczorem).
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — 4 nowe testy end-to-end przez `recommendKotkiDwa` (te same scenariusze + spójność z kotwicą łańcucha).

## Powód / kontekst

Finding C2 z finalnego review gałęzi `feat/plan-dnia-os-24h`: bez tego pola web (prognoza bilansu dnia + oś "rytm dnia") nie miał źródła danych o "ogonie" sesji w toku, co dawało skok bilansu przy starcie drzemki/nocy i dziurę na osi. Silnikowa strona zastana po poprzednim agencie była kompletna i poprawna (zweryfikowano diff + uruchomiono testy) poza brakującym testem niezmienniczości dla Galland wymaganym przez brief — uzupełniony w tej sesji.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-machine build`, `pnpm --filter sleeper-machine-kotki build` — oba `tsc` bez błędów)
- test: PASS — `pnpm --filter sleeper-machine test` (208/208, +1 nowy test niezmienniczości), `pnpm --filter sleeper-machine-kotki test` (90/90, +9 nowych: 5 chain.test.ts, 4 recommender.test.ts)
- runtime: n/a (biblioteka, brak UI w tym commicie) — pokryte testami jednostkowymi z jawnym `now`
