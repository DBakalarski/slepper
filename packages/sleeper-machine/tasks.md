# Sleeper Machine — Implementation Tasks

> Tasks są uporządkowane wg zależności. Po każdej fazie test suite powinien przejść.
> Pełna specyfikacja algorytmu: `PLAN.md`. Kontekst dla Claude: `CLAUDE.md`.

## Phase 0 — Bootstrap (✅ ukończone)

- [x] `git init` w katalogu projektu (branch: main)
- [x] `.gitignore` (node_modules/, dist/, .DS_Store, coverage/, *.log, .env*)
- [x] `package.json` z `"name": "sleeper-machine"`, `"type": "module"`, `"version": "0.1.0"`
- [x] `pnpm add -D typescript@^5.7 vitest@^3.2 tsx @types/node @vitest/coverage-v8@^3.2` (vitest 4 alpha odrzucony — Node ESM import błąd)
- [x] `tsconfig.json` (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + verbatimModuleSyntax)
- [x] `vitest.config.ts` (include: tests/**/*.test.ts, coverage v8)
- [x] npm scripts: `test`, `test:watch`, `test:coverage`, `smoke`, `build` (`--passWithNoTests` dla pustego repo)
- [x] Pierwszy commit: "chore: bootstrap project (Phase 0)" — `eb32558`
- **Acceptance:** ✅ `pnpm test` → exit 0, "No test files found".

## Phase 1 — Typy domeny i helpery matematyczne (✅ ukończone)

- [x] `src/types.ts` — wszystkie typy (Minutes/Hours/AgeMonths/AgeYears branded + konwersje, SleepType, SleepSession, ChildProfile, State, Confidence, PlanEntry, Recommendation, TimeOfDay, DateTime alias)
- [x] `src/math/statistics.ts` — `median`, `mean`, `clamp`, `percentile`
- [x] `src/math/mad.ts` — `medianAbsoluteDeviation`, `trimByMAD(threshold=2)`
- [x] `src/math/ewma.ts` — `ewmaWeighted(values, daysAgo, lambda=0.85)` z walidacją lambda ∈ (0,1] i daysAgo ≥ 0
- [x] `tests/math.test.ts` — **41 testów** (median 6, mean 4, clamp 5, percentile 7, MAD 4, trimByMAD 5, ewmaWeighted 10)
- **Acceptance:** ✅ 41/41 zielonych, **100% coverage** (statements, branches, functions, lines) na wszystkich modułach math.

## Phase 2 — Baseline z Galland 2012 (✅ ukończone)

- [x] `src/profiles.ts`:
      - Stała `AGE_PROFILES` — 7 bucketów z Galland Tabel 2/3 (mean + low/high 95% CI)
      - `gallandSleepDurationByYears` — Eq. A (oś X w latach, R²=0.89)
      - `gallandNapsByMonths` — Eq. D (równolegla forma z A/B/C, parsing brackets z Fig. 4 niejednoznaczny w PDF; wybrana wersja daje wartości w Tabeli 3 95% CI; clamp `max(0, …)`)
      - `gallandLongestSleepByMonths` — Eq. C (oś X w miesiącach, safeAge=max(1, m) dla `ln`)
      - `gallandNightWakingsByMonths` — Eq. B (safeAge=max(1, m) dla `^-0.5`)
- [x] `src/ageBucket.ts` — `bucketOf(months): AgeBucket` z testami na boundary
- [x] `src/baseline.ts`:
      - `ageMonthsFromProfile(profile, now)` — używa `30.44` dni/mies. (Galland convention)
      - `getBaseline(profile, now)` — domyślnie equation, fallback do `AGE_PROFILES['0-2mo']` przy `ageMonths < 0`
- [x] `tests/profiles.test.ts` — **29 testów** (Eq. A 7, Eq. D 6, Eq. C 3, Eq. B 2, AGE_PROFILES 4, bucketOf 1 z 13 asercjami, ageMonthsFromProfile 3, getBaseline 3 z pełnym sanity check 9mo)
- **Acceptance:** ✅ Wszystkie 4 funkcje w 95% CI Galland Tabel 2/3 dla wieków 0/3/6/9/12/18/24 mies. Sanity check: total sleep 14.4→13.6→12.9→11.9h, naps 4.2→2.5→1.8→0.8, longest 5.0→7.4→8.3→9.2h.

