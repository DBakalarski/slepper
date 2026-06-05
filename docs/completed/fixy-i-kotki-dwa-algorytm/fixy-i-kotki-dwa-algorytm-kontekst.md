# Kontekst: fixy-i-kotki-dwa-algorytm

**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Ostatnia aktualizacja:** 2026-05-29 (Faza 6 ukończona)

## Faza 6 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Review fazy 6 (2026-05-29)

Przeprowadzono 5-perspektywowy code review. Wynik: **CZYSTE** — P1=0, P2=0, P3=2 (nity kosmetyczne w dokumentacji).

**P3-1 (ARCH/DOCS):** `CLAUDE.md:22` — layout tree nadal wymienia `active/active-window-machine/` zamiast `active/fixy-i-kotki-dwa-algorytm/`; stale reference po zmianie aktywnego zadania.
**P3-2 (ARCH/DOCS):** `CLAUDE.md:89-100` — sekcja "Walidacja (PRZED deklaracja gotowe)" nie zawiera komend `sleeper-machine-kotki test|build`; niekompletna po dodaniu nowego packagu.

CLI: `pnpm machine-kotki:test` PASS (43/43), `pnpm machine-kotki:build` PASS, `git status` — `data-book/` poprawnie gitignorowany.
Security: brak kodu wykonalnego, brak ryzyka.
Raport: `review-faza-6.md`.

---

## Faza 6 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `CLAUDE.md` (root) — sekcja "Layout repozytorium": zmieniono `sleeper-machine/` na odrębną linię z opisem ("algorytm Galland, EWMA"), dodano `sleeper-machine-kotki/` z opisem ("algorytm Kotki Dwa, lookup table per wiek"). Sekcja "Wazne": rozszerzono wzmiankę o `sleeper-machine` o Galland i dodano opis `sleeper-machine-kotki` z komendami + wzmiankę o wyborze algorytmu per dziecko. Sekcja "Stack": algorytm podzielony na dwa wiersze (Galland 0.1.0 EWMA / Kotki Dwa 0.1.0 lookup table). Sekcja "Aktualny stan": zaktualizowana do 2026-05-29, branch `feature/fixy-i-kotki-dwa-algorytm`, Faza 6 w toku.
- `package.json` (root) — dodane proxy scripty: `"machine-kotki:test": "pnpm --filter sleeper-machine-kotki test"`, `"machine-kotki:build": "pnpm --filter sleeper-machine-kotki build"`.
- `pnpm-workspace.yaml` — bez zmian (`packages/*` już obejmuje `packages/sleeper-machine-kotki/`).

### Walidacja

- `pnpm --filter sleeper-machine-kotki test` z roota — PASS (43/43).
- `pnpm machine-kotki:test` (proxy) — PASS (43/43).
- `git status` — `data-book/` nie pojawia się w output (poprawnie ignorowany).

---

## Faza 5 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Review fazy 5 (2026-05-29)

Przeprowadzono 5-perspektywowy code review. Wynik: **CZYSTE** — P1=0, P2=0, P3=4 (nity nieblokujące).

**P3-1 (ARCH):** `index.tsx:130-138` — `ActiveChildSectionProps.child` inline type duplikuje `ChildForRecommendation`; zaimportować i użyć eksportowanego typu.
**P3-2 (A11Y):** `EditChildForm.tsx:154-186` — chipy algorytmu bez `accessibilityState={{ selected }}`; VoiceOver nie informuje o zaznaczeniu.
**P3-3 (ARCH):** `EditChildForm.tsx:151-191` — inline `Pressable` zamiast `Chip` komponent (odchylenie od planu; spójny z nap selection).
**P3-4 (PERF/ARCH):** `useSleepRecommendation.ts:77-89` — render-time throw z `useMemo` bez `ErrorBoundary` (pre-existing, rozszerzone na `recommendKotkiDwa`).

CLI: tsc PASS (exit 0), lint PASS (exit 0), sleeper-machine-kotki tests 43/43 PASS.
Security: RLS pokrywa nowe pole `algorithm`, DB CHECK constraint blokuje nieznane wartości.
Performance: brak N+1, prawidłowy cache invalidation flow po update `algorithm`.
Manual: checklist w `manual-test-faza-5.md`.
Raport: `review-faza-5.md`.

