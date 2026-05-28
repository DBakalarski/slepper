# Manual Test Checklist — Faza 1 (Dark mode manual override)

**Data:** 2026-05-28
**Tester:** dawid (solo dev)
**Urządzenia:** iPhone (iOS, Expo Go), Pixel/Android (Expo Go)
**Status:** ⏸ DEFERRED — toggle UI wchodzi w Fazie 5 (Profil). Sam store + provider gotowe. Walidacja end-to-end manual po implementacji bottom sheet.

> Wszystkie scenariusze poniżej wykonujemy **po Fazie 5**, gdy toggle (`Switch` lub bottom sheet) w Profilu pozwoli zmienić `mode` w `useThemeStore`. W Fazie 1 nie ma jak ręcznie zmienić mode bez DevTools — pomijamy, NIE jest blokerem kontynuacji.

---

## Setup (po Fazie 5)

- [ ] `cd sleeper-app && git pull && npm install`
- [ ] `npx expo start --clear` — sprawdź QR
- [ ] Otwórz Expo Go na iPhone → skanuj QR
- [ ] Otwórz Expo Go na Android → skanuj QR (drugi tester / second device)
- [ ] Verify obie instancje załadowały app bez czerwonego screena

---

## Scenariusz 1 — Toggle 3 trybów (mapowanie checkboxa: "Walidacja po Fazie 5: przełączyć każdą z 3 opcji")

### iPhone (iOS)

- [ ] Otwórz Profil → znajdź `Tryb ciemny` w sekcji SKRÓTY
- [ ] Wybierz **System**
  - **Oczekiwany:** Tło aplikacji = jasne (iOS w trybie light) lub ciemne (iOS w trybie dark). StatusBar.style = `dark` w light mode, `light` w dark mode.
  - **Verify:** Przełącz w iOS Settings → Display → Appearance między Light/Dark — app powinno **natychmiast** podążyć.
- [ ] Wybierz **Light**
  - **Oczekiwany:** Tło białe/cream NIEZALEŻNIE od ustawienia iOS. StatusBar.style = `dark`.
  - **Verify:** Przełącz iOS na Dark Mode — app **musi pozostać jasna** (override aktywny).
- [ ] Wybierz **Dark**
  - **Oczekiwany:** Tło `dark-bg` (#0F0D26) NIEZALEŻNIE od ustawienia iOS. StatusBar.style = `light`.
  - **Verify:** Przełącz iOS na Light Mode — app **musi pozostać ciemna**.

### Android (Pixel/inne)

- [ ] Powtórz powyższe 3 scenariusze
- [ ] Sprawdź StatusBar background — Android renderuje inaczej niż iOS, ale `expo-status-bar` `style` powinno działać identycznie

---

## Scenariusz 2 — Persist między restartami (mapowanie checkboxa: "Sprawdzić persist między restartami appki")

- [ ] Ustaw tryb **Dark** w Profilu
- [ ] Force close Expo Go (swipe up na iOS, recent apps na Android → swipe out)
- [ ] Otwórz Expo Go ponownie, scan QR
  - **Oczekiwany:** App startuje w trybie Dark **bez flasha do Light**. AsyncStorage `theme-mode` zhydratowane.
  - **Verify (acceptable):** Może być milisekundowy flash systemowego trybu przed hydratacją Zustand persist — to znana cecha (FOWT-analog dla RN, hydration async). Jeśli flash > 200ms widoczny — eskaluj jako bug do `dev-compound`.
- [ ] Powtórz dla **Light** i **System**
- [ ] Verify w Supabase / AsyncStorage CLI (opcjonalne): klucz `theme-mode` w AsyncStorage powinien mieć JSON `{"state":{"mode":"dark"},"version":0}` lub podobny

---

## Scenariusz 3 — Dark mode parity ekranów (regresja)

Po przełączeniu na **Dark**, otwórz każdy ekran i sprawdź czytelność:

- [ ] **Dzisiaj** (`/`)
  - Karty mają tło `dark-card` (#1E1B4B), tekst czytelny
  - Timer (jeśli aktywna sesja) — kontrast WCAG AA z tłem
- [ ] **Historia** (`/history`)
  - Lista sesji, headery dni, agregaty czytelne
- [ ] **Statystyki** (`/stats`) — out of scope ui-redesign, ale sprawdź regresję
- [ ] **Profil** (`/profile`)
  - Karta dziecka, sekcja SKRÓTY, toggle widoczny
- [ ] **Sleep fullscreen** (rozpocznij sesję → fullscreen view)
  - Tło, timer, przycisk Stop czytelne

---

## Scenariusz 4 — Edge cases

- [ ] **Pierwszy start (first launch, brak AsyncStorage)**
  - Wyczyść dane Expo Go (Settings → Reset) → otwórz app
  - **Oczekiwany:** mode default `system`, app śledzi OS theme bez crashy
- [ ] **`systemScheme === null`** (rzadkie, RN edge przy starcie)
  - Niemożliwe do reprodukcji bez patcha — sprawdzane code review (fallback `'light'` w `useEffectiveTheme`)
- [ ] **Background → Foreground**
  - W trybie System: ustaw app w bg → zmień OS theme → wróć do appki
  - **Oczekiwany:** App podąża za nowym OS theme (RN `useColorScheme` jest reactive)

---

## Scenariusz 5 — Two-device sync (regression)

> Theme jest **lokalny per device** — celowo nie synchronizowany przez Supabase. Sprawdzamy że nie ma niezamierzonej propagacji.

- [ ] Telefon A: tryb Dark
- [ ] Telefon B: tryb Light
- [ ] Wykonaj START sesji na A
  - **Oczekiwany:** Sesja syncuje się na B (Realtime), ALE B pozostaje w Light (theme NIE jest propagowany)
- [ ] Zmień tryb na A na Light
  - **Oczekiwany:** B pozostaje w Light niezmienione (theme jest local-only)

---

## Final

- [ ] Wszystkie sekcje 1-5 PASS na iOS + Android
- [ ] Brak czerwonego screena / crashy / `console.error` w Expo Go DevTools
- [ ] Po PASS — odznacz checkboxy `Walidacja po Fazie 5` i `Sprawdzić persist` w `ui-redesign-zadania.md`
- [ ] Commit log w `docs/commits/` (jeśli odkryto poprawki podczas testów)
