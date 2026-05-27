# Code Review — Faza 2: Children + sesje (rdzeń MVP)

**Data:** 2026-05-27
**Branch:** `feature/mvp-sleep-tracker`
**Commit:** `bea5ff5` (feat) + `b9714da` (docs)
**Plików zmienionych:** 18 (+1744 / -31)
**Reviewer:** dev-docs-review (5 agentów: security, performance, architecture, scenario, mobile-feature-tester)

## Severity gate

⛔ **WYMAGA POPRAWEK** — znaleziono 1 problem P1 blokujący kontynuację Fazy 3.

## Liczniki

- 🔴 P1 (blocking): **1**
- 🟠 P2 (important): **9**
- 🟡 P3 (nit): **8**
- Mobile-feature-tester scenariusze: 4 wygenerowane do `manual-test-faza-2.md`

### Typy findingów per severity

| Typ | P1 | P2 | P3 |
|---|---|---|---|
| KOD (implementacja) | 1 | 9 | 8 |
| TEST (brak/błędny test) | 0 | 0 | 0 (Faza 2 świadomie bez testów — patrz notatki implementacyjne) |
| E2E / MOBILE | 0 | 0 | 0 (wszystkie 4 checkboxy `Weryfikacja:` → manual checklist) |

---

## 🔴 P1 — Blocking

### P1-1: Sprzeczny constraint `created_by NOT NULL ... ON DELETE SET NULL`
**Plik:** `supabase/migrations/0007_children_sessions.sql:34`

```sql
created_by uuid not null references auth.users(id) on delete set null,
```

Kolumna ma `NOT NULL` ale FK akcją jest `SET NULL`. Postgres utworzy tabelę, ale każde fizyczne usunięcie usera z `auth.users` (np. soft-delete/admin action/GDPR) złamie kaskadę i transakcja delete usera padnie z `null value in column "created_by" violates not-null constraint`. To blokuje też testy w Supabase Studio gdzie kasuje się usera testowego.

**Severity:** P1 — fundamentalny błąd w migracji który ujawni się dopiero przy delete usera. Lepiej naprawić teraz niż w Fazie 5+ gdy będzie więcej sesji.

**Fix (do wyboru):**
- a) Zmienić na `on delete restrict` (lock usera dopóki ma sesje — niepraktyczne).
- b) Zmienić na `on delete cascade` (usuń sesje razem z userem — agresywne, ale zgodne z RLS scope per-family).
- c) Zachować `set null` i usunąć `not null` (tracking who created się rozpada przy delete usera — akceptowalne dla audit).

**Rekomendacja:** opcja **c** — usuń `NOT NULL`. Sesje przeżywają delete usera, audit traci tylko atrybucję. Walidacja `created_by = auth.uid()` przy INSERT zostaje w policy.

---

## 🟠 P2 — Important

### P2-1: `useSessionTimer` recreates `setInterval` co render z powodu Date prop
**Plik:** `src/features/sessions/useSessionTimer.ts:18-24`

Hook ma `useEffect` z `[startAt]` deps. Wywołujący przekazuje `new Date(session.start_at)` co render (`SleepInProgressCard.tsx:18`, `sleep-fullscreen.tsx:23`). Każdy parent re-render (np. tick `now` co 30s w `index.tsx`) tworzy nowy Date → useEffect dep zmienia się → interval clear+create. Drift co 30s, niepotrzebne re-mounty.

**Fix:** memoize startAt po stronie wywołującego (`useMemo(() => new Date(session.start_at), [session.start_at])`) ALBO w hookcie przyjmować `startAt: string | null` i parsować wewnątrz (lepsze API — string jest stable po deepEqual).

### P2-2: `BackdatedSessionModal.parseLocalDateTime` zakłada device tz = Warsaw
**Plik:** `src/features/sessions/components/BackdatedSessionModal.tsx:25-33`

```ts
const iso = `${date}T${time}:00`;
const parsed = new Date(iso);
```

