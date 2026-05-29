# Zadania: fixy-i-kotki-dwa-algorytm

**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Ostatnia aktualizacja:** 2026-05-29

Kolejność wykonania zgodnie z planem (sekcja "Kolejność wykonania"): **2 → 1 → 3 → 4 → 5 → 6**.
Każdy commit kodu = follow-up commit `docs/commits/YYYY-MM-DD-<hash>-<slug>.md` (OBOWIĄZKOWE per CLAUDE.md).

---

## Faza 2: Progress bar flicker — stabilizacja queryKey (S)

> Plan: sekcja "Faza 2: Progress bar flicker — stabilizacja queryKey".
> Cel: ProgressBar w ActiveWindowCard nie skacze co 30s, brak refetch loop.

### Implementacja

- [ ] `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — `dayKey = useMemo(() => dayKeyInAppTz(now), [])` (raz na mount); `rangeStart`/`rangeEnd` derived z `dayKey`; `useFocusEffect` invalidate `['sessions']` przy zmianie `dayKeyInAppTz(new Date())`.
- [ ] `packages/sleeper-app/src/features/sessions/hooks.ts` — queryKey używa `dayKeyInAppTz(rangeStart)` + `dayKeyInAppTz(rangeEnd)` zamiast `.toISOString()`. `.toISOString()` zostaje wewnątrz `queryFn` jako filtr Supabase.
- [ ] `packages/sleeper-app/src/components/ActiveWindowCard.tsx` — wrapper kontener progress baru z `minHeight ≥ 8` (h-2). Progress widoczny tylko gdy `progressValue !== null`, ale wrapper trzyma wysokość zawsze.

### Weryfikacja:

- [ ] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [ ] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — ekran "Dzisiaj" przez 5 minut → progress bar stabilny, brak skoków layoutu.
- [ ] Weryfikacja: DevTools Network → brak refetch `sessions` co 30s w spoczynku.
- [ ] Weryfikacja: (opcjonalnie) Cross-midnight test — zmień TZ urządzenia na ~23:55, poczekaj na 00:00 → query invaliduje się raz.

---

## Faza 1: Cross-day editing — BackdatedSessionModal (S)

> Plan: sekcja "Faza 1: Cross-day editing — BackdatedSessionModal".
> Cel: Sesja nocna 22:00→06:30 zapisuje się jako start=N 22:00, end=N+1 06:30.

### Implementacja

- [ ] `packages/sleeper-app/src/lib/time.ts` — helper `parseTimeMinutes(hhmm: string): number` (lokalny w modal lub w lib) i ewentualnie `addDaysInAppTz(dayKey: string, n: number): string` (przez `date-fns/addDays` na `toZonedTime`/`fromZonedTime`, TZ-safe).
- [ ] `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — w `handleSubmit`: dla `type==='night_sleep'`, jeśli `parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)`, end liczony jako `addDays(date, 1)`.
- [ ] BackdatedSessionModal — domyślne wartości przy switchu chipa na `night_sleep`: `startTime='19:30'`, `endTime='06:30'`.
- [ ] BackdatedSessionModal — hint widoczny tylko gdy `type==='night_sleep'`: "Jeśli koniec ≤ start, zapis na następny dzień (np. 22:00 → 06:30)".

### Weryfikacja:

- [ ] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [ ] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — "Dodaj sesje wstecz" → Sen nocny → data dziś, 22:00 → 06:30 → zapisz → sesja widoczna od dziś 22:00 do jutro 06:30.
- [ ] Weryfikacja: Manual — same-day drzemka 09:00 → 10:30 nadal działa bez zmian.

---

## Faza 3: Algorytm Kotki Dwa — migracja + gitignore (S)

> Plan: sekcja "Faza 3: Algorytm Kotki Dwa — migracja + gitignore".
> Cel: Schema gotowy na pole wyboru algorytmu; PDF poza repo.

### Implementacja

- [ ] `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` (NOWY) — `alter table public.children add column algorithm text not null default 'galland' check (algorithm in ('galland', 'kotki_dwa'));`
- [ ] `packages/sleeper-app/src/lib/database.types.ts` — regen (lub manual update) po migracji.
- [ ] `.gitignore` (root) — dodać sekcję:
  ```
  # Materialy referencyjne — copyright (Marta Stam / Kotki Dwa)
  data-book/
  ```

### Weryfikacja:

