# CLAUDE.md — Sleeper Machine

## Cel projektu

Standalone TypeScript module z czystą funkcją rekomendującą sen niemowlęcia/dziecka <3 lat. Wejście: data urodzenia, historia sesji snu, opcjonalna godzina docelowej pobudki. Wyjście: kiedy położyć, jak długie okno aktywności, plan drzemek na resztę dnia.

Algorytm jest *biblioteką* — nie ma UI, nie ma backendu, nie ma persystencji. Mobilna aplikacja (przyszła iteracja) będzie konsumować tę bibliotekę.

## Stack

- **TypeScript** strict, ESM, target ES2022, `noUncheckedIndexedAccess`
- **Vitest** do testów (`tests/**/*.test.ts`)
- **pnpm** jako package manager
- **Brak runtime deps** — algorytm to czysta matematyka
- DevDeps: `typescript`, `vitest`, `tsx`, `@types/node`

## Struktura

Patrz `PLAN.md` sekcja "Docelowa struktura projektu" oraz `tasks.md` dla planu inkrementalnego.

Najważniejsze:
- `src/` — moduły algorytmu (pure functions only)
- `src/math/` — helpery numeryczne (median, MAD, EWMA)
- `tests/` — testy + fixtures
- `scripts/smoke-test.ts` — CLI do manualnej weryfikacji
- `PLAN.md`, `tasks.md`, `README.md` — dokumentacja

## Zasady kodowania

1. **Pure functions only w `src/`.** Brak `Date.now()`, `new Date()`, `Math.random()`, `process.env`, I/O. `now` przychodzi przez `state.now: DateTime`.
2. **Determinizm.** Ten sam input → ten sam output. Każdy test podaje `now` jawnie.
3. **Brak mutacji.** Funkcje zwracają nowe obiekty/tablice. Konfig immutable.
4. **Brak klas.** Pure functions nad danymi. `type` zamiast `interface`, string-literal unions zamiast `enum`.
5. **Brandowane jednostki.** `Minutes`, `Hours`, `AgeMonths`, `AgeYears` — żeby kompilator łapał pomyłki.
6. **Safety rails wszędzie.** Adapted values ∈ [0.7×, 1.3×] baseline. Alignment delta ∈ ±20% total awake. Wiek `max(1, ageMonths)` w równaniach z `ln`/`^-0.5`.
7. **Cold start = pure baseline.** Bez historii algorytm musi zwrócić sensowny `Recommendation` (możliwe z `nextSleepAt = null` + warning, gdy brak kotwicy zegarowej).
8. **Walidacja tylko na boundary.** `index.ts/recommend()` waliduje input. Wewnętrzne moduły zakładają poprawne dane.

## Zasady testowania

- Każdy moduł `src/foo.ts` ma paired test `tests/foo.test.ts`.
- Fixtures w `tests/fixtures/*.json` — łatwe do diffowania ludzkim okiem.
- `now` w testach zawsze jawne, nigdy z prawdziwego zegara.
- Walidacja merytoryczna: dla każdego baseline value sprawdzaj przeciwko Galland 2012 Tabela 2/3 (±5%).
- Property-based tests (fast-check) dla safety rails (Phase 9).

## Anti-patterns — czego NIE robić

- **Nie wprowadzaj "wake windows by age" jako tabeli referencyjnej** — to nie pojęcie naukowe (patrz `PLAN.md` sekcja "Ważne uściślenie merytoryczne"). Wake windows są **wielkością pochodną** z `totalSleep`, `longestSleep`, `napsToday`. Każda PR dodająca taką tabelę powinna zostać odrzucona z linkiem do Dr Canapari & Flynn-Evans.
- **Nie dodawaj ML / sieci neuronowych** — hybryda EWMA + safety rails jest interpretowalna i wystarczająca. ML można dołożyć jako oddzielną warstwę, nie do core algo.
- **Nie wywołuj `new Date()` / `Date.now()` w `src/`** — łamie determinizm i test reproducibility.
- **Nie wprowadzaj OOP** — to pure functions nad danymi. Klasa zwiększa złożoność bez korzyści.
- **Nie throwuj na brak danych użytkownika** — zwracaj `Recommendation` z warningiem. Throwuj tylko dla niepoprawnego inputu (np. `end < start` w `SleepSession`).
- **Nie pomyl jednostek wieku w równaniach Galland** — sleep duration używa **lat**, pozostałe trzy używają **miesięcy**. Osobne funkcje, jawne nazwy.
- **Nie hardkoduj wall-clock anchora (np. 7:00)** dla cold-start bez `targetWakeTime` — to fałszywe poczucie precyzji. Zwracaj `nextSleepAt: null` + warning.

## Komendy

```bash
pnpm install                                            # instalacja deps
pnpm test                                               # wszystkie testy
pnpm test:watch                                         # watch mode
pnpm test:coverage                                      # raport coverage
pnpm smoke -- tests/fixtures/nine-month-old.json        # manualny smoke
pnpm build                                              # emit dist/
```

## Źródła naukowe (do cytowania w PR opisach algorytmu)

- **Galland 2012**, *Sleep Medicine Reviews* — baseline (Tabele 2/3 i równania Fig. 4)
- **Iglowstein 2003**, *Pediatrics* — walidacja percentyli (Zurich cohort)
- **Paruthi 2016**, *J Clin Sleep Med* — AASM widełki min/max
- **Spencer 2022**, *PNAS* — mechanizm tranzycji liczby drzemek
- **Borbély 1982**, *Human Neurobiology* — two-process model (homeostaza + circadian)
- **Hirshkowitz 2015**, *Sleep Health* — NSF aktualizacja rekomendacji

Jeśli proponowana zmiana dotyka logiki timingu snu — sanity-check przeciw Galland Fig. 4 i Tabelom 2/3 przed merge.

## Pliki powiązane

- `PLAN.md` — pełna specyfikacja algorytmu (9 kroków + edge cases + bibliografia + plan implementacji)
- `tasks.md` — checklist implementacji (Phase 0–9)
- `README.md` — quickstart + public API (do utworzenia w Phase 8)
