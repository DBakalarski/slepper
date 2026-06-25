---
date: 2026-06-25
topic: tryb-nocny-sesji
---

# Tryb nocny ekranu sesji (Faza 7 — "dark mode")

## Problem
Rodzic sprawdza telefon w nocy, w ciemnym pokoju, gdy dziecko śpi. Jasny ekran
(obecny Sleep Fullscreen ma tło `bg-navy` #1E1B4B — ciemny indygo, nie czarny, z
jasnym timerem i CTA) ryzykuje: (a) obudzenie/rozdrażnienie dziecka światłem,
(b) oślepienie rodzica, (c) drenaż baterii przy telefonie leżącym 6-8h z aktywną
sesją. Dodatkowo po ciemku łatwo przypadkiem dotknąć ekranu i niechcący zakończyć
sesję. Bazowy theme system (System/Light/Dark) już istnieje, ale nie adresuje
nocnego scenariusza aktywnej sesji.

Zakres celowo zawężony do **ekranu Sleep Fullscreen podczas aktywnej sesji** — to
jedyne miejsce, gdzie rodzic patrzy w telefon w nocy. Dashboard/historii nikt o 3:00
nie przegląda, więc osobny app-wide motyw AMOLED świadomie odrzucony (patrz Granice).

## Wymagania

- **R1. True-black tło ekranu sesji.** Sleep Fullscreen (`sleep-fullscreen.tsx`)
  renderuje się na tle true-black (AMOLED, `#000000`) zamiast obecnego `bg-navy`.
  Dotyczy **każdej** sesji na tym ekranie (drzemka i sen nocny), niezależnie od pory
  — bez bramkowania po typie/godzinie.

- **R2. Auto-dim po bezczynności.** Po ~20 s bez interakcji (dotyk ekranu) zawartość
  ekranu sesji mocno przygasa: timer i etykieta do ~15% opacity, CTA znikają lub
  blakną do ledwo widocznych. Tło pozostaje true-black. Stan "dimmed" sygnalizuje
  rodzicowi minimalnym śladem światła, że sesja trwa.

- **R3. Wybudzenie dotykiem.** Dotknięcie w dowolnym miejscu ekranu w stanie dimmed
  natychmiast przywraca pełną jasność (timer + CTA) i resetuje licznik bezczynności.
  Pierwszy dotyk po wybudzeniu **nie** wyzwala żadnej akcji (nie kończy sesji) —
  służy tylko rozjaśnieniu.

- **R4. Hold-tap na "Zakończ sen".** Zakończenie sesji wymaga przytrzymania przycisku
  ~1 s zamiast pojedynczego tapu. W trakcie przytrzymania widoczny jest progres
  (np. wypełniający się pasek/ring lub zmiana tła przycisku), żeby akcja była
  czytelna i odwoływalna (puszczenie przed końcem = anuluje). Chroni przed
  przypadkowym zakończeniem sesji po ciemku.

- **R5. Wolniejszy tick timera w tle.** Gdy karta jest w tle (`document.hidden`)
  timer tyka rzadziej (~co 30 s zamiast co 1 s) dla oszczędności baterii. Po powrocie
  focusu/widoczności karty timer natychmiast przelicza i pokazuje dokładny czas
  (czas jest derived state z `start_at` — bez dryfu).

## Kryteria sukcesu
- Wejście w aktywną sesję w nocy → ekran jest czarny i po ~20 s sam przygasa do
  minimum światła; rodzic może położyć telefon obok łóżka bez świecenia.
- Dotknięcie przygaszonego ekranu rozjaśnia go i **nie** kończy przypadkiem sesji.
- Zakończenie sesji wymaga świadomego przytrzymania — przypadkowy tap nie kończy.
- Telefon leżący z aktywną sesją kilka godzin nie tyka co sekundę w tle.
- Reszta aplikacji (dashboard, historia, ustawienia) bez zmian wizualnych.

