# Plan: ActiveWindowCard zasilany rekomendacją z sleeper-machine

**Branch:** `feature/active-window-machine`
**Ostatnia aktualizacja:** 2026-05-28

## Źródła

- Requirements doc: brak (zmiana bezpośrednio z dialogu user + plan w `window-machine.md`)
- Plan techniczny: `window-machine.md` (root repo, źródłowy plan z plan mode)

## Podsumowanie wykonawcze

Pomarańczowa karta `ActiveWindowCard` na ekranie głównym pokazuje badge "Drzemka za ~Xg Ym" oraz ProgressBar zapełnienia okna czuwania. Target okna jest **hardkodowany na 105 min** (placeholder z Fazy 2, niezależny od wieku dziecka). Tymczasem `RecommendationCard` na tym samym ekranie używa już `sleeper-machine.recommend()` (age-based + historia 14 dni). Dwa źródła prawdy na jednym ekranie → potencjalny rozjazd o kilkanaście minut.

Zmiana: podmienia hardkodowane 105 min na `recommendation.currentWakeWindowDuration` i `recommendation.nextSleepAt`. Hook lifting do `ActiveChildSection` — single source of truth dla obu kart.

## Analiza obecnego stanu

**Plik:** `packages/sleeper-app/src/components/ActiveWindowCard.tsx`
- `targetWindowMinutes = 105` (linia 23) — hardkodowany default
- Lokalny `useState/useEffect` z `setInterval(60000)` (linie 25-30) — duplikuje tick z `useNow` w parencie
- Footer (linie 71-83): "Pobudka o HH:MM" + badge "Drzemka za ~X" lub "Można próbować drzemki"

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`
- `ActiveChildSection` (linia 133) używa `useNow(30000)` — tick co 30s
- `RecommendationCard` (linia 233) woła `useSleepRecommendation` z `now`, `childId`, `child.birth_date`
- `ActiveWindowCard` (linia 173) dostaje tylko `lastSleepEndAt`

**Plik:** `packages/sleeper-app/src/features/recommendation/RecommendationCard.tsx`
- Komponent stateful — woła `useSleepRecommendation` (linie 32-37)
- Zwraca `null` przy `isLoading || !recommendation` (linia 39)

**Plik:** `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`
- Już istnieje. Zwraca `{ recommendation, isLoading, error }`
- Pulls 14 dni sesji via `useSessions` (cache hit gdy ten sam `now`)

## Proponowany stan docelowy

1. `useSleepRecommendation` wołane **raz** w `ActiveChildSection`. Wynik przekazywany propem do `ActiveWindowCard` i `RecommendationCard`.
2. `ActiveWindowCard` przyjmuje `recommendation: Recommendation | null` i `now: Date` propem. Usuwa lokalny tick i hardkodowany 105.
3. `RecommendationCard` przerobione na prezentacyjny komponent — przyjmuje `recommendation: Recommendation | null` propem.
4. Edge cases:
   - `recommendation === null` lub `nextSleepAt === null` → ukryj badge i ProgressBar.
   - `nextSleepAt <= now` (overdue) → badge "Przekroczono okno o ~Xm", ProgressBar 100%.

## Fazy wdrożenia

### Faza 1: ActiveWindowCard — nowa sygnatura i logika (S)

**Cel:** Karta przyjmuje `recommendation` i `now` propem, usuwa hardcode + lokalny tick.

**Kryteria akceptacji:**
- `ActiveWindowCardProps` zawiera `lastSleepEndAt`, `recommendation: Recommendation | null`, `now: Date`.
- Usunięte: `targetWindowMinutes`, `useState`, `useEffect` z `setInterval`, stała `MINUTE_MS`.
- Logika `sinceMs/targetMs/remainingMs/progressValue` z planu (linie 32-49 w `window-machine.md`).
- Footer: badge widoczny tylko gdy `remainingMs !== null`. Overdue → "Przekroczono okno o ~Xm".
- ProgressBar widoczny tylko gdy `progressValue !== null`.

### Faza 2: RecommendationCard — prezentacyjny komponent (S)

**Cel:** Karta przestaje wołać hook, odbiera `recommendation` propem.

**Kryteria akceptacji:**
- `RecommendationCardProps = { recommendation: Recommendation | null }`.
- Usunięty import i wywołanie `useSleepRecommendation`, usunięte propy `childId`, `birthDateIso`, `now`, `targetWakeTime`.
- `if (!recommendation) return null` (loading state delegowany do parenta).
- Reszta JSX bez zmian (warnings, plan reszty dnia, confidence dot).

### Faza 3: ActiveChildSection — hook lifting (S)

**Cel:** Jedno wywołanie hooka, prop przekazywany do obu kart.

**Kryteria akceptacji:**
- `const { recommendation } = useSleepRecommendation(childId, child.birth_date, now)` po sekcji session queries.
- `<ActiveWindowCard>` otrzymuje `recommendation` i `now` propem.
- `<RecommendationCard>` otrzymuje wyłącznie `recommendation` propem.
- Zero zmian w innych komponentach (`BigActionButton`, `QuickActions`, `TodayStatsCard`, `SessionListItem`).

### Faza 4: Walidacja (S)

**Kryteria akceptacji:**
- `npx tsc --noEmit` → 0 błędów.
- `npm run lint` → 0 błędów.
- Manual w Expo Go: 6 scenariuszy z `window-machine.md` (happy path, brak kotwicy, overdue, brak historii, tick co 30s, spójność z RecommendationCard).

## Ocena ryzyka

| Ryzyko | Prawdopodobieństwo | Mitygacja |
|--------|---------------------|-----------|
| `nextSleepAt` w przeszłości łamie istniejący wykres | Średnie | Edge case obsłużony explicite (overdue badge). Test scenariusz 3. |
| Dwa Date instances → cache miss w `useSessions` | Niskie | Hook wywoływany **raz** po lifting — eliminuje problem. |
| Rerender każdej karty co 30s | Niskie | Akceptowalne dla MVP. `recommend()` <1ms wg komentarza w hooku. |
| Brak testów jednostkowych w sleeper-app | Wysokie (zgodnie z CLAUDE.md) | Manual w Expo Go zgodnie z 6 scenariuszami. |

## Mierniki sukcesu

- Badge "Drzemka za ~X" i karta "Następny sen HH:MM" pokazują ten sam czas docelowy (różnica <1 min między momentami renderu).
- Dla dziecka 6mc z historią ≥3 dni — okno czuwania ≠ 105 min (zmienia się age-based).
- Brak crash gdy recommendation == null (świeże dziecko bez historii).

## Wymagane zasoby i zależności

- Istniejące: `useSleepRecommendation`, `formatDuration`, `formatTime`, `useNow`, typ `Recommendation` z `sleeper-machine`, `Badge`, `ProgressBar`.
- Nic nowego do instalacji.

## Szacunki czasowe

- Faza 1: 30 min
- Faza 2: 15 min
- Faza 3: 15 min
- Faza 4 (walidacja + manual): 30 min
- **Razem: ~1.5h**
