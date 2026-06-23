# 8345fa5: fix(sleeper-web): powrot do wlasciwej zakladki z ekranow modalnych

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (bugfix zgloszony przez usera — bug 4)

## Co zostalo zrobione
- Bug 4: po wejsciu w sesje z ekranu Historia i edycji/anulowaniu user byl
  przenoszony na ekran Dzisiaj zamiast wracac do Historii.
- Przyczyna: `<Tabs>` uzywaly domyslnego `backBehavior` react-navigation
  (`firstRoute`), wiec `router.back()` z ukrytych ekranow zawsze celowal w
  pierwsza zakladke.
- Fix: `backBehavior="history"` na `<Tabs>` — powrot do ostatnio odwiedzonej
  zakladki/ekranu (dotyczy tez sleep-fullscreen, settings, child/[id]/edit).

## Zmienione pliki
- `packages/sleeper-web/src/app/(app)/_layout.tsx` — dodany prop
  `backBehavior="history"`.

## Powod / kontekst
Zgloszenie usera (bug 4). Uwaga: na web PWA nawigacja moze mieszac sie z
historia przegladarki — jesli regresja sie utrzyma, plan B to przekazywanie
origin przez param i jawny router.replace do zrodla.

## Walidacja
- typecheck: PASS
- test: PASS (`pnpm web:build:check` — 161 testow)
- lint: PASS
- build: PASS
- runtime: do manualnej weryfikacji w PWA przez usera.