---

## Faza 5 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `packages/sleeper-app/package.json` — dodano `"sleeper-machine-kotki": "workspace:*"` w `dependencies`. `pnpm install` zarejestrował workspace link.
- `features/children/hooks.ts` — `Child` interface rozszerzony o `algorithm: 'galland' | 'kotki_dwa'`; `UpdateChildInput` o `algorithm?: 'galland' | 'kotki_dwa'`; `CHILD_SELECT` dodaje `algorithm`; `ChildRow` dodaje `algorithm: string`; `rowToChild` narrowuje `string → union` przez explicit guard; `useUpdateChild` patch dodaje `if (algorithm !== undefined) patch.algorithm = algorithm`.
- `features/children/components/EditChildForm.tsx` — nowa sekcja "Algorytm rekomendacji" (po Kolor, przed Preferowana liczba drzemek): 2 chipy Pressable (Naukowy Galland / Kotki Dwa) + opis + state `algorithm` inicjalizowany z `child.algorithm` + przekazanie do `updateChild.mutate`.
- `features/recommendation/useSleepRecommendation.ts` — `recommend` zaliasowany jako `recommendGalland`; nowy import `recommendKotkiDwa` z `sleeper-machine-kotki`; `ChildForRecommendation` rozszerzony o `algorithm`; w `useMemo` wybór fn: `child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland`.
- `app/(app)/index.tsx` — `ActiveChildSectionProps.child` rozszerzony o `algorithm: 'galland' | 'kotki_dwa'` (spójność z `ChildForRecommendation`).

### Decyzje

- Tylko jeden consumer `useSleepRecommendation` (index.tsx) — grep potwierdził brak innych miejsc.
- `ChildRow.algorithm` jako `string` (zgodnie z wzorcem DB row w projekcie) z narrowingiem w `rowToChild` — bez type assertion.
- Opis algorytmów w UI bez cytatów z PDF — tylko techniczne parafrazy.

### Walidacja

- `pnpm install` — workspace link sleeper-machine-kotki zarejestrowany.
- `pnpm --filter sleeper-app exec tsc --noEmit` — PASS (0 błędów).
- `pnpm --filter sleeper-app lint` — PASS.

### Commit

`5117f73` — feat(fixy-i-kotki-dwa-algorytm): integracja sleeper-machine-kotki z sleeper-app — adapter + toggle UI

---

## Faza 4 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Review fazy 4 (2026-05-29)

Przeprowadzono 5-perspektywowy code review. Wynik: **CZYSTE** — P1=0, P2=0, P3=4 (nity nieblokujące).

**P3-1 (ARCH):** `recommender.ts:194-203` — `_buildMorningWakeForTest`/`_computeAgeMonths` eksportowane z prod modułu ale nieużywane w testach (over-specification).
**P3-2 (ARCH):** `recommender.ts:177-182` — dead code: warning `napLengthHours > maxNapHours` nigdy nie triggeruje z powodu wcześniejszego `min()`.
**P3-3 (TEST):** `lookup.test.ts:110-116` — osłabiona asercja w fallback teście (tylko `toBeDefined()`, brak asercji na `typicalNaps`).
**P3-4 (TEST):** Brakujący test dla warning "niezdrowa długość nocy" (`recommender.ts:163-174`).

CLI: test 43/43 PASS, build PASS, workspace zarejestrowany (`pnpm list -r`). Brak mobile checkboxów (biblioteka, nie UI).
Raport: `review-faza-4.md`.

---

