# c0c41b5: feat(sleeper-web-pwa): IU6 Children + family data layer

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 2 — Data Layer, IU6

## Co zostalo zrobione

- Skopiowano 1:1 z `packages/sleeper-app/src/features/children/`:
  - `hooks.ts` — TanStack Query hooks (useChildren, useChildById, useCreateChild, useUpdateChild, useDeleteChild)
  - `useActiveChild.ts` — Zustand store (persist via AsyncStorage → localStorage na web OOTB)
- Skopiowano 1:1 z `packages/sleeper-app/src/features/family/`:
  - `hooks.ts` — family + invitations + members hooks (~250 LOC)
  - `translate-family-error.ts` — PL translation (czysta funkcja)
- Dodano puste foldery `components/` w obu features (placeholder na komponenty z IU8/IU10).
- Dodano testy jednostkowe `__tests__/translate-family-error.test.ts` (9 cases): 23505 unique violation, P0001 raise exception, "invitation not available" message, last-owner guard, not authenticated, no email claim, network/fetch, fallback raw, non-Error value.

## Zmienione pliki

- `packages/sleeper-web/src/features/children/hooks.ts` — kopia 1:1 (162 LOC)
- `packages/sleeper-web/src/features/children/useActiveChild.ts` — kopia 1:1 (33 LOC, Zustand)
- `packages/sleeper-web/src/features/family/hooks.ts` — kopia 1:1 (251 LOC)
- `packages/sleeper-web/src/features/family/translate-family-error.ts` — kopia 1:1 (33 LOC)
- `packages/sleeper-web/src/features/family/__tests__/translate-family-error.test.ts` — **NEW** testy (9)

## Powod / kontekst

IU6 z planu Fazy 2 (`docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md`). Cel: PWA czyta liste dzieci, wybiera aktywne, zarzadza rodzina/zaproszeniami. `useActiveChild` Zustand store dziala na web bez modyfikacji — `AsyncStorage` mapuje na `localStorage` przez polyfill. (Asynchroniczna hydration w Fazie 1 review zidentyfikowana jako risk dla theme — ale `useActiveChild` nie ma flash issue bo nie wplywa na pierwszy paint.)

Hooks `useChildren/useFamily` wymagaja React + QueryClient runtime — unit testy odlozono do IU10 (E2E manual po podpieciu komponentow). Pure funkcje (`translate-family-error`) pokryte testami w pelni.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit` exit 0)
- test: PASS 35/35 (14 time + 7 translate-session-error + 5 schedule-nap-side-effects + 9 translate-family-error)
- lint: PASS (`pnpm --filter sleeper-web lint` exit 0)
- sleeper-app regression: PASS
- runtime: n/a (data layer, manual po IU10)
