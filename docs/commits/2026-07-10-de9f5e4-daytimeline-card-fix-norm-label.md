# de9f5e4: fix(web): DayTimeline bez wlasnego Card + label normy z sleep-norms

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Task 5 — fixy po code review (Needs fixes)

## Co zostalo zrobione

- **IMPORTANT 1 (Card-w-Card):** `DayTimeline` renderowal wlasny `<Card>` (bg-white, rounded-card, p-5, shadow-card), a `RecommendationTimelineView` osadzal go wewnatrz chrome'u `RecommendationCard` — efekt: podwojny padding (20+20px per strona) zwezal os 24h, podwojny shadow/rounded dawal artefakt karty-w-karcie. Fix: `DayTimeline` renderuje sie jako goly `<View>` (bez propa `embedded` — YAGNI, jedyny konsument osadza go w karcie). Geometria w `day-timeline-segments.ts` nietknieta. Dodany static-invariant: komponent nie importuje/nie renderuje `Card`.
- **MINOR 2 (duplikacja formatowania normy):** `forecastLabel` budowal wlasny string `w normie (X–Y g)` zamiast uzyc istniejacego `forecast.norm.label` z `sleep-norms.ts` (format "14-17g/dobe"). Fix: `w normie (${forecast.norm.label})`.

## Zmienione pliki

- `packages/sleeper-web/src/features/recommendation/components/DayTimeline.tsx` — usuniety import i wrapper `Card` (→ `View`), zaktualizowany komentarz
- `packages/sleeper-web/src/features/recommendation/components/RecommendationTimelineView.tsx` — `forecastLabel` uzywa `norm.label`
- `packages/sleeper-web/src/features/recommendation/__tests__/day-timeline.invariants.test.ts` — nowy invariant (brak `<Card` / importu Card w DayTimeline)

## Powod / kontekst

Review Taska 5 (b629196) zwrocil "Needs fixes" z dwoma findingami. Zgodnie z decyzja reviewera: bez propa `embedded` (nieistniejacy use case), bez dotykania heurystyki noty 7:00 i `index.tsx` (pre-existing dlug). `[no-changelog]` — korekta w obrebie niewydanej wersji 0.10.0, wpis changelogu juz opisuje feature; wersja nie bumpowana drugi raz.

## Walidacja

- typecheck: PASS (`tsc --noEmit`, 0 bledow)
- test: PASS — 326/326 (38 plikow; +1 nowy invariant)
- lint: PASS (w ramach build:check)
- `pnpm web:build:check`: PASS end-to-end (tsc + lint + vitest + invariants + machine/kotki build + expo export)
- runtime: nie zweryfikowano manualnie w przegladarce — checklista manual w raporcie Taska 5 (pozycja o braku artefaktu karty-w-karcie dopisana).