## Faza 4 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `packages/sleeper-machine-kotki/` (NOWY package) — lookup-based recommender dla Kotki Dwa.
  - `package.json` — `name: sleeper-machine-kotki`, dep `sleeper-machine: workspace:*`, devDeps typescript/vitest/@types/node.
  - `tsconfig.json` — `extends ../sleeper-machine/tsconfig.json`.
  - `vitest.config.ts` — vitest v2, include `tests/**/*.test.ts`.
  - `README.md` — filozofia: opinionated guidebook vs Galland.
  - `CLAUDE.md` — zasady packagu (lookup-based; bez EWMA).
  - `src/index.ts` — eksport `recommendKotkiDwa` + re-eksport typów z `sleeper-machine`.
  - `src/lookup.ts` — `AgeBucket` type + `BUCKETS` constant (11 buckets: 5m, 6m-3naps, 6m-2naps, 7m, 8m, 9m, 10m, 11m, 12m-2naps, 12m-1nap, 18m+) + `pickBucket(ageMonths, preferredNaps)`.
  - `src/forwardPass.ts` — czysta funkcja: `(morningWake, bucket, napLengthHours) → PlanEntry[]`.
  - `src/recommender.ts` — orchestrator: validate → pickBucket → forwardPass → bedtimeOverride → currentWakeWindowDuration/nextSleepAt/warnings → Recommendation.
  - `tests/lookup.test.ts` — 17 testów (struktury + selekcja bucket).
  - `tests/forwardPass.test.ts` — 8 testów (PDF-paired, przesunięcia, edge cases).
  - `tests/recommender.test.ts` — 18 testów (PDF s.13 + s.18, 6m×2/3, bedtimeOverride, targetWakeTime, WW po 0/1/2 naps, walidacja, smoke check).

### Decyzje

- `Minutes` jest branded type w `sleeper-machine` eksportowany przez `makeMinutes` (wartość) a nie `Minutes` (tylko typ). Użyto `makeMinutes(n)` w recommender.ts.
- Dla 12m bez override — `pickBucket` preferuje `12m-2naps` (7-13m → 2 drzemki domyślnie), a dla 14m+ → `12m-1nap` (1 drzemka). Logika: `clampedAge <= 13 → znajdź typicalNaps === 2`.
- `napLengthHours = min(maxNapHours, maxTotalDayNapHours / typicalNaps)` — żadna drzemka nie przekracza limitu jednostkowego ani łącznego.
- Export `_buildMorningWakeForTest` i `_computeAgeMonths` z recommender.ts — pomocnicze dla ewentualnych przyszłych testów. Bez underscore-prefix nie byłyby widoczne jako "helper-only".

### Walidacja

- `pnpm install` — workspace zarejestrowany (nowy package sleeper-machine-kotki widoczny w node_modules).
- `pnpm --filter sleeper-machine-kotki test` — 43/43 PASS (lookup: 17, forwardPass: 8, recommender: 18).
- `pnpm --filter sleeper-machine-kotki build` — dist/index.js + dist/index.d.ts emitowane bez błędów.

### Commit

`b37d99e` — feat(fixy-i-kotki-dwa-algorytm): nowy package sleeper-machine-kotki — lookup-based recommender Kotki Dwa

---

## Faza 3 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Review fazy 3 (2026-05-29)

Przeprowadzono 5-perspektywowy code review. Wynik: **CZYSTE** — P1=0, P2=0, P3=2 (nity nieblokujące).

**P3-1 (ARCH):** `0011_children_algorithm.sql` bez komentarza nagłówkowego — niezgodność z konwencją poprzednich migracji.
**P3-2 (SEC):** `.gitignore` komentarz wymienia nazwisko autorki — bez ryzyka technicznego, kosmetyczne.

CLI: tsc PASS (exit 0), lint PASS (exit 0). `data-book/` poprawnie gitignorowany (nie tracked). Manual operator: `supabase local up` — do weryfikacji przez usera.
Raport: `review-faza-3.md`.

---

## Faza 3 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` (NOWY) — `ALTER TABLE public.children ADD COLUMN algorithm text NOT NULL DEFAULT 'galland' CHECK (algorithm IN ('galland', 'kotki_dwa'))`.
- `packages/sleeper-app/src/lib/database.types.ts` — ręcznie dodano pole `algorithm: string` do `Row` (required) oraz `algorithm?: string` do `Insert` i `Update` (optional) w sekcji `children`.
- `.gitignore` (root) — dodana sekcja `# Materialy referencyjne — copyright (Marta Stam / Kotki Dwa)` + linia `data-book/`.

### Decyzje

- Manual update `database.types.ts` zamiast regen przez CLI Supabase — lokalna baza Supabase nie jest konieczna w tej fazie; regen wymagałby `supabase db pull` z działającą instancją.
- `algorithm` w `Row` jako `string` (nie union type `'galland' | 'kotki_dwa'`) — zgodnie z wzorcem reszty tabeli (np. `type: string` w `sessions`). Węższy typ `'galland' | 'kotki_dwa'` pojawi się w warstwie `features/children/hooks.ts` (Faza 5).

