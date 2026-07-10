# b629196: feat(web): plan dnia + os 24h w karcie rekomendacji

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Task 5 (ostatni) — Integracja karty rekomendacji: przełącznik widoku, prognoza, changelog

## Co zostało zrobione

- Nowy store `useRecommendationViewStore` (kopia wzorca `useThemeStore` 1:1: persist + synchroniczny localStorage adapter na web) — `view: 'timeline' | 'list'`, default `'timeline'`.
- `RecommendationCard` przebudowany na cienki orchestrator: nagłówek (confidence) + `SegmentedControl` (Oś/Lista) + delegacja do dwóch nowych podkomponentów.
- `RecommendationListView` — dotychczasowy render karty bez zmian merytorycznych poza fixem copy dla `nextSleepAt === null`.
- `RecommendationTimelineView` — nowy widok: `DayTimeline` (oś 24h z Taska 4) + linia prognozy bilansu (`computeDayForecast` z Taska 3, badge z kolorem wg verdictu) + warunkowa nota o domyślnej pobudce 07:00 + warunkowy komunikat o trwającym śnie nocnym + warnings.
- `next-sleep-copy.ts` — wspólna logika dla obu widoków: rozróżnia "sen nocny w toku, plan pusty (poprawny stan)" od prawdziwego cold startu, zamiast pokazywać mylący komunikat "Brak kotwicy" gdy dziecko po prostu śpi na noc.
- Fixy legendy `DayTimeline` (review Taska 4): swatch "Teraz" zmieniony z kropki na pionową kreskę (odróżnialny kształtem od "Drzemka", oba mają ten sam kolor); legenda rozbita na "Plan snu nocnego" + "Plan drzemki", pokrywając oba warianty predykcji zamiast jednego mylącego wpisu "Plan".
- `app/(app)/index.tsx` — `RecommendationCard` dostaje teraz `sessions` (istniejący `todaySessions`, bez nowego query — zakres query już pokrywa poranny ogon nocy z wczoraj przez filtr overlap), `now`, `birthDate`, `hasPreferredWakeTime`.
- Changelog v10 (0.10.0) + bump wersji w `app.json`/`package.json`.

## Zmienione pliki

- `packages/sleeper-web/src/features/recommendation/useRecommendationViewStore.ts` — nowy store (utworzony)
- `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` — przebudowa na orchestrator
- `packages/sleeper-web/src/features/recommendation/components/RecommendationListView.tsx` — nowy (utworzony)
- `packages/sleeper-web/src/features/recommendation/components/RecommendationTimelineView.tsx` — nowy (utworzony)
- `packages/sleeper-web/src/features/recommendation/next-sleep-copy.ts` — nowy (utworzony), wspólna logika copy
- `packages/sleeper-web/src/features/recommendation/components/DayTimeline.tsx` — fix legendy (Teraz jako kreska, Plan rozbity na 2 warianty)
- `packages/sleeper-web/src/app/(app)/index.tsx` — nowe propsy dla `RecommendationCard` (sessions/now/birthDate/hasPreferredWakeTime)
- `packages/sleeper-web/public/changelog.json`, `packages/sleeper-web/app.json`, `packages/sleeper-web/package.json` — wpis v10 (0.10.0)
- Testy (nowe): `__tests__/useRecommendationViewStore.test.ts`, `__tests__/next-sleep-copy.test.ts`, `__tests__/recommendation-card.invariants.test.ts`

## Powód / kontekst

Task 5 składa gotowe klocki z Tasków 1–4 (kaskada kotwicy, DayTimeline, day-forecast) w jedną kartę z przełącznikiem widoku. Kluczowe decyzje odroczone/podjęte:
- **Loading state**: karta nadal zwraca `null` przy braku rekomendacji — bez skeletonu (zachowanie sprzed Taska 5, decyzja odroczona, nie w scope tego zadania).
- **Nota o domyślnej pobudce 07:00**: silnik nie eksponuje wprost "użyto defaultu", ale sygnał jest tani do wyprowadzenia — `child.preferred_wake_time === null && brak zakończonej dziś nocy w `sessions`` — dokładnie odpowiada warunkowi `findRealMorningWake` w `sleeper-machine-kotki/src/recommender.ts` (realny koniec nocy z dziś rano ma priorytet nad `targetWakeTime`/default 7:00).
- **Źródło sesji dla osi**: `todaySessions` z istniejącego `useSessions(childId, startOfDay, endOfDay)` na home — bez nowego query. Zweryfikowano że `fetchSessionsInRange` filtruje przez overlap (`start_at < rangeEnd AND (end_at is null OR end_at >= rangeStart)`), więc poranny ogon nocy z wczoraj jest już w tym zbiorze.
- DayTimeline pozostaje nietknięty w geometrii (props i `day-timeline-segments.ts` bez zmian) — dotknięta wyłącznie legenda, zgodnie z zakresem review Taska 4.

## Walidacja

- typecheck: PASS (`tsc --noEmit`, 0 błędów)
- test: PASS — 325/325 (38 plików), w tym nowe: `useRecommendationViewStore.test.ts` (2), `next-sleep-copy.test.ts` (6), `recommendation-card.invariants.test.ts` (8); `version-sync.test.ts` zielony (app.json/package.json/changelog zsynchronizowane na 0.10.0)
- lint: PASS (`expo lint`, 0 błędów)
- `pnpm web:build:check` (tsc + lint + vitest + invariants + build machine/kotki + `expo export --platform web`): PASS end-to-end
- runtime: nie zweryfikowano manualnie w przeglądarce (agent bez dostępu do interaktywnej sesji Safari/Chrome) — checklista manual testing przekazana w raporcie zadania dla usera.
