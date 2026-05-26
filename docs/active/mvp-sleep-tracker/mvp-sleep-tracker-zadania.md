# Zadania: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-26

Postęp: 0 / 7 faz ukończone (Faza 0 w toku — czeka na klucze Supabase od usera)

---

## Faza 0 — Setup projektu (Effort: M)

- [x] `npx create-expo-app@latest sleeper-app -t default` (template TS, Expo Router)
- [x] Skonfigurować TypeScript strict mode w `tsconfig.json`
- [x] Dodać path alias `@/*` w `tsconfig.json` i `babel.config.js`
- [x] Zainstalować i skonfigurować NativeWind v4 (`tailwind.config.js`, `metro.config.js`, `global.css`)
- [x] Stworzyć paletę kolorów w `tailwind.config.js` (z mockupów: kremowy `#F5F0E8`, granatowy `#1E1B4B`, pomarańczowy `#E08B6F`, fiolet `#7C6BAD`)
- [ ] Stworzyć Supabase project (cloud) — zapisać URL i anon key
- [x] Dodać `.env`, `.env.example`, zaktualizować `.gitignore`
- [x] Zainstalować `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `date-fns`, `date-fns-tz`
- [x] Stworzyć `src/lib/supabase.ts` — klient
- [x] Dodać QueryClient provider w `app/_layout.tsx`
- [x] Stworzyć bottom tabs layout `app/(app)/_layout.tsx` z 4 tabami (Dzisiaj / Historia / Statystyki / Profil) — wszystkie puste
- [ ] Weryfikacja: `npx expo start` → zeskanować QR → app się otwiera, tabs działają
- [ ] Weryfikacja: `supabase.from('_health').select()` w `index.tsx` — zwraca odpowiedź bez 401

---

## Faza 1 — Auth + model rodziny (Effort: M)

- [ ] Migracja `supabase/migrations/0001_families.sql`: tabele `families`, `family_members`, `family_invitations`
- [ ] Migracja `supabase/migrations/0003_rls.sql`: RLS policies dla `families`, `family_members` (czytać/modyfikować tylko gdy `user_id = auth.uid()` w `family_members`)
- [ ] Migracja `supabase/migrations/0004_triggers.sql`: trigger po INSERT do `auth.users` → tworzy `families` + `family_members(role='owner')`
- [ ] Trigger: po INSERT do `auth.users`, sprawdza `family_invitations` matching email → dodaje user do tej rodziny zamiast tworzyć nową
- [ ] Wygenerować typy: `supabase gen types typescript --project-id=... > src/lib/database.types.ts`
- [ ] `src/features/auth/AuthProvider.tsx` — context nasłuchujący `supabase.auth.onAuthStateChange`
- [ ] `app/(auth)/sign-in.tsx` — formularz email/password
- [ ] `app/(auth)/sign-up.tsx` — formularz + walidacja
- [ ] `app/(auth)/_layout.tsx` — redirect do `(app)` gdy zalogowany
- [ ] `app/(app)/_layout.tsx` — redirect do `(auth)/sign-in` gdy niezalogowany
- [ ] Sekcja „Rodzina" w `app/(app)/profile.tsx` — lista członków + input email + przycisk „Zaproś"
- [ ] Weryfikacja: sign-up dwóch userów + invite → oboje widzą tę samą rodzinę w `family_members` (query w Supabase Studio)
- [ ] Weryfikacja RLS: user A NIE widzi family usera B (test ręczny — wylogować się, zalogować jako B, sprawdzić query)

---

## Faza 2 — Children + sesje (rdzeń MVP) (Effort: XL)

- [ ] Migracja `supabase/migrations/0002_children_sessions.sql`: tabele `children`, `sessions`
- [ ] Constraint: `create unique index sessions_one_active_per_child on sessions(child_id) where end_at is null`
- [ ] Index `sessions(child_id, start_at desc)` dla queries historii
- [ ] RLS dla `children`, `sessions` (członek rodziny przez `family_members`)
- [ ] Regenerować `database.types.ts`
- [ ] Onboarding: ekran „dodaj dziecko" (imię, data urodzenia, kolor avatara) — pokazany jeśli `children.length === 0`
- [ ] `src/features/children/api.ts` — `useChildren()`, `useCreateChild()`
- [ ] `src/features/children/useActiveChild.ts` — Zustand persisted (AsyncStorage)
- [ ] `src/features/sessions/api.ts` — `useSessions(childId, date)`, `useActiveSession(childId)`, `useStartSession`, `useEndSession`, `useUpdateSession`, `useDeleteSession`
- [ ] `src/features/sessions/useSessionTimer.ts` — hook tickujący 1s, format `HH:MM:SS`
- [ ] `src/lib/time.ts` — `formatDuration(ms): "1g 43m"`, `formatTime(date): "09:30"`, `formatRange(start, end): "09:30 → 11:13"`, `pluralizePL(n, ['drzemka', 'drzemki', 'drzemek'])`
- [ ] `src/components/ActiveWindowCard.tsx` — pomarańczowa karta (mockup #1): czas od końca ostatniej sesji + planowana drzemka
- [ ] `src/components/SleepInProgressCard.tsx` — granatowa karta (mockup #2): timer + przycisk „Pełny ekran"
- [ ] `src/components/TodayStatsCard.tsx` — biała karta z agregatami (sen nocny / drzemki / najdł. aktywność)
- [ ] `src/components/BigActionButton.tsx` — granatowy duży przycisk „Rozpocznij sen" / „Zakończ sen"
- [ ] `src/components/QuickActions.tsx` — 3 białe przyciski (Drzemka teraz / Sen nocny / Dodaj wstecz)
- [ ] `src/components/SessionListItem.tsx` — pojedynczy wpis historii (mockup #2 dół)
- [ ] `app/(app)/index.tsx` — kompozycja: header + ActiveWindowCard ALBO SleepInProgressCard + TodayStatsCard + BigActionButton + QuickActions + lista sesji dziś
- [ ] `app/(app)/sleep-fullscreen.tsx` — duży timer + `expo-keep-awake.activateAsync()` w `useEffect`
- [ ] Modal „Dodaj wstecz" — DateTimePicker dla start/end + dropdown typu
- [ ] Mutacja `useStartSession` z optimistic update
- [ ] Mutacja `useEndSession` z optimistic update
- [ ] Weryfikacja: tap „Rozpocznij sen" → karta zmienia kolor i nagłówek
- [ ] Weryfikacja: zamknij i otwórz app → timer kontynuuje z poprawnym czasem
- [ ] Weryfikacja: „Dodaj wstecz" tworzy sesję w przeszłości i pojawia się w agregatach „Dzisiaj"
- [ ] Weryfikacja: agregat „13g 35m" = suma wszystkich sesji z dziś (sprawdzić manualnie)

---

## Faza 3 — Historia + edycja (Effort: M)

- [ ] Sekcja „Sesje dzisiaj" na `index.tsx` (ostatnie 5) + link „Pokaż wszystkie" → `history.tsx`
- [ ] `app/(app)/history.tsx` — `FlatList` sesji + day picker w headerze (`@react-native-community/datetimepicker`)
- [ ] Group by date dla widoku „wszystkie sesje" (sekcje dnia)
- [ ] `app/(app)/session/[id].tsx` — formularz edycji (`useForm` z `react-hook-form` lub useState)
- [ ] Time picker dla `start_at` i `end_at`
- [ ] Dropdown dla `type`
- [ ] TextArea dla `notes`
- [ ] Przycisk „Usuń sesję" z confirm dialog (`Alert.alert`)
- [ ] Mutacja `useUpdateSession` (bez optimistic, bo formularz)
- [ ] Mutacja `useDeleteSession` z confirm
- [ ] Weryfikacja: edycja sesji aktualizuje agregaty „Dzisiaj" po powrocie
- [ ] Weryfikacja: day picker → wybierz wczoraj → pokazują się sesje z wczoraj
- [ ] Weryfikacja: usunięcie sesji wymaga potwierdzenia + znika z listy

---

## Faza 4 — Realtime sync (Effort: S)

- [ ] Włączyć replication na `sessions` w Supabase Studio (Database → Replication)
- [ ] `src/features/sessions/useRealtimeSessions.ts` — `supabase.channel().on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'child_id=eq.X' })`
- [ ] Wywołanie `queryClient.invalidateQueries({ queryKey: ['sessions'] })` przy każdym evencie
- [ ] Cleanup subskrypcji przy unmount
- [ ] Wywołać hook w `app/(app)/_layout.tsx` (na poziomie aktywnego dziecka)
- [ ] Weryfikacja: telefon A startuje sen → telefon B widzi aktywną sesję w <2s
- [ ] Weryfikacja: telefon A wyłącza wifi → wykonuje akcję → włącza wifi → telefon B dostaje update w <5s

---

## Faza 5 — Powiadomienia (Effort: M)

- [ ] `npx expo install expo-notifications`
- [ ] Permissions request przy onboardingu (po dodaniu pierwszego dziecka)
- [ ] `src/lib/notifications.ts` — `requestPermissions()`, `scheduleNapNotification()`, `cancelNapNotification()`
- [ ] Tabela w `src/lib/time.ts`: `targetWakeWindowMinutes(birthDate: Date): number` (0–3mc: 75min, 3–6mc: 105min, 6–9mc: 150min, 9–12mc: 180min, 12mc+: 240min — wartości referencyjne, dopracować z literaturą)
- [ ] Helper: po `useEndSession` success → oblicz `targetEnd = endAt + targetWakeWindow` → schedule notyfikacja na `targetEnd - 15min`
- [ ] Persist notification ID w AsyncStorage `nap-notif-${childId}`
- [ ] Helper: anulowanie poprzedniej notyfikacji przed planowaniem nowej
- [ ] Hook: po `useStartSession` success → cancel notification
- [ ] Hook: po `useDeleteSession` → recalculate (jeśli usunęliśmy ostatnią sesję)
- [ ] Polski tekst notyfikacji: „Drzemka {imię} za ~15 min"
- [ ] Weryfikacja: zakończ drzemkę → sprawdź zaplanowane notyfikacje (`Notifications.getAllScheduledNotificationsAsync`)
- [ ] Weryfikacja: edycja `end_at` sesji aktualizuje czas notyfikacji
- [ ] Weryfikacja: start nowej sesji anuluje zaplanowaną notyfikację
- [ ] Weryfikacja: notyfikacja faktycznie wyświetla się (test z krótkim wake window, np. 5 min)

---

## Faza 6 — Polish dla siebie (Effort: S)

- [ ] App icon (1024x1024) + adaptive icon Android (`assets/icon.png`, `assets/adaptive-icon.png`)
- [ ] Splash screen (`assets/splash.png`)
- [ ] Dark mode: dark variant w `tailwind.config.js` + `useColorScheme()` provider
- [ ] Haptics: `expo-haptics` `impactAsync(ImpactFeedbackStyle.Medium)` przy start/stop snu
- [ ] EAS init: `npx eas-cli init`
- [ ] EAS Build profile `development` w `eas.json`
- [ ] Build dev na własny telefon: `eas build --profile development --platform ios|android`
- [ ] (Opcjonalnie) Konto Apple Developer → TestFlight build dla partnera
- [ ] Weryfikacja: apka działa standalone bez bundlera (development build zainstalowany)
- [ ] Weryfikacja: porównanie z mockupami — paleta, fonty, spacing zgodne

---

## Następne kroki

Po zakończeniu wszystkich faz:
- `/dev-docs-complete docs/active/mvp-sleep-tracker` — archiwizacja + wnioski
- Decyzja: czy publikować w sklepach (Apple Developer $99 + Google Play $25 + screenshots + privacy policy + content review)
- Roadmap post-MVP: wykresy statystyk, multi-child UI, Apple/Google Sign-In, Sentry, lokal-first sync (Powersync), monetyzacja (RevenueCat)
