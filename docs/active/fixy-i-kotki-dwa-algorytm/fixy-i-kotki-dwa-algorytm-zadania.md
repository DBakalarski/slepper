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

- [x] `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — `dayKey = useMemo(() => dayKeyInAppTz(now), [])` (raz na mount); `rangeStart`/`rangeEnd` derived z `dayKey`; `useFocusEffect` invalidate `['sessions']` przy zmianie `dayKeyInAppTz(new Date())`.
- [x] `packages/sleeper-app/src/features/sessions/hooks.ts` — queryKey używa `dayKeyInAppTz(rangeStart)` + `dayKeyInAppTz(rangeEnd)` zamiast `.toISOString()`. `.toISOString()` zostaje wewnątrz `queryFn` jako filtr Supabase.
- [x] `packages/sleeper-app/src/components/ActiveWindowCard.tsx` — wrapper kontener progress baru z `minHeight ≥ 8` (h-2). Progress widoczny tylko gdy `progressValue !== null`, ale wrapper trzyma wysokość zawsze.

### Weryfikacja:

- [x] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [x] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — ekran "Dzisiaj" przez 5 minut → progress bar stabilny, brak skoków layoutu. — manual test (patrz manual-test-faza-2.md)
- [ ] Weryfikacja: DevTools Network → brak refetch `sessions` co 30s w spoczynku. — manual test (patrz manual-test-faza-2.md)
- [ ] Weryfikacja: (opcjonalnie) Cross-midnight test — zmień TZ urządzenia na ~23:55, poczekaj na 00:00 → query invaliduje się raz. — manual test (patrz manual-test-faza-2.md)

## Do poprawy po review fazy 2

- [ ] 🟡 [nit] **useRealtimeSessions.ts:36** — stale comment opisuje stary format queryKey (`startISO`/`endISO`); po Fazie 2 klucz to `dayKey` YYYY-MM-DD. Zaktualizować komentarz.
- [ ] 🟡 [nit] **index.tsx:145-148** — `startOfDay`/`endOfDay` memoizowane z `[now]` (tick co 30s); semantycznie ok (dayKeyInAppTz stabilizuje queryKey), ale można uprościć analogicznie do `useSleepRecommendation`. Opcjonalne.

---

## Faza 1: Cross-day editing — BackdatedSessionModal (S)

> Plan: sekcja "Faza 1: Cross-day editing — BackdatedSessionModal".
> Cel: Sesja nocna 22:00→06:30 zapisuje się jako start=N 22:00, end=N+1 06:30.

### Implementacja

- [x] `packages/sleeper-app/src/lib/time.ts` — helper `parseTimeMinutes(hhmm: string): number` (lokalny w modal lub w lib) i ewentualnie `addDaysInAppTz(dayKey: string, n: number): string` (przez `date-fns/addDays` na `toZonedTime`/`fromZonedTime`, TZ-safe).
- [x] `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — w `handleSubmit`: dla `type==='night_sleep'`, jeśli `parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)`, end liczony jako `addDays(date, 1)`.
- [x] BackdatedSessionModal — domyślne wartości przy switchu chipa na `night_sleep`: `startTime='19:30'`, `endTime='06:30'`.
- [x] BackdatedSessionModal — hint widoczny tylko gdy `type==='night_sleep'`: "Jeśli koniec ≤ start, zapis na następny dzień (np. 22:00 → 06:30)".

### Weryfikacja:

- [x] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [x] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — "Dodaj sesje wstecz" → Sen nocny → data dziś, 22:00 → 06:30 → zapisz → sesja widoczna od dziś 22:00 do jutro 06:30. — manual test (patrz manual-test-faza-1.md)
- [ ] Weryfikacja: Manual — same-day drzemka 09:00 → 10:30 nadal działa bez zmian. — manual test (patrz manual-test-faza-1.md)

## Do poprawy po review fazy 1

