# Kontekst: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-27 (Faza 6 — kod gotowy: dark mode + haptics + eas.json; eas login + mobile-manual pending operator)

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

### Code review (2026-05-27)

Przeprowadzony `/dev-docs-review docs/active/mvp-sleep-tracker 2`. Severity gate: ⛔ **WYMAGA POPRAWEK**.

- 1 × P1 (data integrity): `created_by NOT NULL ... ON DELETE SET NULL` w migracji 0007 to sprzeczność. Wymaga migracji 0008 (lub edycji 0007 przed push, jeśli środowisko remote pozwala).
- 9 × P2 (performance, correctness tz, RLS column-level grant, deps explicit, type assertions, error mapping). Pełny raport: `review-faza-2.md`.
- 8 × P3 (magic numbers, brakujące memo, brak `rowToChild` parsera, race przy podwójnym tapie). Backlog.
- Manual test checklist: `manual-test-faza-2.md` (4 scenariusze: start/stop, persistence, dodaj wstecz, agregaty).

**Kluczowy wniosek (TZ correctness):** trzy P2 dotyczą jednego źródła — założenia device tz = Warsaw. Refaktor `time.ts` powinien używać konsekwentnie `fromZonedTime`/`toZonedTime` zamiast modyfikować Date objects via `setHours`. Wzorzec do utrwalenia w `learned-patterns.md` po fixie.

### Code review cykl 2 (2026-05-27, po fix `e7ab97d`)

Re-run `/dev-docs-review docs/active/mvp-sleep-tracker 2` po cyklu napraw. Severity gate: ✅ **CZYSTE** — gotowe do Fazy 3.

- 1 × P1 z cyklu 1 → naprawiony przez migration 0008 (`drop not null` na `sessions.created_by` + column-level `grant update`).
- 9 × P2 z cyklu 1 → naprawione, mapowanie 1:1 zweryfikowane w `review-faza-2.md` (sekcja "Review cykl 2").
- 2 × P3 nowe (cykl 2) — opcjonalne sugestie:
  - `useStartSession` `throw new Error(translateSessionError(error))` traci `code` property (custom `SessionError` rozważyć w przyszłości).
  - `useCreateChild.onSuccess` używa `removeQueries(['sessions'])` szeroko zamiast per-child (pragmatyczne dla single-child MVP).
- 4 × mobile-manual checkboxy pozostają `[ ]` jako znany pending operatora (Expo Go on-device).
- Quality gate cykl 2: typecheck + lint PASS.

**Wzorce do utrwalenia w `learned-patterns.md`** (po `/dev-compound`):
1. TZ-safe date math: zawsze `fromZonedTime(dayKey + 'T00:00:00', tz)` zamiast `setHours()`.
2. DST-safe end-of-day: `startOfDayInAppTz(addDays(date, 1))` zamiast `+ 24h`.
3. Hook API: `string | null` (ISO) > `Date | null` dla useEffect deps stability (string deepEqual = primitive equality).
4. Migration constraint sanity: `NOT NULL` + `ON DELETE SET NULL` to sprzeczność — wykrywać w pre-push review.

## Log fazy 3 (2026-05-27)

### Wykonane
- Dependency: `@react-native-community/datetimepicker@8.4.4` zainstalowany przez `npx expo install` (SDK 54 compat).
- Komponenty `DatePickerField` i `TimePickerField` w `src/components/` — wrappery natywnego pickera (iOS inline / Android modal), wartosci kontrolowane.
- Helpery time.ts: `formatDateShort`, `formatDateNoYear`, `dayKeyInAppTz` (wszystkie przez `toZonedTime`, TZ-safe).
- `useSessionById(id)` — nowy hook w `features/sessions/hooks.ts` z `queryKey: ['session', id]`. `useUpdateSession` i `useDeleteSession` invalidiuja ten klucz dodatkowo.
- `src/app/(app)/history.tsx` — przepisany z placeholdera na dwutrybowy ekran (day picker + grouped 14-day list via `SectionList`).
- `src/app/(app)/session/[id].tsx` — nowy ekran edycji sesji (formularz useState, walidacja, Alert.alert na delete, banner "Sesja w toku" dla aktywnej sesji).
- `SessionListItem` opakowany w `Link asChild + Pressable` (klikalny przez całą rodzinę), opcja `disableNavigation` dla read-only przyszłosci.
- `index.tsx`: link "Pokaz wszystkie" w nagłowku sekcji "Sesje dzisiaj" → `/history`.
- `(app)/_layout.tsx`: `<Tabs.Screen name="session/[id]" options={{ href: null }} />` — route ukryta z tab bara.

