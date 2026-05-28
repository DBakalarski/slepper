# Zadania: ActiveWindowCard zasilany rekomendacją z sleeper-machine

**Branch:** `feature/active-window-machine`
**Ostatnia aktualizacja:** 2026-05-28

## Faza 1: ActiveWindowCard — nowa sygnatura i logika

- [x] Otwórz `packages/sleeper-app/src/components/ActiveWindowCard.tsx`
- [x] Dodaj import `Recommendation` z `sleeper-machine`
- [x] Podmień `ActiveWindowCardProps`: usuń `targetWindowMinutes`, dodaj `recommendation: Recommendation | null` i `now: Date`
- [x] Usuń `useState`, `useEffect` z `setInterval`, stałą `MINUTE_MS` (linie 19, 25-30) — `MINUTE_MS` zachowane jako lokalna stała do mnożenia minut, useState/useEffect usunięte
- [x] Usuń import `useEffect`, `useState` (nieużywane po usunięciu ticka)
- [x] Zaimplementuj nową logikę `sinceMs/targetMs/remainingMs/progressValue` zgodnie z planem
- [x] Zaktualizuj render ProgressBar — pokaż tylko gdy `progressValue !== null`
- [x] Zaktualizuj render badge: ukryj gdy `remainingMs === null`, "Drzemka za" gdy `> 0`, "Przekroczono okno o" gdy `<= 0`
- [x] Usuń gałąź "Można próbować drzemki" (zastąpiona przez overdue)

## Faza 2: RecommendationCard — prezentacyjny komponent

- [x] Otwórz `packages/sleeper-app/src/features/recommendation/RecommendationCard.tsx`
- [x] Zmień `RecommendationCardProps` na `{ recommendation: Recommendation | null }`
- [x] Dodaj import `Recommendation` z `sleeper-machine`
- [x] Usuń import `useSleepRecommendation`, pozostaw `formatTime`
- [x] Usuń wywołanie hooka (linie 32-37)
- [x] Uprość gałąź guard: `if (!recommendation) return null` (bez `isLoading`, bez `error`)
- [x] Pozostała JSX bez zmian (header, nextSleepAt block, remainingNapsToday, warnings)
- [x] Usuń import `TimeOfDay` (nieużywany)

## Faza 3: ActiveChildSection — hook lifting

- [x] Otwórz `packages/sleeper-app/src/app/(app)/index.tsx`
- [x] Dodaj import `useSleepRecommendation` z `@/features/recommendation/useSleepRecommendation`
- [x] Dodaj wywołanie `const { recommendation } = useSleepRecommendation(childId, child.birth_date, now)` w `ActiveChildSection` po session queries
- [x] Zaktualizuj render `<ActiveWindowCard>` — dodaj propy `recommendation={recommendation}` i `now={now}`
- [x] Zaktualizuj render `<RecommendationCard>` — usuń `childId`, `birthDateIso`, `now`, podaj `recommendation={recommendation}`
- [x] Zweryfikuj że nie ma duplikacji wywołań `useSleepRecommendation` w tym pliku

## Faza 4: Walidacja

- [x] Weryfikacja: w `packages/sleeper-app/` uruchom `npx tsc --noEmit` — 0 błędów
- [x] Weryfikacja: w `packages/sleeper-app/` uruchom `npm run lint` — 0 błędów
- [x] Weryfikacja: `git diff` pokazuje tylko 3 zmodyfikowane pliki + pre-existing reorder (wciągnięty w commit fazy 3)
- [ ] Test: Happy path — dziecko z historią i nocnym snem, badge i karta "Następny sen" pokazują ten sam czas (±1 min) — **manual test on-device**
- [ ] Test: Brak kotwicy — świeże dziecko, badge i ProgressBar ukryte, footer tylko "Pobudka o HH:MM" — **manual test on-device**
- [ ] Test: Overdue — ręcznie ustawić `lastSleepEndAt` 5h temu, badge "Przekroczono okno o ~Xm", ProgressBar 100% — **manual test on-device**
- [ ] Test: Brak historii (`lastSleepEndAt === null`) — karta pokazuje "Nowy dzień" bez zmian — **manual test on-device**
- [ ] Test: Tick co 30s — 1 min na ekranie, badge i ProgressBar płynnie się aktualizują (parent useNow) — **manual test on-device**
- [ ] Test: Spójność — `now + remainingMs ≈ recommendation.nextSleepAt` z `RecommendationCard` (różnica <1 min) — **manual test on-device**

## Faza 5: Commit i log

- [x] Commit zmian kodu (`40acf8b feat(recommendation): ActiveWindowCard uses sleeper-machine`)
- [x] Odczytaj short hash (`40acf8b`)
- [x] Utwórz `docs/commits/2026-05-28-40acf8b-active-window-card-uses-machine.md`
- [x] Osobny commit (`478fe1b docs(commits): log 40acf8b`)
