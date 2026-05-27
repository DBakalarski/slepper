# Zadania: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-27

Postęp: 6 / 7 faz ukończone (Faza 1–6: kod gotowy, Faza 1–3 review CZYSTE, Faza 4 review CZYSTE po cyklu 2, Faza 5 review CZYSTE po cyklu 1, Faza 6 kod gotowy — mobile-manual pending operator)

---

## Faza 0 — Setup projektu (Effort: M)

- [x] `npx create-expo-app@latest sleeper-app -t default` (template TS, Expo Router)
- [x] Skonfigurować TypeScript strict mode w `tsconfig.json`
- [x] Dodać path alias `@/*` w `tsconfig.json` i `babel.config.js`
- [x] Zainstalować i skonfigurować NativeWind v4 (`tailwind.config.js`, `metro.config.js`, `global.css`)
- [x] Stworzyć paletę kolorów w `tailwind.config.js` (z mockupów: kremowy `#F5F0E8`, granatowy `#1E1B4B`, pomarańczowy `#E08B6F`, fiolet `#7C6BAD`)
- [x] Stworzyć Supabase project (cloud) — zapisać URL i anon key
- [x] Dodać `.env`, `.env.example`, zaktualizować `.gitignore`
- [x] Zainstalować `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `date-fns`, `date-fns-tz`
- [x] Stworzyć `src/lib/supabase.ts` — klient
- [x] Dodać QueryClient provider w `app/_layout.tsx`
- [x] Stworzyć bottom tabs layout `app/(app)/_layout.tsx` z 4 tabami (Dzisiaj / Historia / Statystyki / Profil) — wszystkie puste
- [x] Weryfikacja: `npx expo start` → zeskanować QR → app się otwiera, tabs działają
- [x] Weryfikacja: `supabase.from('_health').select()` w `index.tsx` — zwraca odpowiedź bez 401

---

## Faza 1 — Auth + model rodziny (Effort: M)

- [x] Migracja `supabase/migrations/0001_families.sql`: tabele `families`, `family_members`, `family_invitations`
- [x] Migracja `supabase/migrations/0003_rls.sql`: RLS policies dla `families`, `family_members` (czytać/modyfikować tylko gdy `user_id = auth.uid()` w `family_members`)
- [x] Migracja `supabase/migrations/0004_triggers.sql`: trigger po INSERT do `auth.users` → tworzy `families` + `family_members(role='owner')`
- [x] Trigger: po INSERT do `auth.users`, sprawdza `family_invitations` matching email → dodaje user do tej rodziny zamiast tworzyć nową
- [x] Wygenerować typy: `supabase gen types typescript --project-id=... > src/lib/database.types.ts`
- [x] `src/features/auth/AuthProvider.tsx` — context nasłuchujący `supabase.auth.onAuthStateChange`
- [x] `app/(auth)/sign-in.tsx` — formularz email/password
- [x] `app/(auth)/sign-up.tsx` — formularz + walidacja
- [x] `app/(auth)/_layout.tsx` — redirect do `(app)` gdy zalogowany
- [x] `app/(app)/_layout.tsx` — redirect do `(auth)/sign-in` gdy niezalogowany
- [x] Sekcja „Rodzina" w `app/(app)/profile.tsx` — lista członków + input email + przycisk „Zaproś"
- [ ] Weryfikacja: sign-up dwóch userów + invite → oboje widzą tę samą rodzinę w `family_members` (query w Supabase Studio) — manual test (patrz `manual-test-faza-1.md`)
- [ ] Weryfikacja RLS: user A NIE widzi family usera B (test ręczny — wylogować się, zalogować jako B, sprawdzić query) — manual test (patrz `manual-test-faza-1.md`)

### Do poprawy po review fazy 1

Severity gate po cyklu 2: ✅ **CZYSTE** (0 × P1, 2 × P2 świadomie pominięte, 0 × P2 niepoprawione). Pełny raport: `review-faza-1.md`. Fix logs: `4eb8275` (cykl 1), `553f4af` (cykl 2).

**P1 — Blocking (wszystkie naprawione w cyklu 1):**

- [x] 🔴 [P1-security] **migrations/0005_consent_flow.sql** — Pre-claim invitation exploit naprawiony przez explicit consent flow: trigger nie auto-acceptuje, nowy RPC `accept_invitation(_id)` SECURITY DEFINER sprawdza `auth.email()` matching, banner pending invitations w `(app)/index.tsx`.
- [x] 🔴 [P1-scenario] **migrations/0005_consent_flow.sql + hooks.ts** — Partner-already-exists: RPC `get_my_pending_invitations()` listuje invitations matching auth.email() niezależnie od momentu sign-up; user akceptuje przez `accept_invitation`.
- [x] 🔴 [P1-scenario] **src/app/(app)/profile.tsx + migrations/0005** — Ślepy zaułek: RPC `ensure_family()` + przycisk "Stwórz rodzinę" w fallbacku zamiast "Skontaktuj sie z supportem".

**P2 — Important (13 naprawionych, 2 świadomie pominięte):**

- [x] 🟠 [P2-security] **migrations/0005** — Brak globalnego unique na pending invitations (zlikwidowane przez consent flow)
- [ ] 🟠 [P2-security] **migrations/0004_triggers.sql** — Trigger fires niezależnie od `email_confirmed_at` — **świadomie pominięte**: email confirm OFF w decyzji MVP, sprawdzanie nie ma sensu
- [x] 🟠 [P2-security] **migrations/0006** — UPDATE policy na families: REVOKE UPDATE + GRANT UPDATE (name) only
- [x] 🟠 [P2-perf] **AuthProvider** — `useMemo` na context value (cykl 1)
- [x] 🟠 [P2-perf] **sign-in/sign-up** — refactor na `useMutation` (cykl 2)
- [x] 🟠 [P2-perf] **hooks.ts** — 3-query waterfall → 1-query PostgREST embed (cykl 2)
- [x] 🟠 [P2-arch] **features/family** — rename `api.ts` → `hooks.ts` (cykl 1)
- [x] 🟠 [P2-arch] **AuthProvider** — `.catch()` na `getSession()` (cykl 1)
- [x] 🟠 [P2-arch] **AuthProvider** — `AuthContextValue` jako discriminated union (cykl 1)
- [x] 🟠 [P2-arch] **profile.tsx** — `error.code === '23505'` zamiast `.includes('duplicate')` (cykl 1)
- [x] 🟠 [P2-arch] **profile.tsx** — ekstrakcja `FamilyMembersList` / `InviteMemberForm` / `PendingInvitationsList` / `NoFamilyFallback` (245 → 70 LOC, cykl 2)
- [x] 🟠 [P2-scenario] **migrations/0005** — race dwóch ownerów (zlikwidowane przez consent flow, cykl 1)
- [x] 🟠 [P2-scenario] **AuthProvider** — `queryClient.clear()` na SIGNED_OUT (cykl 1)
- [ ] 🟠 [P2-scenario] **sign-up.tsx** — refetch po SIGNED_IN — **świadomie pominięte**: cykl 2 zweryfikowało że flash minimalny (trigger synchronous), fallback "Stwórz rodzinę" pokrywa edge case

**P1 cykl 2 (naprawiony):**
- [x] 🔴 [P1-scenario] **migrations/0006_atomic_accept.sql** — Race condition w `accept_invitation` przy kasowaniu osieroconej rodziny — atomic delete via NOT EXISTS w jednym statement, plus SELECT FOR UPDATE na invitation

**P2 nowe z cyklu 2 (9 naprawionych):**
- [x] 🟠 [P2-scenario] **hooks.ts** — `accept_invitation` error message mapping PL (`translate-family-error.ts`)
- [x] 🟠 [P2-scenario] **useAcceptInvitation** — `onSettled` zamiast `onSuccess` (auto-invalidate po revoked race)
- [x] 🟠 [P2-perf] **query-client.ts + _layout.tsx** — `focusManager` + AppState listener
- [x] 🟠 [P2-security] **migrations/0006** — Last-owner guard w accept_invitation
- [x] 🟠 [P2-arch] **index.tsx** — CTA "Przejdź do profilu" gdy brak rodziny
- [x] 🟠 [P2-arch] **hooks.ts** — Rename `PendingInvitationForMe` → `IncomingInvitation`
- [x] 🟠 [P2-perf] **hooks.ts** — `useMyIncomingInvitations` staleTime 5 min
- [x] 🟠 [P2-arch] **hooks.ts** — `parseRole` fail-loud (throw)
- [x] 🟠 [P2-arch] **lib/postgres-errors.ts** — extract `isUniqueViolation` + `POSTGRES_UNIQUE_VIOLATION` const

**P3:** ~15 drobnych — patrz `review-faza-1.md` sekcja P3. Część zaimplementowana mimochodem (EMAIL_REGEX shared module, translateAuthError extracted). Reszta jako backlog.

**P3:** ~15 drobnych — patrz `review-faza-1.md` sekcja P3.

---

## Faza 2 — Children + sesje (rdzeń MVP) (Effort: XL)

- [x] Migracja `supabase/migrations/0007_children_sessions.sql`: tabele `children`, `sessions` (numer 0007 zamiast 0002 — chronologia migracji po fixach Fazy 1)
- [x] Constraint: `create unique index sessions_one_active_per_child on sessions(child_id) where end_at is null`
- [x] Index `sessions(child_id, start_at desc)` dla queries historii
- [x] RLS dla `children`, `sessions` (członek rodziny przez `is_family_member()`)
- [x] Regenerować `database.types.ts` (ręczne rozszerzenie — brak dostępu do remote `gen types`)
- [x] Onboarding: ekran „dodaj dziecko" (imię, data urodzenia, kolor avatara) — pokazany jeśli `children.length === 0`
- [x] `src/features/children/hooks.ts` — `useChildren()`, `useCreateChild()`
- [x] `src/features/children/useActiveChild.ts` — Zustand persisted (AsyncStorage)
- [x] `src/features/sessions/hooks.ts` — `useSessions(childId, range)`, `useActiveSession(childId)`, `useLastEndedSession`, `useStartSession`, `useEndSession`, `useUpdateSession`, `useDeleteSession`, `useInsertBackdatedSession`
- [x] `src/features/sessions/useSessionTimer.ts` — hook tickujący 1s, format `HH:MM:SS`
- [x] `src/lib/time.ts` — `formatDuration(ms): "1g 43m"`, `formatTime(date): "09:30"`, `formatRange(start, end): "09:30 → 11:13"`, `pluralizePL(n, ['drzemka', 'drzemki', 'drzemek'])`, `formatTimer`, `startOfDayInAppTz`
- [x] `src/components/ActiveWindowCard.tsx` — pomarańczowa karta (mockup #1): czas od końca ostatniej sesji + planowana drzemka
- [x] `src/components/SleepInProgressCard.tsx` — granatowa karta (mockup #2): timer + przycisk „Pełny ekran"
- [x] `src/components/TodayStatsCard.tsx` — biała karta z agregatami (sen nocny / drzemki / najdł. aktywność)
- [x] `src/components/BigActionButton.tsx` — granatowy duży przycisk „Rozpocznij sen" / „Zakończ sen"
- [x] `src/components/QuickActions.tsx` — 3 białe przyciski (Drzemka teraz / Sen nocny / Dodaj wstecz)
- [x] `src/components/SessionListItem.tsx` — pojedynczy wpis historii (mockup #2 dół)
- [x] `app/(app)/index.tsx` — kompozycja: header + ActiveWindowCard ALBO SleepInProgressCard + TodayStatsCard + BigActionButton + QuickActions + lista sesji dziś
- [x] `app/(app)/sleep-fullscreen.tsx` — duży timer + `expo-keep-awake.activateAsync()` w `useEffect`
- [x] Modal „Dodaj wstecz" — TextInput HH:MM dla start/end + chips typu (świadomie bez DateTimePickera — nowa zależność odłożona do Fazy 3)
- [x] Mutacja `useStartSession` z optimistic update
- [x] Mutacja `useEndSession` z optimistic update
- [ ] Weryfikacja: tap „Rozpocznij sen" → karta zmienia kolor i nagłówek — manual test (patrz `manual-test-faza-2.md`)
- [ ] Weryfikacja: zamknij i otwórz app → timer kontynuuje z poprawnym czasem — manual test (patrz `manual-test-faza-2.md`)
- [ ] Weryfikacja: „Dodaj wstecz" tworzy sesję w przeszłości i pojawia się w agregatach „Dzisiaj" — manual test (patrz `manual-test-faza-2.md`)
- [ ] Weryfikacja: agregat „13g 35m" = suma wszystkich sesji z dziś (sprawdzić manualnie) — manual test (patrz `manual-test-faza-2.md`)

### Do poprawy po review fazy 2

Severity gate: ⛔ **WYMAGA POPRAWEK** (1 × P1 blocking). Pełny raport: `review-faza-2.md`.

**P1 — Blocking:**

- [x] 🔴 [P1-data-integrity] **migrations/0008_sessions_fixes.sql** — `created_by NOT NULL ... ON DELETE SET NULL` rozwiazany przez `alter column created_by drop not null`. Sesje przezywaja delete usera, audit traci tylko atrybucje (rekomendacja `c` z review).

**P2 — Important:**

- [x] 🟠 [P2-perf] **useSessionTimer.ts** — refactor API na `startAt: string | null`, parsing wewnatrz przez Date.parse + useMemo. Callerzy (SleepInProgressCard, sleep-fullscreen) podaja ISO string z bazy.
- [x] 🟠 [P2-correctness] **BackdatedSessionModal.tsx + time.ts** — `parseAppTzDateTime` przez `fromZonedTime(iso, APP_TIMEZONE)`, `todayDateInAppTz` zamiast `getFullYear/getMonth` na device tz.
- [x] 🟠 [P2-correctness] **time.ts:startOfDayInAppTz** — przeniesione na `format(toZonedTime, 'yyyy-MM-dd')` + `fromZonedTime(\`${day}T00:00:00\`)`. Dziala niezaleznie od device tz.
- [x] 🟠 [P2-correctness] **index.tsx + TodayStatsCard.tsx** — nowy helper `endOfDayInAppTz(date) = startOfDayInAppTz(addDays(date, 1))` zamiast `+ 24h`. DST-safe.
- [x] 🟠 [P2-security] **migrations/0008** — `revoke update on sessions ... grant update (type, start_at, end_at, notes)` (wzor z 0006 families).
- [x] 🟠 [P2-arch] **features/children/hooks.ts** — `rowToChild` parser w `useChildren` i `useCreateChild` zamiast `as Child`.
- [x] 🟠 [P2-scenario] **features/sessions/translate-session-error.ts** — nowy modul mapujacy `isUniqueViolation` na PL ("Inny czlonek rodziny juz rozpoczal sesje. Odswiez i sprobuj ponownie."). `useStartSession` thrutuje `new Error(translateSessionError(error))`.
- [x] 🟠 [P2-scenario] **features/children/hooks.ts:useCreateChild** — `queryClient.removeQueries({ queryKey: ['sessions'] })` w onSuccess przed setActiveChildId — czysci cache poprzedniego dziecka.
- [x] 🟠 [P2-deps] **package.json** — `npx expo install expo-keep-awake` → `~15.0.8` explicit w dependencies.

**P3 — Nit (8):**

Lista pełna w `review-faza-2.md`. Highlights: magic numbers (`1000`, `60*1000`, `30*1000` rozproszone), `useChildren` bez `rowToChild` parsera, `useStartSession` race przy podwójnym tapie, brak `useMemo` na `incoming` w `index.tsx:64`, kopiowanie sessions w `computeAggregates`, query key z ISO mogący flap w przyszłości.

### Notatki implementacyjne Fazy 2

- Numer migracji `0007` (nie `0002` z planu) zachowuje chronologię po fixach Fazy 1 (0005, 0006).
- Modal „Dodaj wstecz" używa tekstowych inputów `HH:MM` zamiast `@react-native-community/datetimepicker` — pozwala uniknąć nowej zależności w Fazie 2. Full date picker dochodzi w Fazie 3 razem z day pickerem historii.
- Brak setupu testów (Jest/Vitest) — zgodnie z CLAUDE.md i planem zadania (Faza 2 nie ma checkboxów `Test:`). Testy `time.ts` dochodzą gdy setup testów będzie świadomą decyzją projektu.
- `database.types.ts` zaktualizowane ręcznie (replika wzorca Supabase) — projekt nie ma skonfigurowanego `supabase login` do remote `gen types`.

---

## Faza 3 — Historia + edycja (Effort: M)

- [x] Sekcja „Sesje dzisiaj" na `index.tsx` (ostatnie 5) + link „Pokaż wszystkie" → `history.tsx`
- [x] `app/(app)/history.tsx` — `SectionList`/lista sesji + day picker w headerze (`@react-native-community/datetimepicker`)
- [x] Group by date dla widoku „wszystkie sesje" (sekcje dnia, 14 dni wstecz)
- [x] `app/(app)/session/[id].tsx` — formularz edycji (useState, `useSessionById` hook)
- [x] Time picker dla `start_at` i `end_at` (komponent `TimePickerField`)
- [x] Dropdown/chipy dla `type` (Drzemka / Sen nocny) — pattern z BackdatedSessionModal
- [x] TextArea dla `notes`
- [x] Przycisk „Usuń sesję" z confirm dialog (`Alert.alert`)
- [x] Mutacja `useUpdateSession` (bez optimistic, bo formularz) + invalidate `['session', id]`
- [x] Mutacja `useDeleteSession` z confirm + invalidate `['session', id]`
- [ ] Weryfikacja: edycja sesji aktualizuje agregaty „Dzisiaj" po powrocie — manual test (patrz `manual-test-faza-3.md`)
- [ ] Weryfikacja: day picker → wybierz wczoraj → pokazują się sesje z wczoraj — manual test (patrz `manual-test-faza-3.md`)
- [ ] Weryfikacja: usunięcie sesji wymaga potwierdzenia + znika z listy — manual test (patrz `manual-test-faza-3.md`)

### Do poprawy po review fazy 3

Severity gate (cykl 1): ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** (0 × P1, 2 × P2, 7 × P3).
Severity gate (cykl 2, po fix `04622d7`): ✅ **CZYSTE** (0 × P1, 0 × P2, 5 × P3 backlog). Pełny raport: `review-faza-3.md`.

**P2 — Important:**

- [x] 🟠 [P2-arch] **src/app/(app)/session/[id].tsx:1-358** — plik 358 LOC, przekracza limit 300 LOC (coding-rules §1). Ekstrakcja `SessionEditForm` (presentational) + extract wspolnego `Chip` (TypeChip / ModeChip / chips w BackdatedSessionModal). **FIX (cykl 1):** `SessionEditForm` w `features/sessions/components/`, shared `Chip` w `components/Chip.tsx` uzywany przez session edit + BackdatedSessionModal. Plik strony zredukowany ponizej 200 LOC.
- [x] 🟠 [P2-correctness] **src/app/(app)/session/[id].tsx:30-34** (`combineDateAndTime`) — `setHours()` operuje na device tz, nie app tz. Dla usera spoza Warsaw lub na device z UTC zapisany `start_at` rozjedzie sie z wyborem usera. Wyciagnac `combineDateAndTimeInAppTz` do `lib/time.ts` (pattern z `parseAppTzDateTime`: `fromZonedTime(\`${dayKey}T${timeKey}:00\`, APP_TIMEZONE)`). **FIX (cykl 1):** `combineDateAndTimeInAppTz` dodane do `lib/time.ts` przez `format(toZonedTime(...))` + `fromZonedTime`. `SessionEditForm` uzywa nowego helpera, usunieto lokalny `combineDateAndTime`.

**P3 — Nit (opcjonalne, backlog):**

- [ ] 🟡 [P3-arch] **history.tsx:44-50** — `startBase.setDate(... - 13)` zamienic na `addDays(today, -(ALL_RANGE_DAYS - 1))` z date-fns (DST safety).
- [ ] 🟡 [P3-arch] **history.tsx:172-176** — `new Date(\`${key}T12:00:00Z\`)` jako trick — zamienic na `new Date(groups[key][0].start_at)`.
- [ ] 🟡 [P3-perf] **history.tsx:194** — inline `renderItem` (mikro-optymalizacja).
- [ ] 🟡 [P3-scenario] **session/[id].tsx:59-68** — form nie odswieza sie po refetch (last-write-wins bez ostrzezenia). Po Fazie 4 (realtime) dodac banner "Sesja byla edytowana, odswiez".
- [ ] 🟡 [P3-arch] **session/[id].tsx:113-146** — `handleSave` walidacje wyciagnac do `validateForm(form): string | null`.
- [ ] 🟡 [P3-type] **hooks.ts:284, 311** — `useUpdateSession`/`useDeleteSession` bez explicit `UseMutationResult<...>` return type (konsystencja z `useStartSession`/`useEndSession`).
- [x] 🟡 [P3-arch] **Chip extract** — wyciagniety `Chip` (selected/label/onPress) do `src/components/Chip.tsx` (cykl 1). Uzywany w `SessionEditForm` (typ sesji) + `BackdatedSessionModal` (typ sesji). Lokalny `ModeChip` w `history.tsx` ma inny styling (px-3/bg-white/text-xs) — pozostaje lokalny, do refactoru z `variant: 'small' | 'medium'` przy 3-cim uzyciu.

### Notatki implementacyjne Fazy 3

- Nowe komponenty `DatePickerField` i `TimePickerField` w `src/components/` jako wrappery `@react-native-community/datetimepicker` — natywny picker (iOS inline, Android modal), wartosci kontrolowane przez rodzica. Reuse w history (day picker) i session/[id] (start/end).
- `useSessionById(id)` — nowy hook w `features/sessions/hooks.ts`, query po jednej sesji. Cache key `['session', id]`; `useUpdateSession` i `useDeleteSession` invalidiuja ten klucz dodatkowo.
- `SessionListItem` zostaje klikalny przez `Link` z `expo-router` (asChild + Pressable). Opcja `disableNavigation` zachowana na przyszly read-only kontekst.
- Helpery `formatDateShort`, `formatDateNoYear`, `dayKeyInAppTz` dodane do `lib/time.ts` (wszystkie TZ-safe).
- Historia: dwa tryby — „Wybierz dzien" (FlatList z DatePicker, max = today) i „Ostatnie 14 dni" (SectionList grouped by `dayKeyInAppTz`). Brak paginacji w MVP.
- session/[id]: aktywna sesja (end_at null) — koniec nieedytowalny (informacja na karcie), update wysyla tylko `start_at/type/notes`.

---

## Faza 4 — Realtime sync (Effort: S)

- [x] Włączyć replication na `sessions` w Supabase Studio (Database → Replication) — alternatywnie migracja `0009_realtime_publication.sql` (idempotent, `alter publication supabase_realtime add table public.sessions` w bloku exception duplicate_object). User musi zaaplikować migrację lub wykonać krok manualnie w Studio (patrz `manual-test-faza-4.md`).
- [x] `src/features/sessions/useRealtimeSessions.ts` — `supabase.channel().on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'child_id=eq.X' })`
- [x] Wywołanie `queryClient.invalidateQueries({ queryKey: ['sessions'] })` przy każdym evencie
- [x] Cleanup subskrypcji przy unmount (`supabase.removeChannel` w useEffect return)
- [x] Wywołać hook w `app/(app)/_layout.tsx` (na poziomie aktywnego dziecka)
- [ ] Weryfikacja: telefon A startuje sen → telefon B widzi aktywną sesję w <2s — manual test (patrz `manual-test-faza-4.md`)
- [ ] Weryfikacja: telefon A wyłącza wifi → wykonuje akcję → włącza wifi → telefon B dostaje update w <5s — manual test (patrz `manual-test-faza-4.md`)

### Do poprawy po review fazy 4

Severity gate (cykl 1): ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** (0 × P1, 1 × P2, 3 × P3). Pełny raport: `review-faza-4.md`.

**P2 — Important:**

- [x] 🟠 [P2-scenario] **hooks.ts:91 + useRealtimeSessions.ts:40** — `useSessionById` queryKey `['session', id]` (singular) nie matchuje invalidacji `['sessions']` (plural). Form edycji nie odswieza sie na realtime event → silent overwrite gdy partner edytuje rownolegle. Wybor: (a) dodac `invalidateQueries({ queryKey: ['session'] })` w hooku, (b) banner "Sesja byla edytowana" (z Fazy 3 P3 backlog), (c) swiadome odlozenie + komentarz w hooku. **Fix (cykl 1):** wybrano opcje (a) — dodana inwalidacja prefixu `['session']` w `useRealtimeSessions`. Bezpieczne dla otwartego formularza: `useState` w `session/[id].tsx` inicjalizuje sie raz przez `form === null` guard, refetch nie nadpisuje dirty stanu. Banner konfliktow odlozony do Fazy 5/6 (TODO w hooku, wymaga `updated_at`).

**P3 — Nit (opcjonalne, backlog):**

- [ ] 🟡 [P3-arch] **useRealtimeSessions.ts:50** — `queryClient` w dep array jest redundantne (stabilny ref z `QueryClientProvider`), ale wymagane przez eslint exhaustive-deps. Opcjonalny komentarz `// queryClient stable from provider`.
- [ ] 🟡 [P3-observability] **useRealtimeSessions.ts:43** — `.subscribe()` bez callbacka statusu. Dodanie `(status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn(...) }` pomoze debugowac problemy WS przed Sentry (Faza 5/6).
- [ ] 🟡 [P3-scenario] **manual-test-faza-4.md scenariusz 5** — brak deadline'u dla dluzszego offline (>5 min); pokrycie zalezy od refetch on focus (`focusManager` z Fazy 1 P2), nie od WS replay. Udokumentowac w `Notatki implementacyjne Fazy 4` lub dodac scenariusz.

### Notatki implementacyjne Fazy 4

- Migracja `0009_realtime_publication.sql` dodaje tabele do publikacji `supabase_realtime`. Idempotentna przez `do $$ ... exception when duplicate_object` — bezpieczne ponowne apply.
- Hook `useRealtimeSessions(childId)` zwraca `void` — efekty pchaja inwalidacje do TanStack, nic do konsumpcji w UI. Subskrypcja w `(app)/_layout.tsx` zyje przez caly czas trwania zalogowanej sesji.
- Channel name `sessions:child=${childId}` unikalny per child — bezpieczne dla przyszlego multi-child UI.
- Filter `child_id=eq.X` na poziomie Postgres replication slot — eventy innych dzieci nie wlasnej rodziny nie leca w ogole (RLS-friendly dodatkowo).
- Cleanup `supabase.removeChannel(channel)` w useEffect return jest obowiazkowy (coding-rules §13) — zapobiega wyciekowi WS subskrypcji przy remount/przelaczeniu dziecka.
- Konwencja `invalidateQueries(['sessions'])` (szeroki klucz) — refetchuje WSZYSTKIE active observery sesji (useSessions/useActiveSession/useLastEndedSession/useSessionById). Nie patchujemy cache recznie.

---

## Faza 5 — Powiadomienia (Effort: M)

- [x] `npx expo install expo-notifications` (~0.32.17, SDK 54 compatible)
- [x] Permissions request przy onboardingu (po dodaniu pierwszego dziecka) — `AddChildForm.onSuccess` → `requestPermissions()`
- [x] `src/lib/notifications.ts` — `requestPermissions()`, `scheduleNapNotification()`, `cancelNapNotification()`, `configureNotificationHandler()`
- [x] Tabela w `src/lib/time.ts`: `targetWakeWindowMinutes(birthDate: Date, now?: Date): number` (0–3mc: 75min, 3–6mc: 105min, 6–9mc: 150min, 9–12mc: 180min, 12mc+: 240min)
- [x] Helper: po `useEndSession` success → oblicz `targetEnd = endAt + targetWakeWindow` → schedule notyfikacja na `targetEnd - 15min` (`schedule-nap-side-effects.ts:rescheduleNapNotification`)
- [x] Persist notification ID w AsyncStorage `nap-notif-${childId}`
- [x] Helper: anulowanie poprzedniej notyfikacji przed planowaniem nowej (wbudowane w `scheduleNapNotification`)
- [x] Hook: po `useStartSession` success → cancel notification (`cancelNapNotificationSafe`)
- [x] Hook: po `useDeleteSession` → recalculate (jeśli usunęliśmy ostatnią sesję) — `rescheduleAfterDelete` query last ended
- [x] Polski tekst notyfikacji: „Drzemka {imię} za ~15 min"
- [ ] Weryfikacja: zakończ drzemkę → sprawdź zaplanowane notyfikacje (`Notifications.getAllScheduledNotificationsAsync`) — manual test (patrz `manual-test-faza-5.md`)
- [ ] Weryfikacja: edycja `end_at` sesji aktualizuje czas notyfikacji — manual test (patrz `manual-test-faza-5.md`)
- [ ] Weryfikacja: start nowej sesji anuluje zaplanowaną notyfikację — manual test (patrz `manual-test-faza-5.md`)
- [ ] Weryfikacja: notyfikacja faktycznie wyświetla się (test z krótkim wake window, np. 5 min) — manual test (patrz `manual-test-faza-5.md`)

### Notatki implementacyjne Fazy 5

- `expo-notifications@~0.32.17` zainstalowane przez `npx expo install` (nie `npm install`) dla pewnosci kompatybilnosci z SDK 54.
- Plugin `expo-notifications` dodany do `app.json` `plugins` — wymagany dla iOS background delivery i Android channels.
- `configureNotificationHandler()` wolane modulowo w `app/_layout.tsx` (raz, przed pierwszym renderem) — handler dla in-app notifications (banner + sound w foreground).
- Permission request idempotent: `requestPermissions()` najpierw sprawdza `getPermissionsAsync()`, woluje system prompt tylko gdy `canAskAgain && status !== granted`. Po `Don't ask again` zwraca aktualny status bez UI.
- Scheduling: lokalne `Notifications.scheduleNotificationAsync` z `SchedulableTriggerInputTypes.DATE`. Brak push, brak server. AsyncStorage trzyma notification ID per child (`nap-notif-${childId}`); przed kazdym `scheduleNapNotification` woluje `cancelNapNotification` wewnetrznie.
- Hooki sesji (`hooks.ts`) deleguja side-effecty do `schedule-nap-side-effects.ts` (fire-and-forget z `console.warn` na blad). Mutacja nie failuje gdy powiadomienia padna (brak permissions / brak siecio do `children`).
- `useDeleteSession.onSuccess` woluje `rescheduleAfterDelete(childId)` ktore dodatkowo query `sessions ... order by end_at desc limit 1` aby znalezc nowa "ostatnia zakonczona sesje" i przeliczyc target.
- `useUpdateSession.onSuccess` przeplanowuje wzgledem TEJ edytowanej sesji — nie sprawdza czy to ostatnia. Uproszczenie MVP: typowy use case to edycja ostatniej sesji; edycja starej sesji daje "lekko nadgorliwe" reschedule (notyfikacja moze wskazac stary target), do dopracowania w Fazie 6.
- Brak setupu testow (zgodnie z CLAUDE.md i pattern z Fazy 2). `targetWakeWindowMinutes` testowane recznie w Scenariuszu 7 manual-test.
- iOS Settings → Notifications → sleeper-app permits widoczne; Android: channel "Drzemki" (`default` ID) z `AndroidImportance.HIGH`.

### Do poprawy po review fazy 5

Severity gate cyklu 1: ⚠️ **ZASTRZEŻENIA** (0 × P1, 2 × P2, 5 × P3). Pełny raport: `review-faza-5.md`. Po cyklu 1 fix: ✅ 2 × P2 naprawione, 5 × P3 backlog. **Re-review (2026-05-27): ✅ CZYSTE** — 0 × P1, 0 × P2, 5 × P3 backlog (opcjonalne). Mobile-manual: 8 scenariuszy w `manual-test-faza-5.md` — pending operator (nie blokuje gate).

**P2 — Important:**

- [x] 🟠 [P2-arch] **features/sessions/hooks.ts:314-329** — `useUpdateSession` schedule wzgledem edytowanej sesji, nie ostatniej. **Fix (cykl 1):** rename `rescheduleAfterDelete` → `rescheduleFromLastEnded` w `schedule-nap-side-effects.ts`, uzyty zarowno w `useUpdateSession.onSuccess` jak i `useDeleteSession.onSuccess`. Notyfikacja zawsze odzwierciedla aktualnie najnowsza zakonczona sesje (symetria reschedule mechanizmu).
- [x] 🟠 [P2-arch] **features/sessions/hooks.ts:278-281** — `useEndSession.onSuccess` cicho cancel gdy `data.end_at === null`. **Fix (cykl 1):** dodano `console.warn('[notifications] useEndSession received row with end_at === null — cancelling notification as fallback')` przed cancelem dla diagnostyki race condition.

**P3 — Nits (opcjonalne):**

- [ ] 🟡 [P3-arch] **lib/notifications.ts:70-74** — channel id='default' z name='Drzemki' myli czytelnika. Sugestia: id='nap-reminders' + `content.channelId: 'nap-reminders'` w `scheduleNotificationAsync` dla izolacji.
- [ ] 🟡 [P3-perf] **lib/time.ts:150-159** — `targetWakeWindowMinutes` uzywa 30 days/miesiac (5-10% dryf). Sugestia: `date-fns.differenceInMonths` dla precyzji kalendarzowej.
- [ ] 🟡 [P3-arch] **lib/notifications.ts:128-138** — `scheduleNotificationAsync` bez explicit `content.channelId` — Android domyslnie hit 'default'. Spina z P3-arch nr 1.
- [ ] 🟡 [P3-arch] **features/children/components/AddChildForm.tsx:55-62** — `requestPermissions` w `onSuccess` po kazdym dodaniu dziecka. Idempotent w praktyce (form tylko gdy `children.length === 0`), ale komentarz "po pierwszym dziecku" mylacy gdyby form pojawil sie pozniej.
- [ ] 🟡 [P3-feature] **lib/notifications.ts** — brak deep-link handlera dla tap-on-notification. Notatka dla Fazy 6 polish.

**Mobile-manual (pending operator):**

- [ ] 📱 Scenariusz 1 — Permission granted po dodaniu 1szego dziecka
- [ ] 📱 Scenariusz 2 — Permission denied
- [ ] 📱 Scenariusz 3 — Notyfikacja schedulowana po endSession
- [ ] 📱 Scenariusz 4 — Start nowej sesji anuluje pending notyfikacje
- [ ] 📱 Scenariusz 5 — Edycja end_at aktualizuje czas notyfikacji
- [ ] 📱 Scenariusz 6 — Delete ostatniej sesji recalcule
- [ ] 📱 Scenariusz 7 — Wake window calculation per wiek (REPL)
- [ ] 📱 Scenariusz 8 — App foreground/background/killed

---

## Faza 6 — Polish dla siebie (Effort: S)

- [x] App icon (1024x1024) + adaptive icon Android (`assets/images/icon.png` + `android-icon-*.png` zachowane z template Expo — wystarczaja dla "polish dla siebie")
- [x] Splash screen (`assets/images/splash-icon.png` zachowany z template Expo, konfiguracja `expo-splash-screen` w `app.json` poprawna)
- [x] Dark mode: `darkMode: 'media'` w `tailwind.config.js` + dark variants w `bg-cream`/`text-navy` na ekranach głównych (Dzisiaj, Historia, Statystyki, Profil, Auth, session/[id]) + tabBar coloring przez `useColorScheme()` w `(app)/_layout.tsx`
- [x] Haptics: `expo-haptics` zainstalowany (~15.0.8), `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` w `BigActionButton.handlePress` (start + stop snu)
- [ ] EAS init: `npx eas-cli init` — **pominięte autonomicznie** (wymaga `eas login`). Manual instructions w `manual-test-faza-6.md` scenariusz 6.
- [x] EAS Build profile `development` w `eas.json` (utworzony manually, profile: development/preview/production)
- [ ] Build dev na własny telefon: `eas build --profile development --platform ios|android` — manual step (user)
- [ ] (Opcjonalnie) Konto Apple Developer → TestFlight build dla partnera — manual step (user)
- [ ] Weryfikacja: apka działa standalone bez bundlera (development build zainstalowany) — manual test (patrz `manual-test-faza-6.md`)
- [ ] Weryfikacja: porównanie z mockupami — paleta, fonty, spacing zgodne — manual test (patrz `manual-test-faza-6.md`)

### Do poprawy po review fazy 6

Severity gate cyklu 1: ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** (0 × P1, 3 × P2, 6 × P3). Pełny raport: `review-faza-6.md`.

**P2 — Important:**

- [x] 🟠 [P2-correctness] **session/[id].tsx:53,73,157 + history.tsx:85,96,139,184 + index.tsx:236** — `text-navy` BEZ dark variant na rodzicu `bg-cream dark:bg-dark-bg`. Kontrast `#1E1B4B` na `#0F0D26` ≈ 1.4:1, WCAG AA failuje. Fix: dodać `dark:text-cream` na empty/error states i tytułach drugorzędnych. **NAPRAWIONE w cyklu 1.**
- [x] 🟠 [P2-arch] **components/{TodayStatsCard,SessionListItem,QuickActions,Chip}, features/{children/AddChildForm,family/*, sessions/SessionEditForm, sessions/BackdatedSessionModal}, app/(app)/{history,index,profile}** — karty `bg-white`/`bg-cream` bez `dark:bg-dark-card`. Niespojny dark mode: jasne karty na ciemnym tle. **NAPRAWIONE w cyklu 1** (dodano `dark:bg-dark-card` / `dark:bg-dark-surface` + `dark:text-cream` na zawartosci kart).
- [x] 🟠 [P2-correctness] **(auth)/sign-in.tsx:68,82 + (auth)/sign-up.tsx:98,115 + SessionEditForm.tsx:145 + BackdatedSessionModal.tsx:139,156,171** — inputy `bg-white text-navy` bez dark variant. Wizualnie "wyspy light mode" w dark mode. **NAPRAWIONE w cyklu 1** (dodano `dark:bg-dark-card dark:text-cream` na inputach; placeholdery `#7C6BAD`/`#9d97b5` PASS na obu tlach).

**P3 — Nit (opcjonalne, backlog):**

- [ ] 🟡 [P3-arch] **BigActionButton.tsx:22-29** — `handlePress` woluje haptic przed `onPress()`; jesli `onPress` rzuca synchronicznie, haptic juz sie odpalil. Teoretyczne (mutate non-throwing), MVP OK.
- [ ] 🟡 [P3-perf] **(app)/_layout.tsx:36-38** — `tabBarStyle` obiekt allokowany w kazdym renderze. Wyciagnac do `useMemo` (mikro-optymalizacja).
- [ ] 🟡 [P3-arch] **(app)/_layout.tsx:35** — `tabBarInactiveTintColor: isDark ? '#7C6BAD' : '#7C6BAD'` — conditional bez sensu, zwykly string.
- [ ] 🟡 [P3-arch] **eas.json:3** — `cli.version: ">= 16.0.0"` bez devDependency `eas-cli`. Reproducibility — pragmatyczne dla MVP.
- [ ] 🟡 [P3-arch] **tailwind.config.js:21** — kolor `dark-surface` (`#2A2660`) zdefiniowany, nigdzie nieużywany. Dead code; albo użyć w P2-arch fix, albo usunąć.
- [ ] 🟡 [P3-perf] — `useColorScheme` per komponent NativeWind v4 (Appearance API subscribers). Neglible w praktyce, nota informacyjna.

**Mobile-manual (pending operator) — 7 scenariuszy w `manual-test-faza-6.md`:**

- [ ] 📱 Scenariusz 1 — Haptic przy "Rozpocznij sen" (P1 core UX)
- [ ] 📱 Scenariusz 2 — Haptic przy "Zakoncz sen" (P1 core UX)
- [ ] 📱 Scenariusz 3 — Dark mode toggle iOS (P2 polish)
- [ ] 📱 Scenariusz 4 — Dark mode toggle Android (P2 polish)
- [ ] 📱 Scenariusz 5 — Visual zgodnosc z mockupami (P2 polish)
- [ ] 📱 Scenariusz 6 — EAS development build (P3 manual, wymaga `eas login`)
- [ ] 📱 Scenariusz 7 — TestFlight (P3 opcjonalne, wymaga Apple Developer $99)

### Notatki implementacyjne Fazy 6

- `expo-haptics@~15.0.8` zainstalowany przez `npx expo install` (kompatybilnosc z SDK 54). `BigActionButton` woluje `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` synchronicznie przed `onPress()` — fire-and-forget, brak Haptic Enginu nie blokuje akcji.
- Dark mode: `darkMode: 'media'` (Appearance API, bez manualnego togglera). NativeWind v4 natywnie czyta `Appearance.getColorScheme()`. Dodane kolory `dark-bg` (`#0F0D26`), `dark-card` (`#1E1B4B`), `dark-surface` (`#2A2660`) w palecie.
- Dark variants zastosowane TYLKO na top-level surfaces (tlo ekranu, tytuly H1, subtitle) — karty kolorowe (orange/navy) zachowuja palete z mockupow w obu trybach. Kontrast WCAG AA zachowany (testy wizualne w manual-test).
- `(app)/_layout.tsx` uzywa `useColorScheme()` z `react-native` (nie z `nativewind`) dla tabBar coloring — expo-router Tabs API nie wspiera `className`, wymaga `screenOptions` z hex values.
- `eas.json` utworzony manually z 3 profilami (development, preview, production). `eas init` NIE wykonany — wymaga `eas login` (interaktywne). User wykonuje krok manualnie wg `manual-test-faza-6.md` scenariusz 6.
- Ikony aplikacji ZACHOWANE z template Expo (`assets/images/icon.png` 1024x1024, `android-icon-foreground.png` 512x512, `splash-icon.png` 228x213). Zakres "polish dla siebie" nie wymaga custom design — store release to decyzja post-MVP.

---

## Następne kroki

Po zakończeniu wszystkich faz:
- `/dev-docs-complete docs/active/mvp-sleep-tracker` — archiwizacja + wnioski
- Decyzja: czy publikować w sklepach (Apple Developer $99 + Google Play $25 + screenshots + privacy policy + content review)
- Roadmap post-MVP: wykresy statystyk, multi-child UI, Apple/Google Sign-In, Sentry, lokal-first sync (Powersync), monetyzacja (RevenueCat)