### Odchylenia od planu
- Plan w zadaniach mowil o "FlatList" w history; uzyto `SectionList` dla trybu "wszystkie" (sekcje per dzien) — funkcjonalnie pelnoprawne, lepsze dla grouping bez wlasnej logiki sticky-header.
- Plan wspominal `useForm` z `react-hook-form` "lub useState" — wybrano `useState` (jeden formularz, brak walidacji w realtime, brak nowej dependency).
- "Pokaz wszystkie 5 ostatnich" było już zaimplementowane w Fazie 2 (slice(0,5) w `index.tsx`). Faza 3 dodała tylko link `Pokaz wszystkie` przy nagłowku sekcji.
- Day picker w history ma `maximumDate={today}` (nie da się wybrać przyszłego dnia). Plan nie mówił explicite, ale to oczywiste UX.
- Zamiast natywnego dropdown dla typu uzyto chipow (pattern z `BackdatedSessionModal`) — spojnosc designu.
- Faza 3 nie ma checkboxow `Test:` — brak setupu testow w projekcie, zgodnie z polityka CLAUDE.md.

### Decyzje implementacyjne Fazy 3
- Edycja aktywnej sesji (end_at = null): nie pokazujemy pol "Godz. koniec" / "Data konca", w `update` nie wysylamy `end_at`. Banner informuje usera o stanie.
- `combineDateAndTime(datePart, timePart)`: helper łączący wybor z DatePicker (data) z TimePicker (godzina). Operuje na local fields urządzenia — picker zwraca już wartości widoczne dla usera w jego strefie. Konwersja do UTC dzieje sie przez `toISOString()` w submit.
- `useSessionById` jako pojedynczy fetch (`maybeSingle`) niezalezny od `sessionsByChildKey` — pozwala otworzyc edycje sesji która nie jest w obecnym oknie listy (np. z 30 dni temu).
- `groupByDay` zachowuje sortowanie z `useSessions` (desc po start_at) — najnowszy dzien pierwszy, w obrębie dnia: najnowsza sesja pierwsza.
- ALL_RANGE_DAYS = 14 (sztywno) — MVP scope; paginacja gdy bedzie potrzeba.

### Walidacja
- `npx tsc --noEmit` → PASS (0 błędów)
- `npm run lint` → PASS (0 errors, 0 warnings)
- Manual mobile testing: pending — checklist w `manual-test-faza-3.md` (11 scenariuszy).

### Code review (2026-05-27)

Przeprowadzony `/dev-docs-review docs/active/mvp-sleep-tracker 3`. Severity gate: ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI**.

- 0 × P1 (no blockers).
- 2 × P2: rozmiar `session/[id].tsx` (358 > 300 LOC) oraz `combineDateAndTime` operujacy na device tz (regres wzorca utrwalonego po Fazie 2).
- 7 × P3 (DST drift w `setDate`, formatowanie naglowka grupy, inline renderItem, brak refresh formularza po refetch, `handleSave` walidacje do ekstrakcji, brak explicit return type na 2 hookach, `Chip` shared component dla 3 uzyc).
- Manual test checklist: `manual-test-faza-3.md` (11 scenariuszy, pending operator).

**Kluczowy wniosek (TZ correctness, powtorzenie z Fazy 2):** `setHours` na surowym Date traktuje godziny jako device tz. Wzorzec utrwalony juz w `learned-patterns.md` (TZ-safe date math), ale `combineDateAndTime` w `session/[id].tsx` wprowadza regres. Fix: dodac `combineDateAndTimeInAppTz` do `lib/time.ts` i wymusic uzycie helpera w ekranach formularza.

### Code review cykl 2 (2026-05-27, po fix `04622d7`)

Re-run `/dev-docs-review docs/active/mvp-sleep-tracker 3` po cyklu napraw. Severity gate: ✅ **CZYSTE** — gotowe do Fazy 4.

