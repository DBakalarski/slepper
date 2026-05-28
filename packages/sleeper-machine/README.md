# Sleeper Machine

Standalone TypeScript module — czysta funkcja rekomendująca sen niemowlęcia/dziecka <3 lat na podstawie wieku, historii sesji snu i opcjonalnej godziny docelowej pobudki. Bez UI, bez backendu, bez persystencji. Mobilna aplikacja konsumuje tę bibliotekę.

Algorytm to hybryda **baseline z literatury (Galland 2012)** + **adaptacyjna warstwa EWMA** z trimingiem outlierów (MAD) i safety rails (±30% baseline).

## Quickstart

```bash
pnpm install              # instalacja deps (tylko devDeps — zero runtime deps)
pnpm test                 # 196 testów, 100% coverage statements/functions/lines
pnpm test:watch           # watch mode
pnpm test:coverage        # raport coverage
pnpm smoke -- tests/fixtures/nine-month-old.json    # manualny smoke test (24h iteracja)
pnpm build                # emit dist/
```

## Public API

Jedna funkcja: `recommend(state, profile): Recommendation`.

```ts
import { recommend, type State, type ChildProfile } from 'sleeper-machine';

const profile: ChildProfile = {
  dateOfBirth: new Date('2025-08-27'),
  targetWakeTime: { hour: 7, minute: 0 },  // opcjonalne
};

const state: State = {
  now: new Date('2026-05-27T15:00:00'),
  history: [
    { start: new Date('2026-05-26T19:30:00'), end: new Date('2026-05-27T06:00:00'), type: 'NIGHT' },
    { start: new Date('2026-05-27T09:00:00'), end: new Date('2026-05-27T10:03:00'), type: 'NAP' },
    // ...
  ],
};

const rec = recommend(state, profile);
// {
//   nextSleepAt: Date,                    // kiedy położyć następnym razem
//   currentWakeWindowDuration: Minutes,   // długość bieżącego okna czuwania
//   remainingNapsToday: PlanEntry[],      // pozostałe drzemki + bedtime
//   confidence: 'low' | 'medium' | 'high',
//   warnings: string[],
// }
```

### Determinizm

`recommend` jest czystą funkcją. Ten sam input zwraca ten sam output. `now` przychodzi przez `state.now` — algorytm nigdy nie wywołuje `Date.now()` ani `new Date()` bez argumentów. To czyni go w pełni testowalnym i przewidywalnym.

### Cold start

Bez historii i bez `targetWakeTime` algorytm zwraca `Recommendation` z `nextSleepAt: null` + warning `"brak kotwicy czasowej..."`. To celowe: nie zgadujemy 7:00 jako domyślnej godziny pobudki (Flynn-Evans: pobudka poranna jest główną kotwicą rytmu okołodobowego i nie powinna być wymyślana przez algorytm).

## Algorytm — krótko

Pełna specyfikacja: `PLAN.md`. W skrócie:

1. **Baseline z Galland 2012** — totalSleep, naps, longestSleep, nightWakings z równań ciągłych (Eq. A/B/C/D) sparametryzowanych wiekiem.
2. **Ekstrakcja historii** — grupowanie sesji wg "doby snu" (boundary 04:00), liczenie obserwowanych wielkości per-day.
3. **Adaptacja** — `trim MAD` → `EWMA (λ=0.85)` → mix `α × baseline + (1−α) × observed`, gdzie `α = clamp(1 − n/14, 0.3, 1.0)`. Safety rail: `adapted ∈ [0.7×, 1.3×] baseline`.
4. **Detekcja tranzycji liczby drzemek** — `|median(observed 7d) − round(baseline.naps)| ≥ 1` (od 3 punktów wzwyż).
5. **Pochodne okna aktywności** — `totalAwake = 24h − totalSleep`, dzielone na `(napsToday+1)` okien z wagą `[1, 1, ..., 1.3]` (ostatnie 30% dłuższe).
6. **Forward pass** — generowanie planu dnia od `morningWake` (END ostatniej sesji NIGHT z dzisiaj → mediana ostatnich 7 dni → `targetWakeTime` → null).
7. **Alignment do targetWakeTime** — rozproszenie delty proporcjonalnie do długości okien, clamp do `±20%` total awake budget.
8. **Bieżąca rekomendacja** — `currentWakeWindow = wakeWindows[napsAlreadyDoneToday]`, `nextSleepAt = lastWake + currentWakeWindow`.
9. **Warnings** — `low confidence`, `chronic deficit (<85% norm)`, `overtired (>1.2× okno)`, `nap transition detected`, `alignment out of budget`.

## Struktura

```
src/
  index.ts          # public API (recommend + typy)
  recommender.ts    # orkiestracja
  types.ts          # branded units (Minutes/Hours/AgeMonths/AgeYears), State, Recommendation
  profiles.ts       # Galland Tabele 2/3 + równania ciągłe
  baseline.ts       # getBaseline(profile, now)
  ageBucket.ts      # mapowanie ageMonths → bucket
  sleepDay.ts       # boundary 04:00, groupBySleepDay
  history.ts        # observedTotalSleepPerDay etc.
  adaptation.ts     # adapt() + computeAlpha + computeConfidence
  napCount.ts       # decideNapsToday (z detekcją tranzycji)
  wakeWindows.ts    # deriveWakeWindows
  planner.ts        # resolveMorningWake + forwardPass + alignToTargetWake
  math/             # median, MAD, EWMA, clamp, percentile

tests/
  *.test.ts         # paired tests per src module (196 testów)
  fixtures/         # JSON fixtures + TS builders dla scenariuszy

scripts/
  smoke-test.ts     # CLI: iteracja `now` co 1h przez 24h, tabela
  gen-fixtures.ts   # generator JSON fixtures z canonical patterns
```

## Źródła naukowe

- **Galland BC et al.** Normal sleep patterns in infants and children: a systematic review of observational studies. *Sleep Medicine Reviews* 2012;16(3):213–222. — Podstawa tabel baseline i równań ciągłych.
- **Iglowstein I et al.** Sleep duration from infancy to adolescence: reference values and generational trends. *Pediatrics* 2003;111(2):302–307. — Walidacja percentyli.
- **Paruthi S et al.** Recommended Amount of Sleep for Pediatric Populations: A Consensus Statement of the American Academy of Sleep Medicine. *J Clin Sleep Med* 2016;12(6):785–786.
- **Spencer RMC et al.** Contributions of memory and brain development to the bioregulation of naps and nap transitions in early childhood. *PNAS* 2022;119(44):e2123415119.
- **Borbély AA.** A two process model of sleep regulation. *Human Neurobiology* 1982;1(3):195–204. — Teoretyczne fundamenty.
- **Hirshkowitz M et al.** National Sleep Foundation's updated sleep duration recommendations. *Sleep Health* 2015;1(4):233–243.

## Powiązane

- [`USAGE.md`](./USAGE.md) — **przewodnik integracji** (typy, semantyka warningów, recipes UX, FAQ)
- [`PLAN.md`](./PLAN.md) — pełna specyfikacja algorytmu (9 kroków + edge cases + bibliografia)
- [`tasks.md`](./tasks.md) — checklist implementacji (Phase 0–9, w pełni ukończone 0–8)
- [`CLAUDE.md`](./CLAUDE.md) — instrukcje dla asystenta AI: zasady kodowania, anti-patterns, źródła

## Licencja

MIT
