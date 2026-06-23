# 6999abd: feat(kotki) — spójność z przewodnikiem (okna 6m, ostatnia drzemka 30min) + pole pobudki

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (ad-hoc audyt zgodności algorytmu Kotki Dwa z `data-book/przewodnik_sen.pdf`)

## Co zostalo zrobione

Weryfikacja algorytmu Kotki Dwa (`packages/sleeper-machine-kotki`) i jego użycia w
`packages/sleeper-web` względem przewodnika "Przewodnik Snu Dziecka 5-9 miesięcy"
(Kotki Dwa / Marta Stam). Lookup table dla 5/7/8/9/10/11/12m zgadza się co do wartości
z tabelą "Zapotrzebowanie na sen". Naprawiono 3 rozbieżności:

- **R1** — okna aktywności `6m-2naps`: `[2.5, 2.5, 2.5]` → `[2.5, 2.75, 3.0]`. Źródło:
  harmonogram "6 MIESIĘCY - 2 DRZEMKI" (7:00→9:30→14:15→19:00) + sekcja "Redukcja
  drzemek" ("zacznij od okien 2h30/2h45/3h").
- **R2** — na planach 3-drzemkowych ostatnia drzemka celowo ~30 min (reguła przewodnika
  powtórzona 3×: cele, "Jak ustalić harmonogram", "Redukcja drzemek"). Wcześniej kod
  liczył równe drzemki → 3. drzemka wypadała ~40 min za wcześnie. `forwardPass` przyjmuje
  teraz `napLengths: readonly number[]` zamiast pojedynczej długości; `computeNapLengths()`
  w recommenderze ustawia ostatniej drzemce 0.5h (plany 3+) lub równy podział (1-2 drzemki).
  Usunięto martwy warning "długość drzemki przekracza maksimum" (nieosiągalny — wartość
  zawsze cap-owana przez `maxNapHours`).
- **R3** — konfigurowalna godzina pobudki. Przewodnik: "Wybierz stałą godzinę budzenia,
  dowolną między 6 a 7 rano". Aplikacja hardcode'owała 07:00 — `targetWakeTime` nigdy nie
  trafiał do algorytmu, mimo że recommender/adapter już to obsługiwały. Dodano kolumnę
  `children.preferred_wake_time` (migracja 0012) + pole "Preferowana godzina pobudki" w
  `EditChildForm`, przeprowadzone przez hooks → adapter → `useSleepRecommendation`.
  `toLibProfile` przyjmuje teraz `targetWakeTime` jako string (symetrycznie do
  `preferredBedtime`); usunięto nieużywany parametr `TimeOfDay` z hooka.

## Zmienione pliki

- `packages/sleeper-machine-kotki/src/lookup.ts` — R1: okna 6m-2naps
- `packages/sleeper-machine-kotki/src/forwardPass.ts` — R2: sygnatura `napLengths[]`
- `packages/sleeper-machine-kotki/src/recommender.ts` — R2: `computeNapLengths()`, usunięty martwy warning
- `packages/sleeper-machine-kotki/tests/lookup.test.ts` — asercja okien 6m-2naps
- `packages/sleeper-machine-kotki/tests/forwardPass.test.ts` — helper `fillNaps`, test malejących drzemek
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — test 5m: ostatnia drzemka 30 min
- `packages/sleeper-app/supabase/migrations/0012_children_wake_time.sql` — R3: kolumna `preferred_wake_time`
- `packages/sleeper-app/src/lib/database.types.ts` — R3: typ kolumny (wspólny schemat)
- `packages/sleeper-web/src/lib/database.types.ts` — R3: typ kolumny
- `packages/sleeper-web/src/features/children/hooks.ts` — R3: Child/SELECT/rowToChild/UpdateChildInput/mutacja
- `packages/sleeper-web/src/features/recommendation/adapter.ts` — R3: `toLibProfile` targetWakeTime jako string
- `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` — R3: czyta `preferred_wake_time` z child
- `packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts` — R3: aktualizacja testu targetWakeTime
- `packages/sleeper-web/src/features/children/components/EditChildForm.tsx` — R3: pole pobudki, `TIME_REGEX`/`timeFromDb`, poprawiony tekst
- `packages/sleeper-web/src/app/(app)/index.tsx` — R3: `preferred_wake_time` w propsach sekcji

## Powod / kontekst

Audyt zlecony przez użytkownika ("zweryfikuj algorytm Kotki Dwa czy jest spójny z
przewodnikiem i czy w aplikacji jest dobrze używany"). R1/R2 to czysta spójność danych
i logiki z przewodnikiem. R3 wybrane przez użytkownika (alternatywa: tylko poprawa tekstu)
— wypełnia realną lukę: dziecko budzące się o innej godzinie niż 07:00 dostawało plan od
złej kotwicy. Decyzja `napLengths[]` zamiast special-case ostatniej drzemki: czystsze API
wyrażające wprost, że drzemki mają różne długości.

Świadomie poza zakresem (zgłoszone userowi): clamp wieku <5m do bucketa 5m; opcje 0/4/5
drzemek w UI bez bucketów Kotki Dwa (graceful fallback); wiek korygowany wcześniaków.

## Walidacja

- typecheck: PASS (`sleeper-web`, `sleeper-machine-kotki`, `sleeper-app` — wszystkie 0 błędów)
- test: PASS (`sleeper-machine-kotki` 49/49; `web:build:check` 162/162 + invariants)
- build: PASS (`web:build:check` — eksport bundla; oba pakiety algorytmu zbudowane)
- runtime: migracja 0012 zaaplikowana na remote (`supabase db push`, ref qcyklmrotbkehgpjdebl),
  zweryfikowana ponownym dry-run ("Remote database is up to date")