### Commit

`098c7f4` — feat(fixy-i-kotki-dwa-algorytm): migracja algorithm + gitignore data-book

### Walidacja

- tsc PASS, lint PASS.
- `git status` — `data-book/` nie pojawia się w output.

---

## Faza 2 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Zmiany wprowadzone

- `useSleepRecommendation.ts`: `dayKey` memoizowany raz na mount (`useMemo([], [])`); `rangeStart`/`rangeEnd` derived z `dayKey`; `useFocusEffect` invaliduje `['sessions', childId]` gdy ekran wróci na nowy dzień.
- `hooks.ts`: queryKey w `useSessions` używa `dayKeyInAppTz(rangeStart/rangeEnd)` zamiast `.toISOString()`. `.toISOString()` zostaje w `queryFn` jako filtr Supabase.
- `ActiveWindowCard.tsx`: wrapper `<View className="mt-4 h-2">` trzyma stałą wysokość; ProgressBar renderowany inside (conditional) bez zmiany min-height obszaru.

### Decyzje

- `rangeEnd` = `endOfDayInAppTz(dayKey)` zamiast `now` — akceptowalne, sesje z bieżącego dnia zawsze w zakresie (end of day >> now).
- Import `endOfDayInAppTz` z `@/lib/time` — funkcja już istniała.
- `eslint-disable react-hooks/exhaustive-deps` na linii dayKey — świadoma decyzja (intentionally empty deps).

### Commit

`8e04e13` — fix(fixy-i-kotki-dwa-algorytm): stabilizacja queryKey progress bar — brak refetch loop

### Review fazy 2 (2026-05-29)

Przeprowadzono 5-agentowy code review. Wynik: **PASS** — P1=0, P2=0, P3=2 (nity).

**P3-1:** Stale comment w `useRealtimeSessions.ts:36` — opisuje stary format `startISO`/`endISO` zamiast `dayKey`.
**P3-2:** `index.tsx:145-148` — `startOfDay`/`endOfDay` memoizowane z `[now]` (semantycznie ok, queryKey stabilny przez dayKeyInAppTz).

CLI: tsc PASS, lint PASS. Manual testing: checklist w `manual-test-faza-2.md`.
Raport: `review-faza-2.md`.

## Faza 1 — UKOŃCZONA + REVIEW PASS (2026-05-29)

### Review fazy 1 cykl 2 (2026-05-29)

Ponowny review po fix cyklu 1. Wynik: **CZYSTE** — P1=0, P2=0, P3=2 (nity bez zmian, opcjonalne).

Poprzedni P2 (TEST-01: brakujący test addDaysInAppTz) — **NAPRAWIONY**. Commit `790e837` dodał 14 testów (vitest): happy path, DST boundary Europe/Warsaw, invalid input. Wszystkie testy zielone. Vitest dodany jako devDependency sleeper-app.

CLI: tsc PASS, lint PASS, vitest 14/14 PASS. Raport: `review-faza-1.md` (zaktualizowany).

### Review fazy 1 cykl 1 (2026-05-29)

Przeprowadzono 5-agentowy code review. Wynik: **ZASTRZEŻENIA** — P1=0, P2=1, P3=3.

**P2-1 (TEST):** Brakujący unit test dla nowego eksportowanego helpera `addDaysInAppTz` w `lib/time.ts`. Reguła `coding-rules.md §6` — każda nowa funkcja publiczna ma test. Wymaga dodania testów (n=1, n=-1, DST boundary, niepoprawny format).
**P3-1 (ARCH):** `addDaysInAppTz` bez walidacji formatu wejściowego `dayKey` — silent NaN error. Opcja: JSDoc lub guard.
**P3-2 (ARCH):** Safety net `if (end <= start)` w handleSubmit bez komentarza kontekstu.
**P3-3 (SECURITY):** `parseTimeMinutes` bez walidacji — zwraca 0 dla niepoprawnego wejścia (niekrytyczne, bo TIME_REGEX waliduje przed wywołaniem).

