# 04d65ac: fix(web): aktywnosc pierwszej drzemki dnia liczona od konca snu nocnego

**Data:** 2026-07-23
**Branch:** main
**Faza zadania:** n/a (pojedynczy fix UX zgloszony ze screenshota)

## Co zostalo zrobione
- Ekran Historia: pierwsza drzemka dnia pokazuje teraz linie "aktywnosc Xg Ym"
  liczona od konca snu nocnego (porannej pobudki) do startu drzemki. Wczesniej
  ta przerwa byla pomijana.
- Przyczyna: `computeGapsBetweenSessions` bylo wolane per grupa dnia
  (`DayGroupSection`). Sen nocny konczacy sie danego poranka zaczyna sie
  poprzedniego wieczora, wiec lezy w innej grupie dnia (grupowanie po `start_at`)
  → pierwsza drzemka nie miala poprzednika w swojej grupie → brak gapu.
- Fix: gapy liczone raz na CALEJ liscie sesji w `GroupedHistoryList`, mapa
  przekazywana w dol do `DayGroupSection` (prop `gapMap`). Helper bez zmian —
  jego wewnetrzny guard `dayKeyInAppTz(prevEnd) === dayKeyInAppTz(nextStart)`
  gwarantuje, ze przerwa w trackingu (brak nocy) nie wygeneruje fikcyjnego
  wielogodzinnego gapu.
- Dodano `session-gaps.test.ts` — helper nie mial zadnego pokrycia (6 testow:
  gap same-day, gap cross-day od snu nocnego, brak gapu przy roznych dniach app
  tz, pominiecie aktywnej sesji, niezaleznosc od kolejnosci wejscia, <2 sesje).

## Zmienione pliki
- `packages/sleeper-web/src/app/(app)/history.tsx` — `gapMap` liczony w
  `GroupedHistoryList` na pelnej liscie, przekazany jako prop; `DayGroupSection`
  nie liczy juz gapow lokalnie, tylko czyta `gapMap.get(session.id)`.
- `packages/sleeper-web/src/lib/__tests__/session-gaps.test.ts` — nowy plik testow.
- `packages/sleeper-web/public/changelog.json` — wpis v13 / 0.12.1.
- `packages/sleeper-web/app.json`, `packages/sleeper-web/package.json` — bump 0.12.0 → 0.12.1.

## Powod / kontekst
Zgloszenie usera (screenshot): pod pierwsza drzemka dnia brakowalo linii
aktywnosci obecnej przy pozostalych sesjach. Ekran Home ("Sesje dzisiaj") juz
dzialal poprawnie, bo jego query obejmuje sen nocny z poprzedniego wieczora —
problem dotyczyl tylko Historii z powodu grupowania per dzien. Brak odchylen od
zaprojektowanego rozwiazania.

## Walidacja
- typecheck: PASS (`pnpm web:build:check`)
- lint: PASS
- test: PASS (session-gaps 6/6, version-sync spojne, cala suite web)
- build: PASS (`expo export` → dist)
- runtime: nie testowane w przegladarce — zmiana czysto obliczeniowa,
  pokryta testami jednostkowymi helpera; do potwierdzenia przez usera na Vercel.
