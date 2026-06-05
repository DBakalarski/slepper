# Plan: cross-day edit + progress bar fix + algorytm Kotki Dwa

**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Ostatnia aktualizacja:** 2026-05-29

## Źródła

- Requirements doc: brak (zgłoszenie usera bezpośrednio w sesji)
- Plan techniczny: brak w `docs/plans/`; oryginał z plan mode: `~/.claude/plans/1-w-edycji-frolicking-cupcake.md`
- PDF źródłowy algorytmu Kotki Dwa: `data-book/przewodnik_sen.pdf` (do gitignore w Fazie 3)
- Precedens refetch loop: `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`
- Anti-pattern lookup table WW: `packages/sleeper-machine/CLAUDE.md` (sekcja "Anti-patterns")

## Podsumowanie wykonawcze

Trzy niezależne zmiany zgłoszone przez usera w jednej iteracji:

1. **Cross-day editing sesji nocnej** — `BackdatedSessionModal` używa jednej daty dla start i end → sesja 22:00→06:30 fail-uje walidacją "end <= start". Fix: dla `type='night_sleep'` automatycznie przesuwać end na N+1 jeśli `endTime <= startTime`.
2. **Progress bar flicker** — co ~30s `useNow` tick → `rangeStart` w `useSleepRecommendation` → niestabilny `queryKey` w `useSessions` (`toISOString()` per render) → refetch → `recommendation === null` chwilowo → ProgressBar conditional unmount → layout shift. Fix: stabilizacja queryKey na `dayKey` + `minHeight` fallback.
3. **Drugi algorytm rekomendacji (Kotki Dwa)** — implementacja metodologii z PDF jako alternatywa dla Galland. Per-child toggle w `EditChildForm`. Filozofie konfliktują (Galland = science-based pochodne WW, Kotki Dwa = lookup table per wiek), więc nowy algorytm idzie do osobnego sibling package `packages/sleeper-machine-kotki/`, sleeper-machine pozostaje czysto naukowy.

## Decyzje architektoniczne (potwierdzone z userem)

- **Zakres algorytmu Kotki Dwa**: tylko krok 3 PDF (harmonogram dnia: lookup WW + forward pass z fixed pobudką). Karmienia, rytuały, NSZ — pominięte.
- **Preferencje dziecka**: `preferred_naps_per_day` i `preferred_bedtime` honorowane przez OBA algorytmy (wspólne pola w `children`).
- **Lokalizacja kodu**: nowy package `packages/sleeper-machine-kotki/`. Wspólne typy (`State`, `ChildProfile`, `Recommendation`, `TimeOfDay`) re-eksportowane z `sleeper-machine` (workspace dep).
- **Wybór algorytmu**: nowe pole `children.algorithm` (`'galland'` | `'kotki_dwa'`, default `'galland'`).
- **PDF copyright**: `data-book/` dodane do `.gitignore`. Implementacja dla prywatnego użytku.

## Analiza obecnego stanu

### Zadanie 1: cross-day

**Plik:** `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx`
- Linie 65-66: `parseAppTzInput(date, startTime)` i `parseAppTzInput(date, endTime)` używają tej samej `date`.
- Linia 71: walidacja `if (end <= start) → error 'Koniec musi byc po starcie'`.
- Linie 113-145: jedno pole `Data` + dwa pola `Start (HH:MM)` / `Koniec (HH:MM)`.
- Defaulty (linie 44-45): `'09:00'` / `'10:30'`.

**Plik:** `packages/sleeper-app/src/features/sessions/components/SessionEditForm.tsx` (referencja, **nie wymaga zmian**)
- Linie 88-134: dla zakończonej sesji ma 4 osobne pickery (Data startu, Godz. start, Godz. koniec, Data konca) — cross-day już działa.

### Zadanie 2: refetch loop

**Plik:** `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`
- Linia 39: `rangeStart = useMemo(() => new Date(now.getTime() - 14 * MS_PER_DAY), [now])` — zależy od `now`, który tickuje co 30s.
- Linia 40: przekazuje świeży `rangeStart` i `now` do `useSessions`.

**Plik:** `packages/sleeper-app/src/features/sessions/hooks.ts`
- Linia 69: `queryKey: [..., rangeStart.toISOString(), rangeEnd.toISOString()]` — `toISOString()` na świeżych `Date` daje nowy string co render.