`new Date('2026-05-27T09:00:00')` używa **device local tz**, nie `Europe/Warsaw`. Jeśli user otworzy app na wakacjach w Hiszpanii (CEST → Madrid też CEST, OK) ale np. na wycieczce do Wielkiej Brytanii (BST UTC+1, Warsaw CEST UTC+2) — sesja zapisana o "09:00" w UI poleci do bazy jako 08:00 Warsaw zamiast 09:00 Warsaw. Niezgodne z konwencją CLAUDE.md "zawsze `Europe/Warsaw` przy formatowaniu" i z deklaracją w komentarzu.

**Fix:** użyj `fromZonedTime(iso, APP_TIMEZONE)` z `date-fns-tz` zamiast `new Date(iso)`.

### P2-3: `time.ts:startOfDayInAppTz` zakłada device tz = Warsaw
**Plik:** `src/lib/time.ts:74-80`

```ts
const zoned = toZonedTime(date, APP_TIMEZONE);
zoned.setHours(0, 0, 0, 0);
return zoned;
```

`setHours(0,0,0,0)` modyfikuje obiekt w **device local tz**, nie w Warsaw. Komentarz przyznaje to ("setHours dzialal na tym lokalnym Date") ale wynik jest niepoprawny gdy device tz ≠ Warsaw. Effect: w innej strefie agregaty "dzisiaj" mogą obejmować nieprawidłowy 24h slot. Dla MVP w PL niemal nigdy nie zadziała źle, ale to mina semantyczna.

**Fix:** użyj `format(zoned, 'yyyy-MM-dd')` żeby wyciągnąć date-string w Warsaw tz, potem `fromZonedTime(\`${dateStr}T00:00:00\`, APP_TIMEZONE)` do otrzymania właściwego UTC instant.

### P2-4: `endOfDay = startOfDay + 24h` łamie się przy DST
**Plik:** `src/app/(app)/index.tsx:136-139`, `src/components/TodayStatsCard.tsx:44`

Dwa razy w roku (ostatnia niedziela marca / października) dzień ma 23 lub 25 godzin w Warsaw tz. Hard-coded `24 * 60 * 60 * 1000` przesunie endOfDay o godzinę → sesje na granicy dnia DST mogą być źle zaliczone.

**Fix:** `endOfDay = startOfDayInAppTz(addDays(now, 1))` (po poprawce P2-3 będzie poprawne).

### P2-5: RLS UPDATE policy nie chroni `created_by` ani `child_id`
**Plik:** `supabase/migrations/0007_children_sessions.sql:108-127`

Policy UPDATE pozwala na update każdej kolumny dopóki user jest członkiem rodziny dziecka. User mógłby:
- zmienić `created_by` innego użytkownika na siebie (lub odwrotnie — zatrzeć ślady),
- zmienić `child_id` sesji na inne dziecko z tej samej rodziny (akceptowalne) lub innej (RLS to wyłapie via WITH CHECK, OK), 
- zmienić `created_at` (audit corruption).

**Fix:** dodać column-level GRANT w stylu Fazy 1 `0006`:
```sql
revoke update on public.sessions from authenticated;
grant update (type, start_at, end_at, notes) on public.sessions to authenticated;
```

### P2-6: `useCreateChild` używa `as Child` zamiast type-safe parsing
**Plik:** `src/features/children/hooks.ts:58`

```ts
return data as Child;
```

Łamie `coding-rules.md §10` ("NIGDY nie używaj type assertions (`as`)"). Type assertion ukrywa rozjazd między DB row a domain typem. `useSessions` używa `rowToSession` — inconsistent. `useChildren:30` też ma `return data;` bez parsera (TS trust przez return type).

**Fix:** dodać `rowToChild` (jak `rowToSession`) i użyć go w obu hookach.

### P2-7: `useStartSession` używa `Error` jako error type — gubi szczegóły 23505
**Plik:** `src/features/sessions/hooks.ts:144-198`

