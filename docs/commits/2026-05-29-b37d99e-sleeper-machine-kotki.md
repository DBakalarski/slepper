# b37d99e: feat(fixy-i-kotki-dwa-algorytm): nowy package sleeper-machine-kotki — lookup-based recommender Kotki Dwa

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 4

## Co zostało zrobione

- Stworzono nowy package `packages/sleeper-machine-kotki/` — sibling do `sleeper-machine`.
- `src/lookup.ts`: typ `AgeBucket` + stała `BUCKETS` (11 bucketów: 5m, 6m-3naps, 6m-2naps, 7m, 8m, 9m, 10m, 11m, 12m-2naps, 12m-1nap, 18m+) + funkcja `pickBucket(ageMonths, preferredNaps)`.
- `src/forwardPass.ts`: czysta funkcja generująca harmonogram dnia: `(morningWake, bucket, napLengthHours) → PlanEntry[]`.
- `src/recommender.ts`: orchestrator — walidacja inputu, `pickBucket`, `forwardPass`, override `preferredBedtime`, `currentWakeWindowDuration`, `nextSleepAt`, warnings (ryzyko przemęczenia).
- `src/index.ts`: eksport `recommendKotkiDwa` + re-eksport typów z `sleeper-machine` (bez duplikacji).
- Testy vitest: 43 testy w 3 plikach (lookup: 17, forwardPass: 8, recommender: 18). Scenariusze PDF-paired: 5m→s.13 (08:45), 9m→s.18 (10:00).
- Konfiguracja: `package.json`, `tsconfig.json` (extends sleeper-machine), `vitest.config.ts`, `README.md`, `CLAUDE.md`.
- Zaktualizowano `pnpm-lock.yaml` po `pnpm install`.

## Zmienione pliki

- `packages/sleeper-machine-kotki/package.json` — nowy package (workspace, dep sleeper-machine)
- `packages/sleeper-machine-kotki/tsconfig.json` — extends ../sleeper-machine/tsconfig.json
- `packages/sleeper-machine-kotki/vitest.config.ts` — konfiguracja testów
- `packages/sleeper-machine-kotki/README.md` — filozofia i public API
- `packages/sleeper-machine-kotki/CLAUDE.md` — zasady packagu (lookup-based; bez EWMA)
- `packages/sleeper-machine-kotki/src/index.ts` — eksport recommender + re-eksport typów
- `packages/sleeper-machine-kotki/src/lookup.ts` — BUCKETS + pickBucket()
- `packages/sleeper-machine-kotki/src/forwardPass.ts` — forward pass (pure function)
- `packages/sleeper-machine-kotki/src/recommender.ts` — orchestrator
- `packages/sleeper-machine-kotki/tests/lookup.test.ts` — 17 testów
- `packages/sleeper-machine-kotki/tests/forwardPass.test.ts` — 8 testów
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — 18 testów
- `pnpm-lock.yaml` — aktualizacja po rejestracji workspace
- `docs/active/.../fixy-i-kotki-dwa-algorytm-zadania.md` — zaznaczone ✅
- `docs/active/.../fixy-i-kotki-dwa-algorytm-kontekst.md` — dodany wpis Faza 4

## Powód / kontekst

Faza 4 planu zadania. Nowy package musi być osobny od `sleeper-machine` (zgodnie z CLAUDE.md sleeper-machine: "nie wprowadzaj wake windows by age"). Filozofie algorytmów konfliktują — Galland = science-based, Kotki Dwa = lookup-based guidebook. Oba pakiety współdzielą typy przez re-eksport (bez duplikacji).

Odchylenie: `Minutes` jest branded type constructor eksportowany jako `makeMinutes` (wartość) z `sleeper-machine`, nie jako `Minutes()`. Użyto `makeMinutes()` zamiast `Minutes()`.

## Walidacja

- typecheck: PASS (tsc build → dist/ bez błędów)
- test: PASS (43/43 vitest — lookup 17, forwardPass 8, recommender 18)
- runtime: n/a (pure library, brak UI)
