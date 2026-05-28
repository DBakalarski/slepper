# Manual Test — Faza 3 (Dzisiaj redesign)

**Branch:** `feature/ui-redesign`
**Commit:** `2220c5d`
**Stack:** Expo Go SDK 54, iOS + Android
**Status:** non-blocking, do wykonania równolegle z Fazą 4 lub po niej

> Wykonaj na fizycznym urządzeniu (Expo Go). Sprawdź każdy scenariusz osobno, zaznacz `[x]` po PASS lub zostaw `[ ]` + dopisz krótki opis FAIL.

---

## Setup

- [ ] Aplikacja zbudowana z commita `2220c5d` (lub późniejszym)
- [ ] Konto z **co najmniej 1 rodziną** i **1 dzieckiem** (warunek dla `HomeHeader` — fallback "Dzisiaj"+email pokazuje się tylko bez dziecka)
- [ ] Co najmniej 1 zakończona sesja w bazie dla aktywnego dziecka (dla scenariusza ActiveWindowCard z timerem ≠ "Nowy dzień")

---

## S1 — HomeHeader: Avatar + Greeting + Bell

**Cel:** porównanie wizualne ze screenem #1 z `design.md`, sekcja header.

- [ ] Avatar renderuje się po lewej z **kolorem dziecka** (`child.avatar_color`) jako tłem
- [ ] Avatar wyświetla **pierwszy znak imienia dziecka** uppercase (np. "M" dla "Mia")
- [ ] Obok avatara: **greeting + przecinek + imię (bold)** — np. "Dzień dobry, **Mia**"
- [ ] **ChevronDown** ikona pojawia się obok imienia (visual only, NIE jest klikalna jako dropdown)
- [ ] Greeting zmienia się **per pora dnia** (sprawdź zmieniając godzinę systemową lub czekając):
  - 5:00–11:59 → "Dzień dobry"
  - 12:00–17:59 → "Dobre popołudnie"
  - 18:00–22:59 → "Dobry wieczór"
  - 23:00–4:59 → "Dobranoc"
- [ ] **Bell** ikona po prawej w okrągłym IconButton, z **pomarańczową kropką** w prawym górnym rogu (mock=true)
- [ ] Tap na Bell — nie crashuje (no-op, mock; VoiceOver/TalkBack czyta "Powiadomienia")
- [ ] **Fallback bez dziecka:** wyloguj się / usuń aktywne dziecko → nagłówek zmienia się na "Dzisiaj" + email

---

## S2 — ActiveWindowCard: pomarańczowa karta okna aktywności

**Cel:** porównanie ze screenem #1, karta "OKNO AKTYWNOŚCI".

Warunek: aktualnie **brak aktywnej sesji**, ale jest **przynajmniej 1 zakończona** (`lastSleepEndAt !== null`).

- [ ] Karta z **tłem `bg-orange-soft`** (jasny pomarańczowy, NIE gradient — decyzja Fazy 0)
- [ ] Header: **kropka pomarańczowa** + label "**OKNO AKTYWNOŚCI**" (uppercase, tracking-wide, kolor orange)
- [ ] Wielki **timer text-6xl** w tabular-nums (np. "1:23:45") — kolor navy, nawet w dark mode
- [ ] **ProgressBar** pod timerem — tinted orange, track jasny biały/70%
- [ ] Footer-row:
  - Lewa: "**Pobudka o HH:MM**" (text-muted)
  - Prawa: **Badge** "Drzemka za ~Xg Ym" (variant orange) **LUB** "Można próbować drzemki" (gdy okno upłynęło)
- [ ] Timer tika **co 1 minutę** (nie sekundę — świadomy trade-off)
- [ ] **Stan bez sesji w historii** (nowy account / pierwsze dziecko): zamiast timera "**Nowy dzień**" + "Brak sesji w historii"
- [ ] **Dark mode parity** (Profil → toggle Light/Dark — Faza 5; lub override System): karta zostaje **pomarańczowa** w dark mode (brak `dark:bg-*` variantu — świadoma decyzja designerska; sprawdź czy NIE wygląda obco obok ciemnego tła i ciemnych kart `TodayStatsCard`/`QuickActions`)