Jeśli drugi telefon rodzica wystartuje sesję w tym samym momencie (race), partial unique idx zwróci `23505`. Obecny kod wrzuca do toasta `error.message` z PostgrestError (typowo `duplicate key value violates unique constraint`). Brak mapowania na PL message ani na user-actionable tekst ("inny członek rodziny już rozpoczął sesję"). Faza 1 ma już wzorzec `translate-family-error.ts` i `isUniqueViolation` w `lib/postgres-errors.ts` — niewykorzystane.

**Fix:** reuse `isUniqueViolation` + `translate-session-error.ts` z mapą PL.

### P2-8: `useActiveChild` setter nie czyści cache aktywnej sesji starego dziecka
**Plik:** `src/features/children/useActiveChild.ts:13-23`, `src/features/children/hooks.ts:60-63`

Po `useCreateChild` success → `setActiveChildId(child.id)`. Stary `activeChildId` query (`['sessions', oldId, 'active']`) zostaje w cache. Dla single-child MVP problem nie wystąpi, ale gdy multi-child UI dojdzie (Faza post-MVP), stale cache spowoduje flicker. P2 zamiast P3 bo decyzja architektoniczna pasuje też do realtime sync (Faza 4) — useActiveChild powinien expose'ować mechanizm invalidacji.

**Fix (lekki):** w `useCreateChild.onSuccess` lub w hooku setter wywołać `queryClient.removeQueries({ queryKey: ['sessions'] })` dla starego id.

### P2-9: `expo-keep-awake` używane ale niezadeklarowane w `package.json`
**Plik:** `sleeper-app/package.json` (brak), `src/app/(app)/sleep-fullscreen.tsx:2`

Pakiet istnieje w `node_modules` tylko jako transitive dep z `expo` umbrella. Działa, ale złamanie `coding-rules.md §8` ("NIGDY nie zakładaj że biblioteka jest dostępna — sprawdź package.json"). Przy `npm install` na czystym kloniu po update Expo SDK, lock może się rozjechać i import padnie.

**Fix:** `npx expo install expo-keep-awake` (doda explicit do `package.json`).

---

## 🟡 P3 — Nit

### P3-1: `useSessions` query key zawiera ISO start/end które re-tickują co 30s
**Plik:** `src/features/sessions/hooks.ts:63`, `src/app/(app)/index.tsx:127-139`

`now` ticks every 30s → `startOfDay` recomputes via useMemo, ale wartość się nie zmienia w ciągu dnia. ISO string wychodzi taki sam, więc TanStack nie refetchuje. **Działa OK przypadkowo**, ale jeśli ktoś podmieni `now` na bardziej granularny tick, queries będą flap. Lepiej memoizować `startOfDay` na podstawie `dayKey = format(now, 'yyyy-MM-dd', { timeZone })`.

### P3-2: Optimistic `useStartSession` może zostawić ghost przy podwójnym tapie
**Plik:** `src/features/sessions/hooks.ts:169-198`

Scenariusz: user tapuje 2x szybko (anty-debounce), oba calle failują (np. offline). Pierwszy rollback przywraca null, drugi rollback przywraca optimistic1 → ghost. UI gate `disabled={startSession.isPending}` powinien chronić, ale tap-down-tap-down przed pending=true może to ominąć (RN batching).

**Fix:** dodać `.cancelQueries` + sprawdzić czy nie istnieje już optimistic w cache przed setQueryData.

### P3-3: `useSessions` filter OR z `end_at.is.null` ładuje wszystkie aktywne sesje
**Plik:** `src/features/sessions/hooks.ts:74`

```ts
.or(`end_at.is.null,end_at.gte.${rangeStart.toISOString()}`)
```

Jeśli sesja zaczęła się 3 dni temu i jest nadal aktywna (zapomniany stop), pojawi się w "dzisiaj" mimo że start_at < startOfDay. To poprawne semantycznie (aktywna sesja ma być widoczna), ale `durationWithinDay` przytnie. OK funkcjonalnie. Tylko warto skomentować w queryFn.

