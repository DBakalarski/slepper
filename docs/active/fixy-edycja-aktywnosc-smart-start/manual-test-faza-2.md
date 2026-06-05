# Manual test checklist — Faza 2 (Fix 3: smart start sleep)

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Commit:** `eb5a176` — `feat(start-sleep): derive session type from sleep recommendation`
**Środowisko:** Expo Go (iOS + Android)
**Plik testowany:** `packages/sleeper-app/src/app/(app)/index.tsx` (helper `smartSessionType()` linie 192–197, BigActionButton onPress linia 217)

## Pre-warunki

- Dziecko z wypełnionymi: `birth_date`, `preferred_naps_per_day`, `preferred_bedtime`.
- Co najmniej kilka sesji w historii (≥ 3 dni z sesjami) — pozwala `useSleepRecommendation` zwrócić niepuste `remainingNapsToday`.
- Realny czas dnia — najlepiej testować rano i wieczorem, lub manipulować zegarem systemowym telefonu między scenariuszami.

---

## Scenariusze

### 1. Rano (przed `preferred_bedtime`, plan zawiera napy) → smart start = `nap`

- [ ] Otwórz aplikację rano (np. 10:00) na home screen.
- [ ] Sprawdź sekcję `RecommendationCard` ("Nastepny sen") — pokazuje typ NAP.
- [ ] Tap "Rozpocznij sen" (BigActionButton).
- [ ] **Oczekiwane:** nowa sesja typu `nap` utworzona. `SleepInProgressCard` pojawia się z ikoną Sun w kolorze orange.
- [ ] **Oczekiwane:** w "Sesje dzisiaj" po `endSession` widać ikonę słońca (orange).

### 2. Wieczór (po `preferred_bedtime` lub plan wskazuje NIGHT) → smart start = `night_sleep`

- [ ] Otwórz aplikację wieczorem (np. po 19:30 lub gdy `remainingNapsToday[0].type === 'NIGHT'`).
- [ ] Sprawdź `RecommendationCard` — pokazuje typ NIGHT albo plan pusty.
- [ ] **Oczekiwane:** BigActionButton pokazuje **ikonę Moon (mały półksiężyc)** prepend przed labelem "Rozpocznij sen".
- [ ] Tap "Rozpocznij sen".
- [ ] **Oczekiwane:** nowa sesja typu `night_sleep`. `SleepInProgressCard` z fioletową ikoną Moon.

### 3. Cold start (świeże dziecko, brak `targetWakeTime` / brak historii) → fallback `nap`

- [ ] Stwórz nowe dziecko (lub usuń wszystkie sesje istniejącego — jeśli możliwe).
- [ ] Home → `recommendation === null` (RecommendationCard może pokazywać warning "brak kotwicy").
- [ ] **Oczekiwane:** BigActionButton bez ikony Moon (default `'nap'`).
- [ ] Tap "Rozpocznij sen".
- [ ] **Oczekiwane:** sesja typu `nap` (orange Sun). Brak crashu, brak błędu w `extractErrorMessage`.

### 4. Wszystkie drzemki dnia wykonane (`remainingNapsToday.length === 0`, `recommendation !== null`) → `night_sleep`

- [ ] Dziecko z planem 3 nap/dzień, zarejestruj 3 napy w ciągu dnia (lub przeskocz do wieczora po nich).
- [ ] Sprawdź `RecommendationCard` — `remainingNapsToday` pusty, ale `recommendation` nie null (jest `nextSleepAt` dla nocy).
- [ ] **Oczekiwane:** BigActionButton z ikoną Moon.
- [ ] Tap "Rozpocznij sen".
- [ ] **Oczekiwane:** sesja typu `night_sleep`.

### 5. `QuickActions` override — explicit "Drzemka" / "Sen nocny"

- [ ] Rano (gdy smart = nap) tap przycisk "Sen nocny" w `QuickActions`.
- [ ] **Oczekiwane:** sesja `night_sleep` mimo że smart sugerował `nap` (override działa).
- [ ] Zakończ sesję, wieczorem (smart = night) tap "Drzemka" w `QuickActions`.
- [ ] **Oczekiwane:** sesja `nap` mimo że smart sugerował `night_sleep`.

### 6. UX visual — ikona Moon w BigActionButton

- [ ] Rano: BigActionButton = "Rozpocznij sen" **bez** ikony Moon (`showMoonIcon = false`).
- [ ] Wieczorem: BigActionButton = ikona Moon + "Rozpocznij sen".
- [ ] **Uwaga:** label tekstowy zawsze `'Rozpocznij sen'` — zmienia się tylko ikona (Moon prepend) zgodnie z `BigActionButton.tsx:31`.

### 7. Regression — start sesji nie crashuje gdy `recommendation === null` (loading)

- [ ] Kill app i ponowny start (cold launch).
- [ ] Bardzo szybko tap "Rozpocznij sen" zanim `useSleepRecommendation` zdąży zwrócić `recommendation` (initial render: `recommendation === null`).
- [ ] **Oczekiwane:** brak crashu, fallback `'nap'`, sesja startuje normalnie.

---

## Cross-device

- [ ] iOS Expo Go: scenariusze 1–7.
- [ ] Android Expo Go: scenariusze 1–7 (sanity check — Faza 2 nie ma platformowych gałęzi, zachowanie identyczne).
- [ ] Two-device sync: na drugim telefonie po starcie smart `night_sleep` pojawia się real-time `SleepInProgressCard` z typem `night_sleep` (Realtime invalidation).

---

## Edge cases (opcjonalne)

- [ ] Dziecko bez `preferred_bedtime` → `recommendation` może być null lub mieć `remainingNapsToday[0].type === 'NAP'` zawsze → smart = `'nap'` przez cały dzień. Sprawdź czy nie ma zaskakujących skoków typu.
- [ ] Zmiana strefy czasowej na telefonie (np. wakacje) → `recommendation` przelicza się przez `now` (memoized w hooku), `smartSessionType()` reaguje na nowy `recommendation`. Brak stale state.
- [ ] Wymiana algorytmu (`children.algorithm` `'galland'` ↔ `'kotki_dwa'`) → oba algorytmy zwracają `PlanEntry[]` z `type: 'NIGHT' | 'NAP'`. `smartSessionType()` agnostyczny.
