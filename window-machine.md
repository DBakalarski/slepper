# Plan: ActiveWindowCard zasilany rekomendacją z sleeper-machine

## Context

Pomarańczowa karta `ActiveWindowCard` (home screen) pokazuje badge **"Drzemka za ~Xg Ym"** oraz ProgressBar zapełnienia okna czuwania. Obecnie target okna jest **hardkodowany na 105 min** (`targetWindowMinutes = 105`, `ActiveWindowCard.tsx:23`) — placeholder z Fazy 2, niezależny od wieku dziecka i historii sesji.

Tymczasem niżej na tym samym ekranie `RecommendationCard` (`index.tsx:233`) pokazuje "Następny sen HH:MM" liczony przez `sleeper-machine.recommend()` — age-based + historia 14 dni. Dwa różne źródła prawdy na jednym widoku → potencjalny rozjazd o kilkanaście minut, mylące dla usera.

Cel: podmienić hardkodowane 105 min na `recommendation.currentWakeWindowDuration` i `recommendation.nextSleepAt` z istniejącego hooka `useSleepRecommendation`. Single source of truth, age-correct, spójne z kartą rekomendacji.

## Decyzje (potwierdzone z userem)

1. **Hook lifting** — `useSleepRecommendation` wołany **raz** w `ActiveChildSection`, `recommendation` przekazywane propem do `ActiveWindowCard` i `RecommendationCard`. Eliminuje duplikację, gwarantuje spójność.
2. **Fallback dla `recommendation === null` lub `nextSleepAt === null`** — ukryć badge i ProgressBar (footer pokazuje tylko "Pobudka o HH:MM"). Spójne z `RecommendationCard:69-72`, które przy braku kotwicy mówi "Brak kotwicy — dodaj sesję snu nocnego".
3. **Overdue (`nextSleepAt <= now`)** — badge `"Przekroczono okno o ~Xm"`, ProgressBar 100%. Sygnalizuje że dziecko jest po terminie.

## Zmienione pliki

### 1. `sleeper-app/src/components/ActiveWindowCard.tsx`

**Zmiana sygnatury propsów:**
```ts
interface ActiveWindowCardProps {
  lastSleepEndAt: Date | null;
  recommendation: Recommendation | null;   // z sleeper-machine
  now: Date;                                // przekazane z parent (zamiast lokalnego Date.now)
}
```

Usunąć: `targetWindowMinutes`, lokalny `useState<number>(now)` + `useEffect` z `setInterval` (tick przechodzi do parent przez `useNow` — już tam jest).

**Logika (zastępuje `ActiveWindowCard.tsx:25-35`):**
```ts
const sinceMs = lastSleepEndAt ? Math.max(0, now.getTime() - lastSleepEndAt.getTime()) : null;

const targetMs = recommendation
  ? recommendation.currentWakeWindowDuration * 60_000
  : null;

const remainingMs =
  recommendation?.nextSleepAt
    ? recommendation.nextSleepAt.getTime() - now.getTime()
    : null;

const progressValue =
  sinceMs !== null && targetMs !== null
    ? Math.min(1, sinceMs / targetMs)
    : null;
```

**Render footera (zastępuje `ActiveWindowCard.tsx:71-83`):**
- `progressValue !== null` → render `ProgressBar`, inaczej ukryj.
- `lastSleepEndAt` istnieje → render `"Pobudka o HH:MM"`.
- Badge:
  - `remainingMs === null` (brak rekomendacji) → ukryj badge.
  - `remainingMs > 0` → `"Drzemka za ~${formatDuration(remainingMs)}"`, variant `orange`.
  - `remainingMs <= 0` → `"Przekroczono okno o ~${formatDuration(-remainingMs)}"`, variant `orange`.

Usunąć: stałą `MINUTE_MS` (już niepotrzebna lokalnie), `useState/useEffect` ticka.

### 2. `sleeper-app/src/app/(app)/index.tsx`

W `ActiveChildSection` (`index.tsx:133-246`):

**Dodać wywołanie hooka raz** (między linijką 153 a 155, po deklaracjach session queries):
```ts
const { recommendation } = useSleepRecommendation(
  childId,
  child.birth_date,
  now,
);
```

**Przekazać prop do `ActiveWindowCard`** (`index.tsx:173-175`):
```ts
<ActiveWindowCard
  lastSleepEndAt={lastEnded?.end_at ? new Date(lastEnded.end_at) : null}
  recommendation={recommendation}
  now={now}
/>
```

