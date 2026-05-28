# 40acf8b: feat(recommendation): ActiveWindowCard uses sleeper-machine

**Data:** 2026-05-28
**Branch:** feature/active-window-machine
**Faza zadania:** active-window-machine (fazy 1-3 + walidacja)

## Co zostalo zrobione

- Podmieniono hardkodowane `targetWindowMinutes = 105` w `ActiveWindowCard` na age-based dane z `sleeper-machine.recommend()`.
- Hook `useSleepRecommendation` podniesiony do `ActiveChildSection` — wywolywany raz, wynik (`recommendation`) przekazywany propem do `ActiveWindowCard` i `RecommendationCard`. Single source of truth, eliminacja ryzyka rozjazdu czasu miedzy dwoma kartami.
- `ActiveWindowCard`: nowa sygnatura `{ lastSleepEndAt, recommendation, now }`. Usuniety lokalny `useState`/`useEffect` z `setInterval` — tick rzadzi parent przez `useNow(30000)`.
- `ActiveWindowCard`: edge cases — gdy `recommendation === null` lub `nextSleepAt === null` -> badge i ProgressBar ukryte. Gdy `nextSleepAt <= now` (overdue) -> badge "Przekroczono okno o ~Xm".
- `RecommendationCard`: konwersja na komponent prezentacyjny. Usuniete wywolanie hooka i propy `childId/birthDateIso/now/targetWakeTime`. Loading delegowany do parenta.
- W commit wciagniety pre-existing reorder TodayStatsCard + RecommendationCard ponizej listy "Sesje dzisiaj" — tematycznie pasowal do tej zmiany.

## Zmienione pliki

- `packages/sleeper-app/src/components/ActiveWindowCard.tsx` — nowa sygnatura, nowa logika, usuniety lokalny tick.
- `packages/sleeper-app/src/features/recommendation/RecommendationCard.tsx` — komponent prezentacyjny, props { recommendation }.
- `packages/sleeper-app/src/app/(app)/index.tsx` — hook lifting w `ActiveChildSection`, propy do obu kart, reorder kart.

## Powod / kontekst

`ActiveWindowCard` mial badge "Drzemka za ~Xg Ym" liczone z hardkodowanych 105 min — placeholder z Fazy 2 MVP, niezalezny od wieku dziecka i historii. Tymczasem na tym samym ekranie `RecommendationCard` pokazywal "Nastepny sen HH:MM" z `sleeper-machine` (age-based + historia 14 dni). Potencjalny rozjazd o kilkanascie minut, mylacy dla usera.

Decyzje (potwierdzone w plan mode):
1. Hook lifting (single source of truth) zamiast dwoch niezaleznych wywolan.
2. Brak fallbacku na 105 min — gdy lib nie ma kotwicy, karta nie pokazuje fikcyjnych liczb. Spojne z `RecommendationCard:69` ("Brak kotwicy — dodaj sesje snu nocnego").
3. Overdue jako informacyjny badge ("Przekroczono okno o ~Xm") zamiast neutralnego "Mozna probowac drzemki" — uzytkownik widzi jak bardzo dziecko jest po terminie.

Plan zadania: `docs/active/active-window-machine/`.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` — 0 bledow)
- test: n/a (brak setupu Jest w sleeper-app, zgodnie z CLAUDE.md)
- lint: PASS (`npm run lint` — 0 bledow)
- runtime: nie zweryfikowano w Expo Go w tej sesji — manual scenariusze (happy path / brak kotwicy / overdue / brak historii / tick / spojnosc z RecommendationCard) wypisane w `docs/active/active-window-machine/active-window-machine-zadania.md` Faza 4.