---

## S3 — TodayStatsCard: ring + stacked bar + 3 mini-stats

**Cel:** porównanie ze screenem #1, karta "DZISIAJ".

Warunek: co najmniej 1 sesja **zakończona dzisiaj** (idealnie miks `nap` i `night_sleep`).

- [ ] Label "**DZISIAJ**" uppercase, kolor text-muted (`#6B6580`)
- [ ] Wielka wartość total **"Xg Ym"** (np. "11g 30m") font-display 3xl bold, tabular-nums
- [ ] Pod wartością: "**z 13g zalecanych**" (text-muted, sm)
- [ ] **ProgressRing** po prawej z procentem w środku (np. "88%") — pierścień purple-light track + purple progress, start u góry (12 o'clock)
- [ ] **ProgressBarStacked** poniżej z 3 segmentami (jeśli są dane):
  - Purple (sen nocny)
  - Orange (drzemki)
  - Success/zielony (najdłuższe okno aktywności)
- [ ] 3 **mini-stats grid** poniżej (każda z kropką w odpowiednim kolorze):
  - Sen nocny: `Xg Ym` (kropka purple)
  - Drzemki: `N · Xg Ym` (kropka orange, gdzie N = liczba drzemek)
  - Aktywność: `Xg Ym` (kropka success/zielony)
- [ ] Wszystkie wartości w tabular-nums (równe szerokości cyfr)
- [ ] **Dark mode parity:** karta `bg-dark-card`, tekst cream, ring i bar zachowują kolory

---

## S4 — BigActionButton + QuickActions

**Cel:** porównanie ze screenem #1, sekcja CTA + quick actions.

### BigActionButton

- [ ] **Stan domyślny (brak active session):** "Rozpocznij sen" navy bg, cream text, BRAK Moon ikony (sessionType default 'nap')
- [ ] **Stan disabled / pending:** opacity ↓ (bg-navy/50), spinner ActivityIndicator zamiast labela
- [ ] **Haptic feedback** (medium impact) przy tap — wyczuwalne na iOS/Android (jeśli włączone)
- [ ] **Stan podczas night_sleep w toku (`mode='stop'`, sessionType='night_sleep'):** "Zakończ sen" — **Moon ikona** NIE pokazuje się (Moon tylko dla `mode='start'`)
- [ ] **Stan start z night_sleep (jeśli kiedyś przepniemy default z QuickActions):** Moon ikona PRZED labelem
- [ ] **Dark mode:** bg-purple zamiast bg-navy

### QuickActions

- [ ] **3 białe karty obok siebie** (flex-row gap-2)
- [ ] Każda karta: **okrągły chip** (40×40) + ikona środkowa + label dolny
  - **Drzemka:** chip bg-orange-soft, ikona Sun (orange `#E08B6F`)
  - **Sen:** chip bg-purple-soft, ikona Moon (purple `#7C6BAD`)
  - **Dodaj wstecz:** chip bg-cream (dark: dark-surface), ikona Plus (text-muted `#6B6580`)
- [ ] Tap "Drzemka" → start sesji typu `nap`
- [ ] Tap "Sen" → start sesji typu `night_sleep`
- [ ] Tap "Dodaj wstecz" → otwiera `BackdatedSessionModal`
- [ ] **Disabled state** podczas active session lub pending: opacity 0.5, tap nie działa
- [ ] **Dark mode:** karty `bg-dark-card` zamiast white, chipy zachowują tonalne soft kolory, labele cream

---

## S5 — "Pokaż wszystkie" → router.push('/history')

**Cel:** sprawdzić że link działa i otwiera Historia tab.

Warunek: co najmniej 1 sesja dzisiaj (sekcja "Sesje dzisiaj" się renderuje).

- [ ] Sekcja "**Sesje dzisiaj**" pokazuje się gdy `todaySessions.length > 0`
- [ ] Label "Sesje dzisiaj" uppercase + text-muted
- [ ] Po prawej Pressable "**Pokaz wszystkie**" (mały, font-semibold, underline)
- [ ] Tap → nawigacja do `/history` (zakładka Historia w tab bar)
- [ ] VoiceOver/TalkBack czyta "Pokaz wszystkie sesje" (accessibilityLabel)
- [ ] Lista pod linkiem: max 5 SessionListItem (`.slice(0, 5)`) — komponent w starym stylu (rewrite w Fazie 4)

---

## S6 — Dark mode parity + iOS/Android cross-check

**Cel:** spójność wizualna w obu trybach, oba systemy.

### Dark mode (toggle przez Profil → Faza 5 LUB systemowy ciemny motyw)

- [ ] **HomeHeader:** Avatar zachowuje kolor dziecka, greeting cream/70, imię bold cream, ChevronDown i Bell ikony cream `#F5F0E8`
- [ ] **ActiveWindowCard:** pozostaje pomarańczowe (świadoma decyzja); timer navy text **czytelny** na `bg-orange-soft` (sprawdź WCAG AA kontrast wizualnie)
- [ ] **TodayStatsCard:** `bg-dark-card`, tekst cream, ring + stacked bar zachowują kolory
- [ ] **BigActionButton:** bg-purple, text cream
- [ ] **QuickActions:** karty `bg-dark-card`, chipy zachowują soft kolory tła, ikony zachowują HEX
- [ ] **WCAG AA kontrast** (ocena na oko + jeśli można DevTools accessibility inspector w Expo Go):
  - `text-orange` (#E08B6F) na `bg-orange-soft` (#FBE8DD) — label "OKNO AKTYWNOŚCI" — **uwaga: niski kontrast**, sprawdź czytelność na obu urządzeniach przy różnym oświetleniu
  - `text-text-muted` (#6B6580) na `bg-cream` (#F5F0E8) — pomocnicze labele

### iOS vs Android

- [ ] **iOS:** shadow-card renderuje się (delikatny cień pod kartami)
- [ ] **Android:** shadow-card → elevation, równy/podobny cień
- [ ] **iOS:** lucide ikony Sun/Moon/Plus/Bell/ChevronDown ostre
- [ ] **Android:** lucide ikony ostre (no aliasing), strokeWidth domyślny czytelny
- [ ] **iOS:** ProgressRing SVG płynny (anti-aliased)
- [ ] **Android:** ProgressRing SVG płynny, brak stutter przy tick (30s)
- [ ] **Tap targets ≥44pt** (IconButton md = 44px = OK; ActionCard ≥56px = OK)
- [ ] **Haptic feedback** działa na obu (iOS Taptic Engine, Android wibracje)

---

## Acceptance

✅ Faza 3 GOTOWA do mergea jeśli:
- Wszystkie scenariusze S1–S5 PASS (lub udokumentowany FAIL w komentarzu)
- S6 dark mode parity bez krytycznych odchyleń (kontrast `text-orange/bg-orange-soft` zaakceptowany albo zgłoszony jako follow-up do Fazy 6 polish)
- Brak crashy w Expo Go console (`console.error` clean)

---

## Notatki

- **Sekcja "Pokaz wszystkie" tekst** — w komponencie literówka (brak polskich znaków: "Pokaz" zamiast "Pokaż"), spójne z resztą stringów w pliku (`/Users/.../index.tsx:222`). Nie blokuje fazy — globalny polish stringów w Fazie 6 (lub osobne zadanie i18n).
- **`SessionListItem` w starym stylu** w sekcji "Sesje dzisiaj" — świadome (rewrite w Fazie 4 z sun/moon ikona + ChevronRight).
