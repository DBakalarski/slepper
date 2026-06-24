# bea7ce5: feat(undo): quick-undo po zakonczeniu sesji przez reuzywalny Snackbar

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** Roadmap post-MVP — Faza 0 (szybkie wygrane)

## Co zostalo zrobione
- Dodano globalny, reuzywalny system Snackbar/toast (jeden naraz, auto-dismiss).
- Podpieto quick-undo do flow STOP na ekranie Home: po zakonczeniu sesji pojawia
  sie snackbar "Sen zakonczony" z akcja "Przywroc" (okno 3 s), ktora cofa
  `end_at -> null` (sesja znow aktywna) — zamiast dialogu potwierdzenia.
- Logika stanu wydzielona do czystego reducera (testowalna bez jsdom/RTL).

## Zmienione pliki
- `packages/sleeper-web/src/features/snackbar/snackbar-reducer.ts` — czysty reducer (SHOW/DISMISS), deterministyczny licznik id (`seq`), discriminated union.
- `packages/sleeper-web/src/features/snackbar/__tests__/snackbar-reducer.test.ts` — 5 testow (happy path + behavior: replace, dismiss matching/stale id, no-op).
- `packages/sleeper-web/src/features/snackbar/SnackbarProvider.tsx` — provider + `useSnackbar` hook; auto-dismiss przez `setTimeout` z `clearTimeout` w cleanup useEffect; typed error gdy uzyty poza providerem.
- `packages/sleeper-web/src/features/snackbar/__tests__/SnackbarProvider.test.ts` — static-invariants (cleanup timera, brak native-only API, wiring undo na Home).
- `packages/sleeper-web/src/components/ui/Snackbar.tsx` — komponent prezentacyjny (NativeWind, safe-area, hitSlop na akcji, `accessibilityLiveRegion`).
- `packages/sleeper-web/src/app/_layout.tsx` — montaz `SnackbarProvider` wewnatrz `SafeAreaProvider` (dostep do insets), nad `Stack`.
- `packages/sleeper-web/src/app/(app)/index.tsx` — `handleStop` pokazuje snackbar w `onSuccess`; undo przez `useUpdateSession({ patch: { end_at: null } })`.
- `docs/ideation/2026-06-24-roadmap.md` — oznaczenie postepu Fazy 0.

## Powod / kontekst
Pierwsze zadanie z roadmapu rozbudowy post-MVP. Zmeczony rodzic w nocy latwo
klika przypadkowo "Zakoncz sen"; undo bez dialogu (just-undo) redukuje frykcje.
Snackbar zbudowany jako reuzywalny, bo Faza 4 (wspolpraca real-time) potrzebuje
toasta "edytowane przez partnera" — 2+ uzycia uzasadniaja abstrakcje.

Odchylenia od planu: pozostale zadania Fazy 0 (helper agregacji, wybor biblioteki
wykresow) swiadomie zlozone do `/dev-brainstorm` Fazy 1 — rdzen agregacji juz
istnieje w `lib/sleep-stats.ts`, a brakujace czesci zaleza od ksztaltu dashboardu
(decyzja usera, unika spekulacji/duplikacji).

Edge case: jesli w oknie 3 s wystartowano nowa sesje, partial unique index
odrzuci undo (`end_at -> null`) — akcja po cichu nie zadziala (bez UI bledu).
Akceptowalne dla MVP undo.

## Walidacja
- typecheck: PASS (`tsc --noEmit` w ramach `pnpm web:build:check`)
- lint: PASS (`expo lint`)
- test: PASS (`vitest run` — m.in. 5 testow reducera + static-invariants)
- invariants: PASS (`check-no-native-imports.sh` + web-mock invariants)
- build: PASS (`expo export --platform web` → dist)
- runtime: nie testowane na zywo w przegladarce — do manualnej weryfikacji usera
  (STOP → pojawia sie snackbar → "Przywroc" wznawia sesje; znika po 3 s).