**Plik:** `packages/sleeper-app/src/components/ActiveWindowCard.tsx`
- Linie 67-75: `{progressValue !== null ? <View><ProgressBar/></View> : null}` — bez fallbacku → unmount = layout shift ~24px.

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`
- Linia 142 (lub w okolicy): `useNow(30000)` — źródło ticku, sam w sobie OK (per learned-patterns), problem jest niżej w queryKey.

### Zadanie 3: drugi algorytm

**Schema obecny** (`packages/sleeper-app/supabase/migrations/0010_child_preferences.sql`):
- `children.preferred_naps_per_day INT`, `children.preferred_bedtime TIME` (oba nullable). **Brak** pola wyboru algorytmu.

**Public API sleeper-machine** (`packages/sleeper-machine/src/index.ts`):
- `recommend(state, profile): Recommendation`
- Typy: `State`, `ChildProfile`, `Recommendation`, `TimeOfDay`, `SleepType`, `SleepSession`, `PlanEntry`, `Confidence`, `Minutes`, `Hours`, `AgeMonths`.

**Konflikt z sleeper-machine/CLAUDE.md**:
> "Nie wprowadzaj 'wake windows by age' jako tabeli referencyjnej — to nie pojęcie naukowe. Wake windows są wielkością pochodną z totalSleep, longestSleep, napsToday. Każda PR dodająca taką tabelę powinna zostać odrzucona z linkiem do Dr Canapari & Flynn-Evans."

Decyzja: algorytm Kotki Dwa = osobny package, sleeper-machine pozostaje "scientific".

**Consumer** (`packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`, linie 34-53):
- Hook woła `recommend()` bezpośrednio. Musi wybierać `recommend` vs `recommendKotkiDwa` na podstawie `child.algorithm`.

**Form** (`packages/sleeper-app/src/features/children/components/EditChildForm.tsx`):
- Sekcje: Imie / Data ur. / Kolor / Preferowana liczba drzemek / Preferowana godzina nocnego snu. Brak sekcji "Algorytm".

## Proponowany stan docelowy

1. **BackdatedSessionModal** dla `type='night_sleep'` automatycznie wykrywa cross-day: jeśli `endTime <= startTime`, traktuj end jako N+1. Hint UI: "Jeśli koniec ≤ start, zostanie zapisany na następny dzień".
2. **useSleepRecommendation + useSessions** stabilizują queryKey na `dayKeyInAppTz` (per dzień), nie na świeżym `toISOString()`. `useFocusEffect` invalidate na zmianę dnia (cross-midnight).
3. **ActiveWindowCard** wrapper kontener progress baru z `minHeight` żeby brak danych nie powodował layout shift.
4. **`children.algorithm`** = nowe pole (`'galland'` | `'kotki_dwa'`, default `'galland'`). Migracja `0011`.
5. **`packages/sleeper-machine-kotki/`** = nowy package z `recommendKotkiDwa`. Wspólny kontrakt z sleeper-machine (re-eksport typów). Pełna paritet testów vitest.
6. **EditChildForm** dodaje sekcję "Algorytm" (2 chipy: Naukowy / Kotki Dwa).
7. **`data-book/`** → `.gitignore`.

## Fazy wdrożenia

### Faza 1: Cross-day editing — BackdatedSessionModal (S)

**Cel:** Sesja nocna 22:00→06:30 zapisuje się jako start=N 22:00, end=N+1 06:30.

**Pliki:**
- `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx`
- `packages/sleeper-app/src/lib/time.ts` (opcjonalnie nowy helper)

**Kryteria akceptacji:**
- `parseTimeMinutes(hhmm: string): number` helper (lokalny w modal lub w `lib/time.ts`).
- W `handleSubmit`: dla `type==='night_sleep'`, jeśli `parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)`, end liczony jako `addDays(date, 1)`.
- Helper `addDaysInAppTz(dayKey: string, n: number): string` w `lib/time.ts` jeśli nie istnieje — implementacja przez `date-fns/addDays` na `toZonedTime`/`fromZonedTime` (TZ-safe, zgodnie z `learned-patterns.md`).
- Domyślne wartości przy switchu chipa na `night_sleep`: `startTime='19:30'`, `endTime='06:30'`.
- Pod polami czasu hint widoczny tylko gdy `type==='night_sleep'`: "Jeśli koniec ≤ start, zapis na następny dzień (np. 22:00 → 06:30)".
- Same-day drzemka 09:00 → 10:30 nadal działa bez zmian.

**Walidacja:**
- Manual w Expo Go: "Dodaj sesje wstecz" → Sen nocny → data dziś, 22:00 → 06:30 → zapisz → sesja widoczna od dziś 22:00 do jutro 06:30.
- Same-day drzemka nadal działa.
- `pnpm --filter sleeper-app exec tsc --noEmit` 0 błędów.
- `pnpm --filter sleeper-app lint` PASS.

### Faza 2: Progress bar flicker — stabilizacja queryKey (S)

**Cel:** ProgressBar w ActiveWindowCard nie skacze co 30s, brak refetch loop.

**Pliki:**
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`
- `packages/sleeper-app/src/features/sessions/hooks.ts`
- `packages/sleeper-app/src/components/ActiveWindowCard.tsx`

