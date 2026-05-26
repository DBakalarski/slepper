# Plan: Aplikacja mobilna do trackowania snu i okien aktywności dziecka

## Context

Cel: aplikacja mobilna (iOS + Android) do śledzenia snu noworodka/niemowlęcia — sesje snu nocnego, drzemek, okien aktywności między nimi. Pierwotnie dla własnego użytku (z partnerem/partnerką synchronizującymi się między dwoma telefonami), z opcją publicznej monetyzacji w przyszłości.

Kluczowe wymagania funkcjonalne (MVP):
- Timer aktywnej sesji snu / okna aktywności (z mockupów)
- Historia sesji dnia z możliwością edycji
- Lokalne powiadomienia z predykcją „drzemka za ~Xg Ym"
- **Sync między dwoma telefonami od dnia 1** (oboje rodziców)

Wymagania niefunkcjonalne:
- Polskie UI (i18n od początku, łatwiej później dodać EN przy publikacji)
- Działa nawet jak app jest zamknięty (timer to `start_at` w DB, nie ticker w pamięci)
- Solo dev, JS/TS background bez doświadczenia w React Native

## Stack techniczny

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Framework | **Expo SDK 53+ (RN + TS)** | Jedna baza kodu iOS+Android, EAS Build w chmurze (nie wymaga Maca do dev), bardzo dobre wsparcie notyfikacji i background |
| Routing | **Expo Router** | File-based, oficjalny standard Expo, znajome dla kogoś z Next.js |
| Stylowanie | **NativeWind v4** | Tailwind dla RN — najmniejszy skok od web TS/Tailwind, ale jeśli nigdy nie tykałeś Tailwinda, wtedy `StyleSheet` |
| State / data | **TanStack Query + Zustand** | TanStack do danych z Supabase (cache, optimistic updates, realtime invalidation), Zustand do lokalnego UI state (np. aktywny timer w pamięci) |
| Backend | **Supabase** | Postgres + Auth + Realtime + RLS w jednym, generous free tier, łatwa migracja jakby kiedyś trzeba było zejść z platformy |
| Auth | **Supabase Auth + Apple/Google Sign-In** | Email/password do testów, social login przed publikacją |
| Notyfikacje | **expo-notifications** | Lokalne scheduled, działa offline, nie wymaga push servera na MVP |
| Daty | **date-fns + locale `pl`** | Mniejszy bundle niż Moment, dobra obsługa stref czasowych |
| Wykresy (faza 2) | **victory-native** lub **react-native-gifted-charts** | Decyzja gdy będziesz robił zakładkę Statystyki |
| Build/deploy | **EAS Build + EAS Submit** | Buildy w chmurze, deploy do TestFlight i Internal Testing |

**Świadomie pominięte (na MVP):**
- Local-first sync (Legend-State, Powersync, WatermelonDB) — przyniosłoby prawdziwy offline, ale podnosi złożoność o rząd wielkości. Supabase + TanStack Query daje wystarczające UX dla appki z lekko interaktywnymi sesjami. Dodać gdy poczujesz ból offline.
- Sentry / analityka — dodać przed publikacją.
- RevenueCat — przy monetyzacji.

## Model danych (Postgres / Supabase)

```sql
-- Rodzina = grupa współdzieląca dane (matka + ojciec + ew. babcia)
families (id uuid pk, name text, created_at timestamptz)

-- Powiązanie usera z rodziną (membership)
family_members (
  id uuid pk,
  family_id uuid fk,
  user_id uuid fk auth.users,
  role text check (role in ('owner','member')),
  created_at timestamptz
)

children (
  id uuid pk,
  family_id uuid fk,
  name text,
  birth_date date,
  avatar_color text,
  -- konfigurowalne cele długości okien aktywności wg wieku
  created_at timestamptz, updated_at timestamptz
)

sessions (
  id uuid pk,
  child_id uuid fk,
  type text check (type in ('night_sleep','nap')),
  start_at timestamptz not null,
  end_at timestamptz null, -- null = w toku
  notes text,
  created_by uuid fk auth.users,
  created_at timestamptz, updated_at timestamptz
)
```

