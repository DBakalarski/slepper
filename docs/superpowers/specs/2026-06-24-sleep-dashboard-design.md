# Design: Dashboard snu (ekran Statystyki) — Faza 1

**Data:** 2026-06-24
**Status:** Zaakceptowany (brainstorming) → implementacja autonomiczna do pushu
**Pakiet:** `packages/sleeper-web`
**Roadmap:** `docs/ideation/2026-06-24-roadmap.md` — Faza 1

## Cel

Zastąpić placeholder `stats.tsx` realnym dashboardem trendów snu dziecka.
Profil już pokazuje „średni sen 7 dni vs norma" — dashboard dokłada **trend per
dzień** + agregaty + jakościową „formę snu".

## Zakres (decyzje z brainstormingu)

- Przełącznik zakresu **7 / 14 / 30 dni** (`SegmentedControl`, default 7).
- Wykres słupkowy snu/dobę z poziomą linią normy — **bez nowej biblioteki**,
  słupki jako `View` z dynamiczną wysokością (zero zależności; `react-native-svg`
  jest dostępny, ale dla słupków zbędny).
- Kafelki: średni sen vs norma, średnia drzemek/dobę, regularność zasypiania (σ),
  zakres porannych pobudek (najwcześniej–najpóźniej).
- **Forma snu** jakościowa 🟢/🟡/🔴 z ostatnich 3 dni (NIE numeryczna — unika
  fałszywej precyzji).

## Architektura / przepływ

```
useSessions(childId, today-N, today)  ──▶  useSleepStats(childId, rangeDays)
        (istniejący hook)                        │ agregaty (pure lib)
                                                 ▼
lib/sleep-aggregation.ts (pure, testowane)       │
  dailySleepSeries / bedtimeRegularity /         ▼
  morningWakeRange / sleepForm + averages   stats.tsx (composition)
                                          ├─ RangeToggle (SegmentedControl)
                                          ├─ SleepFormBadge (🟢/🟡/🔴)
                                          ├─ SleepBarChart (View-bary + linia normy)
                                          └─ kafelki Card
```

## Komponenty (jednostki, granice)

### 1. `lib/sleep-aggregation.ts` — czysta logika
Wydziela współdzieloną logikę cross-midnight, której source-of-truth jest dziś
prywatny w `sleep-stats.ts`. **Refaktor:** `sleep-stats.ts` zacznie importować
`durationWithinWindow` + day-split z tego modułu (single source of truth, brak
duplikacji TZ-wrażliwej logiki). Funkcje pure, bez `Date.now()`/I/O — `now`/zakres
wchodzą argumentem.

- `durationWithinWindow(start, end, windowStart, windowEnd): number` (ms).
- `dailySleepTotalsMs(sessions): Map<dayKey, number>` — suma snu per dzień (app tz,
  cross-midnight dzielone proporcjonalnie). Pomija sesje w toku (`end_at === null`).
- `interface DailySleep { dayKey: string; totalSleepMs: number; napCount: number }`
- `dailySleepSeries(sessions, rangeStart, rangeEnd): DailySleep[]` — jeden wpis
  per dzień w zakresie (dni bez snu = 0), `napCount` = liczba sesji `nap`
  zaczynających się tego dnia.
- `bedtimeRegularityMinutes(sessions): { meanMinutes; stdDevMinutes; count } | null`
  — σ startów `night_sleep`, **zakotwiczone na 18:00** (minutes-since-18:00,
  obsługuje 18:00–02:00 bez owijania północy). `null` gdy brak snu nocnego;
  `stdDevMinutes = 0` dla 1 próbki.
- `morningWakeRange(sessions): { earliestMinutes; latestMinutes; count } | null`
  — z `end_at` snu nocnego, minuty-doby app tz.
- `averageSleepMs(series): number` (po dniach z danymi), `averageNapCount(series)`,
  `averageSleepMsLastDays(series, n)` (dla formy — ostatnie 3 dni).