**Kryteria akceptacji:**
- `useSleepRecommendation`: `dayKey = useMemo(() => dayKeyInAppTz(now), [])` (raz na mount), `rangeStart`/`rangeEnd` derived z `dayKey`. Wartości `Date` do `useSessions` rekonstruowane stabilnie.
- `useFocusEffect` na ekranie głównym (lub w hooku) → na zmianę `dayKeyInAppTz(new Date())` invalidate `['sessions']` (cross-midnight refresh).
- `useSessions`: queryKey używa `dayKeyInAppTz(rangeStart)` + `dayKeyInAppTz(rangeEnd)` zamiast `toISOString()`. Wewnątrz `queryFn` `.toISOString()` zostaje (filtr Supabase).
- `ActiveWindowCard`: wrapper kontener progress baru z `minHeight` ≥ 8 (h-2). Progress widoczny tylko gdy `progressValue !== null`, ale wrapper trzyma wysokość zawsze.

**Walidacja:**
- Manual w Expo Go: ekran "Dzisiaj" → 5 minut obserwacji → progress bar stabilny, brak skoków layoutu.
- DevTools Network: brak refetch `sessions` co 30s w spoczynku.
- Cross-midnight test (opcjonalnie): zmień TZ urządzenia na ~23:55 → poczekaj na 00:00 → query invaliduje się raz.
- `tsc`, `lint` PASS.

### Faza 3: Algorytm Kotki Dwa — migracja + gitignore (S)

**Cel:** Schema gotowy na pole wyboru algorytmu; PDF poza repo.

**Pliki:**
- `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` (NOWY)
- `packages/sleeper-app/src/lib/database.types.ts` (regen)
- `.gitignore` (root)

**Kryteria akceptacji:**
- Migracja:
  ```sql
  alter table public.children
    add column algorithm text not null default 'galland'
    check (algorithm in ('galland', 'kotki_dwa'));
  ```
- `database.types.ts` zaktualizowane (regen lub manual).
- `.gitignore` zawiera linię:
  ```
  # Materialy referencyjne — copyright (Marta Stam / Kotki Dwa)
  data-book/
  ```
- `git status` po commit nie pokazuje `data-book/przewodnik_sen.pdf`.

**Walidacja:**
- `pnpm --filter sleeper-app exec tsc --noEmit` 0 błędów (po regen typów).
- Supabase local up: migracja przechodzi bez błędów.

### Faza 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki (L)

**Cel:** Czysta biblioteka `recommendKotkiDwa(state, profile): Recommendation` z lookup table + forward pass, testowana vitest.

**Struktura:**
```
packages/sleeper-machine-kotki/
├── package.json          # name: sleeper-machine-kotki, dep: sleeper-machine (workspace:*)
├── tsconfig.json         # extends ../sleeper-machine/tsconfig.json
├── vitest.config.ts
├── README.md             # filozofia: opinionated guidebook (Kotki Dwa)
├── CLAUDE.md             # zasady tego packagu (lookup-based, nie wprowadzaj EWMA tutaj)
├── src/
│   ├── index.ts          # export recommendKotkiDwa + re-eksport typów
│   ├── lookup.ts         # tabela buckets + pickBucket()
│   ├── forwardPass.ts    # forward pass z fixed wake time
│   └── recommender.ts    # orchestrator
└── tests/
    ├── lookup.test.ts
    ├── forwardPass.test.ts
    └── recommender.test.ts
```

