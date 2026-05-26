# Plan: MVP — Aplikacja do trackowania snu i okien aktywności dziecka

**Branch:** `feature/mvp-sleep-tracker`
**Ostatnia aktualizacja:** 2026-05-26

## Źródła
- Requirements doc: brak (nie użyto `/dev-brainstorm`)
- Plan techniczny: brak (nie użyto `/dev-plan`)
- Plan źródłowy: `PLAN.md` (root projektu)

## Podsumowanie wykonawcze

Aplikacja mobilna (iOS + Android, jeden codebase) do trackowania snu noworodka/niemowlęcia: drzemki, sen nocny, okna aktywności pomiędzy. Sync między telefonem matki i ojca od dnia 1. Stack: **Expo (React Native + TypeScript) + Supabase + TanStack Query**.

MVP = working app dla rodziny (1–2 dzieci, 2 użytkowników synchronizowani). Monetyzacja i publikacja w sklepach to późniejsze fazy poza zakresem MVP.

## Cele i zakres

### W zakresie MVP
- Auth (email/password) + model rodziny współdzielonej przez dwóch userów
- CRUD sesji snu (drzemka / sen nocny) z timerem real-time
- Historia sesji dnia + edycja wstecz
- Sync realtime między urządzeniami (Supabase Realtime)
- Lokalne powiadomienia z predykcją końca okna aktywności
- Ekran „Dzisiaj" z agregatami (suma snu, liczba drzemek, najdłuższe okno aktywności)

### Poza zakresem MVP
- Statystyki/wykresy długoterminowe (zakładka Statystyki = placeholder)
- Wsparcie multi-child dropdown (jedno dziecko per family wystarczy do MVP — schema multi-child, UI single-child)
- Publikacja w sklepach (App Store / Play Store)
- Social login (Apple/Google)
- Subskrypcja / monetyzacja (RevenueCat)
- Local-first offline sync (Powersync / Legend-State)
- Sentry / analityka

## Analiza obecnego stanu

- Greenfield: katalog `/Users/dawidbakalarski/Documents/projekty/sleeper` zawiera tylko `PLAN.md`, `README.md`, `.claude/`
- Brak istniejącego kodu aplikacji
- Brak konta Supabase / Apple Developer
- Mockupy istnieją (dwa screeny iPhone — „Okno aktywności" i „Sen w toku")

## Stan docelowy MVP

Działająca apka na własnym telefonie (przez Expo Go lub development build), połączona z Supabase, używana codziennie z partnerem. Drugie urządzenie loguje się tym samym kontem rodziny i widzi aktywne sesje w <2s.

## Fazy wdrożenia

### Faza 0 — Setup projektu (Effort: M, 1–2 dni)
**Cel:** Działający Expo project + Supabase project + bazowa nawigacja.

Zadania:
1. `npx create-expo-app@latest sleeper-app -t default` (template z Expo Routerem)
2. Setup TypeScript strict mode (w `tsconfig.json`)
3. Setup NativeWind v4 (babel plugin, metro config, globals.css)
4. Setup Supabase: stwórz projekt na supabase.com, zapisz keys w `.env`
5. Setup TanStack Query: provider w root layoutie
6. Bottom tabs layout: Dzisiaj / Historia / Statystyki / Profil (puste ekrany)
7. Pierwszy test: `npx expo start` → zeskanuj QR Expo Go → app się otwiera

**Kryteria akceptacji:**
- ✅ `npx expo start` uruchamia bundler bez błędów
- ✅ Tabs działają na fizycznym urządzeniu
- ✅ `supabase.from('test')` zwraca pustą odpowiedź (nie 401/network error)

### Faza 1 — Auth + model rodziny (Effort: M, 1–2 dni)
**Cel:** Dwóch userów może się zalogować do tej samej „rodziny" i współdzielić dane.

Zadania:
1. Migracja Supabase: `families`, `family_members` + RLS policies
2. Auth provider context: nasłuch `supabase.auth.onAuthStateChange`
3. Ekrany `(auth)/sign-in.tsx`, `(auth)/sign-up.tsx`
4. Trigger SQL: po insert do `auth.users` → auto-create `families` row + `family_members(role='owner')`
5. Ekran „Profil" → sekcja „Rodzina" → przycisk „Zaproś partnera"
6. Zaproszenia (MVP-uproszczone): pole „email partnera" + przycisk → wpis do `family_invitations(email, family_id)`; po sign-up usera tym emailem → trigger dodaje go do `family_members`

