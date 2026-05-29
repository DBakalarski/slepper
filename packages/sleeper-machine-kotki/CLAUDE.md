# CLAUDE.md — sleeper-machine-kotki

## Cel

Lookup-based alternatywa dla `sleeper-machine` (Galland). Implementuje metodologię z przewodnika Kotki Dwa: stałe okna aktywności per wiek + forward pass z fixed pobudką.

## Zasady kodowania

1. **Pure functions only w `src/`.** Brak `Date.now()`, `new Date()`, `Math.random()`, `process.env`, I/O. `now` przychodzi przez `state.now: DateTime`.
2. **Determinizm.** Ten sam input → ten sam output. Każdy test podaje `now` jawnie.
3. **Brak mutacji.** Funkcje zwracają nowe obiekty/tablice.
4. **Zero duplikacji typów z `sleeper-machine`.** Typy `State`, `ChildProfile`, `Recommendation`, `PlanEntry`, `TimeOfDay`, `SleepSession`, `Minutes`, `Hours`, `AgeMonths` są re-eksportowane z `sleeper-machine` — NIE duplikuj.
5. **Brak EWMA tutaj.** Algorytm Kotki Dwa to lookup table — nie wprowadzaj adaptacji historii, EWMA ani shrinkage. To jest i ma zostać lookup-based.
6. **Walidacja tylko na boundary.** `index.ts/recommendKotkiDwa()` waliduje input. Wewnętrzne moduły zakładają poprawne dane.

## Anti-patterns — czego NIE robić

- **Nie dodawaj EWMA / adaptacji historii** — to naruszałoby filozofię tego packagu. Użyj `sleeper-machine` jeśli potrzebujesz adaptacji.
- **Nie importuj `sleeper-machine/src/...` bezpośrednio** — tylko przez public API (`from 'sleeper-machine'`).
- **Nie wprowadzaj OOP** — pure functions nad danymi.
- **Nie wywołuj `new Date()` / `Date.now()` w `src/`** — łamie determinizm.
- **Nie throwuj na brak historii** — cold start jest valid case-em (zwracaj plan z `nextSleepAt` na podstawie `morningWake`).
- **Nie duplikuj lookup table** — jeden plik `src/lookup.ts` jest source of truth.

## Struktura modułów

```
src/
├── index.ts       # public API: exportuje recommendKotkiDwa + re-eksportuje typy
├── lookup.ts      # AgeBucket type + BUCKETS constant + pickBucket()
├── forwardPass.ts # forward pass: morningWake + bucket → PlanEntry[]
└── recommender.ts # orchestrator: validate → pickBucket → forwardPass → Recommendation
tests/
├── lookup.test.ts
├── forwardPass.test.ts
└── recommender.test.ts
```

## Źródła danych lookup table

Przewodnik Kotki Dwa (prywatny użytek). Tabela "Zapotrzebowanie na sen" + przykładowe harmonogramy dnia. Dane numeryczne (WW, maxNap, nightHours) są facts — nie cytujemy treści marketingowych.

## Komendy

```bash
pnpm test          # vitest run
pnpm test:watch    # vitest (watch)
pnpm build         # tsc → dist/
```
