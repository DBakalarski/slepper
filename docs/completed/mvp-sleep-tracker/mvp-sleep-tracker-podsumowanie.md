# Podsumowanie: MVP — Aplikacja do trackowania snu i okien aktywnosci dziecka

**Data ukonczenia:** 2026-05-27
**Branch:** `feature/mvp-sleep-tracker` (49 commitow)
**Status:** Kod KOMPLETNY, wszystkie review CZYSTE (po fix cyklach). Mobile-manual scenariusze (38 w 6 plikach) pending operator na fizycznych urzadzeniach.

## Co zostalo dostarczone

### Faza 0 — Setup projektu (Effort: M)
- Scaffold Expo SDK 56 → downgrade do SDK 54 (lock dla Expo Go App Store compat).
- TypeScript strict, path alias `@/*`, NativeWind v4.2 + Tailwind v3.4, paleta MVP (cream/navy/orange/purple).
- Supabase client (AsyncStorage persistence, URL polyfill), TanStack Query provider, Zustand, date-fns + date-fns-tz.
- Routing expo-router z grupa `(app)` i 4 tabami (Dzisiaj / Historia / Statystyki / Profil).

### Faza 1 — Auth + model rodziny (Effort: M)
- 6 migracji SQL (0001 families, 0003 RLS, 0004 triggers, 0005 consent flow, 0006 atomic accept + last-owner guard, column-level grants).
- AuthProvider z `onAuthStateChange`, dyskryminowany union dla state, queryClient.clear na SIGNED_OUT.
- Ekrany sign-in/sign-up (useMutation), redirect guards na poziomie layoutow.
- Sekcja Rodzina w `profile.tsx` — InviteMemberForm, FamilyMembersList, PendingInvitationsList, NoFamilyFallback (ekstrakcja z 245 → 70 LOC).
- RPC `accept_invitation` (SECURITY DEFINER, atomic delete osieroconej rodziny via NOT EXISTS, SELECT FOR UPDATE), RPC `ensure_family`, RPC `get_my_pending_invitations`.
- Banner pending invitations w `(app)/index.tsx` (consent flow zamiast auto-accept).

### Faza 2 — Children + sesje (Effort: XL)
- Migracje 0007 (children + sessions + partial unique on active session + RLS przez `is_family_member()`) + 0008 (created_by nullable + column-level grants).
- Hooki sesji: useStartSession/useEndSession (optimistic), useUpdateSession, useDeleteSession, useInsertBackdatedSession, useSessions, useActiveSession, useLastEndedSession.
- `useSessionTimer` (tick 1s, derived state, API `startAt: string | null`).
- `lib/time.ts` — formatery PL (formatDuration "1g 43m", formatTime, formatRange), TZ-safe helpery (`startOfDayInAppTz`, `endOfDayInAppTz`, `parseAppTzDateTime`, `dayKeyInAppTz`).
- `translate-session-error.ts` — mapowanie isUniqueViolation na PL "Inny czlonek rodziny juz rozpoczal sesje".
- Komponenty: ActiveWindowCard (pomaranczowa), SleepInProgressCard (granatowa), TodayStatsCard (agregaty: night sleep, naps, longest awake gap), BigActionButton, QuickActions, SessionListItem.
- Ekrany: `index.tsx` (kompozycja kart), `sleep-fullscreen.tsx` (expo-keep-awake + auto-redirect gdy sesja znika).
- Onboarding AddChildForm (imie + data YYYY-MM-DD + paleta 5 kolorow).
- BackdatedSessionModal (inputy HH:MM zamiast nowej deps).

### Faza 3 — Historia + edycja (Effort: M)
- `@react-native-community/datetimepicker@8.4.4` (SDK 54 compat).
- DatePickerField + TimePickerField (wrappery natywnego pickera).
- `history.tsx` — dwutrybowy: day picker (FlatList) + grouped 14-day (SectionList, groupByDay).
- `session/[id].tsx` (183 LOC po ekstrakcji) + `SessionEditForm` (presentational, 192 LOC).
- shared `Chip` component (selected/label/onPress) — uzywany w SessionEditForm + BackdatedSessionModal.
- `combineDateAndTimeInAppTz` w `lib/time.ts` (TZ-safe, no more `setHours`).
- `useSessionById` (cache key `['session', id]`).

