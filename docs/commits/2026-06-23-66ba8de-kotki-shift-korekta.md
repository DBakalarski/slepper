# 66ba8de: feat(kotki): nextSleepShiftMinutes + korekta okna w karcie aktywnosci

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (feature, follow-up do e1dfa9b)

## Co zostalo zrobione
- Nowe pole `nextSleepShiftMinutes: number | null` w typie `Recommendation` (`sleeper-machine`). Minuty ze znakiem: dodatnie = sen wczesniej niz plan (krotsza drzemka), ujemne = pozniej (dluzsza). `null` gdy nieobliczalne lub algorytm nie wspiera.
- `recommendKotkiDwa` liczy przesuniecie: `idealNextStart = plan[napsDone.length].plannedStart` (idealny plan z `forwardPass`, kotwiczony na morningWake + stalych dlugosciach), minus realny `nextSleepAt` (kotwiczony na realnym koncu ostatniej drzemki). `Math.round((ideal - real) / minuta)`.
- `recommend` (Galland) zwraca `nextSleepShiftMinutes: null` — okna sa pochodna historii, nie ma stalego planu-baseline.
- `ActiveWindowCard` (tryb kotki_dwa): zamiast dlugiej noty krotki tekst "Korekta za krótszą drzemkę +X min" / "Korekta za dłuższą drzemkę −X min", pokazywany dopiero od |shift| ≥ 10 min (ponizej = szum).

## Zmienione pliki
- `packages/sleeper-machine/src/types.ts` — pole `nextSleepShiftMinutes` w `Recommendation`.
- `packages/sleeper-machine/src/recommender.ts` — Galland zwraca `null`.
- `packages/sleeper-machine/tests/recommender.test.ts` — asercja null dla cold-start Galland.
- `packages/sleeper-machine-kotki/src/recommender.ts` — obliczenie `nextSleepShiftMinutes`.
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — 3 testy (brak historii → 0, krotsza drzemka → +30, dluzsza → -30).
- `packages/sleeper-web/src/components/ActiveWindowCard.tsx` — krotka nota korekty zamiast dlugiego opisu.

## Powod / kontekst
User chcial konkret "o ile przesuwa", a nastepnie krotsza forme: "korekta za krotsza drzemke +Xmin". Wymagalo to wystawienia liczby z algorytmu (`remainingNapsToday` jest przefiltrowane do przyszlosci — niewystarczajace do policzenia delty dla wlasciwego slotu, stad nowe pole liczone z pelnego planu po indeksie `napsDone.length`).

## Walidacja
- typecheck: PASS (web + obie maszyny)
- test: PASS (sleeper-machine 205/205, kotki 46/46, web 161/161)
- build + invariants: PASS (`pnpm web:build:check` -> Exported: dist)
- runtime: nie weryfikowano on-device (deploy Vercel po push)
