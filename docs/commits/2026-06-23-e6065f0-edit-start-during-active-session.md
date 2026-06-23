# e6065f0: feat(sleeper-web): wejscie w edycje startu sesji w toku

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (zgloszenie usera — bug 5)

## Co zostalo zrobione
- Bug 5: brak mozliwosci edycji godziny startu sesji w trakcie snu.
- Diagnoza: ekran edycji `session/[id]` JUZ wspieral zmiane `start_at`
  aktywnej sesji (end pozostaje null), ale nie istnialo zadne wejscie do
  niego dla sesji w toku — `SleepInProgressCard` linkowal tylko do
  `/sleep-fullscreen`, a lista "Sesje dzisiaj" na home nie miala `onPress`.
- Fix: dodane dwa wejscia (zgodnie z wyborem usera):
  - tap na obszar timera w `SleepInProgressCard` -> `/session/[id]`,
  - przycisk "Edytuj start" na ekranie `sleep-fullscreen`.
- `SleepInProgressCard` dostal nowy wymagany prop `sessionId`. Link
  "Pelny ekran" pozostawiony jako sibling (nie zagniezdzony w Pressable),
  zeby uniknac double-fire na web.

## Zmienione pliki
- `packages/sleeper-web/src/components/SleepInProgressCard.tsx` — nowy prop
  `sessionId`, obszar timera owrappany w Pressable -> router.push edycji.
- `packages/sleeper-web/src/app/(app)/index.tsx` — przekazanie
  `activeSession.id` jako `sessionId` do karty.
- `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` — przycisk
  "Edytuj start" -> router.push edycji; "Wroc" zdegradowane do tekstowego
  wariantu.

## Powod / kontekst
Zgloszenie usera (bug 5). Po fixie stale-form (f24d18f) edycja startu sesji
w toku dziala poprawnie (formularz pokazuje swiezy stan aktywnej sesji).

## Walidacja
- typecheck: PASS
- test: PASS (`pnpm web:build:check` — 161 testow)
- lint: PASS
- build: PASS
- runtime: do manualnej weryfikacji w PWA przez usera (tap karty + przycisk
  na fullscreen -> zmiana startu -> przeliczenie timera).
