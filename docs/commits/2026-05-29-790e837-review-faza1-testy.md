# 790e837: fix(fixy-i-kotki-dwa-algorytm): poprawki po review fazy 1 (cykl 1)

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 1 — review fix cycle 1

## Co zostało zrobione

- Dodano vitest jako devDependency do `sleeper-app` (P2 finding TEST-01)
- Stworzono `packages/sleeper-app/vitest.config.mjs` (format `.mjs` zamiast `.ts` bo `sleeper-app` nie ma `"type": "module"` — unikamy konfliktu ESM/CJS)
- Stworzono `packages/sleeper-app/src/lib/__tests__/time.test.ts` z 14 testami dla `addDaysInAppTz`:
  - Happy path: n=1, n=-1, n=0, granica miesiąca, granica roku, tydzień
  - DST boundary: spring-forward (2026-03-29, Europe/Warsaw) i fall-back (2026-10-25)
  - Invalid input: empty string, zły format (DD-MM-YYYY), non-date string

## Zmienione pliki

- `packages/sleeper-app/package.json` — dodano `vitest: ^3.2.0` do devDeps + skrypt `test: vitest run`
- `packages/sleeper-app/vitest.config.mjs` — NOWY; konfiguracja vitest dla node env + alias `@/*`
- `packages/sleeper-app/src/lib/__tests__/time.test.ts` — NOWY; 14 testów addDaysInAppTz
- `pnpm-lock.yaml` — aktualizacja po dodaniu vitest

## Powód / kontekst

Review fazy 1 (review-faza-1.md) zidentyfikował P2 finding TEST-01: `addDaysInAppTz` to
eksportowana publiczna funkcja w `lib/time.ts` bez żadnych testów. `coding-rules.md §2` wymaga
minimum happy path + error case dla każdej nowej funkcji publicznej. Funkcja jest TZ-sensitive
(operuje na `fromZonedTime`/`toZonedTime` dla `Europe/Warsaw`), więc dodano też testy DST boundary.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów)
- lint: PASS (`pnpm --filter sleeper-app lint` — exit 0)
- testy: PASS (`pnpm --filter sleeper-app test` — 14/14 passed, 239ms)
