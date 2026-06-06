# d694448: feat(sleeper-web-pwa): IU7 Recommendation data + algorytm wiring

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 2 — Data Layer, IU7

## Co zostalo zrobione

- Skopiowano 1:1 z `packages/sleeper-app/src/features/recommendation/`:
  - `adapter.ts` — bridge app types ↔ sleeper-machine types (`toLibSessions`, `toLibProfile`)
  - `useSleepRecommendation.ts` — hook wybierajacy algorytm per `children.algorithm` ('galland' | 'kotki_dwa')
  - `RecommendationCard.tsx` — UI component (kopia 1:1, do uzycia w IU10 home screen)
- Pre-build workspace deps:
  - `pnpm --filter sleeper-machine build` → `packages/sleeper-machine/dist/`
  - `pnpm --filter sleeper-machine-kotki build` → `packages/sleeper-machine-kotki/dist/`
- Dodano testy jednostkowe `__tests__/adapter.test.ts` (11 cases):
  - `toLibSessions` (4): nap→NAP / night_sleep→NIGHT mapping, ISO string → Date conversion, filtruje aktywne sesje (end_at===null), empty input.
  - `toLibProfile` (7): tylko dateOfBirth, targetWakeTime attach, preferredNapsCount null-safe (0/2/null), parser preferredBedtime "HH:MM" + "HH:MM:SS" (Postgres format), fail-safe invalid input ('not-a-time', '25:00', '12:60'), null preferredBedtime.

## Zmienione pliki

- `packages/sleeper-web/src/features/recommendation/adapter.ts` — kopia 1:1 (69 LOC)
- `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` — kopia 1:1 (96 LOC)
- `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` — kopia 1:1 (88 LOC)
- `packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts` — **NEW** testy (11)

## Powod / kontekst

IU7 z planu Fazy 2 (`docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md`). Cel: PWA liczy smart-start rekomendacje przez ten sam algorytm co mobile. Workspace deps (`sleeper-machine`, `sleeper-machine-kotki`) konsumuja types z `dist/` — wymagaja `pnpm build` przed pierwszym `tsc` w sleeper-web (pattern udokumentowany w plan technicznym sekcja "Build order").

`useSleepRecommendation` jest hookiem TanStack Query — wymaga RN/QueryClient runtime, manual test [Mobile-manual] po IU10. Pure adapter funkcje testowane unit (krytyczne dla bezpieczenstwa typow algorytmu).

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit` exit 0, workspace types resolve z dist/)
- test: PASS 46/46 (14 time + 7 translate-session-error + 5 schedule-nap-side-effects + 9 translate-family-error + 11 adapter)
- lint: PASS
- sleeper-machine build: PASS (`pnpm --filter sleeper-machine build` exit 0)
- sleeper-machine-kotki build: PASS (`pnpm --filter sleeper-machine-kotki build` exit 0)
- sleeper-app regression: PASS
- runtime: n/a (data layer, manual po IU10)

## Status fazy

Faza 2 (IU5-IU7) — **kompletna**. Wszystkie data layer feature'y obecne, typecheck PASS, testy PASS, regression PASS. Nastepnie: Faza 3 (UI & Routes, IU8-IU10).
