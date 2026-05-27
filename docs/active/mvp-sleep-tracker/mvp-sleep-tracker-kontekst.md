# Kontekst: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-27

## Źródła
- Requirements doc: brak (nie użyto `/dev-brainstorm`)
- Plan techniczny: brak (nie użyto `/dev-plan`)
- Plan źródłowy: `PLAN.md` (root projektu) — zachowany jako reference, nie modyfikowany

## Powiązane pliki (do utworzenia)

### Konfiguracja projektu
- `app.json` / `app.config.ts` — config Expo (nazwa, schema deep link, permissions)
- `tsconfig.json` — strict mode, path aliasy `@/*`
- `babel.config.js` — NativeWind plugin
- `metro.config.js` — NativeWind CSS interop
- `tailwind.config.js` — paleta kolorów z mockupów
- `global.css` — Tailwind base
- `.env`, `.env.example` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `.gitignore` — `.env`, `node_modules`, `.expo`, `dist`

### Routing i UI
- `app/_layout.tsx` — root providers (QueryClient, Auth, Toast)
- `app/(auth)/_layout.tsx` — guard: redirect do `(app)` jeśli zalogowany
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(app)/_layout.tsx` — bottom tabs + guard (redirect do auth jeśli niezalogowany)
- `app/(app)/index.tsx` — ekran „Dzisiaj" (z mockupów)
- `app/(app)/history.tsx` — historia sesji
- `app/(app)/stats.tsx` — placeholder
- `app/(app)/profile.tsx` — ustawienia + zarządzanie rodziną
- `app/(app)/session/[id].tsx` — edycja sesji
- `app/(app)/sleep-fullscreen.tsx` — ekran pełnoekranowy aktywnego snu (`expo-keep-awake`)

### Logika / hooki / API
- `src/lib/supabase.ts` — klient + typy z `supabase gen types`
- `src/lib/database.types.ts` — wygenerowane typy
- `src/lib/notifications.ts` — schedule/cancel helpery
- `src/lib/time.ts` — formatery PL, tabela targetów wake window per wiek
- `src/features/sessions/api.ts` — TanStack Query queries i mutations
- `src/features/sessions/useActiveSession.ts`
- `src/features/sessions/useSessionTimer.ts`
- `src/features/sessions/useRealtimeSessions.ts`
- `src/features/children/api.ts`
- `src/features/children/useActiveChild.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/stores/ui.ts` — Zustand (active child id, theme)

### Komponenty (presentational)
- `src/components/ActiveWindowCard.tsx`
- `src/components/SleepInProgressCard.tsx`
- `src/components/TodayStatsCard.tsx`
- `src/components/SessionListItem.tsx`
- `src/components/BigActionButton.tsx`
- `src/components/QuickActions.tsx`

### Backend (Supabase)
- `supabase/migrations/0001_families.sql`
- `supabase/migrations/0002_children_sessions.sql`
- `supabase/migrations/0003_rls.sql`
- `supabase/migrations/0004_triggers.sql` (auto-create family po sign-up)
- `supabase/seed.sql` — dev data dla lokalnego Supabase (opcjonalnie)

## Decyzje techniczne

### Wybór stacku
- **Expo (RN + TS)** zamiast natywnego — jeden codebase, niska bariera (JS/TS background usera), EAS Build w chmurze
- **Supabase** zamiast Firebase — Postgres (znajome), RLS, łatwa migracja, lepsze dla relacyjnego modelu (families/children/sessions)
- **TanStack Query + Zustand** zamiast Redux/Apollo — najlżejsze, najmniej boilerplate dla MVP
- **NativeWind v4** zamiast `StyleSheet` — przeniesienie wiedzy Tailwind z weba; jeśli okaże się problematyczne, łatwo zejść na StyleSheet
- **Expo Router** zamiast React Navigation — oficjalny, file-based, znajome z Next.js

### Świadomie odrzucone
- **Local-first (Powersync / Legend-State / WatermelonDB)** — wzrost złożoności o rząd wielkości, MVP nie potrzebuje prawdziwego offline. Supabase + TanStack Query (cache + optimistic) wystarczy. Dodać gdy poczujesz ból offline.
- **Apple/Google Sign-In** — odłożone do publikacji. Email/password do MVP.
- **Multi-child UI** — schema wspiera (mockup ma dropdown), ale UI single-child w MVP (mniej rzeczy do zaprojektowania)
- **Sentry / analityka** — przed publikacją, nie na MVP
- **Wykresy w zakładce Statystyki** — placeholder w MVP, prawdziwe statystyki gdy będzie miesiąc danych

### Decyzje schematu DB
- Tabela `sessions` z `end_at = null` dla sesji w toku (jeden wiersz per child via partial unique index)
- „Okno aktywności" jest derived (gap między sesjami), NIE osobną encją — proste, mniej bugów synchronizacji
- `family_members` jako join table (user ↔ family) — przygotowane do większej rodziny (babcia, niania) bez zmian schematu
- `family_invitations` jako MVP-uproszczone (email + family_id), bez podpisanych tokenów; wystarczy bo user musi i tak być zaproszony przez ownera

### Decyzje implementacyjne
- **Timer = derived state**: komponent czyta `start_at` i renderuje czas przez `useEffect` z setInterval; NIE zapisuje running counter w bazie. Konsekwencja: timer zawsze poprawny po restarcie/sync.
- **Strefa czasowa**: zawsze UTC w bazie (`timestamptz`), zawsze `Europe/Warsaw` przy formatowaniu (`date-fns-tz`)
- **Realtime + invalidacja**: Realtime event → `queryClient.invalidateQueries(['sessions'])`, niech TanStack pobierze ponownie (zamiast ręcznie patchować cache → mniej bugów)
- **Optimistic updates**: dla START/STOP sesji (najczęstsza akcja), nie dla edycji historii

## Zależności

### Zewnętrzne usługi
- **Supabase project** (cloud, free tier): URL + anon key w `.env`
- **Expo Account**: do EAS Build (Faza 6+)
- **Apple Developer Program** ($99/rok): jeśli iOS development build / TestFlight — opcjonalne dla MVP, można żyć z Expo Go

### Środowisko dev
- Node 20+
- Telefon iPhone lub Android z Expo Go (do testów dziennie)
- Drugi telefon do testowania sync (może być simulator / drugi user na tym samym telefonie)

### Konwencje projektu
- Stosować zasady z `.claude/rules/coding-rules.md` (sprawdzić zawartość przed startem)
- Wzorce z `.claude/rules/learned-patterns.md`
- Pipeline dokumentacji z `.claude/docs/dev-pipeline.md`

## Pliki referencyjne (read-only kontekst)
- `PLAN.md` (root) — wysokopoziomowy plan techniczny, źródło tego rozbicia
- `.claude/rules/coding-rules.md`
- `.claude/rules/learned-patterns.md`
- `.claude/docs/dev-pipeline.md`

## Krytyczne ścieżki do uważnego testowania

1. **RLS dwóch rodzin** — łatwy strzał w stopę, test ręczny w Supabase Studio jako oba konta
2. **`end_at = null` partial unique** — bez tego można stworzyć dwie aktywne sesje równolegle
3. **Notyfikacje na iOS w background** — najbardziej kapryśna część stacku, test wcześnie
4. **Strefa czasowa przy „dziś"** — agregat „dziś" o północy łatwo zwariować, jeśli używasz UTC dla cut-off

## Log fazy 0 (2026-05-26)

### Wykonane
- Scaffold: `create-expo-app@latest` -> Expo SDK 56 (RN 0.85, React 19.2, TS 6)
- TS strict ON (juz w template), path alias `@/*` -> `./src/*` (juz w template)
- NativeWind v4.2 + Tailwind v3.4 (NIE v4 — peer dep nativewind oczekuje v3.x)
  - `tailwind.config.js` z paleta MVP (cream/navy/orange/purple)
  - `babel.config.js` z preset `babel-preset-expo` (jsxImportSource: nativewind) + `nativewind/babel`
  - `metro.config.js` z `withNativeWind(config, { input: './src/global.css' })`
  - `src/global.css` z `@tailwind base/components/utilities` + zachowane font CSS vars
  - `nativewind-env.d.ts` z `/// <reference types="nativewind/types" />` + ambient `*.css`
- Supabase: `src/lib/supabase.ts` (AsyncStorage persistence, `detectSessionInUrl: false`, polyfill URL)
- TanStack Query: `src/lib/query-client.ts` + provider w `src/app/_layout.tsx`
- Routing: usunieto `src/app/index.tsx` + `src/app/explore.tsx` (template), utworzono grupe `(app)` z 4 tabami:
  - `index.tsx` (Dzisiaj), `history.tsx`, `stats.tsx`, `profile.tsx` — placeholdery z paleta MVP
  - `(app)/_layout.tsx` uzywa `Tabs` z `expo-router` (nie `NativeTabs`, ktore wymaga PNG icons per tab)
- `.env` (puste wartosci) + `.env.example` (placeholdery) + `.gitignore` (dodano `.env`, `!.env.example`)

### Odchylenia od planu
- Plan zaklada `app/_layout.tsx` i `app/(app)/_layout.tsx`. Template SDK 56 trzyma routes w `src/app/` (alias `@/*` -> `./src/*`), wiec pliki sa w `src/app/_layout.tsx` i `src/app/(app)/_layout.tsx`. Funkcjonalnie identyczne.
- Tailwind v3.4 zamiast v4 — `nativewind@4.2.4` peer dep `tailwindcss: >3.3.0` ale praktyka community to v3.x (Tailwind v4 ma inny config style). Zgodne z planem ("NativeWind v4").
- Tabs: zamiast `NativeTabs` z `expo-router/unstable-native-tabs` (template default, ale wymaga PNG ikon per tab — mamy tylko 2: home/explore) uzyto `Tabs` z `expo-router` (bez ikon w MVP, polish ikon = Faza 6).

### Pozostalo w Fazie 0 (blocked — wymaga akcji usera)
- [ ] Stworzyc Supabase project (cloud) -> zapisac URL i anon key w `.env`
- [ ] Weryfikacja: `npx expo start` -> QR -> tabs dzialaja na fizycznym urzadzeniu
- [ ] Weryfikacja: `supabase.from('_health').select()` -> odpowiedz bez 401

### Walidacja
- `npx tsc --noEmit` -> PASS (0 bledow)
- Brak testow jednostkowych w tej fazie (Faza 0 to setup, plan nie zaklada testow)

### Commit
- `9de7387` — feat(setup): scaffold Expo app with TS strict, NativeWind, TanStack Query

## Log fazy 2 (2026-05-27)

### Wykonane
- Migracja `0007_children_sessions.sql`: tabele `children`, `sessions`, partial unique index na aktywnej sesji, RLS przez `is_family_member()`.
- Hooks: `useChildren`, `useCreateChild`, `useActiveChild` (Zustand+AsyncStorage), pełen zestaw session hooks (start/end optimistic, update, delete, backdated insert, useSessions w oknie, useActiveSession, useLastEndedSession).
- Hook `useSessionTimer` (tick 1s, derived state).
- `lib/time.ts`: `formatDuration`, `formatTimer`, `formatTime`, `formatRange`, `pluralizePL`, `startOfDayInAppTz`.
- Komponenty: `ActiveWindowCard`, `SleepInProgressCard`, `TodayStatsCard` (z agregatami: night sleep, naps, longest awake gap), `BigActionButton`, `QuickActions`, `SessionListItem`.
- Onboarding `AddChildForm` (imię + data YYYY-MM-DD + paleta 5 kolorów avatara).
- Modal `BackdatedSessionModal` (chips typu + TextInputy daty/godziny + walidacja end>start, !future).
- `app/(app)/index.tsx` przepisany jako kompozycja sekcji (NoFamily banner, invitations, AddChild lub ActiveChildSection).
- `app/(app)/sleep-fullscreen.tsx` z `expo-keep-awake` i auto-redirect gdy aktywna sesja znika (np. zdalnie zakończona).
- `(app)/_layout.tsx`: `sleep-fullscreen` ukryty z tab bara (`href: null`).

### Odchylenia od planu
- Migracja ponumerowana `0007` zamiast planowanego `0002` — utrzymuje chronologię po fixach Fazy 1 (0005, 0006). Plan był oparty na greenfield, ale w międzyczasie powstały dodatkowe migracje.
- Modal „Dodaj wstecz" nie używa `@react-native-community/datetimepicker` (plan tego pakietu nie wymienia jako zależności Fazy 2, a coding-rules §8 wymaga zgody na nowe deps). Zamiast tego inputy tekstowe `HH:MM` z walidacją regex. DateTimePicker wprowadzimy razem z day pickerem historii w Fazie 3.
- `database.types.ts` zaktualizowane ręcznie (nie `supabase gen types`) — projekt nie ma supabase CLI dowiązanego do remote project.
- Brak testów jednostkowych — Faza 2 nie ma checkboxów `Test:`, CLAUDE.md wskazuje że setup testów dochodzi gdy będzie potrzebny. Czyste funkcje `time.ts` testowalne, ale wymagałyby instalacji Jest/Vitest (osobna decyzja).

### Decyzje schematu Fazy 2
- `children.family_id` zamiast `parent_id` — dziecko należy do rodziny (wymiana usera nie psuje referencji).
- `sessions.type` jako CHECK constraint zamiast Postgres enum — łatwiej dodać typ bez migracji DDL.
- Brak `duration_seconds` jako kolumny — derived z `end_at - start_at`.
- Walidacja Postgres: `sessions_end_after_start` CHECK (end_at IS NULL OR end_at >= start_at).
- Avatar color jako hex string z regex check.

### Decyzje implementacyjne Fazy 2
- Optimistic updates dla START/STOP (zgodnie z planem). Backdated insert bez optimistic (formularz wymaga walidacji).
- `useSessions(childId, rangeStart, rangeEnd)` — generyczne okno czasowe, nie hardcoded "dziś". Pozwala reuse w Fazie 3 (historia).
- `TodayStatsCard.computeAggregates` — sumy ograniczone do okna dnia (sesja przecinająca północ liczy się proporcjonalnie). „Najdłuższe okno aktywności" wyliczane jako max luka między sesjami w obrębie dnia.
- Tick „now" w `index.tsx` co 30s (nie 1s) — agregaty nie potrzebują sub-sekundowej dokładności, tylko karta `SleepInProgressCard` ma 1s tick lokalnie.
- `sleep-fullscreen` auto-redirect na `/` gdy aktywna sesja znika — pokrywa scenariusz „drugi telefon zakończył" + invalidate po focus.

### Walidacja
- `npx tsc --noEmit` -> PASS (0 błędów)
- `npm run lint` -> PASS (0 errors, 0 warnings)
- Manual mobile testing: pending (jak Faza 1)