- [ ] Weryfikacja: `git status` po commit nie pokazuje `data-book/przewodnik_sen.pdf`.
- [ ] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów (po regen typów).
- [ ] Weryfikacja: Supabase local up → migracja przechodzi bez błędów.

---

## Faza 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki (L)

> Plan: sekcja "Faza 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki".
> Cel: Czysta biblioteka `recommendKotkiDwa(state, profile): Recommendation` z lookup table + forward pass, testowana vitest.

### Implementacja

- [ ] `packages/sleeper-machine-kotki/package.json` (NOWY) — `name: sleeper-machine-kotki`, `dep: sleeper-machine: workspace:*`, devDeps (`typescript ^5.9`, `vitest ^2.0`, `@types/node ^22.0`).
- [ ] `packages/sleeper-machine-kotki/tsconfig.json` (NOWY) — `extends ../sleeper-machine/tsconfig.json`.
- [ ] `packages/sleeper-machine-kotki/vitest.config.ts` (NOWY).
- [ ] `packages/sleeper-machine-kotki/README.md` (NOWY) — filozofia: opinionated guidebook (Kotki Dwa).
- [ ] `packages/sleeper-machine-kotki/CLAUDE.md` (NOWY) — zasady packagu (lookup-based; nie wprowadzać EWMA tutaj).
- [ ] `packages/sleeper-machine-kotki/src/index.ts` — export `recommendKotkiDwa` + re-eksport typów z `sleeper-machine`.
- [ ] `packages/sleeper-machine-kotki/src/lookup.ts` — typ + tabela buckets (5m, 6m-3naps, 6m-2naps, 7m, 8m, 9m, 10m, 11m, 12m-2naps, 12m-1nap, 18m+); każdy bucket: `minMonths`, `maxMonths`, `typicalNaps`, `wakeWindowsHours[]` (długość = naps + 1), `maxNapHours`, `maxTotalDayNapHours`, `nightHoursRange`. `pickBucket(ageMonths, preferredNaps)` — z uwzględnieniem override.
- [ ] `packages/sleeper-machine-kotki/src/forwardPass.ts` — funkcja czysta: `(morningWake: Date, bucket: AgeBucket, napLengthHours: number) → PlanEntry[]`.
- [ ] `packages/sleeper-machine-kotki/src/recommender.ts` — orchestrator: walidacja inputu, `wakeTime = profile.targetWakeTime ?? {hour:7,minute:0}`, `ageMonths = floor((now - dob) / (30.4 * MS_PER_DAY))`, `bucket = pickBucket(...)`, `morningWake` TZ-safe, override `preferredBedtime`, `currentWakeWindowDuration`, `nextSleepAt`, `confidence='high'`, warnings przy `elapsedMin > 1.2 * WW`.
- [ ] `packages/sleeper-machine-kotki/tests/lookup.test.ts` (NOWY).
- [ ] `packages/sleeper-machine-kotki/tests/forwardPass.test.ts` (NOWY).
- [ ] `packages/sleeper-machine-kotki/tests/recommender.test.ts` (NOWY).

### Test:

- [ ] Test: 5m, 3 drzemki, wake 07:00, brak historii → harmonogram zbliżony do PDF s.13 (08:45 / 12:30 / 16:15 / 19:00).
- [ ] Test: 9m, 2 drzemki, wake 07:00 → zbliżony do PDF s.18 (10:00 / 14:30 / 19:30).
- [ ] Test: 6m, `preferredNapsCount=2` vs `3` → różne buckets, różne harmonogramy.
- [ ] Test: `preferredBedtime={hour:18,minute:30}` → ostatni NIGHT entry o 18:30.
- [ ] Test: `targetWakeTime={hour:06,minute:30}` → cały dzień przesunięty o 30min wcześniej.
- [ ] Test: `currentWakeWindowDuration` po 0 / 1 / 2 drzemkach w historii dnia.
- [ ] Test: walidacja inputu — invalid `targetWakeTime` → throw.
- [ ] Test: smoke check — import `recommendKotkiDwa` z innego packagu działa (TS rozumie typy).

### Weryfikacja:

- [ ] Weryfikacja: `pnpm install` w roocie — workspace zarejestrowany.
- [ ] Weryfikacja: `pnpm --filter sleeper-machine-kotki test` — wszystkie testy zielone (>= 8 testów per moduł).
- [ ] Weryfikacja: `pnpm --filter sleeper-machine-kotki build` — `dist/index.js` + `dist/index.d.ts` wyemitowane.

---

