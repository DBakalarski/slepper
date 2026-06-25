# 4d28f57: feat(tryb-nocny): tryb nocny ekranu sesji (Faza 7)

**Data:** 2026-06-25
**Branch:** main
**Faza zadania:** Faza 7 roadmapy — "Tryb nocny / obsługa jedną ręką" (user: "faza z dark mode")

## Co zostało zrobione
Tryb nocny ekranu aktywnej sesji (`sleep-fullscreen.tsx`), web-only PWA, zero warstwy danych. Pełny pipeline `/dev-brainstorm → /dev-plan → /dev-docs-execute` (3 Implementation Units delegowane do `feature-builder-ui`).

- **R1/R2/R3 — true-black + auto-dim:** tło `bg-black` (#000) na ekranie sesji; nowy hook `useIdleDimmer` przygasza zawartość po ~20 s bezczynności (timer ~15% opacity, CTA ~10%); przezroczysty overlay `Pressable` (ostatnie dziecko `SafeAreaView`, nad CTA) przechwytuje pierwszy tap w stanie dimmed → tylko wybudza, nie kończy sesji.
- **R4 — hold-tap:** nowy `HoldToConfirmButton` zastępuje tap na "Zakończ sen" — wymaga ~1 s przytrzymania z liniowym fillem; puszczenie przed końcem anuluje. `Animated` (react-native) zamiast reanimated dla natychmiastowego, deterministycznego resetu przy cancel mid-animation na react-native-web.
- **R5 — wolniejszy tick w tle:** `useSessionTimer` tyka ~30 s gdy `document.hidden`, 1 s gdy widoczny; po `visibilitychange→visible` natychmiastowy recompute. Czas pozostaje derived z `start_at` (zero dryfu). Korzyść dotyczy też home card (`SleepInProgressCard` — współdzielony hook).

Logika timerów wydzielona do pure helperów (`computeSessionTimer`, `createIdleDimmerController`, `createHoldController`) testowanych behawioralnie + static-invariants — bo vitest działa w `environment: 'node'` bez jsdom/RTL (wzorzec spójny z `learned-patterns.md`).

## Zmienione pliki
- `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` — bg-black, useIdleDimmer, overlay wybudzania, HoldToConfirmButton, handleEnd w useCallback
- `packages/sleeper-web/src/features/sessions/useSessionTimer.ts` — wolniejszy tick (SLOW_TICK_MS) + visibilitychange + pure `computeSessionTimer`
- `packages/sleeper-web/src/features/sessions/useIdleDimmer.ts` — nowy hook auto-dim + pure controller
- `packages/sleeper-web/src/components/ui/HoldToConfirmButton.tsx` — nowy komponent hold-to-confirm
- `packages/sleeper-web/src/components/ui/hold-controller.ts` — pure controller holdu (HOLD_MS)
- Testy: `__tests__/useSessionTimer.test.ts`, `__tests__/useIdleDimmer.test.ts`, `app/(app)/__tests__/sleep-fullscreen.invariants.test.ts`, `components/ui/__tests__/HoldToConfirmButton.test.ts` (28 nowych testów)
- `docs/dev-brainstorms/2026-06-25-tryb-nocny-sesji-requirements.md` — requirements doc
- `docs/plans/2026-06-25-001-feat-tryb-nocny-sesji-plan.md` — plan techniczny (3 IU)
- `docs/ideation/2026-06-24-roadmap.md` — Faza 7 odhaczona z adnotacją o zakresie

## Powód / kontekst
Rodzic sprawdza telefon w nocy obok śpiącego dziecka — jasny ekran oślepia/budzi, tyka co 1 s przez 6-8 h (bateria), a po ciemku łatwo przypadkiem zakończyć sesję. Świadome odchylenie od dosłownego brzmienia roadmapy: tryb nocny zrealizowany **tylko na ekranie sesji** (połączone itemy #1+#2), zamiast osobnego app-wide motywu AMOLED — najwyższy stosunek wartość/koszt (nikt nie przegląda dashboardu o 3:00). Hold-tap tylko na "Zakończ sen" (nie START/STOP home — poza scope).

Odchylenia implementacyjne (wszystkie uzasadnione): pure-extraction helperów do testów (brak jsdom), `Animated` zamiast reanimated dla cancel, `handleEnd` w useCallback (per-sekundowy tick re-renderu inaczej anulowałby trwający hold).

## Walidacja
- typecheck: PASS (0 błędów)
- test: PASS — 274/274 (28 nowych, zero regresji)
- lint: PASS (0 errors/warnings)
- build: PASS (`pnpm web:build:check` — tsc + lint + test + invariants + expo export web → dist/)
- runtime: n/a w tej sesji — manual PWA = Operator checklist w planie (user weryfikuje na zainstalowanym PWA: czerń + auto-dim + tap-budzi-bez-kończenia + hold kończy / szybki tap nie)