- [x] 🟠 [important] **time.ts:addDaysInAppTz** — brakujący unit test dla nowej publicznej funkcji; dodać do `packages/sleeper-app/src/lib/__tests__/time.test.ts` (happy path: n=1, n=-1; DST boundary; niepoprawny format dayKey)
- [ ] 🟡 [nit] **time.ts:138** — `addDaysInAppTz` bez walidacji wejściowego dayKey; dodać JSDoc z `@param dayKey - musi być YYYY-MM-DD` lub guard na początku funkcji
- [ ] 🟡 [nit] **BackdatedSessionModal.tsx:96** — safety net `if (end <= start)` bez komentarza kontekstu; dodać `// safety net: np. identyczne czasy 00:00 → 00:00`

---

## Faza 3: Algorytm Kotki Dwa — migracja + gitignore (S)

> Plan: sekcja "Faza 3: Algorytm Kotki Dwa — migracja + gitignore".
> Cel: Schema gotowy na pole wyboru algorytmu; PDF poza repo.

### Implementacja

- [x] `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` (NOWY) — `alter table public.children add column algorithm text not null default 'galland' check (algorithm in ('galland', 'kotki_dwa'));`
- [x] `packages/sleeper-app/src/lib/database.types.ts` — regen (lub manual update) po migracji.
- [x] `.gitignore` (root) — dodać sekcję:
  ```
  # Materialy referencyjne — copyright (Marta Stam / Kotki Dwa)
  data-book/
  ```

### Weryfikacja:

- [x] Weryfikacja: `git status` po commit nie pokazuje `data-book/przewodnik_sen.pdf`.
- [x] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów (po regen typów).
- [ ] Weryfikacja: Supabase local up → migracja przechodzi bez błędów. — wymaga operatora (checklist)

## Do poprawy po review fazy 3

- [ ] 🟡 [nit] **0011_children_algorithm.sql:1** — brak komentarza nagłówkowego; poprzednie migracje mają 3-8 linii opisu decyzji (wzorzec z 0010). Dodać `-- Migracja 0011: kolumna wyboru algorytmu per dziecko.` z krótkim uzasadnieniem.
- [ ] 🟡 [nit] **.gitignore:23** — komentarz wymienia nazwisko autorki (`Marta Stam / Kotki Dwa`); rozważyć anonimizację przy ewentualnym upublicznieniu repo.

---

## Faza 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki (L)

> Plan: sekcja "Faza 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki".
> Cel: Czysta biblioteka `recommendKotkiDwa(state, profile): Recommendation` z lookup table + forward pass, testowana vitest.

### Implementacja

- [x] `packages/sleeper-machine-kotki/package.json` (NOWY) — `name: sleeper-machine-kotki`, `dep: sleeper-machine: workspace:*`, devDeps (`typescript ^5.9`, `vitest ^2.0`, `@types/node ^22.0`).
- [x] `packages/sleeper-machine-kotki/tsconfig.json` (NOWY) — `extends ../sleeper-machine/tsconfig.json`.
- [x] `packages/sleeper-machine-kotki/vitest.config.ts` (NOWY).
- [x] `packages/sleeper-machine-kotki/README.md` (NOWY) — filozofia: opinionated guidebook (Kotki Dwa).
- [x] `packages/sleeper-machine-kotki/CLAUDE.md` (NOWY) — zasady packagu (lookup-based; nie wprowadzać EWMA tutaj).
- [x] `packages/sleeper-machine-kotki/src/index.ts` — export `recommendKotkiDwa` + re-eksport typów z `sleeper-machine`.
- [x] `packages/sleeper-machine-kotki/src/lookup.ts` — typ + tabela buckets (5m, 6m-3naps, 6m-2naps, 7m, 8m, 9m, 10m, 11m, 12m-2naps, 12m-1nap, 18m+); każdy bucket: `minMonths`, `maxMonths`, `typicalNaps`, `wakeWindowsHours[]` (długość = naps + 1), `maxNapHours`, `maxTotalDayNapHours`, `nightHoursRange`. `pickBucket(ageMonths, preferredNaps)` — z uwzględnieniem override.
- [x] `packages/sleeper-machine-kotki/src/forwardPass.ts` — funkcja czysta: `(morningWake: Date, bucket: AgeBucket, napLengthHours: number) → PlanEntry[]`.
- [x] `packages/sleeper-machine-kotki/src/recommender.ts` — orchestrator: walidacja inputu, `wakeTime = profile.targetWakeTime ?? {hour:7,minute:0}`, `ageMonths = floor((now - dob) / (30.4 * MS_PER_DAY))`, `bucket = pickBucket(...)`, `morningWake` TZ-safe, override `preferredBedtime`, `currentWakeWindowDuration`, `nextSleepAt`, `confidence='high'`, warnings przy `elapsedMin > 1.2 * WW`.
- [x] `packages/sleeper-machine-kotki/tests/lookup.test.ts` (NOWY).
- [x] `packages/sleeper-machine-kotki/tests/forwardPass.test.ts` (NOWY).
- [x] `packages/sleeper-machine-kotki/tests/recommender.test.ts` (NOWY).