## Faza 5: Integracja z sleeper-app — adapter + toggle UI (M)

> Plan: sekcja "Faza 5: Integracja z sleeper-app — adapter + toggle UI".
> Cel: App używa wybranego algorytmu per dziecko; toggle w EditChildForm.

### Implementacja

- [ ] `packages/sleeper-app/package.json` — dodać `"sleeper-machine-kotki": "workspace:*"`.
- [ ] `packages/sleeper-app/src/features/children/hooks.ts` — rozszerzyć `Child` i `UpdateChildInput` o `algorithm: 'galland' | 'kotki_dwa'`; update `rowToChild`, `CHILD_SELECT` (dodać `algorithm`), `patch` w `useUpdateChild`.
- [ ] `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` — nowa sekcja "Algorytm rekomendacji" po "Kolor", przed "Preferowana liczba drzemek": 2 chipy (Naukowy (Galland) / Kotki Dwa) + opis ("Naukowy: okna pochodne z norm Galland 2012 + adaptacja z historii. Kotki Dwa: stałe okna z lookup table per wiek, pobudka 07:00 (lub preferowana).") + state `algorithm` + przekazanie do `updateChild.mutate`.
- [ ] `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — import `recommendGalland` z `sleeper-machine` i `recommendKotkiDwa` z `sleeper-machine-kotki`; `ChildForRecommendation` rozszerzony o `algorithm`; wybór funkcji: `const fn = child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland`.
- [ ] `packages/sleeper-app/src/app/(app)/index.tsx` (+ inne consumery przez `grep useSleepRecommendation`) — przekazanie `child.algorithm`.

### Weryfikacja:

- [ ] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [ ] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — EditChildForm dla 9m dziecka → switch na Kotki Dwa → zapisz → wróć do "Dzisiaj" → `currentWakeWindowDuration` zmienia się (Galland = adapted ~3h±, Kotki Dwa = 3h fixed).
- [ ] Weryfikacja: Manual — switch z powrotem na Galland → wartości wracają.
- [ ] Weryfikacja: Manual — toggle persist w bazie (refresh app, wartość zostaje).

---

## Faza 6: Konfigi root + dokumentacja (S)

> Plan: sekcja "Faza 6: Konfigi root + dokumentacja".
> Cel: Monorepo świadomy nowego packagu, CLAUDE.md aktualny.

### Implementacja

- [ ] `CLAUDE.md` (root) — sekcja "Layout repozytorium": dodać `packages/sleeper-machine-kotki/` z krótkim opisem.
- [ ] `CLAUDE.md` (root) — sekcja "Stack": wzmianka o dwóch algorytmach, wybór per dziecko.
- [ ] `package.json` (root) — proxy scripty (opcjonalne): `"machine-kotki:test"`, `"machine-kotki:build"`.
- [ ] `pnpm-workspace.yaml` — sprawdzić, że `packages/*` obejmuje nowy katalog (najprawdopodobniej już tak).

### Weryfikacja:

- [ ] Weryfikacja: `pnpm --filter sleeper-machine-kotki test` działa z roota.
- [ ] Weryfikacja: `git status` po commit — wszystkie pliki śledzone, `data-book/` zignorowany.

---

## Walidacja całościowa (przed merge)

- [ ] `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [ ] `pnpm --filter sleeper-app lint` — PASS.
- [ ] `pnpm --filter sleeper-machine test` — PASS (Galland niezmieniony, regression check).
- [ ] `pnpm --filter sleeper-machine build` — PASS.
- [ ] `pnpm --filter sleeper-machine-kotki test` — PASS.
- [ ] `pnpm --filter sleeper-machine-kotki build` — PASS.
- [ ] Manual Expo Go smoke:
  - [ ] Edycja sesji nocnej cross-day (BackdatedSessionModal) działa.
  - [ ] ProgressBar na "Dzisiaj" stabilny przez 5 minut.
  - [ ] Toggle algorytmu w EditChildForm zmienia rekomendacje na żywo.
- [ ] `git status` — `data-book/` zignorowany.
- [ ] `docs/commits/` — entry per commit kodu.

## Źródła

- Requirements doc: brak (zgłoszenie usera bezpośrednio w sesji)
- Plan techniczny: brak w `docs/plans/`; oryginał z plan mode: `~/.claude/plans/1-w-edycji-frolicking-cupcake.md`
- Plan zadania: `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-plan.md`
- Kontekst: `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-kontekst.md`
