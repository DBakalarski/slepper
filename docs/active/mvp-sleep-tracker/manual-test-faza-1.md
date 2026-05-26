# Manual Test Checklist — Faza 1 (Auth + model rodziny)

**Faza:** 1 (Auth + model rodziny)
**Data wygenerowania:** 2026-05-26
**Tester:** dawid (solo dev)
**Cel:** zaznaczyć dwa pozostałe checkboxy `Weryfikacja:` w `mvp-sleep-tracker-zadania.md`:
1. Sign-up dwóch userów + invite → oboje widzą tę samą rodzinę w `family_members`.
2. RLS: user A NIE widzi family usera B.

Wykonaj na fizycznym urządzeniu w Expo Go (lepiej 2 urządzenia dla testów sync). W razie braku drugiego telefonu — drugi user testowany przez wylogowanie i ponowny sign-in na tym samym urządzeniu (kroki oznaczone `[1-device fallback]`).

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
> - User C (do RLS isolation): `dawid+c@gmail.com` / `TestC1234!`

---

## Scenariusz 1 — Sign-up dwóch userów + invite (happy path)

### 1.A Sign-up usera A (telefon A)

- [ ] 1.A.1 Otwórz app na tel. A → automatyczny redirect na `(auth)/sign-in`
  - **Expected:** widoczny formularz logowania (pole Email, Password, button „Zaloguj"), link „Nie masz konta? Załóż"
  - **Verify:** UI Expo Go
- [ ] 1.A.2 Tap link „Załóż konto" → przejście na `(auth)/sign-up`
  - **Expected:** stack push animation (iOS slide), formularz sign-up
- [ ] 1.A.3 Wpisz `dawid+a@gmail.com` / `TestA1234!` → tap „Zarejestruj"
  - **Expected:** loading spinner na buttonie, po ~2s redirect do `(app)` → ekran „Dzisiaj" / profil
  - **Verify (Supabase Studio):** Table `auth.users` ma nowy rekord; Table `families` ma nową rodzinę; Table `family_members` ma rekord `{user_id: <A>, family_id: <fam_A>, role: 'owner'}`
- [ ] 1.A.4 Tap tab „Profil" (lub przejdź do `(app)/profile.tsx`)
  - **Expected:** sekcja „Rodzina" widoczna, lista członków pokazuje 1 osobę (user A), pod listą input „Email do zaproszenia" + button „Zaproś"

### 1.B User A zaprasza usera B

- [ ] 1.B.1 W sekcji „Rodzina" wpisz `dawid+b@gmail.com` → tap „Zaproś"
  - **Expected:** toast/inline success „Wysłano zaproszenie" (lub odpowiednik); input czyści się
  - **Verify (Supabase Studio):** Table `family_invitations` ma rekord `{email: 'dawid+b@gmail.com', family_id: <fam_A>, status: 'pending'}` (lub odpowiednik kolumn)
- [ ] 1.B.2 Sprawdź że duplikat zaproszenia jest blokowany: ponownie wpisz `dawid+b@gmail.com` → tap „Zaproś"
  - **Expected:** błąd „Już zaproszony" lub idempotent no-op (brak duplikatu w tabeli)
  - **Verify (Supabase Studio):** dalej tylko 1 rekord w `family_invitations` dla tego emaila

### 1.C Sign-up usera B (telefon B lub 1-device fallback)

- [ ] 1.C.1 **[2 urządzenia]** Na tel. B otwórz app → `(auth)/sign-in` → tap „Załóż konto"
  - **[1-device fallback]** Na tel. A: tap „Wyloguj" w Profilu → redirect na sign-in → tap „Załóż konto"
- [ ] 1.C.2 Wpisz `dawid+b@gmail.com` / `TestB1234!` → tap „Zarejestruj"
  - **Expected:** redirect do `(app)`, ekran „Dzisiaj" / profil
  - **KRYTYCZNE Verify (Supabase Studio):**
    - `auth.users` ma rekord dla B
    - `family_members` ma rekord `{user_id: <B>, family_id: <fam_A>, role: 'member'}` (NIE nowa rodzina — trigger z 0004 powinien match'ować invitation)
    - `family_invitations` rekord ma `status: 'accepted'` (lub jest skasowany, zależnie od implementacji)
    - **NIE powinno być nowej rodziny w `families`** — sprawdź `select count(*) from families;` → przed sign-upem B było N, po nadal N (NIE N+1)
- [ ] 1.C.3 Na tel. B tap tab „Profil"
  - **Expected:** sekcja „Rodzina" pokazuje 2 członków (A + B), oboje z tym samym `family_id` w danych

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
- [ ] 1.D.2 Zaznacz checkbox w `mvp-sleep-tracker-zadania.md` linia 41 jeśli powyższe PASS

---

## Scenariusz 2 — RLS isolation (ZAZNACZA CHECKBOX 42)

Celem jest udowodnienie że user B (lub niezależny user C) NIE widzi rodziny innego usera przez klienta Supabase (RLS z `0003_rls.sql`).

### 2.A Sign-up niezależnego usera C (bez invite)

- [ ] 2.A.1 **[2 urządzenia]** Na tel. A: tap „Wyloguj" w Profilu → sign-in → „Załóż konto"
  - **[1-device fallback]** Już zalogowany jako B (z 1.C.2) → wyloguj → sign-up C
- [ ] 2.A.2 Wpisz `dawid+c@gmail.com` / `TestC1234!` (ten email NIE ma invitation) → „Zarejestruj"
  - **Expected:** redirect do `(app)`; trigger tworzy NOWĄ rodzinę dla C (bo brak invitation)
  - **Verify (Supabase Studio):** `family_members` dla user C ma `family_id != fam_A`; `families` ma jeden rekord więcej niż przed sign-upem C

### 2.B RLS test: user C jako klient — NIE widzi rodziny A/B

- [ ] 2.B.1 Na ekranie Profil zalogowany jako C → sekcja „Rodzina" pokazuje TYLKO usera C (1 członek)
  - **Expected:** lista nie zawiera A ani B
  - **Verify:** UI Expo Go
- [ ] 2.B.2 W Supabase Studio → SQL editor — symulacja query jako user C przez RLS. Najprościej: użyj „Run as authenticated user" w Studio (jeśli dostępne) lub uruchom z poziomu app dev-helper. Alternatywnie: w app dodaj tymczasowy debug log (komentarz, nie commituj):
  ```ts
  const { data, error } = await supabase.from('family_members').select('*');
  console.log('RLS test C:', data, error);
  ```
  - **Expected w logach Expo:** `data` zawiera TYLKO wiersze z `user_id = <C>` (lub `family_id = <fam_C>` zależnie od policy). Brak wycieku A/B.
- [ ] 2.B.3 Test odwrotny — bezpośrednie zapytanie do family A:
  ```ts
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', '<fam_A_id_z_Studio>');
  console.log('RLS leak test:', data, error);
  ```
  - **Expected:** `data: []` (empty array) lub `error` (NIGDY rekord rodziny A)

### 2.C RLS test: user B (członek fam_A) NIE widzi rodziny C

- [ ] 2.C.1 Wyloguj C → zaloguj się jako `dawid+b@gmail.com` / `TestB1234!`
- [ ] 2.C.2 Profil → „Rodzina" pokazuje 2 członków (A + B), NIE pokazuje C
  - **Expected:** brak usera C na liście
- [ ] 2.C.3 (Opcjonalnie) debug log próby query family C:
  ```ts
  const { data } = await supabase.from('families').select('*').eq('id', '<fam_C_id>');
  ```
  - **Expected:** `data: []`
- [ ] 2.C.4 Zaznacz checkbox w `mvp-sleep-tracker-zadania.md` linia 42 jeśli powyższe PASS

---

## Edge cases (mobile-specific)

### Keyboard handling (sign-in / sign-up / invite)

- [ ] E.1 Otwórz `(auth)/sign-in` → tap pole Email
  - **Expected:** klawiatura wjeżdża, pole Email widoczne nad klawiaturą (KeyboardAvoidingView działa); pole Password NIE jest przykryte gdy do niego tabniesz przez "Next"
- [ ] E.2 W polu Email tap „Next" na klawiaturze
  - **Expected:** focus przechodzi automatycznie na Password (`returnKeyType="next"` + `onSubmitEditing` z ref do następnego)
- [ ] E.3 W polu Password tap „Done" / „Go"
  - **Expected:** submit formularza (lub przynajmniej klawiatura znika)
- [ ] E.4 `autoCapitalize="none"` na polu Email — wpisz „dawid" — pierwsza litera NIE zmienia się na wielką
- [ ] E.5 Sekcja „Rodzina" w Profilu → tap input emaila do invite
  - **Expected:** klawiatura nie zasłania inputa i buttona „Zaproś"

### App lifecycle (sesja w AsyncStorage)

- [ ] E.6 Zalogowany user A → home button / swipe up → app w background na 30s → wróć
  - **Expected:** user nadal zalogowany, ekran „Dzisiaj" / Profil bez ponownego logowania
- [ ] E.7 Zalogowany user A → kill app (swipe w app switcherze) → otwórz ponownie z launchera
  - **Expected:** AsyncStorage persistence Supabase działa → user automatycznie zalogowany, redirect do `(app)` (NIE do `(auth)/sign-in`)
  - **Verify:** stan sesji widoczny natychmiast po cold start, bez ekranu sign-in flash

### Sign-out

- [ ] E.8 Profil → tap „Wyloguj"
  - **Expected:** Supabase czyści sesję → AuthProvider detect → redirect do `(auth)/sign-in`
  - **Verify (Supabase Studio):** jeśli klient nadal próbuje query → RLS odrzuca (anon role)
- [ ] E.9 Po sign-out kill app → otwórz
  - **Expected:** start z `(auth)/sign-in` (brak persistowanej sesji)

### Network conditions

- [ ] E.10 Włącz Airplane mode → otwórz `(auth)/sign-in` → wpisz dane → tap „Zaloguj"
  - **Expected:** widoczny error „Brak połączenia" lub „Network error" (NIE crash, NIE infinite spinner)
  - **Verify:** Sentry / console log — error obsłużony
- [ ] E.11 Airplane mode → zalogowany user → Profil → spróbuj invite emaila
  - **Expected:** inline error / toast „Brak połączenia" (NIE optimistic add na zawsze)
- [ ] E.12 Slow 3G (iOS: Settings → Developer → Network Link Conditioner → 3G, Android: dev settings throttling)
  - **Expected:** loading indicator na buttonie przez cały czas; po sukcesie redirect; timeout obsłużony (np. ≥ 30s → komunikat)
- [ ] E.13 Network change (WiFi → 4G mid-operation): podczas pending invite przełącz sieć
  - **Expected:** request się retry'uje lub failuje czysto z error message

### Walidacja formularzy

- [ ] E.14 Sign-up: wpisz email bez `@` (np. `nieprawda`) → tap „Zarejestruj"
  - **Expected:** inline błąd „Nieprawidłowy email" pod polem, button NIE wysyła
- [ ] E.15 Sign-up: hasło zbyt krótkie (np. `123`) → tap „Zarejestruj"
  - **Expected:** inline błąd o haśle (zgodnie z Zod schema)
- [ ] E.16 Sign-in: złe hasło dla istniejącego konta
  - **Expected:** widoczny błąd „Nieprawidłowe dane" (NIE ujawnia czy email istnieje — security)
- [ ] E.17 Invite: pusty input → tap „Zaproś"
  - **Expected:** button disabled lub inline error
- [ ] E.18 Invite: zaproszenie samego siebie (`dawid+a@gmail.com` jako user A)
  - **Expected:** error „Nie możesz zaprosić siebie" lub no-op
- [ ] E.19 Invite: zaproszenie usera już w rodzinie
  - **Expected:** error „Ten user jest już członkiem rodziny"

### Dark mode

- [ ] E.20 iOS Settings → Display & Brightness → Dark Mode → wróć do app
  - **Expected:** wszystkie ekrany (`sign-in`, `sign-up`, `Profil`) mają poprawne kolory dark (NativeWind `dark:` variants); tekst czytelny, brak białych płaszczyzn na full-white
- [ ] E.21 Sprawdź kontrast w dark mode: pola TextInput widoczne, placeholdery czytelne (NIE same czarne na czarnym)

### Safe Area

- [ ] E.22 Na iPhone z Dynamic Island / notch: ekrany NIE są przykryte przez notch
  - **Expected:** `SafeAreaView` lub `useSafeAreaInsets` na rootu ekranu
- [ ] E.23 Bottom: ekrany NIE są przykryte przez home indicator (iPhone bez przycisku home)
- [ ] E.24 Profil: button „Wyloguj" / „Zaproś" — minimum 44pt nad home indicator

### Accessibility (VoiceOver / TalkBack)

- [ ] E.25 iOS: Settings → Accessibility → VoiceOver → ON; otwórz app
- [ ] E.26 Sign-in: swipe w prawo / w lewo przez elementy
  - **Expected:** każde pole TextInput ma czytany `accessibilityLabel` („Email", „Hasło"); button „Zaloguj" ogłaszany jako „przycisk"
  - **Anty-pattern:** VoiceOver mówi „Button" / „TextField" bez kontekstu → fail
- [ ] E.27 Sign-in submit przez VoiceOver double-tap na buttonie
  - **Expected:** loading state ogłoszony przez `accessibilityState={{busy: true}}` lub announcement
- [ ] E.28 Profil → sekcja „Rodzina"
  - **Expected:** lista członków czytana jako lista (np. „Lista, 2 elementy, A: dawid+a@gmail.com"); input invite ma label
- [ ] E.29 Touch targets — sprawdź wzrokowo + palcem: każdy button ≥ 44×44pt (tap easy bez precyzji)
- [ ] E.30 Android: Settings → Accessibility → TalkBack → ON; powtórz E.26-E.28 dla telefonu B
- [ ] E.31 Font scaling: iOS Settings → Accessibility → Display & Text Size → Larger Text → 200%
  - **Expected:** layout sign-in/sign-up się NIE rozwala (pola scroll'ują się jeśli trzeba); buttony nadal klikalne; teksty `maxFontSizeMultiplier` na krytycznych elementach (NIE wylewa się poza ekran)

### Two-device sync (sleeper-specific — Faza 1 lekkie, ale warto zweryfikować członkostwo)

- [ ] E.32 **[2 urządzenia]** Tel. A zalogowany jako user A → Profil sekcja Rodzina pokazuje 1 członka. Tel. B (świeży) → sign-up B z invitation.
  - **Expected:** po sign-upie B na tel. B widać 2 członków. Na tel. A — pull-to-refresh sekcji „Rodzina" (lub re-enter ekranu) → też widać 2 członków
  - **Note:** Faza 1 nie ma Realtime (to Faza 4) — auto-refresh jest opcjonalny; manual refresh musi działać

### Sentry / error tracking (jeśli skonfigurowane)

- [ ] E.33 Trigger sztucznego błędu (np. krótkotrwałe wyłączenie Supabase URL przez błędną wartość w `.env` lub Airplane mode na invite)
  - **Expected (jeśli Sentry skonfigurowane):** event w dashboard Sentry, breadcrumbs bez PII (NIE pełny email w breadcrumbs), użytkownik widzi friendly error w UI
- [ ] E.34 Sprawdź że pole `password` nie trafia do Sentry breadcrumbs ani extra (PII masking)

---

## Sprawdzenie po stronie Supabase (final review)

- [ ] S.1 `auth.users` — 3 rekordy (A, B, C), wszystkie z email confirmed (lub odpowiednio do flow — jeśli używamy magic link/confirm, dostosuj)
- [ ] S.2 `families` — 2 rekordy: fam_A (z user A + B), fam_C (z user C). NIE 3 rodziny.
- [ ] S.3 `family_members` — 3 rekordy: (A, fam_A, owner), (B, fam_A, member), (C, fam_C, owner)
- [ ] S.4 `family_invitations` — invitation dla B ma status `accepted` (lub jest skasowany, zależnie od trigger logic z 0004)
- [ ] S.5 RLS policies aktywne na `families`, `family_members`, `family_invitations` — Studio → Authentication → Policies pokazuje policies z `0003_rls.sql`
- [ ] S.6 Logs (Supabase → Logs Explorer) → brak unhandled exceptions w trigger function (`handle_new_user` lub odpowiednik)

---

## Sprzątanie po testach

- [ ] C.1 W Supabase Studio SQL:
  ```sql
  delete from auth.users where email like 'dawid+%@gmail.com';
  -- CASCADE powinno wyczyścić family_members; sprawdź czy families/family_invitations też się sprzątają
  ```
- [ ] C.2 Sprawdź że `families`, `family_members`, `family_invitations` są puste (lub mają tylko prawdziwe dane non-testowe)
- [ ] C.3 Wyloguj się z app na wszystkich urządzeniach

---

## Po teście

- [ ] Wszystko PASS → zaznacz checkboxy linia 41 i 42 w `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-zadania.md`
- [ ] Zaktualizuj nagłówek `Postęp: 1 / 7 faz ukończone` jeśli Faza 1 jest teraz w pełni zamknięta
- [ ] Wklej skrót wyniku do commit message (np. `test(faza-1): manual verification PASS — RLS isolation + invite flow`)
- [ ] Issue found? → utwórz `docs/active/mvp-sleep-tracker/issues-faza-1.md` z listą bugów + screen recordings (jeśli wizualne)
- [ ] Po PASS → kontynuuj do Fazy 2 (`/dev-docs-execute`)