### Faza 4 — Realtime sync (Effort: S)
- Migracja 0009 (idempotent `alter publication supabase_realtime add table public.sessions`).
- `useRealtimeSessions(childId)` — `supabase.channel().on('postgres_changes', { filter: 'child_id=eq.X' })`, invalidate `['sessions']` + `['session']` (singular dla form edycji).
- Channel name `sessions:child=${childId}` unikalny per child.
- Subskrypcja w `(app)/_layout.tsx`, cleanup przez `supabase.removeChannel`.

### Faza 5 — Powiadomienia (Effort: M)
- `expo-notifications@~0.32.17` + plugin w `app.json`.
- `lib/notifications.ts` — `configureNotificationHandler` (modulowo w `app/_layout.tsx`), `requestPermissions` (idempotent), `scheduleNapNotification`, `cancelNapNotification`.
- `targetWakeWindowMinutes(birthDate, now?)` z tabela 75/105/150/180/240 min (0-3mc / 3-6mc / 6-9mc / 9-12mc / 12mc+).
- `schedule-nap-side-effects.ts` — `rescheduleNapNotification`, `cancelNapNotificationSafe`, `rescheduleFromLastEnded` (uzyty w useUpdate + useDelete dla symetrii).
- Integracja w hookach sessji: startSession → cancel, endSession → schedule, updateSession + deleteSession → reschedule from last ended.
- Permission request po dodaniu pierwszego dziecka (`AddChildForm.onSuccess`).
- AsyncStorage `nap-notif-${childId}` persistuje notification ID.
- Polski tekst: "Drzemka {imie} za ~15 min".
- Android channel "Drzemki" (`default` ID, `AndroidImportance.HIGH`).

### Faza 6 — Polish dla siebie (Effort: S)
- `expo-haptics@~15.0.8` — `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` w BigActionButton (start + stop snu).
- Dark mode `darkMode: 'media'` (Appearance API), kolory `dark-bg` `#0F0D26`, `dark-card` `#1E1B4B`, `dark-surface` `#2A2660`.
- Dark variants na ekranach (Dzisiaj, Historia, Statystyki, Profil, Auth, session/[id]), kartach (TodayStatsCard, SessionListItem, QuickActions, AddChildForm, SessionEditForm, BackdatedSessionModal, InvitationRow, profile.Rodzina), inputach (sign-in/sign-up x4, textarea SessionEditForm, BackdatedSessionModal date+2 time). Kontrast WCAG AA PASS (`#F5F0E8` na `#0F0D26` ~13:1).
- TabBar dark mode przez `useColorScheme()` z react-native (expo-router Tabs API nie wspiera className).
- `eas.json` z 3 profilami (development / preview / production), `cli.appVersionSource: "remote"`.
- Ikony aplikacji + splash zachowane z template Expo (scope "polish dla siebie").

## Kluczowe decyzje architektoniczne

1. **Timer = derived state** — czytanie `start_at` + setInterval, NIE zapis running counter w bazie. Timer zawsze poprawny po restarcie/sync.
2. **`end_at = null` = sesja w toku** + partial unique index `sessions_one_active_per_child` — niemozliwe stworzyc dwie aktywne sesje rownolegle.
3. **Realtime + invalidacja `['sessions']`** (nie reczne patchowanie cache) — eliminuje cala klase bugow synchronizacji.
4. **Strefa czasowa**: UTC w bazie (`timestamptz`), Europe/Warsaw przy formatowaniu (`fromZonedTime` / `toZonedTime`). NIE uzywac `setHours` na surowym Date.
5. **Optimistic updates tylko dla START/STOP** sesji (najczestsza akcja). Edycja historii — bez optimistic (formularz wymaga walidacji).
6. **Side-effects (powiadomienia) scentralizowane w hookach sesji**, fire-and-forget z `console.warn`. Caller (UI) nie wie nic o notyfikacjach.
7. **Consent flow dla rodzin** (zamiast auto-accept w trigger) — RPC `accept_invitation` z explicit user action. Banner pending invitations w (app)/index.tsx.
8. **RPC `ensure_family`** + przycisk "Stworz rodzine" jako fallback na "slepy zaulek" (user bez `family_members` row).
9. **Selective dark variants** — tylko top-level surfaces + kluczowe karty. Karty kolorowe (orange/navy) zachowuja palete z mockupow w obu trybach.
10. **Column-level UPDATE grants** na `families` (only `name`) i `sessions` (only `type, start_at, end_at, notes`) — `created_at`/`family_id`/`created_by` nie mozna nadpisac przez klienta.

## Utworzone/zmodyfikowane pliki (glowne)

