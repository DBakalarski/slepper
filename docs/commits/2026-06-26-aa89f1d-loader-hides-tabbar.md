# aa89f1d: fix(web): loader startowy chowa tab bar (bootstrap przeniesiony do (app)/_layout)

**Data:** 2026-06-26
**Branch:** main
**Faza zadania:** n/a (follow-up do ae180f0 — zgloszenie usera: "przy loaderze maja nie byc widoczne dolne elementy menu")

## Co zostalo zrobione
- Loader bootstrapu (gate danych z b8061d1) renderowal sie w `TodayScreen`, czyli
  WEWNATRZ nawigatora `Tabs` -> dolny pasek menu byl widoczny pod loaderem.
- Przeniesiono caly bootstrap do `(app)/_layout`: rozwiazanie aktywnego dziecka +
  jego podstawowych danych (active session / sesje dzisiaj / ostatni sen) dzieje
  sie na poziomie layoutu. Gdy `!hasBootstrapped && !ready`, layout zwraca
  `<AppLoader>` PRZED `<Tabs>` -> pelnoekranowy loader bez tab baru.
- Latch `hasBootstrapped` (state + effect): pelnoekranowy loader chowajacy menu
  pokazuje sie TYLKO przy pierwszym ladowaniu. Pozniejsze przelaczanie aktywnego
  dziecka (gdy `hasBootstrapped`) odswieza tresc in-place — bez chowania paska i
  bez powrotu do pelnoekranowego loadera (regresja, ktorej latch zapobiega).
- Selection effect (wybor pierwszego dziecka gdy brak/zniknelo) przeniesiony do
  layoutu — dziala teraz dla wszystkich zakladek i podczas bootstrapu (zanim
  zamontuje sie ekran).
- `TodayScreen` odchudzony: usuniety wlasny gate, gate-queries, min-loader i
  selection effect. Montuje sie juz z gotowymi danymi (TanStack dedupuje te same
  queryKey — zero podwojnego fetcha). Zakres "dzisiaj" w layoucie liczony przez
  `useMemo([])` (stabilny dayKey == ten z ekranu -> dedup dziala).

## Zmienione pliki
- `src/app/(app)/_layout.tsx` — bootstrap orchestration + latch + pelnoekranowy
  loader przed Tabs
- `src/app/(app)/index.tsx` — usuniety gate/effect, czysty render z gotowych danych

## Powod / kontekst
Wymaganie: podczas loadera nie ma byc widocznego dolnego menu. Tab bar to chrome
nawigatora `Tabs`; loader renderowany jako tresc ekranu nie moze go zaslonic
(jest nad paskiem, nie pod). Jedyne czyste rozwiazanie: nie renderowac `Tabs`
podczas ladowania -> gate musi byc w layoucie, nad nawigatorem. Latch chroni
przed regresja (przelaczanie dziecka chowaloby menu).

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- lint: PASS (0 unused po przeniesieniu importow)
- test: PASS (vitest, 32 pliki / 279 testow)
- build: PASS (`expo export` -> dist, 2.67 MB)
- runtime (signed-out): Playwright na dist — 0 bledow konsoli, sciezka konczy sie
  na /sign-in (nowe hooki w layoucie disabled gdy wylogowany, redirect przed
  gate). Signed-in (pelnoekranowy loader bez tab baru + przelaczanie dziecka) —
  do weryfikacji na urzadzeniu usera (`web:dev`).