## Phase 3 — Ekstrakcja historii (✅ ukończone)

- [x] `src/sleepDay.ts`:
      - `sleepDayBoundary(t: DateTime, dayStartHour=4): DateTime` (lokalna TZ hosta, nie mutuje input)
      - `sleepDayId(boundary): "YYYY-MM-DD"` (lokalna TZ, padded)
      - `groupBySleepDay(sessions, dayStartHour=4): Map<sleepDayId, SleepSession[]>` — grupowanie po `sleepDayBoundary(session.start)`
- [x] `src/history.ts`:
      - `observedTotalSleepPerDay(history, now, lookbackDays=14): Map<sleepDayId, Hours>`
      - `observedNapsPerDay(history, now, lookbackDays=14): Map<sleepDayId, number>`
      - `observedLongestSleepPerDay(history, now, lookbackDays=14): Map<sleepDayId, Hours>`
      - `observedNapLengthsPerDay(history, now, lookbackDays=14): Map<sleepDayId, Minutes[]>`
      - `observedMorningWake(history, now, lookbackDays=7): DateTime[]` — `end` sesji NIGHT, posortowane rosnąco; filtr po `session.end >= now - lookback`
- [x] `tests/sleepDay.test.ts` — **14 testów** (boundary 6, sleepDayId 2, groupBySleepDay 6 w tym DST spring-forward i pusta historia)
- [x] `tests/history.test.ts` — **13 testów** (5 dla total, 2 napCount, 1 longest, 1 napLengths, 4 morningWake, 1 acceptance 9mo)
- **Acceptance:** ✅ Realistyczny pattern 9mo (10.5h night + 2×63min naps) daje per-sleep-day total = 12.6h, mediana z 14 dni = 12.6h (Galland Tabela 2 mean dla 9mo).
- **Decyzje projektowe (dla referencji w przyszłych fazach):**
      - `sleepDayId` = ISO string `"YYYY-MM-DD"` (czytelne w fixtures/snapshotach)
      - Strefa czasowa = lokalna hosta (parametr `timezone` zostawiony na Phase 9)
      - `now` jest jawnym parametrem wszystkich `observed*` (spójność z resztą API)
      - Złagodzony `purity-guard`: `new Date(arg)` dozwolone, `new Date()` bez args nadal zakazane

## Phase 4 — Adaptacja, confidence, safety rails (✅ ukończone)

- [x] `src/adaptation.ts`:
      - `adapt(baseline, observed, daysAgo, options): number` — per-value (wywoływane osobno dla totalSleep/naps/longestSleep w Phase 7)
        - Domyślne `DEFAULT_ADAPT_OPTIONS = { lambda: 0.85, madThreshold: 2, safetyRail: 0.3 }`
        - Pipeline: inline median+MAD trim (pair-aware) → `ewmaWeighted` → mix `α·baseline + (1−α)·observed` → clamp do `[(1−safetyRail)×, (1+safetyRail)×] baseline`
        - Cold start (n=0): zwraca baseline bezpośrednio (bez wywołania ewma)
        - MAD=0 edge: trzyma tylko `v === median` (większość identycznych + jeden outlier — outlier znika)
      - `computeConfidence(n)`: `<3 → 'low'`, `<7 → 'medium'`, `≥7 → 'high'` (PLAN.md Krok 3)
      - `computeAlpha(n, target=14)`: `clamp(1 − n/target, 0.3, 1.0)`
- [x] `tests/adaptation.test.ts` — **23 testów** (computeAlpha 6, computeConfidence 3, input validation 1, cold start 2, full history 2, MAD trimming 3, safety rail 3, EWMA recency 1, property tests 2)
- **Acceptance:** ✅ Property test (1000 iteracji, mulberry32 seeded PRNG, baseline ∈ [1,20], observed ∈ [0.05×, 5×] baseline): `adapted ∈ [0.7×, 1.3×] baseline` zawsze. + dodatkowy property: wynik zawsze skończony i nie-NaN.
- **Coverage:** 100% statements/branches/functions/lines we wszystkich modułach src/.
- **Decyzje projektowe:**
      - `adapt` jest per-value (nie per-Baseline) — wywołujemy 3× w recommender
      - Inline MAD trim w `adapt` zamiast nowego helpera (`math/mad.ts:trimByMAD` zostaje czyste — nie ma jak zachować pair-correspondence z daysAgo bez zmiany API)
      - Property test bez fast-check (mulberry32 + 1000 iter) — fast-check zostaje na Phase 9