### Test:

- [x] Test: 5m, 3 drzemki, wake 07:00, brak historii → harmonogram zbliżony do PDF s.13 (08:45 / 12:30 / 16:15 / 19:00).
- [x] Test: 9m, 2 drzemki, wake 07:00 → zbliżony do PDF s.18 (10:00 / 14:30 / 19:30).
- [x] Test: 6m, `preferredNapsCount=2` vs `3` → różne buckets, różne harmonogramy.
- [x] Test: `preferredBedtime={hour:18,minute:30}` → ostatni NIGHT entry o 18:30.
- [x] Test: `targetWakeTime={hour:06,minute:30}` → cały dzień przesunięty o 30min wcześniej.
- [x] Test: `currentWakeWindowDuration` po 0 / 1 / 2 drzemkach w historii dnia.
- [x] Test: walidacja inputu — invalid `targetWakeTime` → throw.
- [x] Test: smoke check — import `recommendKotkiDwa` z innego packagu działa (TS rozumie typy).

### Weryfikacja:

- [x] Weryfikacja: `pnpm install` w roocie — workspace zarejestrowany.
- [x] Weryfikacja: `pnpm --filter sleeper-machine-kotki test` — wszystkie testy zielone (43/43).
- [x] Weryfikacja: `pnpm --filter sleeper-machine-kotki build` — `dist/index.js` + `dist/index.d.ts` wyemitowane.

## Do poprawy po review fazy 4

- [ ] 🟡 [nit] **recommender.ts:194-203** — `_buildMorningWakeForTest` i `_computeAgeMonths` eksportowane z modułu produkcyjnego, ale nieużywane w żadnym teście; usunąć oba eksporty (over-specification — anty-wzorzec §5)
- [ ] 🟡 [nit] **recommender.ts:177-182** — dead code: warunek `napLengthHours > bucket.maxNapHours` nigdy nie triggeruje bo `napLengthHours = min(maxNapHours, ...)` z definicji; usunąć blok
- [ ] 🟡 [nit] **lookup.test.ts:110-116** — osłabiona asercja w teście fallback (tylko `toBeDefined()` + zakresowy check); dodać `expect(b.typicalNaps).toBe(2)` lub `expect(b.id).toBe('9m')`
- [ ] 🟡 [nit] **recommender.ts:163-174 / recommender.test.ts** — brakujący test dla warning "preferowana godzina nocnego snu daje niezdrową długość nocy"; dodać scenariusz (np. 9m, bedtime=23:00, wake=07:00 → nightH=8h → warning)

---

## Faza 5: Integracja z sleeper-app — adapter + toggle UI (M)

> Plan: sekcja "Faza 5: Integracja z sleeper-app — adapter + toggle UI".
> Cel: App używa wybranego algorytmu per dziecko; toggle w EditChildForm.