- 2 × P2 z cyklu 1 → naprawione:
  - **P2-1 (LOC):** `session/[id].tsx` 358 → 183 LOC (-49%). Ekstrakcja `SessionEditForm` (192 LOC, presentational) + shared `Chip` (27 LOC, uzywany w SessionEditForm + BackdatedSessionModal).
  - **P2-2 (TZ-safety):** `combineDateAndTimeInAppTz` dodane do `lib/time.ts:122-133` (pattern z `parseAppTzDateTime`). Lokalny `combineDateAndTime` z `setHours()` usuniety. SessionEditForm uzywa nowego helpera w 4 callbackach.
- 5 × P3 przeniesione do backlog (DST drift w `setDate`, formatowanie naglowka grupy, inline renderItem, brak refresh formularza po refetch, `handleSave` walidacje, brak explicit return type na 2 hookach). Lokalny `ModeChip` w history nadal istnieje (inny visual — px-3/bg-white/text-xs), shared `Chip` pokrywa Type chipy.
- Brak nowych regressionow w cyklu 2.
- Quality gate cykl 2: typecheck + lint PASS.

**Wzorzec do utrwalenia w `learned-patterns.md`** (do `/dev-compound`):
- `combineDateAndTimeInAppTz` jako jedyny sposob laczenia date+time z native pickerow w app tz; NIE rob `setHours` recznie.

## Log fazy 4 (2026-05-27)

### Wykonane
- Migracja `0009_realtime_publication.sql` — `alter publication supabase_realtime add table public.sessions` w bloku `do $$ ... exception when duplicate_object` (idempotent). Alternatywa manualna w Supabase Studio (Database -> Replication -> publication tables).
- Hook `src/features/sessions/useRealtimeSessions.ts` (45 LOC) — subskrypcja `supabase.channel().on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'child_id=eq.X' })`, invalidate `['sessions']` przy kazdym evencie, cleanup przez `supabase.removeChannel` w useEffect return.
- `src/app/(app)/_layout.tsx` — wywolanie `useRealtimeSessions(activeChildId)` na poziomie tabs layoutu (zyje przez caly sesja zalogowanego usera).
- `docs/active/mvp-sleep-tracker/manual-test-faza-4.md` — 8 scenariuszy manual: INSERT/UPDATE/DELETE propagacja A->B, offline->online resync, bilateralnosc, cleanup po wylogowaniu, opcjonalny test multi-child filter.

### Odchylenia od planu
- Plan zakladal "Wlaczyc replication w Supabase Studio" jako manual step. Wybralem alternatywe: migracja SQL (idempotent, reproducible dla local supabase dev), userowi pozostaje zaaplikowanie migracji (lub manualny toggle w Studio jezeli projekt cloud-only bez supabase CLI). Status w `manual-test-faza-4.md` jako wymaganie wstepne.
- Filter `child_id=eq.X` zawiera tylko aktywne dziecko (z `useActiveChild` w Zustand). Dla multi-child UI (przelaczenie dziecka) hook zostanie re-subskrybowany — pokrywa wymaganie planu bez koniecznosci subskrybowania calej rodziny.

### Decyzje implementacyjne Fazy 4
- **Channel name `sessions:child=${childId}`** — unikalny per child, bezpieczny dla przyszlego multi-child UI (osobne kanaly nie kolidaja).
- **Invalidate szerokiego klucza `['sessions']`** zamiast point-fixu (`['sessions', childId, 'active']`) — pokrywa wszystkie observery (useSessions/useActiveSession/useLastEndedSession/useSessionById) jednym wywolaniem. Cena: kilka extra refetchy dla nieobservowanych zapytan; TanStack inviguje tylko aktywne observery, wiec realny koszt = 0.
- **NIE patchujemy cache recznie** — zgodnie z CLAUDE.md ("Realtime: event z Supabase -> queryClient.invalidateQueries"). Eliminuje cala klase bugow synchronizacji (out-of-order events, brakujace pola w payloadzie postgres_changes).
- **Hook return `void`** — efekty pchaja inwalidacje do TanStack, nic do konsumpcji w UI.
- **Subskrypcja w `(app)/_layout.tsx`** — przezywa nawigacje miedzy zakladkami, restart tylko przy zmianie `activeChildId`. Cleanup gwarantowany przez React.useEffect.

### Walidacja
- `npx tsc --noEmit` -> PASS (0 błędów)
- `npm run lint` -> PASS (0 errors, 0 warnings)
- Manual mobile testing: pending — checklist w `manual-test-faza-4.md` (8 scenariuszy, two-device sync, offline->online).