### P3-4: `TodayStatsCard.computeAggregates` kopiuje sessions per render
**Plik:** `src/components/TodayStatsCard.tsx:74`

`[...sessions].sort(...)` co render. Mała tablica (typowo <10 sesji/dzień), OK. Ale `useMemo([sessions, activeSession, now])` zaoszczędziłby na każdym ticku `now`.

### P3-5: Magic numbers w komponentach
**Pliki:** `index.tsx:32` (`30 * 1000`), `ActiveWindowCard.tsx:17` (`60 * 1000`), `useSessionTimer.ts:5` (`1000`)

Trzy różne nazwy dla podobnych konstant. Zunifikować w `time.ts` (`SECOND_MS`, `MINUTE_MS`).

### P3-6: `AddChildForm.AVATAR_COLORS[0]` może być `undefined` (TS strict)
**Plik:** `src/features/children/components/AddChildForm.tsx:20`

`const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]);` — z `noUncheckedIndexedAccess` byłby błąd. Obecnie nie ma flag, ale `coding-rules.md §10` mówi "Strict mode ON". Można dodać `as const` na array i type-safe access.

### P3-7: Brak `useMemo` na `incomingQuery.data ?? []` w `index.tsx:64`
**Plik:** `src/app/(app)/index.tsx:64`

Nowa referencja `[]` co render gdy data === undefined. Mało istotne (mała lista), ale konsystencja z `children` useMemo (linia 46) jest naruszona.

### P3-8: `useChildren` zwraca `data` bez `rowToChild` parsera
**Plik:** `src/features/children/hooks.ts:29-30`

Patrz P2-6 — zwiększa coupling do generated types. Brak custom mappingu = brak walidacji constraintów (np. `avatar_color` jako `string` bez sprawdzenia, że to hex).

---

## Odchylenia od planu

| Plan | Implementacja | Severity |
|---|---|---|
| Migracja `0002_children_sessions.sql` | `0007_children_sessions.sql` (chronologia po Fazie 1 fixach) | ⚪ info — udokumentowane w pliku zadań |
| `useForm` / `react-hook-form` (Faza 3) | useState w AddChildForm i BackdatedSessionModal | ⚪ info — RHF dochodzi w Fazie 3 |
| DateTimePicker dla Backdated | TextInput HH:MM | ⚪ info — udokumentowane jako Faza 3 |
| Testy `time.ts` | brak setupu Jest | ⚪ info — udokumentowane w CLAUDE.md i pliku zadań |

Wszystkie odchylenia świadome i udokumentowane.

---

## Wzmianka: pozytywne wzorce

- ✅ `parseSessionType` fail-loud na nieznanej wartości DB (zgodne ze wzorcem Fazy 1 `parseRole`).
- ✅ Partial unique idx `sessions_one_active_per_child` poprawnie zaimplementowany.
- ✅ Optimistic updates z rollbackiem i `onSettled` invalidate (poprawny wzorzec TanStack v5).
- ✅ `useMemo` na `children` żeby ustabilizować referencję pustej tablicy (świadoma decyzja, w komentarzu).
- ✅ Komentarze "decyzje:" w migracji wyjaśniają intencję.
- ✅ Polski komunikat error dla `endAt <= startAt` w `useInsertBackdatedSession`.
- ✅ `expo-keep-awake.activateAsync(KEEP_AWAKE_TAG)` z explicit tagiem (zgodne z best practice).

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 0 (Faza 2 nie ma checkboxów CLI w sekcji "Weryfikacja")
- Pozostawione dla operatora (Mobile manual): 4
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [ ] Mobile: `tap „Rozpocznij sen" → karta zmienia kolor i nagłówek` — manual test (patrz `manual-test-faza-2.md`)
- [ ] Mobile: `zamknij i otwórz app → timer kontynuuje z poprawnym czasem` — manual test
- [ ] Mobile: `„Dodaj wstecz" tworzy sesję w przeszłości` — manual test
- [ ] Mobile: `agregat „13g 35m" = suma wszystkich sesji z dziś` — manual test