### Implementacja

- [x] `packages/sleeper-app/package.json` — dodać `"sleeper-machine-kotki": "workspace:*"`.
- [x] `packages/sleeper-app/src/features/children/hooks.ts` — rozszerzyć `Child` i `UpdateChildInput` o `algorithm: 'galland' | 'kotki_dwa'`; update `rowToChild`, `CHILD_SELECT` (dodać `algorithm`), `patch` w `useUpdateChild`.
- [x] `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` — nowa sekcja "Algorytm rekomendacji" po "Kolor", przed "Preferowana liczba drzemek": 2 chipy (Naukowy (Galland) / Kotki Dwa) + opis ("Naukowy: okna pochodne z norm Galland 2012 + adaptacja z historii. Kotki Dwa: stałe okna z lookup table per wiek, pobudka 07:00 (lub preferowana).") + state `algorithm` + przekazanie do `updateChild.mutate`.
- [x] `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — import `recommendGalland` z `sleeper-machine` i `recommendKotkiDwa` z `sleeper-machine-kotki`; `ChildForRecommendation` rozszerzony o `algorithm`; wybór funkcji: `const fn = child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland`.
- [x] `packages/sleeper-app/src/app/(app)/index.tsx` (+ inne consumery przez `grep useSleepRecommendation`) — przekazanie `child.algorithm`.

### Weryfikacja:

- [x] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- [x] Weryfikacja: `pnpm --filter sleeper-app lint` — PASS.
- [ ] Weryfikacja: Manual w Expo Go — EditChildForm dla 9m dziecka → switch na Kotki Dwa → zapisz → wróć do "Dzisiaj" → `currentWakeWindowDuration` zmienia się (Galland = adapted ~3h±, Kotki Dwa = 3h fixed). — manual test (patrz manual-test-faza-5.md)
- [ ] Weryfikacja: Manual — switch z powrotem na Galland → wartości wracają. — manual test (patrz manual-test-faza-5.md)
- [ ] Weryfikacja: Manual — toggle persist w bazie (refresh app, wartość zostaje). — manual test (patrz manual-test-faza-5.md)

## Do poprawy po review fazy 5

- [ ] 🟡 [nit] **index.tsx:130-138** — `ActiveChildSectionProps.child` inline type duplikuje `ChildForRecommendation`; zaimportować i użyć eksportowanego typu
- [ ] 🟡 [nit] **EditChildForm.tsx:154-186** — chipy algorytmu bez `accessibilityState={{ selected }}`; dodać lub zamienić na komponent `Chip` (który już ma ten atrybut)
- [ ] 🟡 [nit] **EditChildForm.tsx:151-191** — odchylenie od planu: inline `Pressable` zamiast komponent `Chip`; rozważyć refaktor przy okazji cleanup
- [ ] 🟡 [nit] **useSleepRecommendation.ts:77-89** — render-time throw z `useMemo` bez `ErrorBoundary` (pre-existing + nowa ścieżka `recommendKotkiDwa`); rozważyć `try/catch` w `useMemo` + zwracanie `null` zamiast throw

---

## Faza 6: Konfigi root + dokumentacja (S)

> Plan: sekcja "Faza 6: Konfigi root + dokumentacja".
> Cel: Monorepo świadomy nowego packagu, CLAUDE.md aktualny.

### Implementacja

- [x] `CLAUDE.md` (root) — sekcja "Layout repozytorium": dodać `packages/sleeper-machine-kotki/` z krótkim opisem.
- [x] `CLAUDE.md` (root) — sekcja "Stack": wzmianka o dwóch algorytmach, wybór per dziecko.
- [x] `package.json` (root) — proxy scripty (opcjonalne): `"machine-kotki:test"`, `"machine-kotki:build"`.
- [x] `pnpm-workspace.yaml` — sprawdzić, że `packages/*` obejmuje nowy katalog (już tak — bez zmian).

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
