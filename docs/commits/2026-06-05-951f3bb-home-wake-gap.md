# 951f3bb: fix(home): render wake gap "aktywność Xg Ym" between today's sessions

**Data:** 2026-06-05
**Branch:** feature/fixy-edycja-aktywnosc-smart-start
**Faza zadania:** Faza 1 — Fix 2: gap aktywności w "Sesje dzisiaj" (home)

## Co zostalo zrobione
- Dodano import `computeGapsBetweenSessions` z `@/lib/session-gaps` w `src/app/(app)/index.tsx`.
- W `ActiveChildSection` dodano `gapMap = useMemo(() => computeGapsBetweenSessions(todaySessions), [todaySessions])` zaraz po `useSleepRecommendation`.
- W mapowaniu `todaySessions.slice(0, 5)` przekazano `gapBeforeMs={gapMap.get(session.id)}` do `SessionListItem` — identyczny pattern jak na ekranie Historia (`src/app/(app)/history.tsx:256`).
- Dodatkowo zmemoizowano `todaySessions` przez `useMemo([todaySessionsQuery.data])` zeby uciszyc nowe ostrzezenie `react-hooks/exhaustive-deps` z `gapMap` (wzorzec spojny z istniejacym memo `children` na linii 52).

## Zmienione pliki
- `packages/sleeper-app/src/app/(app)/index.tsx` — import helpera, memo `todaySessions`, memo `gapMap`, prop `gapBeforeMs` w `SessionListItem`.

## Powod / kontekst
User zglosil regresje: na home screen w sekcji "Sesje dzisiaj" brakuje informacji "aktywność Xg Ym" miedzy sesjami, ktora juz istnieje na ekranie Historia. Helper `computeGapsBetweenSessions` istnial, ale `SessionListItem` na home nie dostawal propa `gapBeforeMs`. Fix minimalny — tylko prop wiring + memoizacja, bez nowych zaleznosci ani refaktorow.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 bledow)
- lint: PASS (`pnpm --filter sleeper-app lint` — 0 warningow, w tym fix nowego ostrzezenia z useMemo deps)
- test: n/a (zmiana czysto UI prop wiring, manualny test on-device pending)
- runtime: manual on-device test pending (Expo Go iOS + Android — user)