### Code review (2026-05-27)

Severity gate: ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** (0 × P1, 1 × P2, 3 × P3). Pełny raport: `review-faza-4.md`.

Kluczowy finding P2: `useSessionById` queryKey `['session', id]` (singular) nie matchuje invalidacji `['sessions']` (plural) z `useRealtimeSessions`. Konsekwencja: otwarty ekran edycji nie odswieza sie na realtime event → silent overwrite gdy partner edytuje rownolegle. Decyzja przed Fazą 5: (a) double-invalidate `['sessions']` + `['session']`, (b) banner "Sesja byla edytowana" (Faza 3 P3 backlog), albo (c) swiadome odlozenie + komentarz w hooku.

3 × P3 to nity: `queryClient` w dep array (linter wymaga, ale stabilny ref); brak callbacka statusu w `.subscribe()` (observability); brak scenariusza długiego offline w manual checklist (zalezy na refocus refetch z `focusManager`).

Manual mobile checklist (8 scenariuszy + 2 prerequisites): pending operator, wymagane two-device test przed Faza 5.

### Code review cykl 2 (2026-05-27, po fix `67303b1`)

Severity gate: ✅ **GOTOWE DO KONTYNUACJI** (0 × P1, 0 × P2, 3 × P3 backlog opcjonalny). Pelny raport: `review-faza-4.md` sekcja "Cykl 2".

- P2 z cyklu 1 (useSessionById nie inwalidowany) zamkniety w `67303b1`. Dodana `invalidateQueries({ queryKey: ['session'] })` w `useRealtimeSessions:50` obok istniejacej `['sessions']`. Komentarz w hooku wyjasnia rationale, bezpieczenstwo (form === null guard w `session/[id].tsx`) oraz TODO do Fazy 5/6 (banner konfliktow przy dirty form, wymaga kolumny `updated_at`).
- Brak regresji: analiza multi-perspective (security, performance, architecture, scenario) — fix to additive invalidate. Form overwrite niemozliwy: useState w `session/[id].tsx:33` inicjalizowany RAZ przez useEffect z guardem `form === null` (linia 39).
- Quality gate cykl 2: `npx tsc --noEmit` PASS, `npm run lint` PASS.
- Pozostale 3 × P3 nity (queryClient dep array, .subscribe status callback, dluzszy offline scenariusz) zostaja w backlogu — opcjonalne, niepilne.
- Mobile-manual: 2 × `Weryfikacja:` w zadania.md + 10 scenariuszy (8 + 2 pre) w `manual-test-faza-4.md` pozostaja `[ ]` dla operatora (two-device test).

## Faza 5 — Powiadomienia (2026-05-27)

### Co zostalo zrobione

- `npx expo install expo-notifications` → `~0.32.17` w dependencies, plugin dodany do `app.json`.
- `src/lib/notifications.ts` — `configureNotificationHandler()`, `requestPermissions()`, `scheduleNapNotification()`, `cancelNapNotification()`. Handler skonfigurowany modulowo w `app/_layout.tsx` (raz przed mount).
- `src/lib/time.ts` — dodana `targetWakeWindowMinutes(birthDate, now?)` z tabela 75/105/150/180/240 min.
- `src/features/sessions/schedule-nap-side-effects.ts` — helpery `rescheduleNapNotification`, `cancelNapNotificationSafe`, `rescheduleAfterDelete`. Fire-and-forget z `console.warn` na bledy.
- `hooks.ts` zintegrowane: `useStartSession.onSuccess` → cancel; `useEndSession.onSuccess` → schedule; `useUpdateSession.onSuccess` → reschedule; `useDeleteSession.onSuccess` → recalculate (query last ended).
- `AddChildForm.onSuccess` → `requestPermissions()` (idempotent, prompt tylko raz przy pierwszym dziecku).
- Polski tekst: "Drzemka {imie} za ~15 min" + body z windowem aktywnosci.
- AsyncStorage klucz `nap-notif-${childId}` persistuje notification ID; `cancelNapNotification` zawsze wolany przed nowym schedule.
- Android channel "Drzemki" (`default` ID, `AndroidImportance.HIGH`) tworzony przy permission grant.

### Kluczowe decyzje architekturalne