- `sleepForm(avgHours, norm): 'good' | 'ok' | 'poor'`:
  - 🟢 `good`: `minHours ≤ avgHours ≤ maxHours`.
  - 🟡 `ok`: poza pasmem, ale `80 ≤ (avgHours/maxHours)*100 ≤ 110`.
  - 🔴 `poor`: inaczej. `avgHours = 0` (brak danych) → `poor` traktowane jako brak (ekran ukrywa badge gdy `daysCovered === 0`).

### 2. `features/stats/useSleepStats.ts` — hook
- Wejście: `childId: string | null`, `rangeDays: 7 | 14 | 30`.
- Stabilny `queryKey` przez memo na `dayKey` (wzorzec anty-refetch z `sleep-stats.ts`),
  zakres `[startOfDay(today - rangeDays), startOfDay(today)]`.
- Zwraca: `{ series, avgSleepMs, avgNapCount, avgSleepMsLast3, regularity, wakeRange,
  daysCovered, isLoading, isError }`. Norma i forma liczone w ekranie
  (`getNormForChild(child.birthDate)` + `sleepForm`).

### 3. `features/stats/components/SleepBarChart.tsx`
Słupki `View` (wys. ∝ `totalSleepMs / maxScaleMs`), pozioma linia normy
(`normMaxHours`), etykiety dni (skrót dnia tygodnia w app tz), `tabular-nums`.
Props: `{ series: DailySleep[]; normMaxHours: number }`.

### 4. `features/stats/components/SleepFormBadge.tsx`
Kropka koloru + label: `good`→zielony/„dobra", `ok`→pomarańczowy/„ok",
`poor`→czerwony/„słaba". Props: `{ form: 'good'|'ok'|'poor' }`.

### 5. `app/(app)/stats.tsx`
Kompozycja: nagłówek, `RangeToggle` (`useState`, default 7), `SleepFormBadge`,
`SleepBarChart` w `Card`, kafelki agregatów. Stany **empty / loading / error**.
Dziecko z istniejącego źródła aktywnego dziecka (jak `profile.tsx`).

## Obsługa błędów / edge cases

| Sytuacja | Zachowanie |
|---|---|
| `isLoading` | szkielet/spinner |
| `isError` | kafelek błędu z komunikatem |
| brak sesji w zakresie (`daysCovered === 0`) | empty state, bez wykresu/badge |
| brak snu nocnego | regularność + pobudki ukryte (`null`) |
| 1 próbka bedtime | `stdDevMinutes = 0` |
| sesja cross-midnight | dzielona proporcjonalnie (reuse) |
| brak aktywnego dziecka | redirect/empty jak w innych ekranach `(app)` |

## Czego NIE robię (YAGNI)

- Brak nowej biblioteki wykresów (słupki = `View`).
- Brak explicit lazy-load ekranu — nie dokładamy ciężkiej zależności, więc zbędne
  (pozycja z roadmapu Faza 0/1 rozwiązana jako „niepotrzebne").
- Forma snu jakościowa, nie numeryczna.
- Bez paginacji (30 dni = max kilkaset sesji, jeden range query).

## Testy

- **Unit `sleep-aggregation.test.ts`:** `dailySleepSeries` (normalny dzień,
  cross-midnight split, dzień zerowy, `napCount`), `bedtimeRegularityMinutes`
  (σ z kotwicą 18:00, 1 próbka → 0, brak → null), `morningWakeRange`,
  `sleepForm` (granice good/ok/poor), averages.
- **Static-invariants:** `useSleepStats` (stabilny queryKey, brak `new Date()`
  inline w kluczu), `stats.tsx` (SegmentedControl, 3 stany render, brak `setHours`).
- **Regresja:** istniejące testy `sleep-stats` muszą przejść po refaktorze
  (współdzielony day-split).

## Walidacja (Definition of Done)

`pnpm web:build:check` zielony + nowy kod ma testy + commit + log w `docs/commits/`.
Czas/daty wyłącznie przez `lib/time.ts`. Wpis do `public/changelog.json` (bump `v`).
Runtime: manualna weryfikacja po deployu.
