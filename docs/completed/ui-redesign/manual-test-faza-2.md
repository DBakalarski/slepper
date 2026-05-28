# Manual test checklist — Faza 2: Tab bar redesign

**Branch:** `feature/ui-redesign`
**Commit:** `8e2be5a`
**Cel:** Weryfikacja redesignu tab bara na fizycznym urządzeniu (Expo Go, iOS + Android).
**Status:** non-blocking — wykonanie po Fazach 3-5 (gdy zawartość ekranów będzie pełna) ALBO równolegle, jak wygodnie.

---

## Setup

1. W `sleeper-app/`: `npx expo start`
2. QR → Expo Go (iOS + Android — oba!)
3. Zaloguj się (lub utwórz konto), upewnij się że jest aktywne dziecko (Faza 0/1 setup)

---

## Scenariusze

### S1 — Ikony renderują się w light + dark

**Przygotowanie:** Profil → bottom sheet trybu (uwaga: UI bottom sheet wchodzi w Fazie 5, na razie zmień tryb przez chwilowy hak: `useThemeStore.setState({ mode: 'light' })` lub przełącz system iOS/Android, bo Faza 1 robi `mode='system'` domyślnie).

- [ ] **Light mode**: w tab barze widoczne 4 ikony (Home/Calendar/BarChart3/User). Inactive ikony w kolorze `#6B6580` (szaro-fioletowy, `text-muted`). Tło tab bara białe (default).
- [ ] **Dark mode**: w tab barze widoczne 4 ikony. Inactive ikony w kolorze `#B8A8D9` (purple-light, jaśniejsze niż tło). Tło tab bara `#0F0D26` (ciemny navy).

**Acceptance:** żadna ikona nie jest niewidoczna ani przezroczysta, kontrast czytelny w obu trybach.

### S2 — Focus state (outlined chip) widoczny

- [ ] **Light mode**: tap "Dzisiaj" → ikona Home otrzymuje **outlined pill** (border 2px w kolorze navy `#1E1B4B`, rounded-full, padding 14/6). Ikona jest lekko bolder (strokeWidth 2.25 vs 2.0 inactive).
- [ ] Tap "Historia" → focus pill przeskakuje na Calendar, Home wraca do plain.
- [ ] Tap "Statystyki" → focus na BarChart3.
- [ ] Tap "Profil" → focus na User.
- [ ] **Dark mode**: powtórz powyższe — border w kolorze cream `#F5F0E8` zamiast navy.

**Acceptance:** w każdym momencie DOKŁADNIE jedna ikona ma pill. Visual delta ze screenem #1 z `design.md` minimalna (acceptable: kerning fontów, exact stroke width).

### S3 — Tap area ≥44pt (a11y)

- [ ] **Pomiar manualny:** w iOS Accessibility Inspector (Settings → Accessibility → Touch Accommodations / Xcode Accessibility Inspector w sim) zaznacz tap area na każdą z 4 ikon. Powinno być ≥44×44pt.
- [ ] **Heurystyka:** tap palcem w odległości ~5pt od krawędzi ikony — tab nadal przełącza się (oznacza że hit-slop jest ≥44pt).
- [ ] Brak fail-through na sąsiedni tab przy tapnięciu na środek ikony.

**Acceptance:** wszystkie 4 taby spełniają WCAG / HIG minimum 44pt.

**Heurystyka kodu:** lucide `size: 22` + paddingVertical 6 (chip) + tabBarItemStyle paddingVertical 6 ≈ 22 + 12 + 12 = ~46pt total height. PaddingHorizontal 14 zapewnia ~50pt szerokości chipa. Powinno być OK, ale ZWERYFIKUJ na device.

### S4 — Cross-platform parity (iOS + Android)

- [ ] **iOS Expo Go**: tab bar bez wizualnych artefaktów (border 2px renderuje się czysto bez subpixel blur, rounded-full faktycznie okrągły).
- [ ] **Android Expo Go**: jak wyżej. Sprawdź czy nie ma kanciastego rogu (Android czasem ignoruje `borderRadius: 999` przy małych view — jeśli tak, debug `overflow: 'hidden'`).
- [ ] **Ripple effect (Android)**: tap na ikonę powinien dawać domyślny ripple — sprawdź czy chip nie blokuje feedbacku.
- [ ] **iOS bezpieczny obszar dolny**: tab bar respektuje home indicator (nie zachodzi na gesture area).

**Acceptance:** parity wizualne między iOS i Android. Drobne różnice ripple/highlight są akceptowalne (RN convention).

---

## Heads-up

- Statusbar (z Fazy 1) powinien automatycznie zmieniać style na light/dark — sprawdź przy okazji.
- Po Fazach 3-5 ekrany będą miały bogatszą zawartość — re-run S1+S2 w realnym kontekście (nie tylko placeholder routes) jako sanity check.
- Two-device sync (Faza 7 regression) — nie dotyczy Fazy 2, ale upewnij się że tab bar nie crashuje gdy realtime invalidacja przychodzi.

---

## Notatki testera

(wypełnij podczas wykonania)

- **Data testu iOS:**
- **Wersja Expo Go iOS:**
- **Data testu Android:**
- **Wersja Expo Go Android:**
- **Zaobserwowane anomalie:**