**Przekazać prop do `RecommendationCard`** (`index.tsx:233-237`) — i odpowiednio zmienić `RecommendationCard` żeby przyjmowała `recommendation` propem zamiast wołać hook (patrz pkt 3).

### 3. `sleeper-app/src/features/recommendation/RecommendationCard.tsx`

Przerobić na **prezentacyjny komponent** — odbiera `recommendation: Recommendation | null` propem, przestaje wołać hook.

**Nowa sygnatura:**
```ts
interface RecommendationCardProps {
  readonly recommendation: Recommendation | null;
}
```

Usunąć z propsów: `childId`, `birthDateIso`, `now`, `targetWakeTime`.
Usunąć: import `useSleepRecommendation`, wywołanie hooka (`RecommendationCard.tsx:32-37`).
Usunąć: gałąź `if (isLoading || !recommendation) return null` zostaje jako `if (!recommendation) return null` (loading state obsługuje parent).
Reszta JSX bez zmian.

## Funkcje/utility do reuse (już istnieją — nie pisać nowych)

- `useSleepRecommendation(childId, birthDateIso, now, targetWakeTime?)` — `src/features/recommendation/useSleepRecommendation.ts:31`
- `formatDuration(ms): string` — `src/lib/time.ts` (już używana w `ActiveWindowCard.tsx:61,78`)
- `formatTime(date): string` — `src/lib/time.ts` (już używana)
- `useNow(tickMs): Date` — `src/lib/useNow.ts` (już używane w `index.tsx:136`)
- Typy: `Recommendation` z `sleeper-machine` (`packages/sleeper-machine/src/types.ts:48`)
- `Badge`, `ProgressBar` — bez zmian (`src/components/ui/`)

## Czego NIE robimy

- Nie tworzymy nowego hooka — `useSleepRecommendation` istnieje i pasuje.
- Nie dotykamy `sleeper-machine` — overdue logika (`nextSleepAt` w przeszłości) obsługiwana w UI, lib zwraca to legalnie (`recommender.ts:169` nie clampuje).
- Nie usuwamy `useSleepRecommendation` — może być przydatny w innych miejscach; zostaje publiczny.
- Nie dodajemy memo wokół `RecommendationCard` po podniesieniu hooka — zbędne, parent i tak rerenderuje co tick.

## Walidacja

W `sleeper-app/`:

```bash
npx tsc --noEmit     # 0 błędów
npm run lint         # 0 błędów
```

Manualnie w Expo Go:

1. **Happy path z historią** — dziecko z ≥3 dniami historii i nocnym snem dziś. ActiveWindowCard pokazuje "Drzemka za ~Xg Ym", ProgressBar zapełnia się; badge i karta "Następny sen" w `RecommendationCard` pokazują **ten sam czas docelowy**.
2. **Brak kotwicy** — świeże dziecko bez nocnego snu w historii. Badge ukryty, ProgressBar ukryty, footer tylko z "Pobudka o HH:MM". `RecommendationCard` poniżej pokazuje "Brak kotwicy...".
3. **Overdue** — ręcznie ustawić `lastSleepEndAt` daleko w przeszłości (np. 5h temu dla niemowlęcia z 1.5h oknem). Badge: "Przekroczono okno o ~3g 30m", ProgressBar 100%.
4. **Brak historii w ogóle** — `lastSleepEndAt === null`. Karta pokazuje "Nowy dzień" (bez zmian wobec dzisiaj).
5. **Tick co 30s** — siedź na ekranie 1 min, sprawdź że badge i ProgressBar płynnie się aktualizują (parent useNow rządzi obydwoma).
6. **Spójność z RecommendationCard** — porównać "Drzemka za ~X" w ActiveWindowCard z "Następny sen HH:MM" w RecommendationCard. `now + remainingMs ≈ nextSleepAt`. Tolerancja: <1 min (różny moment renderu).

Brak testów jednostkowych do dopisania (projekt nie ma setupu Jest w `sleeper-app/`, zgodnie z `CLAUDE.md`).

## Commit log

Po commitcie utworzyć `docs/commits/YYYY-MM-DD-<hash>-active-window-card-uses-machine.md` zgodnie z procedurą z `CLAUDE.md` (obowiązkowe).