### Backend (Supabase)
- `supabase/migrations/0001_families.sql` — families, family_members, family_invitations
- `supabase/migrations/0003_rls.sql` — RLS policies
- `supabase/migrations/0004_triggers.sql` — auto-create family po sign-up
- `supabase/migrations/0005_consent_flow.sql` — accept_invitation RPC, get_my_pending_invitations RPC, ensure_family RPC
- `supabase/migrations/0006_atomic_accept.sql` — atomic delete osieroconej rodziny + last-owner guard + column-level grants families
- `supabase/migrations/0007_children_sessions.sql` — children, sessions, partial unique, RLS przez is_family_member()
- `supabase/migrations/0008_sessions_fixes.sql` — created_by drop not null + column-level grants sessions
- `supabase/migrations/0009_realtime_publication.sql` — idempotent add table to publication

### Frontend (sleeper-app/src)
- `lib/supabase.ts`, `lib/query-client.ts`, `lib/database.types.ts`, `lib/postgres-errors.ts`, `lib/time.ts`, `lib/notifications.ts`
- `features/auth/AuthProvider.tsx`, `features/auth/translate-auth-error.ts`
- `features/family/hooks.ts`, `features/family/translate-family-error.ts`, `features/family/components/*` (FamilyMembersList, InviteMemberForm, PendingInvitationsList, NoFamilyFallback)
- `features/children/hooks.ts`, `features/children/useActiveChild.ts`, `features/children/components/AddChildForm.tsx`
- `features/sessions/hooks.ts`, `features/sessions/useSessionTimer.ts`, `features/sessions/useRealtimeSessions.ts`, `features/sessions/schedule-nap-side-effects.ts`, `features/sessions/translate-session-error.ts`, `features/sessions/components/SessionEditForm.tsx`
- `components/*` — ActiveWindowCard, SleepInProgressCard, TodayStatsCard, BigActionButton, QuickActions, SessionListItem, Chip, DatePickerField, TimePickerField, BackdatedSessionModal
- `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`, `app/(auth)/_layout.tsx`
- `app/(app)/_layout.tsx` (Tabs + useRealtimeSessions), `app/(app)/index.tsx` (Dzisiaj), `app/(app)/history.tsx`, `app/(app)/stats.tsx`, `app/(app)/profile.tsx`, `app/(app)/session/[id].tsx`, `app/(app)/sleep-fullscreen.tsx`

### Konfiguracja
- `app.json` (expo-notifications plugin), `tailwind.config.js` (paleta + dark colors + `darkMode: 'media'`), `eas.json` (3 profile)

## Wyciagniete wnioski (do `learned-patterns.md`)

1. **TZ-safe date math**: zawsze `fromZonedTime(\`${dayKey}T00:00:00\`, APP_TIMEZONE)` zamiast `setHours()`. `setHours` operuje na device tz, daje bugi dla userow spoza app tz.
2. **DST-safe end-of-day**: `startOfDayInAppTz(addDays(date, 1))` zamiast `+ 24h` (DST switch dni nie maja 24h).
3. **Hook API `string | null` (ISO) > `Date | null`** dla useEffect deps stability — string deepEqual = primitive equality, Date object referential equality flapuje.
4. **Migration constraint sanity**: `NOT NULL` + `ON DELETE SET NULL` to sprzecznosc — wykryc w pre-push review (P1 z Fazy 2).
5. **`combineDateAndTimeInAppTz`** jako jedyny sposob laczenia date+time z native pickerow w app tz (zamiast `setHours`).
6. **Realtime invalidate konwencja**: `invalidateQueries({ queryKey: ['sessions'] })` (szeroki) + `['session']` (singular dla singletonow). Pokrywa wszystkie observery bez recznego patchowania cache.
7. **Column-level UPDATE grants** dla audit-only kolumn (`created_at`, `created_by`, `family_id`) — REVOKE UPDATE; GRANT UPDATE (kolumny_modyfikowalne) dla anon/authenticated.
8. **Consent flow > auto-accept** dla zaproszen — trigger tylko tworzy `family_members(owner)`, akceptacja zaproszen przez RPC z auth.email() matching.
9. **`error.code === '23505'`** > `.includes('duplicate')` dla isUniqueViolation (PostgreSQL error code, nie tekst).
10. **Side-effects fire-and-forget z `console.warn`** dla powiadomien — nie blokowac mutacji jesli brak permissions/sieci.
11. **WCAG AA dark mode**: `text-navy` (`#1E1B4B`) na `dark-bg` (`#0F0D26`) = kontrast 1.4:1, fail. Wymaga `dark:text-cream`. Walidowac kontrast OBA tryby narzedziem, nie na oko.
12. **`bg-white` w komponentach kart** — zawsze dodaj `dark:bg-dark-card` (lub `dark:bg-dark-surface` dla zagniezdzonych). Inaczej "wyspy light mode" w dark scenie.

