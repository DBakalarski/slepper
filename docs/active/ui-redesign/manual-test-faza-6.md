# Manual Test Checklist — Faza 6 (Polish + a11y)

**Wykonanie:** on-device w Expo Go (iOS + Android), single-test pass.
**Czas estymowany:** ~25-35 min (2 platformy × ~15 min).
**Wymaga:** włączony VoiceOver (iOS) / TalkBack (Android) dla scenariuszy a11y.

---

## S1 — VoiceOver / TalkBack: nawigacja i labelki

**Cel:** Każda interakcja czytana poprawnie przez screen reader.

### iOS (VoiceOver)
- [ ] Włącz VoiceOver: Settings → Accessibility → VoiceOver
- [ ] Ekran Dzisiaj: swipe right czyta kolejno: Avatar ("imię dziecka"), greeting tekst, IconButton "Powiadomienia"
- [ ] Ekran Dzisiaj (jest aktywna sesja): SleepInProgressCard czyta poprawnie label typu sesji
- [ ] BigActionButton w trybie `start` dla nap: czyta "Rozpocznij sen", role: button
- [ ] BigActionButton w trybie `start` + night_sleep: czyta "Rozpocznij sen" (ikona Moon ignorowana — labeling tekstem)
- [ ] BigActionButton podczas mutation (`isPending`): czyta "busy" status
- [ ] QuickActions: 3 chipy czytają "Drzemka", "Sen", "Dodaj wstecz"
- [ ] SessionListItem w historii Z gapem `> 0`: label zawiera ", po aktywnosci Xg Ym" na końcu
- [ ] SessionListItem w historii BEZ gapu: label kończy się na zakresie czasu (bez sufiksu)
- [ ] Ekran Profil: gear IconButton czyta "Ustawienia"
- [ ] ShortcutRow "Tryb ciemny": czyta "Tryb ciemny, [aktualny tryb]", role: button
- [ ] ThemeModeBottomSheet otwarty: 3 opcje czytają labelki ("Zgodnie z systemem", "Jasny", "Ciemny") z `accessibilityState selected` dla aktywnej
- [ ] ThemeModeBottomSheet backdrop: czyta "Zamknij wybor motywu"
- [ ] Ekran Settings: back button czyta "Wroc"
- [ ] InvitationRow na Dzisiaj (jeśli jest zaproszenie): "Dolacz" button czyta "Dolacz do rodziny [nazwa]"

### Android (TalkBack)
- [ ] Powtórz powyższe scenariusze z TalkBack włączonym
- [ ] Sprawdź czy `accessibilityState` (`disabled`, `busy`, `selected`) jest zapowiadany

**Acceptance:** Każdy interaktywny element ma sensowną nazwę. Brak "Button" bez kontekstu.

---

## S2 — Touch targets ≥44pt + hitSlop

**Cel:** Wszystkie tap area spełniają guideline iOS HIG / Android Material (44pt / 48dp).

- [ ] Settings back button (`w-11 h-11` + hitSlop 8): tap w obszarze ~52pt szerokości działa
- [ ] "Pokaz wszystkie" link na Dzisiaj: hitSlop 8 — tap blisko (ale poza) tekstu otwiera Historię
- [ ] IconButton `md` (44pt natywnie): tap w środku łatwy, na krawędziach też
- [ ] ProgressRing nie jest interaktywny (sprawdź że tap nic nie robi — to tylko visual)
- [ ] SegmentedControl Lista/Kalendarz: tap na sam tekst (środek) działa, tap blisko krawędzi też

**Acceptance:** Żaden Pressable nie wymaga "precyzyjnego" tapu.

---

## S3 — Tabular nums w timerach

**Cel:** Cyfry w timerach nie "skakają" przy zmianie wartości (mono-width).

- [ ] Ekran Dzisiaj z aktywną sesją: timer w SleepInProgressCard (display + short) — cyfry mają stałą szerokość, nie ma "wiggle" przy 0→1, 1→2 itp.
- [ ] ActiveWindowCard timer (np. "1g 23m") — cyfry stable width
- [ ] TodayStatsCard suma (`formatDuration(totalSleepMs)`) + ring label (% normy) — stable
- [ ] ProgressRing label "98%" — stable width

**Acceptance:** Brak widocznego "drgania" cyfr podczas ticka timera (co 1s w SleepInProgress, co 30s w Today).

---

## S4 — Pressable feedback

**Cel:** Visual feedback przy press jest delikatny, spójny, nie irytuje.

- [ ] BigActionButton press: scale 0.97 + opacity 0.85, gładkie release
- [ ] BigActionButton disabled (no haptic, no scale) — sprawdź że nie odpowiada
- [ ] QuickActions/ActionCard press: scale + opacity (każdy z 3)
- [ ] IconButton press (Bell, Settings gear): scale + opacity
- [ ] InvitationRow "Dolacz" button: scale + opacity (jeśli zaproszenie istnieje)
- [ ] SessionListItem row press: TYLKO opacity (bez scale — świadoma decyzja UX dla list rows)
- [ ] ShortcutRow w Profilu: TYLKO opacity
- [ ] Settings back button: TYLKO opacity
- [ ] Wyloguj button w Settings: TYLKO opacity

