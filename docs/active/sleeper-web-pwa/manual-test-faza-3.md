---
title: Sleeper Web — Faza 3 manual test checklist
data: 2026-06-06
faza: 3 (IU8 + IU9 + IU10)
status: BLOKOWANY — P1.1 musi być naprawiony przed wykonaniem
---

# Manual test checklist — Faza 3 (UI & Routes)

**⛔ BLOKADA:** Przed wykonaniem któregokolwiek z testów wymagany jest fix **P1.1** z `review-faza-3.md` (alias `zustand/middleware` do CJS w `metro.config.js`). Bez tego cała PWA pokazuje white screen (bundle parse error).

**Po fixie P1.1 uruchom:**
```bash
pnpm --filter sleeper-web build
cd packages/sleeper-web/dist && python3 -m http.server 5173
# w Safari iOS przez ngrok lub LAN IP: http://<mac-ip>:5173
```

Alternatywnie: `pnpm --filter sleeper-web start --web` + ngrok dla iOS Safari.

---

## A) Smoke (po fixie P1.1)

- [ ] Otwórz `http://<host>:5173/` w Safari macOS → strona renderuje się (NIE white screen)
- [ ] Otwórz Developer Tools → Console: brak `SyntaxError: Cannot use 'import.meta'`
- [ ] Otwórz w Safari iOS (iPhone) → strona renderuje się, font readable, layout responsive
- [ ] Otwórz w Chrome Android (jeśli dostępne) — strona renderuje się

## B) Auth gate (IU9)

- [ ] Niezalogowany user otwiera `/` → redirect na `/sign-in`
- [ ] Niezalogowany user otwiera `/history` → redirect na `/sign-in`
- [ ] Zalogowany user otwiera `/sign-in` → redirect na `/`
- [ ] Zalogowany user otwiera `/sign-up` → redirect na `/`
- [ ] Refresh strony na `/` po logowaniu → sesja persist (localStorage AsyncStorage)
- [ ] Sign-out z `/settings` → redirect `/sign-in`

## C) Pickers (IU8 NEW)

### TimePickerField

- [ ] iOS Safari: tap na `<input type="time">` → natywny wheel picker (minuty scroll)
- [ ] **Parytet z mobile fix:** minute scroll precyzyjne (0-59), bez crop bug znanego z RN
- [ ] Zmiana godziny: po close wheel value reflektuje w UI
- [ ] Edycja w `/session/[id]`: godz. start → save → reload → poprawnie zapisane w app tz
- [ ] Edycja cross-DST: ustaw session 2026-10-26 02:30 (DST end) → poprawnie zapisane bez 1h offset
- [ ] iOS focus: NIE ma auto-zoom przy tap (font-size 16px)
- [ ] Touch target ≥ 44pt (min-height 44px)

### DatePickerField

- [ ] iOS Safari: tap na `<input type="date">` → natywny calendar
- [ ] Android Chrome: tap → natywny calendar dialog
- [ ] Desktop: tap → calendar dropdown
- [ ] `maximumDate={new Date()}` blokuje wybór jutra
- [ ] Edycja daty zachowuje godzinę (DST-safe pipeline)

### a11y

- [ ] VoiceOver iOS: focus na picker → odczytuje `accessibilityLabel`
- [ ] Tab navigation: focus przeskakuje przez pickers w naturalnej kolejności
- [ ] Disabled state: opacity 0.5, kursor not-allowed na desktop

## D) Animations (IU8)

- [ ] BigActionButton press → scale 0.97 + opacity 0.85 fallback (Pressable inline style)
- [ ] ProgressRing renderuje SVG (animacja fade-in via reanimated lub instant render)
- [ ] SegmentedControl tap → smooth indicator transition (reanimated worklets)
- [ ] **Bundle size check:** dist `entry-*.js` ~4.4 MB (po fixie P1.1 — nie powinno wzrosnąć)

## E) Main dashboard `/` (IU10)

- [ ] Aktywne dziecko: HomeHeader z imieniem + avatar
- [ ] Brak rodziny: NoFamilyBanner z linkiem do `/profile`
- [ ] Brak dzieci: AddChildForm widoczny
- [ ] Aktywna sesja: SleepInProgressCard z timerem (useSessionTimer)
- [ ] Brak aktywnej sesji: ActiveWindowCard + BigActionButton START
- [ ] **Smart session type:** czyta `recommendation.remainingNapsToday[0].type` — przed pierwszą drzemką nap, przed snem nocnym night, fallback nap
- [ ] QuickActions: Drzemka / Sen nocny / Wstecz w czasie buttons działają
- [ ] Sesje dzisiaj: lista do 5 ostatnich, link "Pokaż wszystkie" → `/history`

## F) Start/Stop flow (IU10)