CLI walidacja (poza checkboxami):
- ✅ `npx tsc --noEmit` → PASS (0 błędów)
- ✅ `npm run lint` → PASS (0 warnings)

---

## Decyzja severity gate (po bookkeeping)

⛔ **WYMAGA POPRAWEK** — 1 × P1 (migration constraint) blokuje. P2 i P3 idą do osobnego cyklu lub świadomego pominięcia, ale P1 musi być naprawiony przed Fazą 3 (która rozszerza model sessions).

---

# Review cykl 2 (po fix commit `e7ab97d`)

**Data:** 2026-05-27
**Commit napraw:** `e7ab97d` (fix(mvp-sleep-tracker): poprawki po review fazy 2 (cykl 1))
**Reviewer:** dev-docs-review (holistic re-check po cyklu napraw)

## Severity gate

✅ **CZYSTE** — wszystkie znalezione w cyklu 1 problemy (1 × P1, 9 × P2) są naprawione. Brak regresji. Brak nowych P1/P2.

## Liczniki cyklu 2

- 🔴 P1 (blocking): **0**
- 🟠 P2 (important): **0**
- 🟡 P3 (nit): **2** (nowe sugestie — opcjonalne)
- Mobile-manual: 4 checkboxy pozostają `[ ]` jako znany pending (manual on-device test)

## Mapowanie 1:1 — weryfikacja napraw

### P1

| ID | Opis | Status | Lokalizacja fixu |
|---|---|---|---|
| P1-1 | `created_by NOT NULL ... ON DELETE SET NULL` | ✅ NAPRAWIONY | `migrations/0008_sessions_fixes.sql:14-15` — `alter column created_by drop not null` |

### P2

| ID | Opis | Status | Lokalizacja fixu |
|---|---|---|---|
| P2-1 | `useSessionTimer` recreates `setInterval` co render (Date prop) | ✅ NAPRAWIONY | `useSessionTimer.ts:20` — API przyjmuje `startAt: string \| null`, `useMemo` parsuje Date.parse, deps `[startMs]` stable; callerzy (`SleepInProgressCard.tsx:9`, `sleep-fullscreen.tsx:23`) przekazują `session.start_at` string |
| P2-2 | `BackdatedSessionModal.parseLocalDateTime` zakłada device tz = Warsaw | ✅ NAPRAWIONY | `BackdatedSessionModal.tsx:26-31` — używa `parseAppTzDateTime` z `lib/time.ts`; `todayDateInAppTz` zamiast `getFullYear/getMonth` |
| P2-3 | `time.ts:startOfDayInAppTz` zakłada device tz = Warsaw | ✅ NAPRAWIONY | `time.ts:78-81` — `format(toZonedTime, 'yyyy-MM-dd')` + `fromZonedTime(\`${dayKey}T00:00:00\`, APP_TIMEZONE)` |
| P2-4 | `endOfDay = startOfDay + 24h` łamie się przy DST | ✅ NAPRAWIONY | `time.ts:85-87` — nowy helper `endOfDayInAppTz = startOfDayInAppTz(addDays(date, 1))`; użyty w `index.tsx:138` i `TodayStatsCard.tsx:45` |
| P2-5 | RLS UPDATE policy nie chroni `created_by`/`child_id`/`created_at` | ✅ NAPRAWIONY | `migrations/0008:19-20` — `revoke update on sessions ... grant update (type, start_at, end_at, notes)` |
| P2-6 | `useCreateChild` `as Child` zamiast type-safe parsing | ✅ NAPRAWIONY | `features/children/hooks.ts:29-38` — dodany `rowToChild`, użyty w `useChildren:52` i `useCreateChild:81` |
| P2-7 | `useStartSession` `Error` gubi szczegóły 23505 | ✅ NAPRAWIONY | `features/sessions/translate-session-error.ts` nowy moduł; `hooks.ts:169` — `throw new Error(translateSessionError(error))` z PL message dla 23505 |
| P2-8 | `useActiveChild` setter nie czyści cache | ✅ NAPRAWIONY | `features/children/hooks.ts:87` — `queryClient.removeQueries({ queryKey: ['sessions'] })` w `onSuccess` przed `setActiveChildId` |
| P2-9 | `expo-keep-awake` używane ale niezadeklarowane w `package.json` | ✅ NAPRAWIONY | `sleeper-app/package.json:18` — `"expo-keep-awake": "~15.0.8"` explicit |

