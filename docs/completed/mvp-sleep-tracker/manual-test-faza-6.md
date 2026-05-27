# Manual test — Faza 6: Polish dla siebie

**Data utworzenia:** 2026-05-27
**Status:** Pending operator
**Wymaga:** Fizyczne urzadzenie (iOS lub Android) z najnowszym Expo Go ALBO development build.

---

## Scenariusze

### Scenariusz 1 — Haptics przy "Rozpocznij sen"

**Setup:**
- Zaloguj sie, dodaj rodzina + dziecko.
- Upewnij sie ze NIE ma aktywnej sesji (ekran "Dzisiaj" pokazuje pomaranczowa karte `ActiveWindowCard`).
- Telefon NIE w trybie cichym (iOS: switch po lewej stronie w pozycji ON; Android: profil dzwieku != "Cichy").

**Kroki:**
1. Tap na granatowy duzy przycisk "Rozpocznij sen".
2. Obserwuj: telefon powinien wykonac krotki, sredni haptic feedback (Medium impact) w momencie tap-a.
3. Karta przelacza sie na granatowa `SleepInProgressCard` z timerem.

**Oczekiwany rezultat:**
- Wyrazna, krotka wibracja w palcu jednoczesnie z tap-em.
- Sesja wystartowala (timer leci od 00:00:00).

**Edge case:**
- W trybie cichym iOS — haptic moze byc wyciszony zaleznie od ustawienia "System Haptics" (Settings → Sounds & Haptics → System Haptics ON). Jesli OFF — brak wibracji to OK.
- Android — niektore tanie urzadzenia nie maja Haptic Engine; brak wibracji to nie blad.

---

### Scenariusz 2 — Haptics przy "Zakoncz sen"

**Setup:**
- Sesja w toku (scenariusz 1 wykonany).

**Kroki:**
1. Tap granatowy przycisk "Zakoncz sen" (mode='stop').
2. Obserwuj haptic.
3. Karta wraca do pomaranczowej `ActiveWindowCard`.

**Oczekiwany rezultat:**
- Identyczny haptic Medium jak przy starcie.
- Sesja zakonczona, agregat "Dzisiaj" zaktualizowany.

---

### Scenariusz 3 — Dark mode toggle (iOS)

**Setup:**
- App otwarta na ekranie "Dzisiaj" w jasnym trybie (tlo kremowe `#F5F0E8`).

**Kroki:**
1. Bez zamykania appki: przesun palec z gornego prawego rogu w dol → Control Center.
2. Long-press na slider jasnosci → "Dark Mode" toggle.
3. Wroc do appki.

**Oczekiwany rezultat:**
- Tlo glowne zmienia sie z kremowego na ciemne (`#0F0D26`).
- Tytuly ("Dzisiaj", "Historia", "Profil", "Statystyki") z granatowych na kremowe.
- Karty kolorowe (pomaranczowa `ActiveWindowCard`, granatowa `SleepInProgressCard`) — bez zmian (paleta zachowana).
- Tab bar (Dzisiaj/Historia/Statystyki/Profil) — tlo ciemne, aktywny tab kremowy zamiast granatowego.
- BigActionButton — tlo zmienia sie z navy na purple w dark mode (zachowuje rozpoznawalnosc).

---

### Scenariusz 4 — Dark mode toggle (Android)

**Setup:**
- Android telefon, app otwarta.

**Kroki:**
1. Przesun palec z gornego rogu w dol (2x dla pelnego panelu Quick Settings).
2. Tap kafelek "Dark theme" / "Ciemny motyw".
3. Wroc do appki.

**Oczekiwany rezultat:**
- Identyczne zmiany jak w scenariuszu 3 (iOS).
- Status bar moze zmienic kolor (StatusBar `auto` adaptuje).

---

### Scenariusz 5 — Visual zgodnosc z mockupami

**Setup:**
- App w jasnym trybie, sesja w toku, dane z dzis (kilka sesji).

**Kroki:**
1. Sprawdz palete:
   - Tlo glowne: kremowe `#F5F0E8`
   - Karta aktywnej sesji: granatowe `#1E1B4B`
   - Karta okna aktywnosci: pomaranczowe `#E08B6F`
   - Tekst akcentu (purple): `#7C6BAD`
2. Sprawdz spacing:
   - Padding zewnetrzny ekranu: 24px (px-6)
   - Gap miedzy kartami: 16px (gap-4)
   - Padding karty: 20px (p-5)
