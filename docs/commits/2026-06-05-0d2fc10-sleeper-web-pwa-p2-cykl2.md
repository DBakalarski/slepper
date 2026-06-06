# 0d2fc10: fix(sleeper-web-pwa): adresuj P2 z review fazy 2 (cykl 2)

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 2 — Data Layer (cykl fix 2 z 2, graceful autopilot)

## Co zostalo zrobione

- **P2.2 NAPRAWIONE** — dodano 2 pliki testow hookow (19 cases, all PASS):
  - `hooks.test.ts` (12 cases) — static invariants dla `useStartSession` (optimistic + rollback + cancelQueries + onSettled invalidations), `useEndSession` (optimistic null), stable queryKey (regression test na refetch loop), domain constraints (`useInsertBackdatedSession` validation, `useActiveSession`/`useLastEndedSession` filtry), error translation przez `translateSessionError`.
  - `useRealtimeSessions.test.ts` (7 cases) — static invariants dla cleanup (`supabase.removeChannel`), dependency array, postgres_changes filter, prefix invalidation (`['sessions']` + `['session']`), early return na null childId, unique channel name per childId.
- **Strategia testow:** static invariants przez `readFileSync` + grep (parytet z istniejacym `schedule-nap-side-effects.test.ts`). Pelne behavioralne renderHook + jsdom wymagaloby dodania `@testing-library/react` + jsdom env + mockowania `@/lib/supabase` (transitive react-native Flow syntax) — pominiete bez zgody usera per CLAUDE.md §8.
- **P2.1 + P2.3 DEFERRED** — udokumentowane w nowym `docs/active/sleeper-web-pwa/known-issues.md`:
  - P2.1: `useFocusEffect` web cross-midnight edge → IU10 manual test (hook nie ma jeszcze konsumenta, strukturalnie zalezne od UI).
  - P2.3: `console.warn` prod leak → IU11 deploy hardening (centralny fix przez `babel-plugin-transform-remove-console` zamiast dotykania kodu domeny).
- Aktualizacja `sleeper-web-pwa-zadania.md` (checkboxy P2.1/P2.2/P2.3 z notatkami) i `review-faza-2.md` (sekcja Historia cykli fix — cykl 2).

## Zmienione pliki

- `packages/sleeper-web/src/features/sessions/__tests__/hooks.test.ts` — NOWY, 12 cases static invariants
- `packages/sleeper-web/src/features/sessions/__tests__/useRealtimeSessions.test.ts` — NOWY, 7 cases static invariants
- `docs/active/sleeper-web-pwa/known-issues.md` — NOWY, lista P2.1 + P2.3 deferred z action items dla IU10/IU11
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md` — checkboxy P2.1/P2.2/P2.3 zaznaczone z notatkami (status P2: ZAADRESOWANE)
- `docs/active/sleeper-web-pwa/review-faza-2.md` — dodana sekcja "Cykl 2 (2026-06-05, autopilot graceful)" w Historii cykli fix

## Powod / kontekst

Drugi (ostatni) cykl naprawy P2 w trybie autopilot graceful. P1 byly juz naprawione w commicie 85bfe69 (cykl 1). Pozostale 3 P2:

- P2.1 (useFocusEffect web cross-midnight) — strukturalnie zalezne od IU10 UI, brak sensu fixowac przed dodaniem konsumenta. Deferred z action item dla manual test po IU10.
- P2.2 (testy hookow) — MOZNA naprawic teraz, ale z ograniczeniami: pelne renderHook wymaga nowych zaleznosci. Wybor: static invariants (parytet z istniejacym wzorcem) zamiast dodawania zaleznosci bez konsultacji. Pokrycie regresyjne kluczowych wzorcow (optimistic, cleanup, queryKey) ma realna wartosc.
- P2.3 (console.warn) — fix centralny w IU11 (babel plugin) eliminuje wszystkie warningi naraz bez dotykania kodu domeny (parytet zachowany).

Zasada parytetu 1:1 z sleeper-app zachowana — kod domeny niezmieniony, dodatki to wylacznie test files.

## Walidacja

- `pnpm --filter sleeper-web exec tsc --noEmit`: **PASS** (exit 0)
- `pnpm --filter sleeper-web lint`: **PASS** (exit 0)
- `pnpm --filter sleeper-web test`: **PASS** — 7 files, 65/65 tests (poprzednio 46, +19 nowych)
- `pnpm --filter sleeper-web build`: **PASS** — dist/index.html (1.36 kB) + entry-*.js (1.45 MB) + CSS (10.4 kB) + 18 assets, Metro 442ms
- Runtime: n/a (testy CI only, manual mobile po IU10)
