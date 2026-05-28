# Algorytm rekomendacji snu i okien aktywności (<3 lat)

## Kontekst

Aplikacja mobilna do śledzenia snu dzieci do 3 r.ż. Algorytm w czasie rzeczywistym odpowiada na trzy pytania:

1. **Kiedy** dziecko powinno się następnym razem położyć (drzemka albo noc)?
2. **Jak długie** powinno być bieżące okno aktywności?
3. **Ile** drzemek zostało dziś do realizacji i o których godzinach?

Wejście: czasy snu nocnego i drzemek (start/koniec), data urodzenia, opcjonalna docelowa godzina porannej pobudki. Wybrane podejście: **hybryda baseline (z danych naukowych) + adaptacja personalizująca**. Forma: pseudokod i opis matematyczny, niezależny od stacku mobilnego.

## Ważne uściślenie merytoryczne (po researchu)

Pierwotna wersja planu zawierała tabelę "wake windows by age". **Wake windows nie są pojęciem z literatury naukowej** — to heurystyka rozpowszechniona przez konsultantów snu (Weissbluth, Mindell, Polly Moore). Dr Craig Canapari (Yale Pediatric Sleep): *"This is not a concept that is taught, discussed, or researched in medical school or in the world of pediatric sleep medicine."* Dr Erin Flynn-Evans (NASA Fatigue Countermeasures Lab) dodaje, że wake windows ignorują rytm okołodobowy i koncentrują się wyłącznie na homeostatycznym ciśnieniu snu.

**Co jest udokumentowane w literaturze:**
- **Galland et al. (2012, Sleep Medicine Reviews)** — meta-analiza 34 badań obserwacyjnych, n>30000, kraje 18. Twarda tabela referencyjna.
- **Iglowstein et al. (2003, Pediatrics)** — Zurich Longitudinal Study, n=493 śledzonych przez 16 lat, percentyle.
- **AASM Consensus / Paruthi et al. (2016)** — eksperckie rekomendacje minimum/maksimum snu/24h.
- **Spencer et al. (2022, PNAS)** — mechanizm tranzycji liczby drzemek (homeostatic pressure + memory consolidation).
- **Borbély (1982, two-process model)** — homeostaza + rytm okołodobowy.

**Z tej literatury algorytm bezpiecznie wyciąga:**
1. Średni czas snu/24h i jego zmienność (mierzalne, mocne dane).
2. Średnią liczbę drzemek/dzień (mierzalne).
3. Średnią długość najdłuższego epizodu snu (mierzalne).
4. Wiek typowych tranzycji liczby drzemek (3→2 ok. 8–12 mies., 2→1 ok. 12–18 mies., 1→0 między 2–8 r.ż. z dużą zmiennością).

**Wake windows są wyliczane jako wielkość pochodna** z powyższych, a nie wprowadzane jako odrębny baseline.

## Tabela referencyjna `AGE_PROFILES` (Galland 2012, Tabele 2 i 3)

Wartości to pooled mean ± dolna/górna granica (±1.96 SD ≈ 95% populacji).

```
                  Total sleep/24h (h)   Daytime naps (#)   Longest sleep period (h)   Night wakings (#)
0–2 miesięcy      14.6 (9.3–20.0)       3.1 (1.2–5.0)*     5.7 (1.8–9.6)*             1.7 (0–3.4)
3 mies.           13.6 (9.4–17.8)       3.1 (1.2–5.0)*     5.7 (1.8–9.6)*             0.8 (0–3.0)
6 mies.           12.9 (8.8–17.0)       2.2 (0.9–3.5)      8.3 (3.0–13.7)             0.8 (0–3.0)
9 mies.           12.6 (9.4–15.8)       2.2 (0.9–3.5)      8.3 (3.0–13.7)             1.1 (0–3.1)
12 mies.          12.9 (10.1–15.8)      1.2 (0.4–2.1)      8.3 (3.0–13.7)             1.1 (0–3.1)
1–2 lata          12.6 (9.0–15.2)       1.2 (0.4–2.1)      8.3 (3.0–13.7)             0.7 (0–2.5)
2–3 lata          12.0 (9.7–14.2)       ~1 (drops to 0)†   ~10–11†                    rare
```