**Kryteria akceptacji:**

`src/index.ts`:
```ts
export { recommendKotkiDwa } from './recommender.js';
export type {
  Minutes, Hours, AgeMonths, TimeOfDay, SleepType, SleepSession,
  ChildProfile, State, Confidence, PlanEntry, Recommendation,
} from 'sleeper-machine';
```

`src/lookup.ts` — typ + tabela buckets (5m, 6m-3naps, 6m-2naps, 7m, 8m, 9m, 10m, 11m, 12m-2naps, 12m-1nap, 18m+). Każdy bucket: `minMonths`, `maxMonths`, `typicalNaps`, `wakeWindowsHours[]` (długość = naps + 1), `maxNapHours`, `maxTotalDayNapHours`, `nightHoursRange`. `pickBucket(ageMonths, preferredNaps)` zwraca bucket z uwzględnieniem override.

`src/forwardPass.ts` — funkcja czysta:
- input: `morningWake: Date`, `bucket: AgeBucket`, `napLengthHours: number` (np. średnia z `maxTotalDayNapHours / typicalNaps`)
- output: `plan: PlanEntry[]`

`src/recommender.ts`:
- Walidacja inputu (jak w sleeper-machine).
- `wakeTime = profile.targetWakeTime ?? { hour: 7, minute: 0 }`.
- `ageMonths = floor((now - dateOfBirth) / (30.4 * MS_PER_DAY))`.
- `bucket = pickBucket(ageMonths, profile.preferredNapsCount ?? null)`.
- `morningWake` = dzisiejsza data + `wakeTime` (TZ-safe, użyj `setHours` w czystym Date).
- `plan = forwardPass(morningWake, bucket, ...)`.
- Override `preferredBedtime` → nadpisuje ostatni NIGHT entry (jak w Galland).
- `currentWakeWindowDuration` = WW dla aktualnej liczby ukończonych drzemek dziś.
- `nextSleepAt` = lastWake + WW (last wake = morningWake lub end ostatniej drzemki dziś).
- `confidence = 'high'` (deterministic, brak shrinkage).
- Warnings: `elapsedMin > 1.2 * currentWakeWindowDuration` → "ryzyko przemęczenia".

**Testy paired (`tests/recommender.test.ts`)** — kluczowe scenariusze:
- 5m, 3 drzemki, wake 07:00, brak historii → harmonogram zbliżony do PDF s.13 (08:45 / 12:30 / 16:15 / 19:00).
- 9m, 2 drzemki, wake 07:00 → zbliżony do PDF s.18 (10:00 / 14:30 / 19:30).
- 6m, preferredNapsCount=2 vs 3 → różne buckets, różne harmonogramy.
- `preferredBedtime={hour:18,minute:30}` → ostatni NIGHT entry o 18:30.
- `targetWakeTime={hour:06,minute:30}` → cały dzień przesunięty o 30min wcześniej.
- `currentWakeWindowDuration` po 0 / 1 / 2 drzemkach w historii dnia.
- Walidacja inputu: invalid `targetWakeTime` → throw.

