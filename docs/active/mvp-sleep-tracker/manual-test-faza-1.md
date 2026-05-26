# Manual Test Checklist — Faza 1 (Auth + model rodziny)

**Faza:** 1 (Auth + model rodziny)
**Data wygenerowania:** 2026-05-26
**Ostatnia aktualizacja:** 2026-05-26 (cykl 2 — consent flow)
**Tester:** dawid (solo dev)
**Cel:** zaznaczyć dwa pozostałe checkboxy `Weryfikacja:` w `mvp-sleep-tracker-zadania.md`:
1. Sign-up dwóch userów + invite → oboje widzą tę samą rodzinę w `family_members`.
2. RLS: user A NIE widzi family usera B.

Wykonaj na fizycznym urządzeniu w Expo Go (lepiej 2 urządzenia dla testów sync). W razie braku drugiego telefonu — drugi user testowany przez wylogowanie i ponowny sign-in na tym samym urządzeniu (kroki oznaczone `[1-device fallback]`).

> **Zmiana w cyklu 2 (commit 4eb8275):** Trigger przy sign-upie NIE akceptuje automatycznie zaproszeń. User dostaje solo-rodzinę, a pending invitations są pokazywane jako banner na ekranie „Dzisiaj". User musi explicit kliknąć „Dolacz" — wtedy solo-rodzina jest atomic zamieniana na rodzinę z invitation. Dodano też fallback „Stwórz rodzinę" w profilu (gdy brak membership).

---

## Setup

- [ ] Expo Go zainstalowane na iOS (telefon A — iPhone)
- [ ] Expo Go zainstalowane na Android (telefon B — Pixel/Samsung) lub akceptujesz 1-device fallback
- [ ] `cd sleeper-app && git pull && npm install` — bez błędów
- [ ] `npx tsc --noEmit` — 0 błędów
- [ ] `npx expo start` w `sleeper-app/` → QR code widoczny
- [ ] Tel. A skanuje QR → bundle ładuje się bez czerwonego ekranu
- [ ] Tel. B skanuje QR (jeśli używasz) → bundle ładuje się bez czerwonego ekranu
- [ ] Supabase Studio otwarte: `https://supabase.com/dashboard/project/<id>` → Table Editor + SQL editor (do query weryfikacji)
- [ ] Skrzynka pocztowa z dostępem do dwóch unikalnych emaili (np. `dawid+a@…` i `dawid+b@…` — Gmail subaddressing trafia w jedną skrzynkę)
- [ ] Wyczyść stan: w Expo Go menu (shake/dev menu) → „Reload" + jeśli była wcześniejsza sesja → wyloguj się w app, lub w Supabase Studio: SQL `delete from auth.users where email like 'dawid+%';` (sprzątanie testowe)

> **Konwencja loginów testowych:**
> - User A: `dawid+a@gmail.com` / `TestA1234!`
> - User B: `dawid+b@gmail.com` / `TestB1234!`
> - User C (do RLS isolation + multi-invite): `dawid+c@gmail.com` / `TestC1234!`
> - User D (do scenariusza pre-existing account): `dawid+d@gmail.com` / `TestD1234!`

---

## Scenariusz 1 — Invite + consent flow (ZAZNACZA CHECKBOX 41)

> **CYKL 2 REWORK:** B sign-upem dostaje solo-rodzinę. Banner pending invitations na „Dzisiaj" pokazuje zaproszenie z A. B klika „Dolacz" → atomic switch (solo-rodzina B usunięta, B dołączony do fam_A).

### 1.A Sign-up usera A (telefon A)