CLI: tsc PASS, lint PASS. Manual testing: checklist w `manual-test-faza-1.md`.
Raport: `review-faza-1.md`.

## Faza 1 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `lib/time.ts`: dodany `addDaysInAppTz(dayKey: string, n: number): string` — przesuwa klucz dnia YYYY-MM-DD o n dni TZ-safe (przez `addDays` z date-fns + `fromZonedTime`/`toZonedTime`).
- `BackdatedSessionModal.tsx`: dodany lokalny `parseTimeMinutes(hhmm)` do porównania godzin bez tworzenia obiektów Date. W `handleSubmit` dla `type==='night_sleep'` jeśli `parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)` → `endDate = addDaysInAppTz(date, 1)` (cross-day). Dodany `handleTypeChange` zamiast `setType` inline — przy switchu na `night_sleep` ustawia domyślne `19:30`/`06:30`, przy powrocie do `nap` resetuje na `09:00`/`10:30`. Hint cross-day widoczny tylko gdy `type === 'night_sleep'`.

### Decyzje

- `parseTimeMinutes` implementowana lokalnie w modalu (nie w `lib/time.ts`) — używana tylko tutaj, brak uzasadnienia dla eksportu.
- `addDaysInAppTz` dodany do `lib/time.ts` jako eksportowany helper — może być potrzebny w SessionEditForm lub innych edytorach w przyszłości.
- Walidacja `end <= start` (linia 96) pozostaje jako siatka bezpieczeństwa — po cross-day korekcie nie powinna nigdy wejść dla `night_sleep`, ale chroni przed edge case (np. oba czasy identyczne, np. 00:00 → 00:00).

### Commit

`21b5deb` — fix(fixy-i-kotki-dwa-algorytm): cross-day editing sesji nocnej w BackdatedSessionModal

## Powiązane pliki

| Plik | Faza | Zakres |
|---|---|---|
| `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` | 1 | cross-day logika (start/end na różne dni dla `night_sleep`) |
| `packages/sleeper-app/src/lib/time.ts` | 1 | helper `addDaysInAppTz` / `parseTimeMinutes` (opcjonalny) |
| `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` | 2, 5 | stabilizacja `dayKey` + wybór algorytmu per `child.algorithm` |
| `packages/sleeper-app/src/features/sessions/hooks.ts` | 2 | queryKey: `dayKeyInAppTz` zamiast `toISOString()` |
| `packages/sleeper-app/src/components/ActiveWindowCard.tsx` | 2 | `minHeight` wrapper progress baru |
| `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` | 3 | NOWY — kolumna `algorithm` w `children` |
| `packages/sleeper-app/src/lib/database.types.ts` | 3 | regen po migracji |
| `.gitignore` (root) | 3 | dodać `data-book/` (PDF copyright) |
| `packages/sleeper-machine-kotki/**` | 4 | NOWY package — lookup-based recommender |
| `packages/sleeper-app/package.json` | 5 | workspace dep `sleeper-machine-kotki` |
| `packages/sleeper-app/src/features/children/hooks.ts` | 5 | rozszerzenie `Child` / `UpdateChildInput` o `algorithm` |
| `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` | 5 | sekcja toggle Algorytm (chipy Galland / Kotki Dwa) |
| `packages/sleeper-app/src/app/(app)/index.tsx` | 5 | przekazanie `child.algorithm` do `useSleepRecommendation` |
| `CLAUDE.md` (root) | 6 | aktualizacja sekcji "Layout repozytorium" + "Stack" |

## Decyzje techniczne

Potwierdzone z userem przed planowaniem (zob. plan, sekcja "Decyzje architektoniczne"):

- **Zakres algorytmu Kotki Dwa:** TYLKO krok 3 PDF (harmonogram dnia: lookup WW + forward pass z fixed pobudką). Karmienia, rytuały, NSZ — pominięte.
- **Preferencje dziecka:** `preferred_naps_per_day` i `preferred_bedtime` honorowane przez OBA algorytmy (wspólne pola w `children`).
- **Lokalizacja kodu:** nowy package `packages/sleeper-machine-kotki/`. Wspólne typy (`State`, `ChildProfile`, `Recommendation`, `TimeOfDay`) re-eksportowane z `sleeper-machine` (workspace dep). NIE wprowadzać lookup table WW do `sleeper-machine` — naruszenie jego CLAUDE.md ("scientific-only").
- **Wybór algorytmu:** nowe pole `children.algorithm` (`'galland'` | `'kotki_dwa'`, default `'galland'`).
- **PDF copyright:** `data-book/` dodane do `.gitignore` (Faza 3). Implementacja dla prywatnego użytku — bez cytatów z PDF w UI/kodzie.