3. Sprawdz typografie:
   - Tytul "Dzisiaj": 3xl (30px), font-semibold
   - Timer w `SleepInProgressCard`: 4xl (36px), font-mono
   - Etykiety quick actions: xs (12px), font-semibold

**Oczekiwany rezultat:**
- Zgodne z mockupem #1 (active window) i mockupem #2 (sleep in progress).
- Brak overflowu tekstu na malym ekranie (test na iPhone SE / Android 5").

---

### Scenariusz 6 — EAS development build (manual instructions dla usera)

**Cel:** Apka dziala standalone bez Expo Go i bez bundlera (Metro).

**Wymagania wstepne (po stronie usera):**
- Konto Expo (free): https://expo.dev/signup
- (iOS) Konto Apple Developer ($99/rok) — wymagane dla install na fizyczne iPhone
- (Android) Brak wymagan ($0)

**Krok 1 — Zaloguj sie do EAS:**
```bash
cd sleeper-app
npx eas-cli@latest login
# Wprowadz username/password z konta Expo
```

**Krok 2 — Zainicjuj projekt EAS:**
```bash
npx eas-cli@latest init
# Wybierz/utworz slug "sleeper-app"
# Komenda doda `extra.eas.projectId` do app.json
```

**Krok 3 — Build dev na Android (szybciej):**
```bash
npx eas-cli@latest build --profile development --platform android
# ~10-15 min na cloud build
# Po skonczeniu — link do .apk
# Wgraj .apk na telefon (file transfer lub QR code z dashboardu)
# Zainstaluj (allow "Install from unknown sources")
```

**Krok 4 — Build dev na iOS (wymaga Apple Developer):**
```bash
npx eas-cli@latest build --profile development --platform ios
# Pytanie o credentials — wybierz "Let EAS handle"
# Telefon musi byc zarejestrowany w Apple Developer (UDID) → EAS poprosi
# Po build — instalacja przez TestFlight lub bezposrednio przez link
```

**Krok 5 — Uruchom development build:**
- Otworz zainstalowana appke (ikona "sleeper-app").
- Pojawi sie ekran "Enter URL manually" lub QR scanner.
- Na komputerze: `npx expo start --dev-client`
- Zeskanuj QR z terminala → appka laczy z Metro bundlerem.

**Weryfikacja po build:**
- Apka uruchamia sie standalone (po zamknieciu Metro w `npx expo start`, appka dalej dziala bez bundlera tylko jesli build production — dev build wymaga Metro).
- Notyfikacje dzialaja (Expo Go nie wspiera background notifications w SDK 53+).
- Deep linking `sleeperapp://` dziala.

---

### Scenariusz 7 — TestFlight build dla partnera (opcjonalne)

**Wymagania:**
- Apple Developer $99/rok
- Konto App Store Connect

**Kroki (manual, NIE wykonujemy w Fazie 6 autonomicznie):**
1. `npx eas-cli@latest build --profile preview --platform ios`
2. `npx eas-cli@latest submit --platform ios --latest`
3. W App Store Connect → "TestFlight" → dodaj partnera jako "Internal Tester" (email).
4. Partner instaluje TestFlight app + akceptuje invite + instaluje sleeper-app.

---

## Severity gate scenariuszy

| Scenariusz | Priorytet | Blokuje gate? |
|---|---|---|
| 1 — Haptic start | P1 (core UX feature) | TAK |
| 2 — Haptic stop | P1 (core UX feature) | TAK |
| 3 — Dark mode iOS | P2 (polish, brak fallbacku) | NIE |
| 4 — Dark mode Android | P2 (polish) | NIE |
| 5 — Visual mockup parity | P2 (polish) | NIE |
| 6 — EAS dev build | P3 (out-of-scope autonomous) | NIE |
| 7 — TestFlight | P3 (opcjonalne) | NIE |

---

## Notatki

- Haptic feedback `ImpactFeedbackStyle.Medium` jest fire-and-forget — brak Haptic Enginu nie blokuje akcji.
- Dark mode oparty o `darkMode: 'media'` w `tailwind.config.js` — czyta `Appearance` API natywnie (iOS Settings → Display & Brightness, Android → Display → Dark theme). NIE ma manualnego togglera w app.
- EAS init NIE wykonany autonomicznie — wymaga interaktywnego logowania. `eas.json` przygotowany z profilami `development`/`preview`/`production`.
- App icon i splash NIE zmienione — placeholder template Expo wystarcza dla wlasnego uzytku (Faza 6 = "polish dla siebie", nie store release).