## Nowe findings (cykl 2)

### 🟡 P3-cycle2-1: `translateSessionError` zwraca PL wiadomość bez `code`, blokuje dalsze parsowanie po `throw new Error()`

**Plik:** `src/features/sessions/hooks.ts:169`

```ts
if (error) throw new Error(translateSessionError(error));
```

`new Error(string)` traci property `code` (i całą `PostgrestError`). Jeśli kiedyś w przyszłości UI (lub kolejna warstwa) będzie chciał rozróżnić 23505 od innych przyczyn programatycznie, `isUniqueViolation(error)` na re-throwniętym `Error` zwróci `false`. Dla obecnego flow (UI pokazuje tylko `error.message`) to OK — komunikat już jest po polsku. Nit zostawiony jako sugestia: rozważyć custom `SessionError extends Error` z polem `code` (analogicznie do AppError w coding-rules.md §4).

**Severity:** P3 — nie blokuje, obecny use-case działa.

### 🟡 P3-cycle2-2: `useCreateChild.onSuccess` używa `removeQueries(['sessions'])` szeroko

**Plik:** `src/features/children/hooks.ts:87`

`removeQueries({ queryKey: ['sessions'] })` usuwa cache WSZYSTKICH sesji (wszystkich dzieci, wszystkich query keys zaczynających się od `'sessions'`). Dla obecnego single-child MVP cache jest mały lub pusty (dziecko właśnie dodane), więc działa. Ale gdy multi-child UI dojdzie i user przełącza dziecko poprzez `setActiveChildId`, brak granularności spowoduje niepotrzebny refetch wszystkich child-sessions on next focus. P2-8 sugerował dokładnie `['sessions', oldId, 'active']` — fix idzie szerzej niż minimum.

**Severity:** P3 — pragmatyczne dla MVP, do reconsider w post-MVP multi-child.

## Walidacja CLI (cykl 2)

- ✅ `npx tsc --noEmit` → PASS (exit 0)
- ✅ `npm run lint` → PASS (exit 0)

## Mobile-manual (pending — bez zmian od cyklu 1)

4 checkboxy `Weryfikacja:` w pliku zadań pozostają `[ ]` z suffix `— manual test (patrz manual-test-faza-2.md)`. To znany pending z `manual-test-faza-2.md` — wymaga wykonania na fizycznym urządzeniu (Expo Go) i ręcznego odznaczenia przez user. NIE klasyfikowane jako P2.

## Decyzja severity gate (cykl 2, po holistic re-check)

✅ **CZYSTE — GOTOWE DO KONTYNUACJI Fazy 3**

- 1 × P1 z cyklu 1 → naprawiony.
- 9 × P2 z cyklu 1 → naprawione, mapowanie 1:1 zweryfikowane.
- 2 × P3 nowe — opcjonalne sugestie, nie blokują.
- 4 × mobile-manual checkboxy pozostają jako pending operatora (znany flow).
- Quality gate: typecheck + lint PASS.
- Brak regresji w innych obszarach (zweryfikowane: type assertions sweep, fix integrity z migration 0007 baseline, consumer hooks signature OK, RLS column grant zgodny ze wzorcem `0006`).
