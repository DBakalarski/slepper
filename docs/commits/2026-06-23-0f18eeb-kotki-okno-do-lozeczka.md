# 0f18eeb: feat(sleeper-web): rozbicie okna aktywnosci na "do lozeczka" + "drzemka" dla Kotki Dwa

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (drobny feature UX)

## Co zostalo zrobione
- W glownym oknie aktywnosci (`ActiveWindowCard`) dla dziecka z algorytmem **Kotki Dwa** pojedynczy badge "Drzemka za ~X" rozbity na dwa odliczania:
  - **Do lozeczka za ~X** = `nextSleepAt - 15 min` (moment odlozenia po rytuale)
  - **Drzemka za ~X** / **Sen nocny za ~X** = `nextSleepAt` (koniec okna aktywnosci)
- Zrodlo 15 min: przewodnik snu Kotki Dwa, rozdz. "Jak ustalic harmonogram dnia" — "Odkladaj do lozeczka na sen, po rytuale do snu, na 15min przed koncem okna aktywnosci". Stala `CRIB_LEAD_MINUTES = 15` inline (jedno uzycie, wiedza domenowa).
- Etykieta drugiego wiersza ("Drzemka" vs "Sen nocny") wg `recommendation.remainingNapsToday[0].type` (pusty plan = kolejny sen to noc).
- Algorytm Galland bez zmian — pojedynczy badge "Drzemka za" / "Przekroczono okno".

## Zmienione pliki
- `packages/sleeper-web/src/components/ActiveWindowCard.tsx` — nowy prop `algorithm`, stala `CRIB_LEAD_MINUTES`, helper `CountdownRow` (label + badge `za ~X` / `~X temu`), warunkowy rozbity widok dla `kotki_dwa`.
- `packages/sleeper-web/src/app/(app)/index.tsx` — przekazanie `algorithm={child.algorithm}` do `ActiveWindowCard`.

## Powod / kontekst
User: "jesli wybiore algorytm kotki dwa, to w glownym oknie aktywnosci rozbij za ile drzemka, za ile odlozenie do lozeczka". Web-only (scope projektu); mobilny `ActiveWindowCard` w `sleeper-app/` nietkniety.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit`)
- lint: PASS (`pnpm --filter sleeper-web lint`)
- test: PASS (161/161 vitest)
- build + invariants: PASS (`pnpm web:build:check` -> Exported: dist)
- runtime: nie weryfikowano on-device (deploy Vercel po push)