**`package.json`:**
```json
{
  "name": "sleeper-machine-kotki",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "sleeper-machine": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**Walidacja:**
- `pnpm install` w roocie — workspace zarejestrowany.
- `pnpm --filter sleeper-machine-kotki test` — wszystkie testy zielone (>= 8 testów per moduł).
- `pnpm --filter sleeper-machine-kotki build` — `dist/index.js` + `dist/index.d.ts` wyemitowane.
- Smoke check: import `recommendKotkiDwa` z innego packagu działa (TS rozumie typy).

### Faza 5: Integracja z sleeper-app — adapter + toggle UI (M)

**Cel:** App używa wybranego algorytmu per dziecko; toggle w EditChildForm.

**Pliki:**
- `packages/sleeper-app/package.json` — dodać `"sleeper-machine-kotki": "workspace:*"`.
- `packages/sleeper-app/src/features/children/hooks.ts` — rozszerzyć `Child`, `UpdateChildInput`.
- `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` — sekcja toggle.
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — wybór funkcji.
- `packages/sleeper-app/src/app/(app)/index.tsx` (i inne consumery) — przekazanie `child.algorithm`.

**Kryteria akceptacji:**

`hooks.ts` (children):
```ts
export interface Child {
  // ... istniejące pola
  algorithm: 'galland' | 'kotki_dwa';
}
export interface UpdateChildInput {
  // ... istniejące pola
  algorithm?: 'galland' | 'kotki_dwa';
}
```
Plus update `rowToChild`, `CHILD_SELECT` (dodać `algorithm`), `patch` w `useUpdateChild` (`if (algorithm !== undefined) patch.algorithm = algorithm`).

`EditChildForm.tsx` — nowa sekcja po "Kolor", przed "Preferowana liczba drzemek":
```tsx
<View>
  <Text className="text-xs font-semibold text-purple">Algorytm rekomendacji</Text>
  <View className="mt-2 flex-row gap-2">
    <Chip label="Naukowy (Galland)" selected={algorithm === 'galland'} onPress={() => setAlgorithm('galland')} />
    <Chip label="Kotki Dwa" selected={algorithm === 'kotki_dwa'} onPress={() => setAlgorithm('kotki_dwa')} />
  </View>
  <Text className="mt-1 text-xs text-purple">
    Naukowy: okna pochodne z norm Galland 2012 + adaptacja z historii.
    Kotki Dwa: stałe okna z lookup table per wiek, pobudka 07:00 (lub preferowana).
  </Text>
</View>
```
Plus state `algorithm` + przekazanie do `updateChild.mutate`.

`useSleepRecommendation.ts`:
```ts
import { recommend as recommendGalland } from 'sleeper-machine';
import { recommendKotkiDwa } from 'sleeper-machine-kotki';

export type ChildForRecommendation = {
  readonly id: string;
  readonly birth_date: string;
  readonly preferred_naps_per_day: number | null;
  readonly preferred_bedtime: string | null;
  readonly algorithm: 'galland' | 'kotki_dwa';
};