**Decyzje schematu:**
- „Okno aktywności" NIE jest osobną encją — to po prostu gap między `end_at` poprzedniej sesji a `start_at` następnej (lub `now()` jeśli trwa). Daje to spójność: nie ma stanu pośredniego do synchronizacji.
- `end_at = null` oznacza sesję w toku. Najwyżej jedna na dziecko (constraint partial unique index).
- RLS: SELECT/INSERT/UPDATE/DELETE tylko dla członków `families` powiązanych przez `family_members`.

## Architektura na wysokim poziomie

```
┌─────────────────────────────────────────┐
│  Expo App (iOS + Android, jeden codebase)│
│                                          │
│  UI (NativeWind) ── Expo Router          │
│       │                                  │
│       ├── TanStack Query (server state) ─┼──► Supabase REST
│       ├── Zustand (UI state)             │     + Realtime
│       └── expo-notifications (lokalne)   │     (Postgres + Auth + RLS)
└─────────────────────────────────────────┘
```

- Timer aktywnej sesji: komponent czyta `start_at` z `sessions where end_at is null` i renderuje czas przez `useEffect` z interwałem 1s. Nie przechowuje tickera w bazie.
- Sync między telefonami: Supabase Realtime subskrypcja na tabelę `sessions` filtrowane po `family_id` → automatyczna inwalidacja TanStack Query.
- Notyfikacje predykcyjne: po zakończeniu sesji snu obliczamy oczekiwany koniec okna aktywności (na razie: prosty target wg wieku dziecka, np. tabela referencyjna) i `Notifications.scheduleNotificationAsync` na 15 min wcześniej. Reschedule przy edycji.

## Struktura projektu (Expo Router)

```
app/
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (app)/
    _layout.tsx           # bottom tabs
    index.tsx             # „Dzisiaj" (mockup #1 i #2)
    history.tsx           # „Historia"
    stats.tsx             # „Statystyki" (placeholder MVP)
    profile.tsx           # „Profil" + ustawienia dziecka
    session/[id].tsx      # edycja pojedynczej sesji
  _layout.tsx             # root: providery (Query, Auth, NativeWind)

src/
  lib/
    supabase.ts           # klient + typy z `supabase gen types`
    notifications.ts      # helpery do schedule/cancel
    time.ts               # formatery PL, oblicznia okien
  features/
    sessions/
      api.ts              # queries i mutations TanStack Query
      useActiveSession.ts # hook do aktywnej sesji + realtime
      useSessionTimer.ts  # tickujący timer dla widoku
    children/
      api.ts
      useActiveChild.ts   # wybrane dziecko (Zustand, persisted)
  components/             # presentational, reużywalne
  stores/
    ui.ts                 # Zustand: aktywny child, motyw itd.

supabase/
  migrations/             # SQL schema
  seed.sql                # dev data
```

## Etapy implementacji

### Faza 0 — Setup (1–2 dni)
1. `npx create-expo-app@latest -t default` (template TS), włącz Expo Router
2. Setup NativeWind v4
3. Setup Supabase project (cloud), zapisz `EXPO_PUBLIC_SUPABASE_URL` i `ANON_KEY` w `.env`
4. Setup TanStack Query Provider w `app/_layout.tsx`
5. Pierwszy build na własny telefon przez Expo Go (zeskanowanie QR)

### Faza 1 — Auth + rodzina (1–2 dni)
1. Migracja: tabele `families`, `family_members`, RLS policies
2. Ekrany sign-in/sign-up (Supabase Auth)
3. Po sign-up: auto-tworzenie `families` row + `family_members` z rolą `owner`
4. Ekran „zaproś partnera" (deep link z tokenem zaproszenia — może być MVP-uproszczone do „podaj email partnera, dodajemy go do rodziny po jego sign-up")