- **Side-effects scentralizowane w hookach (`hooks.ts`)**, nie w UI. Caller (index.tsx, session/[id].tsx) nie wie nic o powiadomieniach. Pozwala dodac nowy caller bez duplikacji logiki.
- **Fire-and-forget side-effects**: powiadomienia nie blokuja sukcesu mutacji. Jesli brak permissions / sieci / cokolwiek — `console.warn`, mutation kontynuuje. Spojne z pattern z `cancelNapNotificationSafe` / `rescheduleNapNotification` try/catch wewnetrzne.
- **birth_date + name pobierane przez 1-row query**, nie z TanStack cache (caller nie ma familyId w hooku). Runs tylko po mutacji, nie w render loop. Akceptowalne dla MVP.
- **Permission request opozniony do "po dodaniu pierwszego dziecka"**, nie przy starcie app. Lepszy UX: user widzi kontekst (apka do snu) gdy system pyta o uprawnienia.
- **`useUpdateSession` przeplanowuje wzgledem TEJ sesji**, nie wzgledem "ostatniej zakonczonej". Uproszczenie MVP — typowy use case to edycja ostatniej. Edycja starej sesji daje lekko nadgorliwe reschedule; do dopracowania w Fazie 6.
- **WAKE_WINDOW wartosci to MVP-przyblizenie**: 1 miesiac = 30 dni (kalkulacja age w `targetWakeWindowMinutes`). Dla precyzji kalendarzowej (np. liczenie pelnych miesiecy) — wystarczy w MVP. Wartosci minutowe pochodza z popularnych poradnikow snu.

### Walidacja

- `npx tsc --noEmit` -> PASS (0 błędów)
- `npm run lint` -> PASS (0 errors, 0 warnings)
- Manual mobile testing: pending — `manual-test-faza-5.md` (8 scenariuszy + Scenariusz 7 manualnego REPL test dla `targetWakeWindowMinutes`).
- Brak unit testow `targetWakeWindowMinutes` — projekt nie ma setupu testow (zgodnie z CLAUDE.md). Scenariusz 7 w manual-test pokrywa weryfikacje.

### Review fazy 5 (2026-05-27, cykl 1)

**Severity gate: ⚠️ ZASTRZEŻENIA** — 0 × P1, 2 × P2, 5 × P3. Pełny raport: `review-faza-5.md`.

**Kluczowe findings:**

- 🟠 P2-1 `useUpdateSession` schedule wzgledem edytowanej sesji (nie ostatniej zakonczonej) — asymetria z `useDeleteSession.rescheduleAfterDelete`. Rekomendacja: rename `rescheduleAfterDelete` → `rescheduleFromLastEnded` i uzyc go z `useUpdateSession`.
- 🟠 P2-2 `useEndSession.onSuccess` cicho cancel gdy `data.end_at === null` (anomalia post-update). Dodac `console.warn` dla diagnostyki.
- 🟡 P3 × 5: channel id='default' (mylacy), 30-dni-miesiac w `targetWakeWindowMinutes`, brak explicit `channelId` w schedule, komentarz "po pierwszym dziecku" mylacy, brak deep-link handlera.

**Wnioski:**

- Implementacja kompletna wzgledem planu (§130-146). Wszystkie 5 zadan planu pokryte + bonus: jawny cancel przy startSession (plan tego nie wymagal).
- Architektura czysta: side-effects izolowane w `schedule-nap-side-effects.ts`, idempotentne, fire-and-forget z warningiem.
- Type safety: zero `any`, zero `!`, strict mode OK. Lint clean.
- Glowny dlug: symetria `useUpdateSession` ↔ `useDeleteSession` przy schedulowaniu. Praktycznie nie wystepuje (user typowo edytuje ostatnia sesje), ale tania naprawa.

### Re-review fazy 5 (2026-05-27, po cyklu fix 1)

**Severity gate: ✅ CZYSTE** — 0 × P1, 0 × P2, 5 × P3 backlog. Commit fix: `90dba65`.

- P2-1 naprawione: rename `rescheduleAfterDelete` → `rescheduleFromLastEnded`, uzyty zarowno w `useUpdateSession.onSuccess` jak i `useDeleteSession.onSuccess` (symetria reschedule mechanizmu). Brak stale references do starej nazwy.
- P2-2 naprawione: `useEndSession.onSuccess` loguje `console.warn` gdy `data.end_at === null` przed fallback cancel.
- Walidacja: `npx tsc --noEmit` PASS, `npm run lint` PASS.
- P3 (5 sugestii) pozostaje w backlogu — adresowane opcjonalnie w Fazie 6.
- Mobile-manual: 8 scenariuszy w `manual-test-faza-5.md` pending operator. Nie blokuje przejscia do Fazy 6.