**Acceptance:** Feedback przy press jest natychmiastowy (<16ms perceptual), wraca do normalu po release. Brak "jankness" na slabszych urządzeniach (Android budget).

---

## S5 — ProgressRing fade-in animation

**Cel:** Ring pojawia się płynnie przy wejściu na ekran, value updates są instant.

- [ ] Kill app, open → Dzisiaj: ProgressRing w TodayStatsCard ma 300ms fade-in (opacity 0→1)
- [ ] Switch tab: Historia → Dzisiaj: ring re-mountuje się i znowu robi fade-in
- [ ] Z aktywną sesją, dodaj nową sesję (mock z BackdatedSessionModal): ring `value` zmienia się instantly (BEZ ponownego fade-in — dashOffset update SVG bez animacji opacity)
- [ ] Po zmianie value, opacity pozostaje 1.0 (nie resetuje się do 0)

**Acceptance:** Fade-in tylko przy mount. Value updates instant bez "blinkania".

---

## S6 — Dark mode + WCAG AA contrast (wszystkie ekrany)

**Cel:** Każdy ekran ma czytelny kontrast w obu trybach.

### Light mode
- [ ] Dzisiaj: HomeHeader greeting/name (text-text-muted/text-navy on cream bg)
- [ ] Dzisiaj: ActiveWindowCard duration text (text-navy on orange-soft bg)
- [ ] Dzisiaj: TodayStatsCard "z 13g zalecanych" (text-text-muted on white bg)
- [ ] Historia: nagłówki sekcji "Dzisiaj"/"Wczoraj" + agregat
- [ ] Historia: "aktywność Xg Ym" w pomarańczowym
- [ ] Profil: imię dziecka na karcie purple-light (navy text — sprawdź AA)
- [ ] Profil: "% normy" success/orange — kontrast OK
- [ ] Settings: tekst "Rodzina" + email użytkowników

### Dark mode (Profil → Tryb ciemny → Ciemny)
- [ ] Tab bar: ikony active (cream) vs inactive (purple-light) — wyraźnie różne
- [ ] HomeHeader: greeting (text-cream/70) — czytelny na dark-bg
- [ ] ProgressRing label cream w dark
- [ ] SegmentedControl: aktywna opcja (text-navy lub text-cream) vs nieaktywna (text-muted)
- [ ] SessionListItem: type label "Drzemka · 1g 11m" (text-cream/70 on dark-card)
- [ ] Profil child card w dark mode (bg-dark-surface zamiast bg-purple-light)
- [ ] ThemeModeBottomSheet w dark: nazwy opcji czytelne, mutedIconColor visible

**Acceptance:** DevTools accessibility inspector raportuje WCAG AA dla każdego pomiaru. Jeśli któryś element <4.5:1 — flag jako P2 i wpisz w `Do poprawy` w pliku zadań.

---

## S7 — Regression check: SegmentedControl animation

**Cel:** Indicator animation pozostała w SegmentedControl po Fazie 6 (NIE zmodyfikowanej).

- [ ] Ekran Historia: tap "Kalendarz" — indicator slide z lewej do prawej (~200ms withTiming)
- [ ] Tap "Lista" — slide back
- [ ] Multiple szybkie tapy — animation queue się resetuje, nie ma jank
- [ ] Brak nowego `pressed` feedback na SegmentedControl (tylko animacja indicatora)

**Acceptance:** Animacja jak w Fazie 4 — nic się nie zmieniło.

---

## S8 — Regression check: dwa telefony Realtime sync

**Cel:** Polish/a11y zmiany nie zepsuły core sync flow.

- [ ] Telefon A: START sesja → Telefon B: w ciągu ~2s pojawi się SleepInProgressCard na Dzisiaj
- [ ] Telefon A: STOP → Telefon B: ActiveWindowCard wraca, sesja w historii
- [ ] Edycja sesji z telefonu A: telefon B widzi zaktualizowane dane

**Acceptance:** Realtime nadal działa. Brak crashy w Expo Go console.

---

## Finalizacja

- [ ] Wszystkie powyższe scenariusze PASS na iOS
- [ ] Wszystkie powyższe scenariusze PASS na Android
- [ ] Brak console.error w Expo Go DevTools
- [ ] Brak ostrzeżeń Reanimated worklet w konsoli
- [ ] Jeśli któryś scenariusz FAIL — wpis w `ui-redesign-zadania.md` sekcja "Do poprawy po review fazy 6" z klasyfikacją severity

---

**Po zakończeniu manual testów:** odznaczyć checkbox `[ ] DevTools accessibility inspector: WCAG AA na każdym ekranie (light + dark)` w `ui-redesign-zadania.md` Faza 6.
