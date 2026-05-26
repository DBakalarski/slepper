# Kontekst: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-26

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
