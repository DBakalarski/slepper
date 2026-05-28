# Kontekst: ActiveWindowCard zasilany rekomendacją z sleeper-machine

**Branch:** `feature/active-window-machine`
**Ostatnia aktualizacja:** 2026-05-28

## Źródła

- Requirements doc: brak
- Plan techniczny: `window-machine.md` (root repo)

## Powiązane pliki

### Modyfikowane

- `packages/sleeper-app/src/components/ActiveWindowCard.tsx` — nowa sygnatura propsów, usunięcie hardcode + lokalnego ticka, nowa logika footera (badge "Drzemka za" / "Przekroczono okno o").
- `packages/sleeper-app/src/features/recommendation/RecommendationCard.tsx` — konwersja na komponent prezentacyjny, usunięcie wywołania hooka.
- `packages/sleeper-app/src/app/(app)/index.tsx` — hook lifting (jedno wywołanie `useSleepRecommendation` w `ActiveChildSection`), propy do obu kart.

### Czytane (reuse, bez zmian)

- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts:31` — hook publiczny, wywoływany raz w parencie.
- `packages/sleeper-app/src/lib/time.ts` — `formatDuration`, `formatTime` (polska deklinacja).
- `packages/sleeper-app/src/lib/useNow.ts` — tick co 30s w `ActiveChildSection`.
- `packages/sleeper-app/src/components/ui/Badge.tsx` — pill, variant `orange`.
- `packages/sleeper-app/src/components/ui/ProgressBar.tsx` — tint `bg-orange`, track `bg-white/70`.
- `packages/sleeper-machine/src/types.ts:48` — typ `Recommendation`.
- `packages/sleeper-machine/src/recommender.ts:169` — `nextSleepAt` nie clampowane do `now` (overdue legalne).

## Decyzje techniczne

1. **Hook lifting** zamiast dwóch wywołań — single source of truth, eliminuje ryzyko rozjazdu dwóch kart.
2. **Fallback `recommendation === null`** — ukryć badge i ProgressBar (nie fallback na 105 min). Spójne z `RecommendationCard:69-72`, które przy braku kotwicy nie pokazuje fikcyjnych liczb.
3. **Overdue (`nextSleepAt <= now`)** — badge `"Przekroczono okno o ~${formatDuration(-remainingMs)}"`, ProgressBar 100%. Bardziej informatywne niż neutralne "Można próbować drzemki".
4. **`now` propem zamiast lokalnego ticka** — parent (`ActiveChildSection`) rządzi tickiem przez `useNow(30000)`, wszystkie dzieci dostają ten sam `Date`. Usuwa duplikację `setInterval`.
5. **`useSleepRecommendation` zostaje publiczny** — nie usuwamy, może się przydać w innym widoku.

## Zależności

- **`sleeper-machine`** (workspace package) — typy + algorytm. Bez zmian.
- **`@tanstack/react-query`** — cache `useSessions` (klucz oparty o ISO daty `now-14d..now`). Cache hit gwarantowany w obrębie jednego renderu, bo hook wywoływany raz.

## Designerski kontekst

Pomijam — feature dotyczy logiki danych w istniejących kartach. Layout i style bez zmian (taki sam JSX kontener, te same Tailwind classes, ten sam Badge/ProgressBar). Brak `design_md`, `figma_spec`, `figma_screens` w planie technicznym.

## Konwencje projektu (z CLAUDE.md / coding-rules)

- Strict TS, zero `any`, zero non-null `!`.
- `useSleepRecommendation` zwraca już immutable `Recommendation` — props `readonly`.
- Komentarze tylko gdy WHY non-obvious (np. dlaczego hook lifting).
- Po zakończeniu: `npx tsc --noEmit && npm run lint` w `sleeper-app/` przed deklaracją "gotowe".
- Commit log obowiązkowy: `docs/commits/YYYY-MM-DD-<hash>-<slug>.md` po każdym commitcie kodu.

## Niezacommitowany pre-existing diff

Branch utworzony z modyfikacją `packages/sleeper-app/src/app/(app)/index.tsx` — reorder kart (TodayStatsCard + RecommendationCard przeniesione poniżej listy "Sesje dzisiaj"). Tematycznie zbieżne z tą zmianą, więc carry-forward na branchu jest OK. Do osobnego commita podczas implementacji.