## Faza 6 — Polish dla siebie (2026-05-27)

### Co zostalo zrobione

- **expo-haptics zainstalowany** (~15.0.8, SDK 54 compat). `BigActionButton.handlePress` wola `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` synchronicznie przed `onPress()` (fire-and-forget). Medium impact uzasadnienie: Light za delikatne dla glownego CTA, Heavy drazniace.
- **Dark mode `darkMode: 'media'`** w `tailwind.config.js` — bez manualnego togglera, czyta `Appearance` API natywnie. Dodane kolory `dark-bg` (`#0F0D26`), `dark-card` (`#1E1B4B`), `dark-surface` (`#2A2660`).
- **Dark variants na top-level surfaces:** ekrany Dzisiaj/Historia/Statystyki/Profil/Auth/session/[id] dostaly `bg-cream dark:bg-dark-bg`, tytuly `text-navy dark:text-cream`, subtitle `text-purple dark:text-cream/70`. Karty kolorowe (orange/navy ActiveWindowCard/SleepInProgressCard) zachowuja palete z mockupow w obu trybach (paleta sama w sobie spelnia kontrast WCAG AA na ciemnym tle).
- **BigActionButton dark variant** — `bg-navy dark:bg-purple` (zachowuje rozpoznawalnosc na ciemnym tle).
- **TabBar dark mode** w `(app)/_layout.tsx` przez `useColorScheme()` z `react-native` (expo-router Tabs nie wspiera `className`). Aktywny tab `#F5F0E8` w dark, `#1E1B4B` w light.
- **`eas.json` utworzony** z 3 profilami (development: developmentClient + distribution internal, preview, production). `cli.appVersionSource: "remote"`.
- **`eas init` NIE wykonany autonomicznie** — wymaga `eas login` (interaktywne). Manual instructions w `manual-test-faza-6.md` scenariusz 6.
- **Ikony aplikacji ZACHOWANE** z template Expo (1024x1024 icon.png, android-icon-foreground 512x512, splash-icon 228x213). Zakres "polish dla siebie" nie wymaga custom design.

### Odchylenia od planu

- EAS init pominiete autonomicznie (wymaga loginu) — user wykonuje wg `manual-test-faza-6.md`.
- App icon + splash zachowane z template (placeholder). Custom design = post-MVP decyzja.
- Dark mode tryb `media` zamiast `class` — brak manualnego togglera UI (out of scope MVP, nie ma sekcji Settings).

### Decyzje implementacyjne Fazy 6

- **Selective dark variants**: tylko ekrany glowne i kluczowe komponenty (BigActionButton). Pomocnicze karty (ActiveWindowCard pomaranczowa, SleepInProgressCard granatowa) zachowuja paleta bo to ich definicja w mockupach. Wczesna nadgorliwosc dark variants na wszystkich elementach = niespojnosc z designem.
- **`useColorScheme` z `react-native`** w `(app)/_layout.tsx`, NIE z `nativewind`. Tabs API expo-router wymaga `screenOptions` z hex values (brak className na tabBar), wiec uzyto natywnego API systemu.
- **Haptics fire-and-forget**: brak `await`, brak `try/catch`. expo-haptics gracefully ignoruje brak Haptic Enginu (zwraca void). Strategia spojna z `cancelNapNotificationSafe` z Fazy 5.

### Walidacja

- `npx tsc --noEmit` PASS (0 bledow).
- `npm run lint` PASS (0 bledow).
- Mobile-manual: 7 scenariuszy w `manual-test-faza-6.md` (haptic x2, dark mode iOS/Android, visual mockup parity, EAS build instrukcje, TestFlight opcjonalne). Pending operator.

### Co zostalo dla usera (manual)

- `eas login` + `eas init` (interaktywne)
- `eas build --profile development --platform android|ios` (~10-15 min cloud build)
- TestFlight (Apple Developer $99 + App Store Connect)
- Custom ikona/splash design (opcjonalne, post-MVP)
- 7 scenariuszy manual mobile testing