## Phase 5 — Liczba drzemek i okna aktywności (✅ ukończone)

- [x] `src/napCount.ts`:
      - `decideNapsToday(adaptedNaps, baselineNaps, observed7d): { naps: number; transitionWarning: boolean }`
        - Per-value sig (3 args) odpowiadająca PLAN.md Krok 4: default = `round(adaptedNaps)`, transition check vs `round(baselineNaps)`
        - Cold start (observed7d empty) → naps = round(adapted), warning = false
        - Transition gdy `|median(observed7d) − round(baselineNaps)| >= 1` → naps = round(median), warning = true
        - `Math.max(0, …)` defensywnie na wyniku
- [x] `src/wakeWindows.ts`:
      - `deriveWakeWindows({ totalSleep, longestSleep, napsToday, ageMonths }): Minutes[]`
      - `totalAwakeMin = max(0, (24 − totalSleep) × 60)` (degenerate totalSleep ≥ 24h → 0)
      - `numWindows = max(0, napsToday) + 1`, weights `[1.0]×napsToday + [1.3]`, ostatnie okno 30% dłuższe
      - **Decyzja: night derivation NIE jest w wakeWindows** — funkcja zwraca tylko okna aktywności. Wybór `totalSleep × 0.5` vs `longestSleep` należy do plannera (Phase 6), gdy wyznacza nightSleep dla budgetu 24h. `ageMonths` zostaje w sygnaturze dla przyszłego użycia (np. waga ostatniego okna może być wiekowo zmienna).
- [x] `tests/napCount.test.ts` — **9 testów** (cold start 2, stable 2, transition 4, defensywny clamp 1)
- [x] `tests/wakeWindows.test.ts` — **12 testów** (9mo acceptance 2, window count 3, last-longest 2, age-night derivation 3, edge cases 2)
- **Acceptance:** ✅ 9mo (totalSleep=12.6, longestSleep=9.2, napsToday=2): 3 okna sumujące się do 684 min = 11.4h. 24h budget check: awake + naps + night = 24h (±5 min).
- **Coverage:** 100% statements/branches/functions/lines.
- **Uwagi:**
      - `wakeWindows` to czyste dzielenie totalAwake na okna — formuła dla noc/nap-sleep zostaje w wywołującym (planner). Inaczej funkcja brałaby na siebie więcej niż obiecuje nazwa.
      - Testy `wakeWindows` weryfikują 24h budget używając obu formuł (<6mo: 0.5× total, ≥6mo: longestSleep) — czyli weryfikują że dla obu pre-set'ów spójność matematyczna istnieje.

## Phase 6 — Planner (✅ ukończone)