- [ ] Tap BigActionButton START → optimistic UI (przejście do "Sleep in progress")
- [ ] **Cross-device sync:** start na PWA → druga osoba na sleeper-app widzi via Realtime ≤ 2s
- [ ] Tap BigActionButton STOP → sesja zapisana w bazie z poprawnym `end_at`
- [ ] Haptics (BigActionButton): expo-haptics medium impact (na iOS Safari graceful no-op)
- [ ] Error toast jeśli mutate fail (np. RLS violation)

## G) Edit session `/session/[id]` (IU10)

- [ ] Form prefill z bazy (type/start/end/notes)
- [ ] Type chips: tap zmienia (nap / night_sleep)
- [ ] Date + Time pickers: edycja
- [ ] Cross-day night sleep: 22:00 → 06:00 (endDate < startDate) → walidacja error
- [ ] Cross-day night sleep poprawny: 22:00 + endDate +1day 06:00 → save → DB ma start_at < end_at
- [ ] **⚠️ Delete session: Alert.alert no-op na web (P2.1 BUG)** — tap "Usuń" → cisza, akcja nie wykonana. Potwierdza P2.1.
- [ ] Save → redirect back, sesja w `/history` z nowymi wartościami

## H) Backdated insert (IU10)

- [ ] Modal otwiera się
- [ ] Prefill: date = today (todayDateInAppTz), time = current HH:MM
- [ ] Walidacja endAt > startAt
- [ ] Walidacja future dates (startAt > Date.now())
- [ ] Insert → modal close → sesja w "Sesje dzisiaj"

## I) History `/history` (IU10)

- [ ] Grupowanie per dzień w app tz (Europe/Warsaw)
- [ ] Cross-midnight session pokazuje się w dniu startu
- [ ] Tap sesji → `/session/[id]` edit

## J) Stats `/stats` (IU10)

- [ ] Wykresy 7 dni renderują się (recharts lub native SVG?)
- [ ] Brak danych: empty state

## K) Profile/Settings (IU10)

- [ ] `/profile`: edycja email/avatar (TBD scope)
- [ ] `/settings`: Rodzina sekcja
- [ ] InviteMemberForm: walidacja email, błąd "siebie nie zaprosisz"
- [ ] **⚠️ PendingInvitations revoke: Alert.alert no-op na web (P2.1 BUG)** — tap "Cofnij" → cisza. Potwierdza P2.1.
- [ ] Theme toggle (System/Light/Dark): zmiana reaktywna, persist po reload
- [ ] Sign-out: redirect `/sign-in`

## L) Child edit `/child/[id]/edit` (IU10)

- [ ] Form prefill z bazy
- [ ] Zmiana algorithm ('galland' / 'kotki_dwa') → save → recommendation refresh

## M) Cross-midnight refresh (P2.2 verify)

- [ ] **Otwórz PWA o 23:55 na aktywnej karcie**
- [ ] **Bez zamykania karty zostań do 00:05**
- [ ] Sprawdź:
  - "Sesje dzisiaj" pokazuje wczorajsze sesje (BUG — powinno wyczyścić)?
  - Lub: queryKey się odświeżył automatycznie (`dayKeyInAppTz` zmiana)?
- [ ] **Jeśli BUG potwierdzony** → fix P2.2 (setInterval fallback)

## N) Sleep fullscreen (P2.3 verify)

- [ ] Start sesji → `/sleep-fullscreen` ekran (router.push)
- [ ] **iOS Safari: zostaw ekran włączony, czekaj ~30s bez dotyku**
- [ ] **Czy ekran gaśnie (no Wake Lock)?** — potwierdza P2.3
- [ ] Po fixie P2.3 (Wake Lock API): ekran zostaje włączony przez czas sesji
- [ ] Tap "Zakończ sen" → endSession.mutate → redirect `/`

## O) Realtime cross-device

- [ ] Telefon A (sleeper-app Expo Go) + Telefon B (PWA Safari) zalogowane na to samo konto
- [ ] Start sesji na A → B widzi w ≤ 2s (Realtime invalidate)
- [ ] Edit sesji na B → A widzi update w ≤ 2s
- [ ] Delete sesji na A → B widzi removal w ≤ 2s
- [ ] **Note:** Edit/delete na B (PWA) zależy od fixu P2.1 (Alert confirm)

## P) Regression

- [ ] sleeper-app w Expo Go nadal działa (smoke: start/stop sesji, edit)
- [ ] sleeper-app build: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS

---

## Format raportowania wyników

Po wykonaniu każdego testu zaznacz `[x]` przed nim. Jeśli FAIL — opisz w pliku `manual-test-faza-3-results.md` z reprodukcją + screenshot.

**Severity dla FAIL podczas manual test:**
- P1: test smoke (A) lub auth gate (B) fail → blocker
- P2: pickers / Alert (G/K) / cross-midnight (M) / Wake Lock (N) fail → blocker dla Fazy 4 deploy
- P3: visual polish (animations D, a11y) fail → can defer