### Faza 2 — Children + sesje (3–5 dni)
1. Migracja: tabele `children`, `sessions` + RLS + indeksy
2. Onboarding: dodaj pierwsze dziecko (imię, data urodzenia)
3. Ekran „Dzisiaj":
   - Karta aktywnej sesji / okna aktywności (mockup #1 i #2)
   - Big button „Rozpocznij sen" → `INSERT sessions (type, start_at=now())`
   - Aktywna sesja: dotknij timera → ekran „pełny ekran" z `expo-keep-awake`
   - „Zakończ sen" → `UPDATE end_at=now()`
4. Quick actions: „Drzemka teraz", „Sen nocny" (te same mutacje z różnym `type`)
5. „Dodaj wstecz" — modal z time picker
6. Karta „Dzisiaj" z agregatami (suma snu, liczba drzemek, najdłuższe okno aktywności)

### Faza 3 — Historia + edycja (2 dni)
1. Lista sesji dnia (mockup #2 dół)
2. Tap → ekran edycji `session/[id].tsx` (zmiana czasów, usunięcie)
3. Filtr po dacie (header z chooserem dnia)

### Faza 4 — Realtime sync (1 dzień)
1. Subskrypcja Supabase Realtime na `sessions` filtrowane po `child_id`
2. Inwalidacja TanStack Query queries przy event
3. Test ręczny: dwie instancje (telefon + Expo Go na drugim) → operacje na jednej widoczne na drugiej w <1s

### Faza 5 — Powiadomienia (1–2 dni)
1. Request permissions przy onboardingu
2. Helper `scheduleNapWindowNotification(childId)`:
   - Po `end_at` snu → policz target wake window (lookup wg wieku z `lib/time.ts`)
   - Schedule notyfikacja na (target − 15 min)
   - Anuluj przy starcie nowej sesji snu / edycji
3. Persist zaplanowanych notyfikacji ID lokalnie (AsyncStorage) żeby móc anulować

### Faza 6 — Polish dla siebie (1 dzień)
1. EAS development build na własny iPhone/Android (jednorazowe konto Apple $99 jeśli iOS)
2. App icon, splash, dark mode
3. Drobne UX: haptics przy start/stop, dźwięk opt-in

## Krytyczne pliki/decyzje do podjęcia podczas implementacji

- `src/lib/supabase.ts` — generuj typy: `supabase gen types typescript --project-id=...` (po każdej migracji)
- `src/lib/time.ts` — tabela targetów wake window wg wieku (np. 0–3mc: 60–90 min, 3–6mc: 90–120 min, itd. — sprawdzić źródła np. „Mama, daj mi spać")
- RLS policies — testować ręcznie z dwóch userów, łatwy strzał w stopę
- `useActiveSession` hook — single source of truth dla „czy timer ma się kręcić"

## Weryfikacja end-to-end (jak sprawdzić że MVP działa)

1. **Setup**: `npm install && npx expo start` → zeskanować QR Expo Go → app się otwiera
2. **Auth**: sign-up nowym kontem → ląduje na onboardingu → dodaje dziecko → ląduje na „Dzisiaj"
3. **Sesja w toku**: tap „Rozpocznij sen" → timer się kręci → zamknij app w pełni → otwórz po 5 min → timer pokazuje ~5 min (czas liczony z `start_at`)
4. **Multi-device**: zainstaluj na drugim telefonie, zaloguj partnera, dodaj do rodziny → telefon A startuje sen → telefon B widzi aktywną sesję w <2s
5. **Edycja historii**: tap sesję z historii → zmień czas startu → wróć → karta „Dzisiaj" pokazuje zaktualizowane sumy
6. **Notyfikacja**: zakończ drzemkę → ustaw zegar systemowy na 14 min do przodu (lub poczekaj) → notyfikacja „Drzemka za ~15 min" się pojawia
7. **Realtime offline**: na telefonie A wyłącz wifi → start sesji → włącz wifi → telefon B dostaje update w <5s (Supabase queue)

## Czego nauczyć się przed startem (skoro nie RN)

Krótka lista zasobów (max 1 dzień na przegląd):
- React Native dla web devów: oficjalna dokumentacja Expo „Get started" — różnice `View` vs `div`, `Text` zawsze wymagany dla tekstu, `Pressable` zamiast `<button>`
- Expo Router docs — file-based routing i layouts (znajome z Next.js)
- Supabase JS quickstart dla RN
- NativeWind v4 setup guide (jeśli wybierasz)

Pierwsze trudności typowo: brak `console.log` widocznych w przeglądarce (są w terminalu Expo), `flex` działa inaczej (default to column, flex:1 fill), brak hover (Pressable + `pressed` state).
