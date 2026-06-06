# Manual Test Checklist — Faza 1 (sleeper-web PWA)

**Faza/IU:** Faza 1 — Bootstrap + foundation + auth + theme (IU1-IU4)
**Data:** 2026-06-05
**Tester:** dawid (solo dev)
**Target device:** iPhone Safari iOS (primary) + drugi iPhone z Expo Go (cross-device sync)
**Środowisko:** `pnpm --filter sleeper-web start --web` → Mac na lokalnej sieci, dostęp z iPhone przez `http://<mac-ip>:8081`

> Uwaga: web PWA w Safari iOS — to NIE jest Expo Go ani React Native runtime. Mimo to test odbywa się on-device (mobile target), z uwzględnieniem iOS Safari quirks (auto-zoom, safe-area, bottom toolbar).

---

## Setup

- [ ] Mac w tej samej sieci Wi-Fi co iPhone (sprawdź `ifconfig | grep "inet "` na Mac → notuj IP, np. `192.168.1.10`)
- [ ] Terminal 1 (Mac): `pnpm --filter sleeper-web start --web` — serwer startuje (port ~8081), brak czerwonych errors w terminalu
- [ ] Terminal 2 (Mac): `pnpm app:dev` — Expo dev server dla sleeper-app, QR widoczny
- [ ] iPhone A: Safari → otwórz `http://<mac-ip>:8081` (PWA)
- [ ] iPhone B (drugi telefon): Expo Go → skanuj QR z Terminal 2 (sleeper-app)
- [ ] Konto testowe: znane email/hasło już używane w sleeper-app (do weryfikacji "ten sam user")

---

## IU1: Bootstrap & smoke (placeholder web + regression mobile)

- [ ] **Test 1.1** — Otwórz `http://<mac-ip>:8081` w Safari iOS.
  **Expected:** Placeholder ekran sleeper-web ładuje się (np. "Sleeper Web — coming soon" lub minimalne `<View>` z tekstem), brak białego screena, brak błędu w terminalu Metro.

- [ ] **Test 1.2** — Włącz Safari Web Inspector (Mac → Safari → Develop → <iPhone-name> → localhost) i sprawdź Console.
  **Expected:** Zero czerwonych errors, dopuszczalne warningi React Native Web (np. `style.resizeMode` deprecation jeśli są).

- [ ] **Test 1.3** — Pull-to-refresh / hard reload (Safari → trzymaj URL bar → Reload Without Cache).
  **Expected:** Placeholder ładuje się ponownie, brak FOWT (flash of wrong theme) ani migotania.

- [ ] **Test 1.4** — iPhone B: otwórz sleeper-app w Expo Go (QR z Terminal 2).
  **Expected:** Mobile app działa bez zmian — splash → home/sign-in jak przed dodaniem `packages/sleeper-web/`. Brak regresji w monorepo (smoke check, że dodanie nowego workspace nie zepsuło builda mobilnego).

- [ ] **Test 1.5** — Edge: rotate iPhone do landscape z otwartym placeholder.
  **Expected:** Layout responsywny, safe-area-inset nie psuje paddingu, brak overflow w prawo.

---

## IU3: Auth flow (sign-in + persist + cross-device)

- [ ] **Test 3.1** — Otwórz `/sign-in` na iPhone Safari (jeśli root redirect nie działa, wpisz URL ręcznie).
  **Expected:** Formularz renderuje się, pola email/hasło widoczne, przycisk submit obecny.

- [ ] **Test 3.2** — Tap w pole email.
  **Expected:** Klawiatura iOS pojawia się BEZ auto-zoom na input (`font-size` ≥ 16px na inputach — to twarda zasada iOS Safari, inaczej zoom).

- [ ] **Test 3.3** — Wpisz znane konto (to samo co w sleeper-app) → submit.
  **Expected:** Sukces → redirect na `/` (root). Brak czerwonych errors w Safari Web Inspector. Jeśli `/` nie istnieje (Faza 1 nie ma routes app), akceptowalny placeholder root lub 404 jest OK — kluczowe: brak crashu auth flow.

- [ ] **Test 3.4** — Pełny reload strony (Safari → reload).
  **Expected:** User pozostaje zalogowany (Supabase persist przez `localStorage`, sesja survival). Brak redirect na `/sign-in`.

- [ ] **Test 3.5** — Kill Safari (swipe up app switcher → swipe Safari w górę) → reopen → wpisz URL.
  **Expected:** Sesja persist (Supabase storage = localStorage, nie sessionStorage). User nadal zalogowany.

- [ ] **Test 3.6** — Cross-device: iPhone A (PWA, zalogowany) + iPhone B (sleeper-app Expo Go, zaloguj się tym samym kontem).
  **Expected:** Oba urządzenia pokazują tego samego user_id w UI / Supabase Studio → `auth.users` jeden wpis. Sesje per-device są niezależne (każde ma własny refresh token), ale user jest ten sam.