- [x] `src/planner.ts`:
      - `resolveMorningWake(state, profile, observedMornings): DateTime | null`
        - Kolejność fallbacku: most-recent `NIGHT.end` z dziś (calendar day) → mediana time-of-day z `observedMornings` (lokalne hh:mm, projekcja na dziś) → `targetWakeTime` (projekcja na dziś) → null
        - **Decyzja:** "dziś" = same calendar day, nie sleep day (rozstrzygnięte: \"czy dziś już była pobudka?\")
      - `forwardPass({ morningWake, wakeWindows, napLengths, napsToday }): PlanEntry[]`
        - Throw na: `napsToday < 0`, `napLengths.length !== napsToday`, `wakeWindows.length !== napsToday + 1`
        - NAP entries z `plannedEnd`, NIGHT entry bez (zgodne z `exactOptionalPropertyTypes`)
        - Zwraca `napsToday + 1` entries
      - `alignToTargetWake(morningWake, wakeWindows, napLengths, targetWakeTime, longestSleep, budget=0.2): { plan, warning? }`
        - Wstępny forwardPass → bieżący bedtime → `delta = (target tomorrow − longestSleep) − bedtime`
        - `maxBudget = budget × Σ wakeWindows` (w ms)
        - `|delta| > maxBudget` → warning + clamp do `sign(delta) × maxBudget`
        - Korekta wakeWindows proporcjonalna do długości okien → re-run forwardPass
- [x] `tests/planner.test.ts` — **23 testów** (resolveMorningWake 8 priority chain, forwardPass 9 incl. validation, alignToTargetWake 5, integration 1)
- **Acceptance:** ✅ Pełny plan spójny czasowo (start_{i+1} > end_i strictly). 24h budget: bedtime + night = next morning ≈ morningWake (±5 min). Align: target 06:30 → plan bedtime przesunięty, all windows w ±20%. Niemożliwy target 14:00 → warning + clamp do +144 min total.
- **Coverage:** 100% statements/branches/functions/lines.
- **Decyzje projektowe:**
      - `alignToTargetWake` ma rozszerzoną sygnaturę (`morningWake, wakeWindows, napLengths, ...`) zamiast tasks.md `(plan, ...)` — bo plan nie zawiera wystarczająco informacji do re-derive correction proporcjonalnej do okien. PLAN.md Krok 7 jest matematycznie spójny tylko z surowymi `wakeWindows` jako wejściem.
      - Median time-of-day w `resolveMorningWake` używa `getHours()*60+getMinutes()` (lokalne) — strefa zgodna z `sleepDayId` z Phase 3.
      - Float ms precision: `wakeWindow × 60_000` daje float, `new Date(...)` truncuje do integer → testy używają ±1 ms tolerancji w asercjach na surowe timestampy.

## Phase 7 — Recommender (public API) i 9 scenariuszy testowych (✅ ukończone)

- [x] `src/recommender.ts`:
      - `recommend(state, profile): Recommendation`
      - Orkiestracja: validateInput → getBaseline → observed*PerDay → adapt(×3) → computeConfidence → decideNapsToday → deriveWakeWindows → resolveMorningWake → forwardPass/alignToTargetWake → Krok 8 (current window + nextSleepAt) → Krok 9 (warnings)
      - Helper inline: `sleepDayIdToDaysAgo`, `sameCalendarDay`, `napsDoneToday`, `lastWakeMs`
      - Walidacja na boundary: `state.now` Date, `dateOfBirth` Date, `targetWakeTime` w [0..23]/[0..59], każda SleepSession `end > start`
- [x] `src/index.ts`: re-export `recommend`, `DEFAULT_ADAPT_OPTIONS`, wszystkie publiczne typy, brand factories (`makeMinutes`/`makeHours`/`makeAgeMonths`/`makeAgeYears`), konwertery jednostek
- [x] `tests/fixtures/`:
      - `loader.ts` — JSON → State+ChildProfile (ISO date strings → Date)
      - `builders.ts` — generator `buildDay`/`buildHistory`/`buildState` + canonical patterns `PATTERN_4MO`/`PATTERN_9MO`/`PATTERN_14MO_TRANSITION`/`PATTERN_9MO_DEFICIT`
      - `cold-start.json` (małe), `early-wake.json` (małe) — JSON dla manualnej inspekcji
      - 14-dniowe wzorce generowane builderami (hybrid approach — tasks.md `four-month-old.json` etc. nie potrzebne jako pliki)
- [x] `tests/recommender.test.ts` — **31 testów** (9 scenariuszy z PLAN.md + 3 coverage tests + 4 input validation)
      1. Cold start (4mo, brak history) — confidence=low, brak kotwicy, nextSleepAt=null ✓
      2. Galland 9mo (14d) — confidence=high, plan computed, no transition warning ✓
      3. Stała historia 14d (lekko nadmiar) — confidence=high, no deficit warning ✓
      4. Alignment do targetWakeTime — no align warning, bedtime w 17:00–22:30 ✓
      5. Nap transition (14mo, 7d × 1 drzemka, baseline=2) — emituje transition warning ✓
      6. Outlier (1 dzień +50%) — plan stabilny mimo outlier'a ✓
      7. Wczesna pobudka 04:30 — nextSleepAt liczone od 04:30 ✓
      8. targetWakeTime nierealistyczne 14:00 — emituje align warning ✓
      9. Chronic sleep debt (7d × 85%) — emituje deficit warning ✓
- **Acceptance:** ✅ 196/196 testów zielonych. Wszystkie 9 scenariuszy z PLAN.md "Weryfikacja" przechodzi.
- **Coverage:** 100% statements/functions/lines we wszystkich plikach. Branch 100% wszędzie poza `recommender.ts` (92.72% — niepokryte to defensywne `?? 0` fallbacki przy `noUncheckedIndexedAccess`, nigdy nie triggerują w realnym flow).
- **Fix algorytmu odkryty przez Scenario 7:** `decideNapsToday` miał false-positive tranzycji przy n<3 (np. 1 logged NIGHT, 0 logged naps → median=0, baseline=2 → wykrywało "tranzycję 2→0"). Dodano `TRANSITION_MIN_SAMPLES = 3` (poniżej tego fallback na `round(adapted)`). PLAN.md zakłada `median(last 7d)` więc 1-2 punkty to za słaby sygnał.

## Phase 8 — Smoke test, README, finalizacja (✅ ukończone — pozostał commit/tag)

- [x] `scripts/gen-fixtures.ts` — one-shot generator JSON fixtures z canonical patterns (re-run gdy zmienia się pattern). Generuje `tests/fixtures/nine-month-old.json` (42 sesje, 14 dni × PATTERN_9MO).
- [x] `tests/fixtures/nine-month-old.json` — fixture wymagana przez smoke test (wygenerowana, w git).
- [x] `scripts/smoke-test.ts` — CLI: `pnpm smoke -- tests/fixtures/nine-month-old.json`. Ładuje JSON, iteruje `now` co 1h przez 24h, drukuje tabelę: `now │ wakeWindow │ nextSleepAt │ confidence │ remainingPlan │ warning`. Wynik smoke pokazuje sensowny algorytm: bedtime ~21:16, naps następnego dnia 09:43+14:56, warnings o przemęczeniu w odpowiednich godzinach.
- [x] `README.md` — quickstart, public API z przykładem `recommend()`, algorytm w 9 krokach, struktura, 6 źródeł naukowych, linki do PLAN/tasks/CLAUDE.
- [x] Cross-check PLAN.md krytyczne pliki ≡ `src/` struktura: ✅ wszystkie 10 plików obecne (`types`, `profiles`, `ageBucket`, `history`, `adaptation`, `napCount`, `wakeWindows`, `planner`, `recommender`, `index`) + ekstra moduły pomocnicze (`baseline`, `sleepDay`, `math/`).
- [x] `pnpm build` emituje `dist/` z `.js` + `.d.ts` + sourcemaps dla każdego modułu.
- [ ] **TODO przed v0.1.0:** `git init` + commit + tag `v0.1.0` (repo jeszcze niezainicjowane — wymaga zgody usera, krok niereversybilny).
- **Acceptance:** ✅ `pnpm install && pnpm test && pnpm smoke -- tests/fixtures/nine-month-old.json && pnpm build` działa bez błędów. 196/196 testów zielonych, 100% coverage statements/functions/lines.

## Phase 9 (opcjonalna, post-v0.1) — ulepszenia

- [ ] Property-based tests (fast-check) dla safety rails
- [ ] Benchmark (vitest bench): czas wykonania `recommend` z 1000 sesji w historii (cel: <5ms)
- [ ] Walidacja schematu JSON dla fixtures (zod lub pure TS guards)
- [ ] Eksport JSON Schema dla SleepSession (do dokumentacji API mobilnego)
- [ ] Lokalizacja warnings (i18n: en, pl)
- [ ] Wersja Borbély'ego: pełny model two-process z circadian sine wave (zamiast heurystyki ×1.3)

---

## Krytyczne pułapki (z PLAN.md Część II)

1. **Jednostki wieku w równaniach Galland** — sleep duration w **latach**, pozostałe trzy w **miesiącach**. Osobne funkcje, jawne nazwy.
2. **`ln(0)` / `0^-0.5`** — klamrować `ageMonths` do `max(1, ageMonths)`.
3. **Brandowane typy** `Minutes`, `Hours`, `AgeMonths`, `AgeYears` — kompilator łapie pomyłki jednostek.
4. **"Doba snu" ≠ doba kalendarzowa** — drzemka 23:50→00:30 grupowana po `sleepDayBoundary` (próg ~04:00).
5. **Pochodna nocy** — dla ≥6mo `night = longestSleep`, dla 0-5mo `night = totalSleep × 0.5`.
6. **Cold start bez kotwicy** — zwracaj `nextSleepAt: null` + warning, nie zgaduj 7:00.
7. **Determinizm** — żadnego `Date.now()`/`new Date()` w `src/`, `now` zawsze jako parametr.
8. **Walidacja tylko na boundary** — `index.ts/recommend()` waliduje; wewnętrzne moduły zakładają poprawny input.