### Anty-wzorce (czego unikać)

- Lookup table WW per wiek w `packages/sleeper-machine/` — naruszenie CLAUDE.md tego packagu. **MUSI iść do `packages/sleeper-machine-kotki/`**.
- `new Date()` / `Date.now()` / `Math.random()` w `src/` żadnego z packagów algorytmów — łamie determinizm testów.
- Duplikacja typów `Recommendation`, `State`, `ChildProfile` w nowym packagu — re-eksport z `sleeper-machine`.
- Inline `new Date()` / `.toISOString()` w queryKey — udokumentowane w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`.
- Bezpośrednie cytowanie treści marketingowych z PDF do UI/kodu (zostawiamy tylko liczby z tabeli WW).

## Zależności

### Workspace deps (pnpm)

```
sleeper-machine-kotki  ─┐
        │ workspace:*   │
        ▼               │
sleeper-machine         │
                        │
        ┌───────────────┘
        │ workspace:*
        ▼
   sleeper-app  ──→ używa OBU
```

### Kolejność faz (sekwencyjna)

1. **Faza 2** (queryKey + progress) — niezależna, najszybszy wizualny efekt.
2. **Faza 1** (cross-day modal) — niezależna od reszty.
3. **Faza 3** (migracja `0011` + `.gitignore`) — **must-precede Fazę 5** (Faza 5 czyta `algorithm` z bazy → wymaga regenu `database.types.ts`).
4. **Faza 4** (package sleeper-machine-kotki) — **must-precede Fazę 5** (Faza 5 importuje `recommendKotkiDwa`).
5. **Faza 5** (adapter + UI toggle) — wymaga Faz 3 + 4.
6. **Faza 6** (CLAUDE.md root + konfigi) — finalne, po Fazach 4-5.

### Zewnętrzne biblioteki

Brak nowych zależności do instalacji:
- `sleeper-machine-kotki`: tylko `sleeper-machine` (workspace) + `typescript`/`vitest`/`@types/node` (devDeps — analogicznie jak w `sleeper-machine`).
- `sleeper-app`: workspace dep `sleeper-machine-kotki` (zero npm install).

## Reuse istniejących utilities

- `combineDateAndTimeInAppTz`, `parseAppTzDateTime`, `todayDateInAppTz`, `dayKeyInAppTz`, `formatDateShort`, `formatTime` (`packages/sleeper-app/src/lib/time.ts`)
- `Chip` komponent (`packages/sleeper-app/src/components/Chip.tsx`)
- Typy `State`, `ChildProfile`, `Recommendation`, `TimeOfDay`, `SleepType`, `Minutes`, `Hours`, `AgeMonths` — re-eksport z `sleeper-machine` (NIE duplikować w sleeper-machine-kotki).
- Wzorzec walidacji inputu — analogiczny do `validateInput` w `sleeper-machine/src/recommender.ts`.
- Wzorzec adaptera (DB row → lib type) — analogiczny do `toLibProfile` / `toLibSessions` w `packages/sleeper-app/src/features/recommendation/adapter.ts`.

## Źródła

- Requirements doc: brak (zgłoszenie usera bezpośrednio w sesji)
- Plan techniczny: brak w `docs/plans/`; oryginał z plan mode: `~/.claude/plans/1-w-edycji-frolicking-cupcake.md`
- PDF źródłowy algorytmu Kotki Dwa: `data-book/przewodnik_sen.pdf` (do gitignore w Fazie 3)
- Precedens refetch loop: `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`
- TZ-safe pattern: `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md`
- Anti-pattern lookup table WW: `packages/sleeper-machine/CLAUDE.md` (sekcja "Anti-patterns")
- Plan zadania: `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-plan.md`