- [ ] **Test 3.7** — Edge wrong password: wpisz złe hasło → submit.
  **Expected:** Inline error widoczny (przetłumaczony przez `translate-auth-error.ts`), brak crashu, formularz nadal interaktywny.

- [ ] **Test 3.8** — Edge offline: iPhone A → Settings → Airplane mode ON → tap submit z prawidłowym hasłem.
  **Expected:** Graceful error ("Brak połączenia" lub similar), nie crash, nie wieczne spinner.

- [ ] **Test 3.9** — iOS Safari quirk: scroll formularza gdy klawiatura otwarta.
  **Expected:** Pole hasło widoczne nad klawiaturą (bottom toolbar Safari + klawiatura NIE zasłaniają submit button). Jeśli zasłania — fix w Fazie 2 (KeyboardAvoidingView dla web).

---

## IU4: Theme system (System / Light / Dark + persist)

> Faza 1 dodaje `ThemeProvider` + wire StatusBar, ale UI toggle bottomsheet jest w Fazie 4+ (Settings screen). Tu testujemy default System mode + localStorage persist + reaktywność na zmianę iOS settings.

- [ ] **Test 4.1** — iPhone Settings → Display & Brightness → **Light** → wróć do Safari z otwartą PWA.
  **Expected:** Tło PWA jasne, tekst ciemny (NativeWind `dark:` variants NIE aktywne).

- [ ] **Test 4.2** — iPhone Settings → Display & Brightness → **Dark** → wróć do Safari.
  **Expected:** Tło PWA ciemne, tekst jasny — domyślny mode System reaguje na iOS. Brak FOWT na load.

- [ ] **Test 4.3** — PWA otwarta w Dark mode → przełącz iOS na Light bez zamykania Safari → wróć do PWA.
  **Expected:** PWA reaktywnie przechodzi w light mode (matchMedia `prefers-color-scheme` listener). Akceptowalne: lekki flash przy zmianie. Niedopuszczalne: zostaje stary motyw aż do reloadu.

- [ ] **Test 4.4** — localStorage persist (jeśli Settings screen z toggle będzie w Fazie 1; jeśli nie — pomiń do Fazy 4):
  W Safari Web Inspector → Storage → Local Storage → znajdź klucz `theme-store` (Zustand persist). Wpisz manualnie `{"state":{"mode":"dark"},"version":0}` → reload PWA.
  **Expected:** PWA ładuje się w dark mode niezależnie od iOS Settings (manual override aktywny).

- [ ] **Test 4.5** — Edge: clear localStorage (Safari Web Inspector → Storage → Local Storage → Clear All) → reload.
  **Expected:** PWA wraca do default System mode, ładuje się zgodnie z iOS Settings, brak crashu.

- [ ] **Test 4.6** — Status bar / theme-color meta tag (jeśli dodany w `app.json` web config):
  Sprawdź w Safari iOS czy URL bar przybiera kolor tła aplikacji (light → biały, dark → ciemny).
  **Expected:** URL bar Safari zmienia kolor zgodnie z motywem (PWA standalone mode lub theme-color meta).

---

## Cross-cutting (Faza 1 wide)

- [ ] **Test 5.1** — Safe area insets: iPhone z notch (X+) → sprawdź czy treść NIE jest pod dynamic island ani pod home indicator.
  **Expected:** `env(safe-area-inset-top/bottom)` honoruje, padding poprawny.

- [ ] **Test 5.2** — Add to Home Screen (Safari → Share → Add to Home Screen) → otwórz PWA z ikonki.
  **Expected:** PWA otwiera się w standalone mode (bez Safari URL bar), splash screen jeśli zdefiniowany, sesja użytkownika zachowana z poprzedniego logowania w Safari (localStorage shared).

- [ ] **Test 5.3** — Regression mobile: po wszystkich testach web, otwórz sleeper-app w Expo Go na iPhone B → krótki happy path (start sesji / stop sesji).
  **Expected:** Mobile działa bez zmian, brak side-effect od web workspace.

---

## Po teście

- [ ] Issues found? Wpisz do `docs/active/sleeper-web-pwa/issues-faza-1.md` (utworzyć jeśli nie istnieje)
- [ ] Wszystko PASS → zaznacz checkboxy `[Mobile-manual]` w `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md`:
  - IU1: Weryfikacja localhost web placeholder, regresja sleeper-app
  - IU3: Weryfikacja logowanie istniejącym kontem, persist po reload
  - IU4: Weryfikacja dark/light/system
- [ ] Wklej summary tej checklisty do commit message lub PR description fazy