## Granice scope'u
- **Brak osobnego app-wide motywu AMOLED** (4. opcja w Ustawieniach) — odrzucone:
  wysoki koszt (paleta + wszystkie ekrany), niska wartość (nikt nie przegląda
  dashboardu w nocy). Tryb nocny żyje wyłącznie na ekranie sesji.
- **Brak bramkowania po typie sesji / porze dnia** — true-black + auto-dim dla każdej
  sesji na fullscreenie (decyzja: prostota > semantyka "tylko noc").
- **Brak ściemniania sprzętowej jasności ekranu** (Screen Brightness API) — sterujemy
  tylko warstwą wizualną (opacity/kolory) w obrębie webowej PWA.
- **Bez haptyki** (web Vibration API zawodny — wykluczone już w roadmapie).
- Hold-tap dotyczy **tylko** "Zakończ sen" na ekranie sesji — nie START/STOP na home
  ani innych akcji destrukcyjnych (te poza scope tej fazy).

## Kluczowe decyzje
- **Tryb nocny tylko na Sleep Fullscreen, łączy item #1 i #2 roadmapy**: najwyższy
  stosunek wartość/koszt; to jedyne miejsce nocnego użycia.
- **Auto-dim po bezczynności (nie "zawsze ciemny" ani manualny przycisk)**: jasny gdy
  patrzysz, ciemny gdy odłożysz telefon — bez świadomej akcji rodzica w nocy.
- **Auto-dim/AMOLED bez bramkowania typu sesji**: uniform, zero logiki warunkowej;
  dzienna drzemka też dostaje czarne tło (nieszkodliwe).
- **Hold-tap zamiast confirm-dialog**: jeden gest, mniej tarcia niż modal "na pewno?"
  po ciemku, a chroni przed przypadkiem.

## Zależności / Założenia
- Czas sesji to derived state z `start_at` (CLAUDE.md / `useSessionTimer`) — wolniejszy
  tick (R5) nie powoduje dryfu, bo dokładny czas liczy się z timestampu, nie z licznika.
- Wszelkie operacje czasowe przez `lib/time.ts` (TZ-safe) — dotyczy ewentualnego
  liczenia interwałów (raczej `setTimeout`/`setInterval` ms, nie daty domenowe).
- Native-only API niepotrzebne; całość web (PWA). Wake Lock już działa na tym ekranie.

## Otwarte pytania

### Do rozwiązania przed planowaniem
- _(brak — wszystkie decyzje produktowe rozstrzygnięte)_

### Odroczone do planowania
- [Dotyczy R2][Techniczne] Konkretne wartości: timeout bezczynności (domyślnie ~20 s),
  poziom przygaszenia (domyślnie ~15% opacity timera), czy CTA znikają całkiem czy
  blakną — dostroić w planie/manualnym teście.
- [Dotyczy R2/R3][Techniczne] Mechanizm detekcji bezczynności na web (listener
  `pointerdown`/`touchstart` + `setTimeout` reset) i cleanup w `useEffect`
  (coding-rules §13: zawsze clearTimeout w cleanup).
- [Dotyczy R4][Techniczne] Realizacja hold-tap na react-native-web (Pressable
  `onPressIn`/`onPressOut` + `setTimeout` ~1 s + wskaźnik progresu; reanimated vs
  prosty stan). Min. 1 test happy path + 1 anulowania.
- [Dotyczy R5][Techniczne] Czy wolniejszy tick robić w `useSessionTimer`
  (`visibilitychange` → zmiana interwału) globalnie czy tylko na fullscreenie;
  weryfikacja braku dryfu po powrocie focusu (recompute z `start_at`).
- [Dotyczy R2] Przejście jasny↔dim: natychmiastowe czy z krótką animacją opacity
  (drobny polish, do decyzji w planie).

## Następne kroki
→ `/dev-plan` do planowania technicznego implementacji (Implementation Units).
