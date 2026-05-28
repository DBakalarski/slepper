# Zadania: ActiveWindowCard zasilany rekomendacją z sleeper-machine

**Branch:** `feature/active-window-machine`
**Ostatnia aktualizacja:** 2026-05-28

## Faza 1: ActiveWindowCard — nowa sygnatura i logika

- [ ] Otwórz `packages/sleeper-app/src/components/ActiveWindowCard.tsx`
- [ ] Dodaj import `Recommendation` z `sleeper-machine`
- [ ] Podmień `ActiveWindowCardProps`: usuń `targetWindowMinutes`, dodaj `recommendation: Recommendation | null` i `now: Date`
- [ ] Usuń `useState`, `useEffect` z `setInterval`, stałą `MINUTE_MS` (linie 19, 25-30)
- [ ] Usuń import `useEffect`, `useState` jeśli pozostałe wystąpienia nie wymagają
- [ ] Zaimplementuj nową logikę `sinceMs/targetMs/remainingMs/progressValue` zgodnie z planem
- [ ] Zaktualizuj render ProgressBar — pokaż tylko gdy `progressValue !== null`
- [ ] Zaktualizuj render badge: ukryj gdy `remainingMs === null`, "Drzemka za" gdy `> 0`, "Przekroczono okno o" gdy `<= 0`
- [ ] Usuń gałąź "Można próbować drzemki" (zastąpiona przez overdue)

## Faza 2: RecommendationCard — prezentacyjny komponent

- [ ] Otwórz `packages/sleeper-app/src/features/recommendation/RecommendationCard.tsx`
- [ ] Zmień `RecommendationCardProps` na `{ recommendation: Recommendation | null }`
- [ ] Dodaj import `Recommendation` z `sleeper-machine`
- [ ] Usuń import `useSleepRecommendation`, `formatTime` (jeśli pozostaje to zostaw)
- [ ] Usuń wywołanie hooka (linie 32-37)
- [ ] Uprość gałąź guard: `if (!recommendation) return null` (bez `isLoading`, bez `error`)
- [ ] Pozostała JSX bez zmian (header, nextSleepAt block, remainingNapsToday, warnings)
- [ ] Usuń import `TimeOfDay` jeśli już nieużywany w sygnaturze

## Faza 3: ActiveChildSection — hook lifting

- [ ] Otwórz `packages/sleeper-app/src/app/(app)/index.tsx`
- [ ] Dodaj import `useSleepRecommendation` z `@/features/recommendation/useSleepRecommendation`
- [ ] Dodaj wywołanie `const { recommendation } = useSleepRecommendation(childId, child.birth_date, now)` w `ActiveChildSection` po session queries
- [ ] Zaktualizuj render `<ActiveWindowCard>` — dodaj propy `recommendation={recommendation}` i `now={now}`
- [ ] Zaktualizuj render `<RecommendationCard>` — usuń `childId`, `birthDateIso`, `now`, podaj `recommendation={recommendation}`
- [ ] Zweryfikuj że nie ma duplikacji wywołań `useSleepRecommendation` w tym pliku

## Faza 4: Walidacja

- [ ] Weryfikacja: w `packages/sleeper-app/` uruchom `npx tsc --noEmit` — 0 błędów
- [ ] Weryfikacja: w `packages/sleeper-app/` uruchom `npm run lint` — 0 błędów
- [ ] Weryfikacja: `git diff` pokazuje tylko 3 zmodyfikowane pliki + pre-existing reorder
- [ ] Test: Happy path — dziecko z historią i nocnym snem, badge i karta "Następny sen" pokazują ten sam czas (±1 min)
- [ ] Test: Brak kotwicy — świeże dziecko, badge i ProgressBar ukryte, footer tylko "Pobudka o HH:MM"
- [ ] Test: Overdue — ręcznie ustawić `lastSleepEndAt` 5h temu, badge "Przekroczono okno o ~Xm", ProgressBar 100%
- [ ] Test: Brak historii (`lastSleepEndAt === null`) — karta pokazuje "Nowy dzień" bez zmian
- [ ] Test: Tick co 30s — 1 min na ekranie, badge i ProgressBar płynnie się aktualizują (parent useNow)
- [ ] Test: Spójność — `now + remainingMs ≈ recommendation.nextSleepAt` z `RecommendationCard` (różnica <1 min)

## Faza 5: Commit i log

- [ ] Commit zmian kodu z opisem (`feat(recommendation): ActiveWindowCard uses sleeper-machine`)
- [ ] Odczytaj short hash: `git rev-parse --short HEAD`
- [ ] Utwórz `docs/commits/2026-05-28-<hash>-active-window-card-uses-machine.md` zgodnie z formatem z CLAUDE.md
- [ ] Osobny commit: `docs(commits): log <hash>`