**Kryteria akceptacji:**
- ✅ Sign-up dwóch userów + invite → oboje widzą tę samą rodzinę w `family_members`
- ✅ RLS: user A nie widzi rodziny usera B (test ręczny przez supabase studio)

### Faza 2 — Children + sesje (rdzeń MVP) (Effort: XL, 3–5 dni)
**Cel:** Widok „Dzisiaj" z mockupów — działa start/stop snu, agregaty, historia dnia.

Zadania:
1. Migracja: `children`, `sessions` z constraint `partial unique index on (child_id) where end_at is null`
2. Onboarding po pierwszym sign-up: ekran „dodaj dziecko" (imię, data urodzenia)
3. Hook `useActiveChild` (Zustand persisted)
4. Hook `useActiveSession(childId)` — `sessions where child_id=? and end_at is null`
5. Hook `useSessionTimer(startAt)` — tick interval 1s, format `HH:MM:SS`
6. Komponent `<ActiveWindowCard />` — pomarańczowa karta z mockupu #1 (okno aktywności trwa od końca ostatniej sesji)
7. Komponent `<SleepInProgressCard />` — granatowa karta z mockupu #2 (sesja w toku)
8. Komponent `<TodayStatsCard />` — agregaty (mockup obie)
9. Akcja „Rozpocznij sen" → INSERT session(type='night_sleep' lub 'nap', start_at=now())
10. Akcja „Zakończ sen" → UPDATE end_at=now()
11. Quick actions: „Drzemka teraz", „Sen nocny", „Dodaj wstecz" (modal z time picker)
12. Ekran pełnoekranowy snu z `expo-keep-awake`

