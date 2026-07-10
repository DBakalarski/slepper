# fcb0590: feat(web): komponent DayTimeline (os 24h)

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Task 4 (Komponent osi 24h — geometria + prezentacja), z planu `docs/plans/2026-07-10-001-feat-plan-dnia-os-24h-plan.md`

## Co zostalo zrobione
- Stworzono pure modul geometrii `day-timeline-segments.ts`: wejscie (sesje, plan, `now`) → segmenty `{leftPct, widthPct, kind}` dla faktow i predykcji plus pozycja znacznika "teraz" (`nowPct`), wszystko w procentach szerokosci pasa doby.
- Pozycja % liczona wylacznie przez `startOfDayInAppTz`/`endOfDayInAppTz` (DST-safe, doba 23/25h) — zero `/1440`, zero stalej `86400000`.
- Fakty clampowane do `[startOfDay, now]` (sesja w toku i defensywnie `end_at` z przyszlosci koncza sie na `now`). Predykcje clampowane do `(now, endOfDay]` (start planu przed `now` startuje od `now`; NIGHT bez `plannedEnd` idzie do konca doby). Segmenty o zerowej/ujemnej szerokosci po clampie sa pomijane.
- Stworzono glupi komponent prezentacyjny `DayTimeline.tsx` (props: `sessions`, `plan`, `now`, bez hookow danych/timera): pas z segmentami, sparse etykiety godzin (0/6/12/18/24), legenda, znacznik "teraz", `accessibilityLabel` z tekstowym podsumowaniem ("Rytm dnia: N drzemek odbytych, plan: ...").
- Kolory faktow/predykcji zgodne z istniejacym app-wide wzorcem (SessionListItem/TodayStatsCard): drzemka = pomaranczowy, sen nocny = fioletowy; predykcje = ten sam odcien w wersji polprzezroczystej + obrys (zamiast kreskowania, kosztownego w RN-web).
- Testy unit geometrii (9 scenariuszy: cross-midnight clip, sesja w toku, defensywny end_at z przyszlosci, NIGHT bez plannedEnd, clamp planu z silnika, DST marzec/pazdziernik, zero-width skip, pusty dzien) + static-invariants (grep: brak `setHours`/`new Date(y,m,d`/stalej dobowej w ms/raw `useColorScheme`, RN prymitywy zamiast web HTML, komponent bez `useEffect`/`useState`/`setInterval`, obecnosc `accessibilityLabel`).
- Komponent NIE jest jeszcze zamontowany w UI (home/RecommendationCard) — to celowe, integracja to Task 5.

## Zmienione pliki
- `packages/sleeper-web/src/features/recommendation/day-timeline-segments.ts` — nowy, pure geometria osi 24h.
- `packages/sleeper-web/src/features/recommendation/components/DayTimeline.tsx` — nowy, komponent prezentacyjny.
- `packages/sleeper-web/src/features/recommendation/__tests__/day-timeline-segments.test.ts` — nowy, testy unit geometrii.
- `packages/sleeper-web/src/features/recommendation/__tests__/day-timeline.invariants.test.ts` — nowy, static-invariants.

## Powod / kontekst
Task 4 z planu `feat-plan-dnia-os-24h`: reuzywalny, read-only komponent "rytm dnia" — pas doby z blokami faktow i predykcji, znacznikiem "teraz" i etykietami godzin, z geometria w czystym module (bez Reacta) zeby byla latwo testowalna i niezalezna od prezentacji. Zalezny od typow z Unit 2 (`PlanEntry` z `sleeper-machine`), niezalezny od Unit 3 (props-driven). Odchylenie od sugestii kolorow w briefie (fakty noc=navy/drzemka=purple) na rzecz istniejacej konwencji app-wide (SessionListItem/TodayStatsCard: drzemka=orange, noc=purple) — zachowanie spojnosci kolorow miedzy komponentami majacymi ten sam typ danych (`nap`/`night_sleep`) uznane za wazniejsze niz literalna sugestia z briefu.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit`, 0 bledow)
- test: PASS (`pnpm --filter sleeper-web test` — 309/309, w tym 17 nowych testow dla DayTimeline)
- lint: PASS (`pnpm --filter sleeper-web lint` — 0 bledow, 0 warningow)
- runtime: brak manual testu w przegladarce — komponent nie jest zamontowany w UI (celowo, integracja to Task 5); zweryfikowano wylacznie przez typecheck/test/lint.
