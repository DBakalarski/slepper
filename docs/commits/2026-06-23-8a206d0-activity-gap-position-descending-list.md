# 8a206d0: fix(sleeper-web): aktywnosc miedzy sesjami renderowana w zlym miejscu na home

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (bugfix zgloszony przez usera — gap aktywnosci)

## Co zostalo zrobione
- Linia "aktywność Xg Ym" (czas czuwania miedzy sesjami) pojawiala sie w zlym
  miejscu na ekranie Home ("Sesje dzisiaj").
- Przyczyna: `SessionListItem` zawsze renderowal gap NAD wierszem
  (`gapBeforeMs` keyed do pozniejszej sesji). Dziala to tylko dla listy
  rosnacej (Historia sortuje sesje dnia rosnaco). Home renderuje sesje w
  kolejnosci z `useSessions` — malejaco (`order('start_at', desc)`, najnowsza
  u gory) — wiec gap ladowal nad najnowsza sesja na samej gorze listy,
  oderwany od wczesniejszej sesji (ktora jest nizej).
- Fix: nowy prop `gapPosition` ('above' | 'below', default 'above') w
  `SessionListItem`. Home przekazuje 'below' — gap renderowany pod sesja, do
  ktorej nalezy, dzieki czemu aktywnosc ladzie wizualnie MIEDZY dwiema
  sasiednimi sesjami niezaleznie od kierunku sortowania listy.
- Historia bez zmian (sortuje rosnaco -> default 'above' = poprawnie).

## Zmienione pliki
- `packages/sleeper-web/src/components/SessionListItem.tsx` — nowy prop
  `gapPosition`; gap wyciagniety do `gapNode` i renderowany nad albo pod
  wierszem zaleznie od propa.
- `packages/sleeper-web/src/app/(app)/index.tsx` — lista "Sesje dzisiaj"
  przekazuje `gapPosition="below"`.

## Powod / kontekst
Zgloszenie usera. Placement potwierdzony z userem: aktywnosc ma byc MIEDZY
sesjami chronologicznie, niezaleznie od sortowania. Wg analizy kodu ekran
Historia juz renderowal poprawnie (rosnaco) — do potwierdzenia w runtime przez
usera.

## Walidacja
- typecheck: PASS
- test: PASS (`pnpm web:build:check` — 161 testow)
- lint: PASS
- build: PASS
- runtime: do manualnej weryfikacji w PWA przez usera.