**Kryteria akceptacji:**
- ✅ Start sesji → karta zmienia kolor i nagłówek („Sen w toku")
- ✅ Zamknij i otwórz app → timer kontynuuje (czas liczony z `start_at`)
- ✅ „Dodaj wstecz" pozwala wpisać sesję z dowolnymi czasami w przeszłości
- ✅ Agregat „Dzisiaj 13g 35m" zgodny ze sumą sesji z dziś

### Faza 3 — Historia + edycja (Effort: M, 2 dni)
**Cel:** Lista sesji dnia z mockupu #2 + edycja pojedynczej sesji.

Zadania:
1. Sekcja „Sesje dzisiaj" na ekranie Dzisiaj (5 ostatnich) + link „Pokaż wszystkie"
2. Ekran `history.tsx` — lista wszystkich sesji + day picker w headerze
3. Ekran `session/[id].tsx` — edycja `start_at`, `end_at`, `type`, `notes` + przycisk Usuń
4. Helpery `lib/time.ts` — formatery PL (`1g 43m`, `09:30 → 11:13`)

**Kryteria akceptacji:**
- ✅ Edycja sesji aktualizuje agregaty „Dzisiaj"
- ✅ Day picker pozwala przejść do wczoraj / 7 dni wstecz
- ✅ Usunięcie sesji potwierdzane confirmem

### Faza 4 — Realtime sync (Effort: S, 1 dzień)
**Cel:** Drugi telefon widzi zmiany w <2s.

Zadania:
1. Hook `useRealtimeSessions(familyId)` — subskrypcja Supabase Realtime na `sessions`
2. Inwalidacja TanStack Query queries przy każdym event (INSERT/UPDATE/DELETE)
3. Włączyć replication na tabeli `sessions` w Supabase Studio

**Kryteria akceptacji:**
- ✅ Telefon A startuje sen → telefon B widzi aktywną sesję w <2s
- ✅ Telefon A wyłącza wifi → akcja → włącza wifi → telefon B dostaje update

### Faza 5 — Powiadomienia (Effort: M, 1–2 dni)
**Cel:** „Drzemka za ~15 min" notyfikacja.

Zadania:
1. Request permissions przy onboardingu (`expo-notifications`)
2. Tabela referencyjna w `lib/time.ts`: target wake window per wiek dziecka
3. Helper `scheduleNapNotification(childId, lastSleepEndAt, birthDate)`:
   - Oblicz oczekiwany koniec okna aktywności
   - Schedule notyfikacja na `target - 15min`
   - Zapisz ID w AsyncStorage (klucz `nap-notif-${childId}`)
4. Po INSERT/UPDATE sesji → anuluj poprzednią notyfikację + zaplanuj nową
5. Po DELETE ostatniej sesji → anuluj

**Kryteria akceptacji:**
- ✅ Zakończ drzemkę → notyfikacja zaplanowana (sprawdź w iOS Settings → Notifications)
- ✅ Edycja sesji aktualizuje czas notyfikacji
- ✅ Start nowej sesji anuluje notyfikację

### Faza 6 — Polish dla siebie (Effort: S, 1 dzień)
**Cel:** Apka wygląda i działa wystarczająco dobrze, żeby używać codziennie.

Zadania:
1. App icon, splash screen (assety w `assets/`)
2. Dark mode (NativeWind dark variant)
3. Haptics przy start/stop snu (`expo-haptics`)
4. EAS development build na własny telefon (żeby Expo Go nie był wymagany)
5. (Opcjonalnie) Konto Apple Developer + TestFlight dla partnera

**Kryteria akceptacji:**
- ✅ App nadaje się do używania bez bundlera włączonego
- ✅ Wygląda zgodnie z mockupami (paleta, fonty, spacing)

## Ocena ryzyka i mitygacje

| Ryzyko | Prawd. | Wpływ | Mitygacja |
|---|---|---|---|
| iOS background notyfikacje nie odpalają | Średnia | Wysoki | Test wczesny w Fazie 5; fallback: powiadomienia tylko w foreground |
| RLS źle skonfigurowane → wyciek danych innej rodziny | Niska | Krytyczny | Test ręczny w Fazie 1 z dwoma kontami; check listy w `coding-rules.md` |
| Supabase Realtime zrywa połączenie po timeoutie | Średnia | Średni | TanStack Query + auto-refetch on focus jako fallback (już jest w domyślnej konfiguracji) |
| Niezgodność stref czasowych (UTC vs Europe/Warsaw) | Wysoka | Średni | Zawsze przechowuj `timestamptz`, formatuj client-side z `Europe/Warsaw` |
| Konflikt: oboje rodzice startują sesję jednocześnie | Niska | Niski | Partial unique index → drugi INSERT padnie z błędem → toast „już jest aktywna sesja" |
| Skok złożoności RN (pierwsza apka) | Średnia | Średni | Tabs + jeden ekran w Fazie 0 jako warm-up; konsultacja docs Expo per komponent |

## Mierniki sukcesu MVP

1. **Dzienne użycie**: używasz appki min. 5 dni z rzędu bez ręcznego debug
2. **Multi-device**: partner aktualizuje sesję z drugiego telefonu i widzisz to bez restartu
3. **Powiadomienia**: dostajesz notyfikację „drzemka za ~15 min" co najmniej raz dziennie
4. **Brak utraconych danych**: zero sesji zniknęło z historii po refresh / restart

## Wymagane zasoby i zależności

### Zewnętrzne
- Konto Supabase (free tier wystarczy na MVP)
- Konto Expo (free, do EAS Build)
- Node 20+, npm/pnpm
- iPhone lub Android telefon z zainstalowanym Expo Go (na czas dev)

### Opcjonalne (Faza 6+)
- Apple Developer Program ($99/rok) — dla TestFlight i własnego development build na iOS
- Google Play Developer ($25 jednorazowo) — dla Internal Testing

### Pakiety npm (główne)
- `expo`, `expo-router`, `expo-notifications`, `expo-keep-awake`, `expo-haptics`
- `react-native`, `react`
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `zustand`
- `nativewind`, `tailwindcss`
- `date-fns`, `date-fns-tz`

## Szacunki czasowe

| Faza | Effort | Dni (solo, after-hours) |
|---|---|---|
| 0 — Setup | M | 1–2 |
| 1 — Auth | M | 1–2 |
| 2 — Sesje (rdzeń) | XL | 3–5 |
| 3 — Historia | M | 2 |
| 4 — Realtime | S | 1 |
| 5 — Powiadomienia | M | 1–2 |
| 6 — Polish | S | 1 |
| **Suma MVP** | | **10–15 dni roboczych** |

Realistycznie kalendarzowo (1–2h dziennie po dziecku 😉): **3–5 tygodni**.

## Następne kroki

Po zatwierdzeniu tego planu:
```
/dev-docs-execute docs/active/mvp-sleep-tracker
```

Każda faza zostanie wykonana jako osobny commit/PR z weryfikacją.