## Pulapki / przypadki brzegowe

1. **Pre-claim invitation exploit** — auto-accept w trigger pozwala przejac konta przez stworzenie invitation PRZED rejestracja ofiary. Rozwiazane przez consent flow (P1 z Fazy 1).
2. **Race condition w `accept_invitation`** — dwoch userow akceptuje rownolegle, zostaje osierocona rodzina. Rozwiazane przez atomic delete via NOT EXISTS w jednym statement + SELECT FOR UPDATE.
3. **Last-owner guard** — niemozliwe usunac swojej ostatniej rodziny jako jedyny owner (zostaja dzieci/sesje bez accessu).
4. **`useSessionById` queryKey `['session', id]` nie matchuje invalidacji `['sessions']`** — silent overwrite w formularzu gdy partner edytuje. Fix: double-invalidate w useRealtimeSessions.
5. **`useUpdateSession` reschedule** — pierwotnie wzgledem TEJ sesji, nie ostatniej. Asymetria z `useDeleteSession`. Fix: rename na `rescheduleFromLastEnded` + uzyc w obu.
6. **Empty/error states bez dark variant** — `text-navy` w empty placeholder na `dark-bg` = nieczytelne. Wymaga `dark:text-cream` na KAZDYM tekscie ponad `bg-cream dark:bg-dark-bg`.
7. **TextInput bez dark variant** — `bg-white text-navy` w inputach formularza = wizualne "wyspy" w dark mode. Wymaga `dark:bg-dark-card dark:text-cream`.

## Dodane zaleznosci (sleeper-app/package.json)

- `@supabase/supabase-js@^2.106` + `@react-native-async-storage/async-storage`, `react-native-url-polyfill`
- `@tanstack/react-query@^5.100`
- `zustand@^5.0`
- `date-fns` + `date-fns-tz`
- `nativewind@4.2.4` + `tailwindcss@3.4` (peer dep)
- `expo-router@~6.0`, `expo-keep-awake@~15.0.8`, `expo-notifications@~0.32.17`, `expo-haptics@~15.0.8`
- `@react-native-community/datetimepicker@8.4.4`
- `eas-cli` (NIE jako devDependency, pragmatyczne MVP — backlog P3)

## Pozostalo dla usera (manual, post-autopilot)

1. **Mobile-manual testing** — 38 scenariuszy w 6 plikach `manual-test-faza-{1..6}.md`:
   - Faza 1 (2 scenariusze): sign-up + invite two-user, RLS izolacja rodzin
   - Faza 2 (4 scenariusze): start/stop, persistence przez restart, dodaj wstecz, agregaty "dzis"
   - Faza 3 (3 scenariusze): edit aktualizuje agregaty, day picker, delete z confirm
   - Faza 4 (8 scenariuszy + 2 prerequisites): two-device sync, INSERT/UPDATE/DELETE propagacja, offline→online resync
   - Faza 5 (8 scenariuszy): permission flows, schedule po endSession, cancel po startSession, edycja/delete reschedule, REPL wake window per wiek, foreground/background/killed
   - Faza 6 (7 scenariuszy): haptic start/stop, dark mode iOS/Android, mockup visual parity, EAS dev build, TestFlight
2. **EAS init + build** — `eas login` + `eas init` + `eas build --profile development --platform ios|android` (~10-15 min cloud build)
3. **TestFlight (opcjonalne)** — Apple Developer $99 + App Store Connect
4. **Custom ikona/splash** (opcjonalne, post-MVP) — obecnie placeholder z template Expo

## Roadmap post-MVP (z `mvp-sleep-tracker-zadania.md` sekcja "Nastepne kroki")

- Wykresy statystyk (gdy bedzie miesiac danych)
- Multi-child UI (schema wspiera, brak UI w MVP)
- Apple/Google Sign-In (przed publikacja)
- Sentry + analytics (pre-release)
- Local-first sync (Powersync) — jesli zaboli offline
- Monetyzacja (RevenueCat)
- Publikacja w sklepach (Apple $99 + Google $25 + screenshots + privacy policy)
