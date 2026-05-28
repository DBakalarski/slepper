# Manual test checklist — MVP Sleeper

Skrót najwazniejszych scenariuszy do przeklikania na fizycznych urzadzeniach **przed** uznaniem MVP za dzialajacy. Pelne 38 scenariuszy per faza zyje w `docs/completed/mvp-sleep-tracker/manual-test-faza-{1..6}.md` — ten plik to wybor "must pass".

## Przygotowanie (raz)

- [ ] Supabase: wszystkie migracje 0001–0009 zaaplikowane (`supabase db push` lub przez Studio).
- [ ] `sleeper-app/.env` ma `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] 2 fizyczne urzadzenia z Expo Go (najlepiej iOS + Android, minimum 2x ten sam OS).
- [ ] 2 konta email do testow (np. `test+a@…`, `test+b@…`).
- [ ] W terminalu: `cd sleeper-app && npx expo start` → QR → Expo Go.

> **Konwencja:** "Telefon A" = owner rodziny, "Telefon B" = zaproszony czlonek. Po kazdej grupie scenariuszy zrob restart Expo Go zeby uniknac stale state z bundlera.

---

## A. Smoke (musi przejsc, inaczej dalej nie ma sensu) — 5 min

### A1. Sign-up + auto-create rodziny

- [ ] Telefon A: sign-up z emailem, haslo min. 6 znakow → redirect na onboarding (AddChildForm) lub bezposrednio na "Dzisiaj".
- [ ] Brak crashu w konsoli Metro.
- [ ] W Supabase Studio: pojawil sie wiersz w `auth.users`, `families`, `family_members` (role=owner).

### A2. Sign-out + sign-in

- [ ] Profil → "Wyloguj sie" → ekran sign-in.
- [ ] Sign-in tymi samymi danymi → wraca do "Dzisiaj" z dzieckiem z onboardingu (state nie zniknal).

### A3. Restart aplikacji = sesja persists

- [ ] Po sign-in zabij Expo Go przez app switcher.
- [ ] Otworz ponownie → wchodzi od razu na "Dzisiaj" (bez ekranu sign-in).

---

## B. Rodzina + invitations (RLS critical) — 10 min

### B1. Zaproszenie + akceptacja consent flow

- [ ] Telefon A → Profil → Rodzina → "Zapros czlonka" → wpisz email Telefonu B → submit.
- [ ] Lista "Oczekujace zaproszenia" pokazuje nowy wpis.
- [ ] Telefon B: sign-up z tym samym emailem.
- [ ] Na "Dzisiaj" Telefon B widzi **banner** "Masz zaproszenie do rodziny" (NIE auto-accept).
- [ ] Tap "Akceptuj" → banner znika, Telefon B widzi dziecko Telefonu A.

### B2. RLS izolacja rodzin

- [ ] Z trzeciego konta (lub anon w Studio) sproboj zaczytac `sessions` rodziny A → 0 rows.
- [ ] Telefon B nie widzi sesji innej rodziny (jesli kiedys byl w innej).

### B3. Last-owner guard

- [ ] Sam-na-sam jako owner: Profil → "Usun rodzine" (jesli jest) → blokada / komunikat ze nie mozna (zostalyby osierocone dzieci).

---

## C. Sesja snu — happy path (core feature) — 10 min

### C1. Start sesji

- [ ] "Dzisiaj": pomaranczowa karta "Okno aktywnosci" widoczna z czasem od ostatniej sesji.
- [ ] Tap "Rozpocznij sen" → **haptic** feedback (vibration).
- [ ] Karta zmienia kolor na granatowa "Drzemka/Sen w toku", timer `00:00:01` tika co sekunde.
- [ ] QuickActions ("Drzemka teraz", "Sen nocny", "Dodaj wstecz") sa disabled.

### C2. Stop sesji

- [ ] Tap "Zakoncz sen" → **haptic** feedback.
- [ ] Granatowa karta znika, pomaranczowa "Okno aktywnosci" pokazuje sie z `0m`.
- [ ] Agregat "Dzisiaj" (drzemki / sen nocny / najdluzsza aktywnosc) wzrasta o nowa sesje.

### C3. Persistence przez restart z aktywna sesja

- [ ] Wystartuj sesje, zanotuj timer (np. `01:23`).
- [ ] Zabij Expo Go, odczekaj 1 minute, otworz ponownie.
- [ ] Timer pokazuje `~02:23` (oryginalny + odczekanie). Tika dalej co sekunde.

### C4. Tylko jedna aktywna sesja per dziecko

- [ ] Wystartuj sesje na Telefonie A.
- [ ] Telefon B (ten sam dzieciak) — tap "Rozpocznij sen" → blad PL: "Inny czlonek rodziny juz rozpoczal sesje" (NIE crash).

### C5. Sleep fullscreen + keep-awake

- [ ] W aktywnej sesji tap "Pelny ekran" → routing `/sleep-fullscreen`, duzy timer.
- [ ] **Ekran nie gasnie** przez minimum 1 minute (keep-awake dziala).
- [ ] Tap "Zakoncz sen" w fullscreen → wraca na "Dzisiaj", granatowa karta znika.

---

## D. Historia + edycja — 10 min

### D1. Dodaj wstecz

- [ ] "Dzisiaj" → "Dodaj wstecz" → modal z domyslnymi polami (dzisiaj, drzemka, 09:00–10:30).
- [ ] Zmien koniec na np. 11:00 → "Zapisz".
- [ ] Sesja pojawia sie w historii i w agregacie "Drzemki" wzrasta liczba.

### D2. Edycja sesji

- [ ] Historia → tap dowolnej sesji → SessionEditForm.
- [ ] Zmien godzine konca o +30 min → "Zapisz".
- [ ] Wracaj na "Dzisiaj" → agregat "Sen nocny" / "Najdluzsza drzemka" zaktualizowany.

### D3. Usuwanie sesji

- [ ] Historia → tap sesji → "Usun" → Alert confirm → tap "Usun".
- [ ] Sesja znika z listy, agregat "Dzisiaj" maleje.

### D4. Picker daty/godziny

- [ ] W SessionEditForm tap pole daty → natywny DatePicker (iOS spinner / Android dialog).
- [ ] Tap pole godziny → natywny TimePicker, format 24h.

### D5. Day picker w historii (boundary)

- [ ] Historia → switch na "Dzien" → wybierz wczoraj → lista pokazuje sesje wczorajsze.
- [ ] Wybierz date 30+ dni temu → "Brak sesji" lub odpowiednia lista.

---

## E. Realtime sync (krytyczne dla two-device UX) — 10 min

### E1. Start na A → widoczne na B

- [ ] Oba telefony otwarte na "Dzisiaj" tej samej rodziny.
- [ ] A: tap "Rozpocznij sen".
- [ ] B: w ciagu **<3 sekund** pomaranczowa karta zmienia sie na granatowa, timer tika.

### E2. Stop na B → A widzi koniec

- [ ] A trzyma aktywna sesje (z E1), B tap "Zakoncz sen".
- [ ] A: w ciagu <3s granatowa karta znika, pomaranczowa z `0m` pokazuje sie.

### E3. Edycja sesji historycznej na A → B widzi update

- [ ] B: otworz Historia, tap dowolnej sesji (formularz edycji widoczny).
- [ ] A: w Studio (lub w app) zmien godzine tej samej sesji.
- [ ] B: w ciagu <3s formularz pokazuje nowe wartosci (singular invalidate `['session', id]`).

### E4. Delete na A → B widzi znikniecie

- [ ] B: Historia widoczna.
- [ ] A: usun sesje (z Historia → edytuj → usun).
- [ ] B: sesja znika z listy bez refresha.

### E5. Offline → online resync

- [ ] B: tryb samolotowy ON.
- [ ] A: stworz nowa sesje (start + stop).
- [ ] B: tryb samolotowy OFF (po 30s).
- [ ] B: w ciagu kilku sekund nowa sesja widoczna w historii.

---

## F. Powiadomienia drzemek — 10 min

### F1. Permission request

- [ ] Po dodaniu pierwszego dziecka system prompt o powiadomienia → "Pozwol".
- [ ] Brak crashu jesli user odrzuci.

### F2. Schedule po zakonczeniu drzemki

- [ ] Wystartuj **drzemke** (NIE sen nocny) o znanej godzinie.
- [ ] Zakoncz po 10 min.
- [ ] Wyciagnij telefon z app (background lub kill).
- [ ] Po `targetWakeWindow - 15 min` (np. dla 6mc = 105–15 = 90 min od endu) — **powiadomienie** "Drzemka {imie} za ~15 min".

> **Skrot do szybkiego testu:** edytuj `targetWakeWindowMinutes` lokalnie albo zmien date_of_birth dziecka na nowsze (0–3mc → 75min, czyli 60min do powiadomienia).

### F3. Cancel po starcie nowej sesji

- [ ] Powtorz F2 do momentu zaplanowania notyfikacji.
- [ ] PRZED odpaleniem notyfikacji wystartuj kolejna sesje na tym dziecku.
- [ ] Notyfikacja **NIE odpala sie**.

### F4. Reschedule po edycji ostatniej sesji

- [ ] Zaplanuj notyfikacje (F2), w app edytuj koniec ostatniej sesji o -30 min.
- [ ] Notyfikacja powinna odpalic 30 min wczesniej (cancel + nowa).

### F5. Reschedule po delete

- [ ] Zaplanuj notyfikacje, usun ostatnia sesje.
- [ ] Notyfikacja zostaje przeplanowana wzgledem **przedostatniej** sesji (lub anulowana jesli brak historii).

### F6. Foreground/background/killed

- [ ] F2 z app w foreground → banner pojawia sie u gory.
- [ ] F2 z app w background → push w system tray.
- [ ] F2 z app killed → push w system tray, tap → otwiera app na "Dzisiaj".

---

## G. Polish / a11y / wizualne — 5 min

### G1. Dark mode

- [ ] iOS Settings → Display → Dark → wroc do app: cale UI ciemne, BIALYCH PLAM **brak** (sprawdz: karty, inputy, modal, profile sekcje rodziny, sign-in).
- [ ] Android: System → Theme → Dark, to samo.
- [ ] Switch z dark na light w trakcie app — natychmiastowa zmiana, brak flash.

### G2. Tekst czytelny w obu trybach

- [ ] Pomaranczowa karta: tekst `text-cream` na orange, czytelne w obu.
- [ ] Granatowa karta: timer biel/cream, czytelny.
- [ ] Empty state historii ("Brak sesji") czytelny w dark mode (NIE granat na granacie).

### G3. Tabs nawigacja

- [ ] Tap kazdy tab (Dzisiaj / Historia / Statystyki / Profil) → poprawny ekran, ikony zmieniaja kolor na aktywny.
- [ ] W dark mode tabBar ciemny, ikony cream.

### G4. Strefa czasowa (TZ) wokol polnocy

- [ ] Stworz sesje "Dodaj wstecz" z czasem 23:45 dzisiaj → 00:15 jutro.
- [ ] W historii sesja przypisana do **dnia rozpoczecia** (`dayKeyInAppTz` na `start_at`).
- [ ] Agregat "Sen nocny" zawiera ten zakres.

---

## H. Sanity przed merge / release (1 min)

- [ ] `cd sleeper-app && npx tsc --noEmit` — 0 bledow.
- [ ] `npm run lint` — 0 bledow.
- [ ] `git status` czysty (poza scratchpadami z gitignore).
- [ ] Branch zmergowalny z `main` bez konfliktow.

---

## Co pominieto i kiedy wrocic

- **Multi-child UI** — schema wspiera, brak UI, nie testujemy.
- **Wykresy statystyk** — placeholder w Statystyki, sprawdz tylko ze ekran sie otwiera bez crashu.
- **TestFlight / Play Internal** — osobny krok (`eas build --profile preview`), nie czesc tej checklisty.
- **Apple/Google Sign-In** — backlog post-MVP.
- **Sentry** — backlog post-MVP, na razie blad = `console.warn` w Metro.

Jesli jakikolwiek scenariusz A–F failuje: **STOP**, otworz nowe zadanie przez `/bugfix <opis>` zamiast obchodzic problem.