const recommendation = useMemo(() => {
  // ... istniejące checks
  const fn = child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland;
  return fn(state, profile);
}, [child, now, targetWakeTime, sessionsQuery.data]);
```

Każdy consumer hooka musi przekazać `child.algorithm` — sprawdzić `app/(app)/index.tsx` i inne miejsca przez grep `useSleepRecommendation`.

**Walidacja:**
- `pnpm --filter sleeper-app exec tsc --noEmit` 0 błędów.
- `pnpm --filter sleeper-app lint` PASS.
- Manual w Expo Go:
  - EditChildForm dla 9m dziecka → switch na Kotki Dwa → zapisz → wróć do "Dzisiaj" → `currentWakeWindowDuration` zmienia się (Galland = adapted ~3h±, Kotki Dwa = 3h fixed).
  - Switch z powrotem na Galland → wartości wracają.
  - Toggle persist w bazie (refresh app, wartość zostaje).

### Faza 6: Konfigi root + dokumentacja (S)

**Cel:** Monorepo świadomy nowego packagu, CLAUDE.md aktualny.

**Pliki:**
- `CLAUDE.md` (root) — sekcje "Layout repozytorium" + "Stack" + ewentualnie "Algorytmy".
- `package.json` (root) — proxy scripty (opcjonalne): `"machine-kotki:test"`, `"machine-kotki:build"`.
- `pnpm-workspace.yaml` — sprawdzić że `packages/*` obejmuje nowy katalog (najprawdopodobniej już tak).

**Kryteria akceptacji:**
- CLAUDE.md root sekcja "Layout repozytorium" wymienia `packages/sleeper-machine-kotki/` z krótkim opisem.
- CLAUDE.md root sekcja "Stack" — wzmianka o dwóch algorytmach, wybór per dziecko.
- `pnpm --filter sleeper-machine-kotki test` działa z roota.

**Walidacja:**
- `git status` po commit — wszystkie pliki śledzone, `data-book/` zignorowany.

## Kolejność wykonania

1. **Faza 2** (S, ~45 min) — najszybszy diff, największy wizualny efekt dla usera.
2. **Faza 1** (S, ~30 min) — bug fix BackdatedSessionModal.
3. **Faza 3** (S, ~20 min) — migracja DB + gitignore (przygotowanie pod algorytm).
4. **Faza 4** (L, ~3-4h) — nowy package + testy.
5. **Faza 5** (M, ~1h) — adapter + UI toggle.
6. **Faza 6** (S, ~20 min) — konfigi root + dokumentacja.

Każdy commit kodu = follow-up commit `docs/commits/YYYY-MM-DD-<hash>-<slug>.md` zgodnie z CLAUDE.md (OBOWIĄZKOWE).

## Krytyczne pliki do modyfikacji

| Plik | Faza | Zakres |
|---|---|---|
| `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` | 1 | cross-day logika |
| `packages/sleeper-app/src/lib/time.ts` | 1 | helper `addDaysInAppTz` (opcjonalny) |
| `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` | 2, 5 | dayKey + wybór algorytmu |
| `packages/sleeper-app/src/features/sessions/hooks.ts` | 2 | queryKey stabilizacja |
| `packages/sleeper-app/src/components/ActiveWindowCard.tsx` | 2 | minHeight wrapper |
| `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` | 3 | NOWY |
| `packages/sleeper-app/src/lib/database.types.ts` | 3 | regen |
| `.gitignore` (root) | 3 | `data-book/` |
| `packages/sleeper-machine-kotki/**` | 4 | NOWY package |
| `packages/sleeper-app/package.json` | 5 | dep workspace |
| `packages/sleeper-app/src/features/children/hooks.ts` | 5 | typ Child + UpdateChildInput |
| `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` | 5 | toggle UI |
| `packages/sleeper-app/src/app/(app)/index.tsx` | 5 | przekazanie `child.algorithm` |
| `CLAUDE.md` (root) | 6 | layout + stack update |

## Reuse istniejących utilities

- `combineDateAndTimeInAppTz`, `parseAppTzDateTime`, `todayDateInAppTz`, `dayKeyInAppTz`, `formatDateShort`, `formatTime` (`packages/sleeper-app/src/lib/time.ts`)
- `Chip` komponent (`packages/sleeper-app/src/components/Chip.tsx`)
- Typy `State`, `ChildProfile`, `Recommendation`, `TimeOfDay`, `SleepType`, `Minutes`, `Hours`, `AgeMonths` — re-eksport z `sleeper-machine` (nie duplikować w sleeper-machine-kotki).
- Wzorzec walidacji inputu — analogiczny do `validateInput` w `sleeper-machine/src/recommender.ts`.
- Wzorzec adaptera — analogiczny do `toLibProfile` / `toLibSessions` w `packages/sleeper-app/src/features/recommendation/adapter.ts`.

## Anty-wzorce (czego unikać)

- Lookup table WW per wiek w `packages/sleeper-machine/` — naruszenie CLAUDE.md tego packagu. **MUSI iść do `packages/sleeper-machine-kotki/`**.
- `new Date()` / `Date.now()` / `Math.random()` w `src/` żadnego z packagów algorytmów — łamie determinizm testów.
- Duplikacja typów `Recommendation`, `State`, `ChildProfile` w nowym packagu — re-eksport z `sleeper-machine`.
- Inline `new Date()` w queryKey — wzorzec już udokumentowany w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`.
- Bezpośredni copy treści marketingowych z PDF do UI/kodu (zostawiamy tylko liczby z tabeli WW, bez cytatów).

## Walidacja całościowa (przed merge)

- `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- `pnpm --filter sleeper-app lint` — PASS.
- `pnpm --filter sleeper-machine test` — PASS (Galland niezmieniony, regression check).
- `pnpm --filter sleeper-machine build` — PASS.
- `pnpm --filter sleeper-machine-kotki test` — PASS.
- `pnpm --filter sleeper-machine-kotki build` — PASS.
- Manual Expo Go (smoke):
  - Edycja sesji nocnej cross-day (BackdatedSessionModal) działa.
  - ProgressBar na "Dzisiaj" stabilny przez 5 minut.
  - Toggle algorytmu w EditChildForm zmienia rekomendacje na żywo.
- `git status` — `data-book/` zignorowany.
- `docs/commits/` — entry per commit kodu.