- [ ] 1.A.1 Otwórz app na tel. A → automatyczny redirect na `(auth)/sign-in`
  - **Expected:** widoczny formularz logowania (pole Email, Password, button „Zaloguj"), link „Nie masz konta? Załóż"
  - **Verify:** UI Expo Go
- [ ] 1.A.2 Tap link „Załóż konto" → przejście na `(auth)/sign-up`
  - **Expected:** stack push animation, formularz sign-up
- [ ] 1.A.3 Wpisz `dawid+a@gmail.com` / `TestA1234!` → tap „Zarejestruj"
  - **Expected:** loading spinner na buttonie, po ~2s redirect do `(app)/index` (ekran „Dzisiaj")
  - **Expected na ekranie „Dzisiaj":** BRAK bannera pending invitations (A nie ma żadnego zaproszenia)
  - **Verify (Supabase Studio):** `auth.users` ma rekord A; `families` ma `fam_A` (solo-rodzina A); `family_members` ma `{user_id: A, family_id: fam_A, role: 'owner'}`
- [ ] 1.A.4 Tap tab „Profil"
  - **Expected:** sekcja „Rodzina" pokazuje 1 członka (user A), input „Email do zaproszenia" + button „Zaproś"

### 1.B User A zaprasza usera B

- [ ] 1.B.1 W sekcji „Rodzina" wpisz `dawid+b@gmail.com` → tap „Zaproś"
  - **Expected:** toast/inline success „Wysłano zaproszenie"; input czyści się
  - **Verify (Supabase Studio):** `family_invitations` ma rekord `{email: 'dawid+b@gmail.com', family_id: fam_A, status: 'pending'}`
- [ ] 1.B.2 Duplikat zaproszenia: ponownie wpisz `dawid+b@gmail.com` → „Zaproś"
  - **Expected:** błąd „Już zaproszony" lub idempotent no-op; dalej tylko 1 rekord pending

### 1.C Sign-up usera B + banner pending invitations

- [ ] 1.C.1 **[2 urządzenia]** Na tel. B otwórz app → `(auth)/sign-in` → „Załóż konto"
  - **[1-device fallback]** Na tel. A: Profil → „Wyloguj" → sign-in → „Załóż konto"
- [ ] 1.C.2 Wpisz `dawid+b@gmail.com` / `TestB1234!` → „Zarejestruj"
  - **Expected:** redirect do `(app)/index` (ekran „Dzisiaj")
  - **KRYTYCZNE Expected — NOWY consent flow:**
    - Ekran „Dzisiaj" pokazuje **banner pending invitations** z 1 zaproszeniem od „Rodzina A" (nazwa rodziny / email właściciela)
    - Banner ma button „Dolacz"
    - B JEST przypisany do solo-rodziny fam_B (NIE jeszcze do fam_A)
  - **Verify (Supabase Studio):**
    - `auth.users` ma rekord B
    - `families` ma 2 rodziny: fam_A i fam_B (solo-rodzina B utworzona przez trigger)
    - `family_members` ma 2 rekordy: `(A, fam_A, owner)`, `(B, fam_B, owner)` — B NIE jest jeszcze w fam_A
    - `family_invitations` ma rekord pending dla B → fam_A
- [ ] 1.C.3 Na banner kliknij „Dolacz"
  - **Expected:** loading state na bannerze; po ~1s banner znika; pojawia się toast/success „Dołączyłeś do rodziny"
  - **Expected (przepiana danych):** B widzi teraz dane rodziny A (np. ewentualne dzieci/sesje, w Fazie 1 puste); ekran odświeża się
  - **KRYTYCZNE Verify (Supabase Studio) — ATOMIC switch:**
    - `families` ma teraz **1 rodzinę** (fam_A) — fam_B została **usunięta** atomic w transakcji accept
    - `family_members` ma 2 rekordy: `(A, fam_A, owner)`, `(B, fam_A, member)` — solo-rodzina B zniknęła
    - `family_invitations` dla B → fam_A ma `status: 'accepted'` (lub jest skasowany)
    - **Total families count: 1** (NIE 2)
- [ ] 1.C.4 Tap tab „Profil"
  - **Expected:** sekcja „Rodzina" pokazuje 2 członków (A + B), oboje z tym samym `family_id = fam_A`

### 1.D Weryfikacja query w Supabase Studio (ZAZNACZA CHECKBOX 41)

- [ ] 1.D.1 W Supabase Studio → SQL editor:
  ```sql
  select fm.user_id, fm.family_id, fm.role, u.email
  from family_members fm
  join auth.users u on u.id = fm.user_id
  where fm.family_id = (
    select family_id from family_members
    where user_id = (select id from auth.users where email = 'dawid+a@gmail.com')
  );
  ```
  - **Expected:** dokładnie 2 wiersze, oba z tym samym `family_id`, role: owner (A) + member (B)
- [ ] 1.D.2 Sprawdź że nie ma osieroconej solo-rodziny B:
  ```sql
  select count(*) from families;
  -- Expected: 1 (fam_A); fam_B została usunięta przy accept
  ```
- [ ] 1.D.3 Zaznacz checkbox w `mvp-sleep-tracker-zadania.md` linia 41 jeśli powyższe PASS

---

## Scenariusz 2 — Solo-rodzina bez invite + RLS isolation (ZAZNACZA CHECKBOX 42)

> **CYKL 2 ZMIANA:** Trigger ZAWSZE tworzy solo-rodzinę przy sign-upie (nie różnicuje invite/no-invite). Test pokazuje że user bez invitations widzi tylko swoją rodzinę.

### 2.A Sign-up usera C (bez invitations)

- [ ] 2.A.1 **[2 urządzenia]** Na tel. A: Profil → „Wyloguj" → sign-in → „Załóż konto"
  - **[1-device fallback]** Zalogowany jako B z 1.C → wyloguj → sign-up C
- [ ] 2.A.2 Wpisz `dawid+c@gmail.com` / `TestC1234!` → „Zarejestruj"
  - **Expected:** redirect do `(app)/index`; ekran „Dzisiaj" — **BRAK bannera pending invitations** (C nie ma zaproszeń)
  - **Verify (Supabase Studio):**
    - `families` ma teraz 2 rodziny: fam_A (z A+B) i fam_C (solo C)
    - `family_members` dla C: `(C, fam_C, owner)`
    - `family_invitations` brak rekordów dla C
- [ ] 2.A.3 Profil → sekcja „Rodzina" pokazuje TYLKO usera C (1 członek)
  - **Expected:** lista nie zawiera A ani B
  - **Verify:** UI Expo Go — `family_id` w danych = fam_C (NIE fam_A)

### 2.B RLS test: user C jako klient — NIE widzi rodziny A/B

- [ ] 2.B.1 Tymczasowy debug log w app (komentarz, NIE commituj):
  ```ts
  const { data, error } = await supabase.from('family_members').select('*');
  console.log('RLS test C:', data, error);
  ```
  - **Expected w logach Expo:** `data` zawiera TYLKO wiersz `(C, fam_C, owner)`. Brak wycieku A/B.
- [ ] 2.B.2 Test odwrotny — bezpośrednie zapytanie do family A z konta C:
  ```ts
  const { data } = await supabase.from('families').select('*').eq('id', '<fam_A_id>');
  console.log('RLS leak test:', data);
  ```
  - **Expected:** `data: []` (empty array) — NIGDY rekord rodziny A

### 2.C RLS test: user B (członek fam_A) NIE widzi rodziny C

- [ ] 2.C.1 Wyloguj C → zaloguj jako `dawid+b@gmail.com` / `TestB1234!`
- [ ] 2.C.2 Profil → „Rodzina" pokazuje 2 członków (A + B), NIE pokazuje C
- [ ] 2.C.3 (Opcjonalnie) debug log próby query family C:
  ```ts
  const { data } = await supabase.from('families').select('*').eq('id', '<fam_C_id>');
  ```
  - **Expected:** `data: []`
- [ ] 2.C.4 Zaznacz checkbox w `mvp-sleep-tracker-zadania.md` linia 42 jeśli powyższe PASS

---

## Scenariusz 3 — Partner z pre-existing account (cykl 2 nowy)

> **Use case:** Partner założył konto ZANIM owner wysłał zaproszenie. Musi zobaczyć banner po reloginie / refetch focus, kliknąć „Dolacz" → przepiena.

### 3.A Sign-up usera D (przed invite)

- [ ] 3.A.1 Wyloguj poprzedniego usera → sign-up D: `dawid+d@gmail.com` / `TestD1234!`
  - **Expected:** redirect do `(app)/index`; BRAK bannera (D nie ma jeszcze zaproszeń)
  - **Verify (Supabase Studio):** `families` ma teraz fam_A, fam_C, fam_D (3 rodziny); D w solo-rodzinie fam_D

### 3.B Owner A zaprasza D (gdy D już istnieje)

- [ ] 3.B.1 Wyloguj D → zaloguj jako A (`dawid+a@gmail.com`)
- [ ] 3.B.2 Profil → sekcja Rodzina → wpisz `dawid+d@gmail.com` → „Zaproś"
  - **Expected:** success „Wysłano zaproszenie"
  - **Verify (Supabase Studio):** `family_invitations` ma rekord `(email: dawid+d, family_id: fam_A, status: pending)`

### 3.C D widzi banner po reloginie / focus refetch

- [ ] 3.C.1 Wyloguj A → zaloguj jako D (`dawid+d@gmail.com` / `TestD1234!`)
  - **Expected:** ekran „Dzisiaj" pokazuje banner z 1 zaproszeniem od „Rodzina A"
- [ ] 3.C.2 **Alternatywa — focus refetch (jeśli D już jest zalogowany):** zalogowany D → tab przełącz na „Profil" → wróć na „Dzisiaj"
  - **Expected:** banner pojawia się po refetch (TanStack Query refetchOnWindowFocus / refetchOnMount). Jeśli nie pojawia się natychmiast — pull-to-refresh na ekranie „Dzisiaj"
- [ ] 3.C.3 Klik „Dolacz" na bannerze
  - **Expected:** banner znika, toast success, ekran odświeża się
  - **KRYTYCZNE Verify (Supabase Studio):**
    - `families` zniknęła fam_D — pozostają fam_A i fam_C (2 rodziny)
    - `family_members` D ma teraz `(D, fam_A, member)`
    - `family_invitations` accepted dla D

---

## Scenariusz 4 — Fallback „Stwórz rodzinę" (cykl 2 nowy)

> **Use case:** Anomalia — user zostaje bez rodziny (np. fail triggera w przeszłości, manualne usunięcie). UI w profilu pokazuje przycisk „Stwórz rodzinę" → user odzyskuje membership.

> **Note:** Trigger fail simulation manualnie trudne (race condition). Zamiast tego symulujemy stan końcowy: bezpośrednio usuwamy membership w Studio.

### 4.A Symulacja stanu „brak rodziny"

- [ ] 4.A.1 Zaloguj jako C (`dawid+c@gmail.com`)
- [ ] 4.A.2 W Supabase Studio SQL editor:
  ```sql
  -- Usuń membership C i jego solo-rodzinę (symulacja "brak rodziny")
  delete from family_members where user_id = (select id from auth.users where email = 'dawid+c@gmail.com');
  delete from families where id not in (select family_id from family_members);
  ```
- [ ] 4.A.3 Na app C: tab „Profil" — pull-to-refresh (lub re-enter ekranu)
  - **Expected:** sekcja „Rodzina" pokazuje stan empty: „Brak rodziny" + przycisk „Stwórz rodzinę"
  - **Expected:** brak crashy, brak nieskończonego spinnera

### 4.B Klik „Stwórz rodzinę" — mutation

- [ ] 4.B.1 Tap „Stwórz rodzinę"
  - **Expected:** loading state na przycisku; po ~1s przycisk znika, sekcja pokazuje normalną listę członków (1 członek — user C)
  - **Verify (Supabase Studio):**
    - `families` ma nową rodzinę (fam_C_new)
    - `family_members` ma `(C, fam_C_new, owner)`
- [ ] 4.B.3 Sprawdź że stan utrzymuje się po reloginie:
  - Wyloguj C → zaloguj C ponownie → Profil pokazuje membership (NIE wraca do „Brak rodziny")

> **Scenariusz 4.C (trigger fail real-time) — NOT APPLICABLE manual:** wymuszenie fail triggera wymaga symulacji race conditions / błędu sieci w transakcji Supabase, które są niedostępne w Expo Go. Fallback z 4.A/4.B pokrywa stan końcowy.

---

## Scenariusz 5 — Multiple pending invitations (cykl 2 nowy)

> **Use case:** Owner A i owner C oboje zapraszają tego samego email. User po sign-upie widzi banner z 2 zaproszeniami. Wybiera jedno → drugie nadal pending.

### 5.A Setup — A i C zapraszają ten sam email

> **Wymaga:** A i C mają osobne rodziny (po scenariuszu 2 mamy fam_A i fam_C). Email do zaproszenia: `dawid+e@gmail.com`.

- [ ] 5.A.1 Zaloguj A → Profil → „Rodzina" → zaproś `dawid+e@gmail.com`
  - **Verify:** `family_invitations` pending dla E → fam_A
- [ ] 5.A.2 Wyloguj A → zaloguj C → Profil → „Rodzina" → zaproś `dawid+e@gmail.com`
  - **Verify (Supabase Studio):** `family_invitations` ma teraz **2 pending** rekordy dla `dawid+e@gmail.com`: jeden do fam_A, drugi do fam_C

### 5.B Sign-up E — banner pokazuje 2 zaproszenia

- [ ] 5.B.1 Wyloguj C → sign-up `dawid+e@gmail.com` / `TestE1234!`
  - **Expected:** redirect do `(app)/index`; banner pending invitations pokazuje **2 osobne zaproszenia** (od „Rodzina A" i „Rodzina C")
  - **Expected:** każde zaproszenie ma osobny przycisk „Dolacz"
- [ ] 5.B.2 Klik „Dolacz" przy zaproszeniu od „Rodzina A"
  - **Expected:** zaproszenie A znika z bannera; banner nadal widoczny z **1 pozostałym zaproszeniem od Rodzina C**
  - **Verify (Supabase Studio):**
    - `family_invitations` dla E → fam_A: status `accepted`
    - `family_invitations` dla E → fam_C: nadal `pending`
    - `family_members` E ma `(E, fam_A, member)` (solo-rodzina E usunięta atomic)
- [ ] 5.B.3 Drugie zaproszenie nadal widoczne — to oczekiwane zachowanie (user świadomy)
  - **Expected:** klik „Dolacz" przy Rodzina C **NIE działa** (lub disabled / pokazuje error „Jesteś już w rodzinie") — bo user już ma membership w fam_A
  - **Alternatywa (jeśli zaimplementowane):** klik „Dolacz" przy Rodzina C zmienia rodzinę (leave fam_A, join fam_C) — wtedy zachowanie zależne od decyzji produktowej; udokumentuj wynik
  - **Verify:** odnotuj faktyczne zachowanie w raporcie testów

---

## Edge cases (mobile-specific)

### Keyboard handling (sign-in / sign-up / invite)

- [ ] E.1 Otwórz `(auth)/sign-in` → tap pole Email
  - **Expected:** klawiatura wjeżdża, pole Email widoczne nad klawiaturą (KeyboardAvoidingView); pole Password NIE jest przykryte gdy tab przez „Next"
- [ ] E.2 W polu Email tap „Next" → focus przechodzi na Password (`returnKeyType="next"` + `onSubmitEditing`)
- [ ] E.3 W polu Password tap „Done" / „Go" → submit lub klawiatura znika
- [ ] E.4 `autoCapitalize="none"` na Email — wpisz „dawid" — pierwsza litera NIE wielka
- [ ] E.5 Profil → input emaila do invite — klawiatura NIE zasłania inputa i buttona „Zaproś"

### App lifecycle (sesja w AsyncStorage)

- [ ] E.6 Zalogowany user A → home button / swipe up → background 30s → wróć
  - **Expected:** user nadal zalogowany, bez ponownego logowania
- [ ] E.7 Zalogowany user → kill app → otwórz ponownie z launchera
  - **Expected:** AsyncStorage persistence → auto-zalogowany, redirect do `(app)` bez flash sign-in
- [ ] E.8 **Cykl 2 — banner po cold start:** Zalogowany B z pending invitations → kill app → reopen
  - **Expected:** banner pending invitations widoczny natychmiast po cold start na ekranie „Dzisiaj" (NIE wymaga manualnego pull-to-refresh)

### Sign-out

- [ ] E.9 Profil → „Wyloguj"
  - **Expected:** redirect do `(auth)/sign-in`; Supabase clear; **cykl 2:** AuthProvider czyści cache TanStack Query (na SIGNED_OUT) — następny user NIE widzi stale danych poprzedniego
  - **Verify:** po sign-out + sign-in jako inny user — żadne dane poprzednika nie wyciekają (np. lista członków „świeża")
- [ ] E.10 Po sign-out kill app → otwórz → start z `(auth)/sign-in`

### Network conditions

- [ ] E.11 Airplane mode → sign-in → tap „Zaloguj"
  - **Expected:** error „Brak połączenia" / „Network error" (NIE crash, NIE infinite spinner)
- [ ] E.12 Airplane mode → zalogowany → Profil → invite
  - **Expected:** inline error / toast; brak optimistic add na zawsze
- [ ] E.13 **Cykl 2 — accept invitation offline:** Zalogowany B z pending → Airplane mode → tap „Dolacz" na bannerze
  - **Expected:** error toast „Brak połączenia"; banner NIE znika optymistycznie; po włączeniu internetu retry działa
- [ ] E.14 Slow 3G — loading indicator widoczny przez cały czas; timeout obsłużony
- [ ] E.15 Network change (WiFi → 4G mid-operation) — retry lub clean error message

### Walidacja formularzy

- [ ] E.16 Sign-up: email bez `@` → inline błąd „Nieprawidłowy email"
- [ ] E.17 Sign-up: hasło zbyt krótkie → inline błąd o haśle (Zod)
- [ ] E.18 Sign-in: złe hasło → „Nieprawidłowe dane" (NIE ujawnia czy email istnieje)
- [ ] E.19 Invite: pusty input → button disabled lub inline error
- [ ] E.20 Invite: zaproszenie samego siebie → error „Nie możesz zaprosić siebie"
- [ ] E.21 Invite: user już członkiem rodziny → error „Już w rodzinie"

### Dark mode

- [ ] E.22 iOS Settings → Dark Mode → wróć do app
  - **Expected:** wszystkie ekrany (sign-in, sign-up, Profil, „Dzisiaj" z bannerem) mają poprawne dark colors
- [ ] E.23 Kontrast w dark: TextInput widoczne, placeholdery czytelne
- [ ] E.24 **Cykl 2 — banner w dark mode:** banner pending invitations ma czytelne kolory, button „Dolacz" wyraźnie kontrastuje z tłem bannera

### Safe Area

- [ ] E.25 iPhone z Dynamic Island / notch — ekrany NIE przykryte
- [ ] E.26 Bottom: home indicator nie zasłania buttonów
- [ ] E.27 Profil: „Wyloguj" / „Zaproś" ≥ 44pt nad home indicator
- [ ] E.28 **Cykl 2:** banner pending invitations na „Dzisiaj" — odstęp od notch/dynamic island OK

### Accessibility (VoiceOver / TalkBack)

- [ ] E.29 iOS Settings → Accessibility → VoiceOver → ON; otwórz app
- [ ] E.30 Sign-in: swipe — każde pole ma `accessibilityLabel` („Email", „Hasło"); button „Zaloguj" jako „przycisk"
- [ ] E.31 Sign-in submit przez VoiceOver double-tap → loading state przez `accessibilityState={{busy: true}}`
- [ ] E.32 Profil → sekcja „Rodzina" — lista członków czytana jako lista; input invite ma label
- [ ] E.33 **Cykl 2 — banner a11y:** VoiceOver na bannerze pending invitations
  - **Expected:** banner ogłaszany jako region z opisem („Masz 1 zaproszenie do rodziny..."); button „Dolacz" jako przycisk z hint („Dołącza do rodziny A")
- [ ] E.34 Touch targets — każdy button ≥ 44×44pt
- [ ] E.35 Android: TalkBack → powtórz E.30-E.33 dla tel. B
- [ ] E.36 Font scaling: iOS → Larger Text → 200% — layout nie rozwala się; banner czytelny

### Two-device sync (Faza 1 lekkie)

- [ ] E.37 **[2 urządzenia]** Tel. A jako A → Profil pokazuje 1 członka. Tel. B sign-up B (z 1.C) — po klik „Dolacz" widać 2 członków na B.
  - Na tel. A — pull-to-refresh sekcji „Rodzina" → też widać 2 członków
  - **Note:** brak Realtime w Fazie 1 (to Faza 4) — manual refresh musi działać

### AuthProvider stability (cykl 2)

- [ ] E.38 Rapid switch ekranów (Dzisiaj → Profil → Dzisiaj → Profil) — brak re-renderów / mig
  - **Expected:** `useMemo` na AuthContext value powoduje stabilne ref; konsumenci nie re-render'ują niepotrzebnie
- [ ] E.39 Symulacja błędu na fetch usera: tymczasowo zmień Supabase URL na zły → restart app
  - **Expected:** `.catch` w AuthProvider — brak crash; UI pokazuje sign-in (lub error state); discriminated union state poprawnie sygnalizuje błąd

### Sentry / error tracking (jeśli skonfigurowane)

- [ ] E.40 Trigger sztucznego błędu (np. Airplane mode na invite)
  - **Expected:** event w Sentry, breadcrumbs bez PII (brak pełnego emaila, brak hasła)
- [ ] E.41 Pole `password` NIE trafia do Sentry breadcrumbs ani extra

---

## Sprawdzenie po stronie Supabase (final review)

- [ ] S.1 `auth.users` — rekordy A, B, C, D, E (5 jeśli wszystkie scenariusze wykonane)
- [ ] S.2 `families` — finalna liczba zależna od wyboru w scen. 5:
  - Po scen. 1+2+3+4: 2 rodziny (fam_A z A+B+D, fam_C_new z C)
  - Po scen. 5 (E dołączył do A): fam_A z A+B+D+E, fam_C z C → nadal 2 rodziny
- [ ] S.3 `family_members` — każdy user dokładnie w jednej rodzinie; brak duplikatów; brak orphan
- [ ] S.4 `family_invitations` — accepted (lub deleted) dla wszystkich zaakceptowanych; **scen. 5:** rekord E → fam_C nadal pending (jeśli E nie dołączył do C)
- [ ] S.5 **Cykl 2 KRYTYCZNE:** sprawdź że solo-rodziny przy accept zostały atomic usunięte:
  ```sql
  -- Brak rodzin bez członków (orphaned)
  select id, name from families
  where id not in (select family_id from family_members);
  -- Expected: 0 wierszy
  ```
- [ ] S.6 RLS policies aktywne na `families`, `family_members`, `family_invitations` — Studio → Authentication → Policies
- [ ] S.7 Logs (Supabase → Logs Explorer) — brak unhandled exceptions w `handle_new_user` trigger ani w funkcji accept invitation

---

## Sprzątanie po testach

- [ ] C.1 W Supabase Studio SQL:
  ```sql
  delete from auth.users where email like 'dawid+%@gmail.com';
  -- CASCADE czyści family_members; sprawdź czy families / family_invitations też się sprzątają
  ```
- [ ] C.2 Sprawdź `families`, `family_members`, `family_invitations` puste (lub tylko prawdziwe dane)
- [ ] C.3 Wyloguj na wszystkich urządzeniach

---

## Po teście

- [ ] Wszystko PASS → zaznacz checkboxy linia 41 i 42 w `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-zadania.md`
- [ ] Zaktualizuj nagłówek `Postęp: 1 / 7 faz ukończone` jeśli Faza 1 jest zamknięta
- [ ] Wklej skrót wyniku do commit message (np. `test(faza-1): manual verification PASS — consent flow + RLS isolation + multi-invite`)
- [ ] Issue found? → `docs/active/mvp-sleep-tracker/issues-faza-1.md` z listą bugów + screen recordings
- [ ] Po PASS → kontynuuj do Fazy 2 (`/dev-docs-execute`)