\* Galland zbiorczy bucket 0-5 mies.; † Galland: dane dla 2–5 lat sparse, wartości szacunkowe z AASM/Iglowstein.

**Równania ciągłe (Galland 2012, Fig. 4, age w miesiącach):**
- Sleep duration (lata): `10.49 − 5.56·[(age/10)^0.5 − 0.71]`, R²=0.89
- Daytime naps (#): `2.02 − [2.19·((age/10)^0.5) − 0.99]`, R²=0.98
- Longest sleep period (h): `7.79 + 1.32·ln(age/10) + 0.22`, R²=0.96
- Night wakings (#): `0.84 + 0.56·[(age/10)^−0.5 − 1.10]`, R²=0.58

Równania działają na wieku w miesiącach. Można je użyć zamiast tabeli dla płynnej interpolacji.

## Tranzycje liczby drzemek (Spencer et al. 2022, PNAS)

| Tranzycja | Wiek modalny | Mechanizm |
|---|---|---|
| Polyphasic → 3 naps + night | 4–6 mies. | Konsolidacja snu nocnego |
| 3 → 2 naps | 8–12 mies. | Wydłużenie longest sleep period |
| 2 → 1 nap | 12–18 mies. (mediana ~15) | Wzrost pojemności hipokampa |
| 1 → 0 napów | 2–8 lat (duża zmienność) | Dalszy rozwój pamięci |

Algorytm wykrywa tranzycje **z danych dziecka** (mediana zaobserwowanych drzemek z 7 dni różni się od baseline o ≥1), a nie po sztywnym wieku — bo rozrzut indywidualny jest ogromny.

## Model domeny

```
SleepSession {
  start:    DateTime
  end:      DateTime
  type:     'NIGHT' | 'NAP'
}

ChildProfile {
  dateOfBirth:     Date
  targetWakeTime?: TimeOfDay   // np. 06:30 — opcjonalne
}

State {
  now:           DateTime
  history:       SleepSession[]   // sortowane rosnąco po start, ostatnie 14 dni
  lastWakeTime:  DateTime
}

Recommendation {
  nextSleepAt:                DateTime
  currentWakeWindowDuration:  Minutes     // wielkość pochodna, nie pierwotna
  remainingNapsToday:         { plannedStart, plannedEnd, type }[]
  confidence:                 'low' | 'medium' | 'high'
  warnings:                   string[]
}
```

## Algorytm — kroki

### Krok 1. Baseline z literatury (Galland 2012)

```
ageMonths = floor((now - dateOfBirth).days / 30.44)
baseline = AGE_PROFILES[bucketOf(ageMonths)]
// lub równania ciągłe:
totalSleep24h_baseline = 10.49 − 5.56·[(ageMonths/120)^0.5 − 0.71]   // h
napsPerDay_baseline    = round(2.02 − [2.19·((ageMonths/120)^0.5) − 0.99])
longestSleep_baseline  = 7.79 + 1.32·ln(ageMonths/120) + 0.22       // h
```

### Krok 2. Ekstrakcja zaobserwowanych wielkości z historii

Dla każdego dnia w ostatnich 14 dniach:
- `observedTotalSleep[d]` = Σ czasów wszystkich SleepSession danego dnia + nocy z dnia
- `observedNaps[d]` = liczba SleepSession.NAP danego dnia
- `observedLongest[d]` = max długość pojedynczego SleepSession danego dnia (zwykle noc)
- `observedNapLength[d, k]` = długość k-tej drzemki dnia d
- `observedMorningWake[d]` = end pierwszego snu nocnego kończącego się tego dnia

### Krok 3. Adaptacja (EWMA + trimming outlierów)

Dla każdej wielkości X:
```
samples_X = ostatnie 14 dni
samples_X = trim(samples_X, |x − median| > 2·MAD)    // odsiewa choroby, anomalie
λ = 0.85   // dziennej zaniku wagi
weights = [λ^d for d in days_ago]
observed_X = Σ(sample · weight) / Σ(weight)

n = liczba dni z danymi
α = clamp(1 − n/14, 0.3, 1.0)
adapted_X = α · baseline_X + (1 − α) · observed_X
adapted_X = clamp(adapted_X, 0.7·baseline_X, 1.3·baseline_X)   // safety rail
```

**Confidence:**
- `n < 3` → `low`
- `3 ≤ n < 7` → `medium`
- `n ≥ 7` → `high`

### Krok 4. Liczba drzemek na dziś (z detekcją tranzycji)

```
napsToday = round(adapted_napsPerDay)
# detekcja tranzycji: jeśli median(observedNaps z 7 dni) ≠ round(baseline_napsPerDay):
if abs(median(observedNaps[last 7d]) - baseline_napsPerDay) >= 1:
    napsToday = median(observedNaps[last 7d])
    warnings.push('possible nap transition detected — schedule may be unstable')
```

### Krok 5. Wyznaczenie pochodnych okien aktywności

To kluczowy krok — wake windows wyliczone *po* ustaleniu mierzalnych wielkości.

```
// suma snu nocnego (z longest sleep period jako proxy nocy)
nightSleep_h = adapted_longestSleep
// suma snu dziennego = total - night
totalNapSleep_h = max(0, adapted_totalSleep − nightSleep_h)
avgNapLen_min = (totalNapSleep_h * 60) / max(napsToday, 1)

// całkowity czas aktywności w ciągu 24h
totalAwakeTime_min = (24 * 60) - (adapted_totalSleep * 60)

// liczba okien aktywności = liczba drzemek + 1 (ostatnie kończy się nocą)
numWakeWindows = napsToday + 1

// bazowy rozkład: ostatnie okno (wieczorne) jest ~1.3× dłuższe niż pozostałe
// (znane heurystycznie + spójne z circadian wake maintenance zone)
weights = [1.0] * napsToday + [1.3]
W = sum(weights)
wakeWindow_min[i] = totalAwakeTime_min * (weights[i] / W)
```

Można też skalibrować `wakeWindow_min[i]` mocniej do danych dziecka, jeśli historia jest bogata: liczyć obserwowane długości okien między snami i nadpisywać przewidywany rozkład.

### Krok 6. Forward pass — generowanie planu dnia

```
morningWakeTime = end ostatniego SleepSession.NIGHT (jeśli był dziś)
                  || mediana observedMorningWake z 7 dni
                  || targetWakeTime
cursor = morningWakeTime
plan = []
for i in 0..napsToday-1:
    napStart = cursor + wakeWindow_min[i]
    napEnd   = napStart + avgNapLen_min
    plan.append({ start: napStart, end: napEnd, type: 'NAP' })
    cursor   = napEnd
bedtime = cursor + wakeWindow_min[napsToday]    // ostatnie (wieczorne)
plan.append({ start: bedtime, type: 'NIGHT' })
```

### Krok 7. Wyrównanie do `targetWakeTime` (jeśli ustawione)

Cel: następnego dnia rano pobudka ≈ `targetWakeTime`.

```
desiredBedtime = targetWakeTime − adapted_longestSleep   // cofnij na poprzedni dzień
delta = desiredBedtime − plan.bedtime

maxBudget = 0.2 · Σ wakeWindow_min[]       // wolno przesunąć do 20%
if |delta| ≤ maxBudget:
    // rozproś proporcjonalnie do długości okien aktywności
    for i in 0..napsToday:
        wakeWindow_min[i] += delta · (wakeWindow_min[i] / Σ wakeWindow_min)
    powtórz forward pass z poprawkami
else:
    warnings.push('targetWakeTime poza zakresem ±20% bezpiecznej korekty')
    // wyrównaj tyle, ile się da (przytnij deltę do ±maxBudget)
```

**Uwaga circadian (Flynn-Evans):** poranna pobudka jest *główną kotwicą* rytmu okołodobowego. `targetWakeTime` powinno być trzymane na stałym poziomie ±30 min, a kolejne drzemki dostosowywane. Algorytm nie przesuwa porannej pobudki, żeby "dorobić" sen — przesuwa wieczorne położenie się.

### Krok 8. Bieżąca rekomendacja

```
napsAlreadyDoneToday = count(history where start.date == today AND type=='NAP')
i = napsAlreadyDoneToday               // indeks bieżącego okna
currentWakeWindowDuration = wakeWindow_min[i]
nextSleepAt = lastWakeTime + wakeWindow_min[i]
remainingNapsToday = plan filter (start > now)
```

### Krok 9. Sygnały ostrzegawcze

```
elapsed = now − lastWakeTime
if elapsed > 1.2 · wakeWindow_min[i]:
    warnings.push('ryzyko przemęczenia')
if elapsed < 0.7 · wakeWindow_min[i] && userIntent == 'putToSleep':
    warnings.push('prawdopodobnie za wcześnie — okno za krótkie')
if confidence == 'low':
    warnings.push('rekomendacje oparte głównie o normy wiekowe (Galland 2012) — dodaj więcej dni danych')
if observedTotalSleep_last7d_mean < 0.85 · adapted_totalSleep:
    warnings.push('przewlekły deficyt snu w ostatnim tygodniu')      // Flynn-Evans: monitoruj chronic, nie acute
```

## Edge cases

| Scenariusz | Reakcja algorytmu |
|---|---|
| Dzień 1, brak historii | Czysty baseline z Galland, `confidence='low'`, brak alignmentu |
| Bardzo wczesna pobudka (np. 04:30) | Skróć pierwsze okno do `0.6·wakeWindow[0]`, dolicz brakujący sen do 1. drzemki |
| Pominięta drzemka | Wydłuż następne okno o `0.5·skippedNapLen` (max 1.3·baseline) |
| Choroba / wakacje | Trimming MAD (krok 3) odsiewa anomalie; α nie spada poniżej 0.3 |
| Nap transition 3→2 / 2→1 | Wykrywany medianą 7-dniową (krok 4); warning, plan przeliczony |
| `targetWakeTime` nierealistyczne | Warning + częściowe wyrównanie (max ±20% baseline) |
| Drzemka rozjeżdża się o ±30 min | Plan przeliczany na żywo po każdym nowym SleepSession — nie trzymamy sztywnego rozkładu |
| Skok wieku przez bucket | Płynna interpolacja przez równania ciągłe Galland (Krok 1) zamiast skokowej tabeli |

## Krytyczne pliki (struktura modułu)

```
sleep-algo/
  types.ts          // SleepSession, ChildProfile, Recommendation
  profiles.ts       // AGE_PROFILES (tabela Galland 2012) + równania ciągłe
  ageBucket.ts      // mapowanie ageMonths → bucket
  history.ts        // ekstrakcja observedTotalSleep, observedNaps, observedLongest z SleepSession[]
  adaptation.ts     // EWMA, trim outlierów (MAD), confidence, safety rails
  napCount.ts       // wybór napsToday, detekcja tranzycji
  wakeWindows.ts    // pochodne okna aktywności z mierzalnych wielkości
  planner.ts        // forward pass + alignment do targetWakeTime
  recommender.ts    // recommend(state, profile) → Recommendation
  index.ts          // public API: jedna funkcja `recommend()`
  __tests__/
    recommender.test.ts
```

Moduł jest *czystą funkcją* `(State, ChildProfile) → Recommendation` — bez I/O, bez stanu globalnego. Łatwo testowalny, łatwo wpinany w dowolny UI mobilny (React Native, Flutter, native).

## Weryfikacja

Zestaw testów jednostkowych (`recommender.test.ts`):

1. **Cold start (dzień 1)** — niemowlę 4 mies., brak historii → `totalSleep ≈ 13.6h`, `naps ≈ 3`, `confidence='low'`.
2. **Walidacja z Galland Fig. 4** — dla wieku 9 mies. wynik algorytmu w środku przedziału 95% Galland (8.8–17.0h przy mean 12.6h).
3. **Stała historia 14 dni** — okna konsekwentnie 10 min dłuższe niż baseline → `adapted` zbiega do `~baseline + 7 min` (α=0.3), `confidence='high'`.
4. **Alignment do `targetWakeTime`** — target 07:00, baseline daje bedtime 19:30 → delta rozkłada się proporcjonalnie, `|adjusted − baseline| ≤ 20%`.
5. **Nap transition 3→2** — 7 dni z 2 drzemkami przy `baseline_naps=3` → algorytm przełącza scheme, emituje warning.
6. **Outlier (jednodniowa choroba)** — okno 50% dłuższe niż reszta → trimowane przez MAD, nie wpływa na średnią.
7. **Bardzo wczesna pobudka 04:30** — pierwsze okno skrócone, plan dnia przesunięty.
8. **`targetWakeTime` nierealistyczne** (delta > 20%) — warning + częściowe wyrównanie.
9. **Chronic sleep debt** — średnia tygodniowa < 85% baseline → warning, niezależnie od konkretnego dnia.

**Manualny smoke test:** skrypt CLI ładujący syntetyczny `history.json` (6-miesięczne dziecko, 14 dni danych) i drukujący `Recommendation` w pętli co godzinę — wzrokowa weryfikacja przeciwko Galland Fig. 4 i typowym harmonogramom.

## Bibliografia

- **Galland BC, Taylor BJ, Elder DE, Herbison P.** Normal sleep patterns in infants and children: a systematic review of observational studies. *Sleep Medicine Reviews* 2012;16(3):213–222. — Podstawa tabel baseline i równań ciągłych.
- **Iglowstein I, Jenni OG, Molinari L, Largo RH.** Sleep duration from infancy to adolescence: reference values and generational trends. *Pediatrics* 2003;111(2):302–307. — Walidacja percentyli, Zurich cohort.
- **Paruthi S et al.** Recommended Amount of Sleep for Pediatric Populations: A Consensus Statement of the American Academy of Sleep Medicine. *J Clin Sleep Med* 2016;12(6):785–786. — Klinicze widełki min/max.
- **Spencer RMC et al.** Contributions of memory and brain development to the bioregulation of naps and nap transitions in early childhood. *PNAS* 2022;119(44):e2123415119. — Mechanizm tranzycji liczby drzemek.
- **Borbély AA.** A two process model of sleep regulation. *Human Neurobiology* 1982;1(3):195–204. — Teoretyczne fundamenty (homeostaza + circadian).
- **Hirshkowitz M et al.** National Sleep Foundation's updated sleep duration recommendations. *Sleep Health* 2015;1(4):233–243. — Alternatywne widełki.

## Co świadomie *poza zakresem* tego planu

- Model ML (sieci neuronowe) — hybryda EWMA z safety rails jest wystarczająca, interpretowalna i ma teoretyczne uzasadnienie.
- UI/UX aplikacji, warstwa persystencji, sync z backendem.
- Czynniki kontekstowe (choroba, ząbkowanie, milestones) — w tej iteracji odsiewane jako outliery, nie modelowane explicite.
- Pełna implementacja modelu Borbély'ego (acute + chronic homeostatic pressure + circadian) — algorytm aproksymuje go heurystyką ostatniego okna ×1.3 (wake maintenance zone) i monitorowaniem 7-dniowej średniej (chronic).
- Wybór języka — pseudokod jest agnostyczny; rekomendowany TypeScript (shared między RN i web), alternatywnie Dart (Flutter) lub Kotlin Multiplatform.
