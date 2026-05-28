# UI Redesign — checklist zadań

**Branch:** `feature/ui-redesign`
**Ostatnia aktualizacja:** 2026-05-28

> Format: `- [ ]` = todo, `- [x]` = done. Updateuj na bieżąco przez `dev-docs-execute`.

---

## Faza 0 — Design system foundation

### Decyzje (blokery — wymagają zatwierdzenia przed startem implementacji)

> **Wszystkie zatwierdzone przez usera 2026-05-28 (autopilot start) — przyjęte rekomendacje z planu.**

- [x] **Decyzja:** Sleep norm table source → **WHO+AAP hybrid** (0-3m: 14-17h, 4-12m: 12-16h, 1-2y: 11-14h, 3-5y: 10-13h). Zatwierdzone 2026-05-28.
- [x] **Decyzja:** Gradient karty dziecka → **solid `bg-purple-light`** (SKIP `expo-linear-gradient`). Zatwierdzone 2026-05-28.
- [x] **Decyzja:** Sekcja "Rodzina" → **`/settings` placeholder route** za gear icon. Zatwierdzone 2026-05-28.
- [x] **Decyzja:** Toggle dark mode → **tri-state bottom sheet** (System/Light/Dark). Zatwierdzone 2026-05-28.
- [x] **Decyzja:** Bell icon dot → **mock `true`** (matchuje screen #1). Zatwierdzone 2026-05-28.

### Dependencies (zatwierdzenie usera, regula §8)

> **User zatwierdził 2026-05-28: tylko `lucide-react-native`. `react-native-svg` jeśli brak tranzytywnie — dopytaj. `expo-linear-gradient` SKIP.**

- [x] Sprawdzić `npm ls react-native-svg` w `sleeper-app/` — przed instalacją lucide brak, po instalacji `lucide-react-native@1.17.0` dociaga tranzytywnie `react-native-svg@15.15.5` (BEZ blokera, BEZ osobnej instalacji)
- [x] Poinformować usera o `lucide-react-native` przed `npm i` — zatwierdzone 2026-05-28
- [x] Decyzja: `expo-linear-gradient` → SKIP (potwierdzone 2026-05-28)
- [x] `npm i lucide-react-native` w `sleeper-app/` (zainstalowane 2026-05-28, wersja 1.17.0)

### Tokens — `sleeper-app/tailwind.config.js`

- [x] Dodać kolory: `purple-light: '#B8A8D9'`, `purple-soft: '#E8DEF7'`, `success: '#5A8B6F'`, `success-soft: '#D7E5DC'`, `orange-soft: '#FBE8DD'`, `text-muted: '#6B6580'`
- [ ] Walidacja wartości eye-dropperem na finalnym mockupie/screenie (faza review / on-device) — manual test (patrz `manual-test-faza-0.md`)
- [x] Dodać `borderRadius`: `card: '20px'`, `pill: '999px'`
- [x] Dodać `boxShadow`: `card: '0 4px 12px rgba(30,27,75,0.04)'`
- [ ] Zweryfikować renderowanie `shadow-card` na iOS + Android (NativeWind v4 → `shadowColor/Offset/Opacity/Radius`) — faza on-device — manual test (patrz `manual-test-faza-0.md`)
- [x] Dodać `fontFamily`: aliasy `display` (system), `mono` (tabular-nums)
- [x] `darkMode: 'class'` (przygotowanie pod Fazę 1)

### Primitives — `sleeper-app/src/components/ui/`

- [x] `Avatar.tsx` — props `name`, `color?`, `size?`, `image?`; renderuje kółko z inicjałem
- [x] `Card.tsx` — wrapper `bg-white dark:bg-dark-card rounded-card p-5 shadow-card`; wariant `gradient?`
- [x] `Badge.tsx` — pill, warianty `success | neutral | orange`
- [x] `IconButton.tsx` — round button z lucide ikoną, prop `accessibilityLabel`
- [x] `ProgressBar.tsx` — value 0..1, `tintClassName?`
- [x] `ProgressBarStacked.tsx` — `segments: { value, className }[]`
- [x] `ProgressRing.tsx` — SVG, prop `value, size, strokeWidth, label?`
- [x] `SegmentedControl.tsx` — iOS pill, Reanimated `useSharedValue` dla active background
- [x] `Switch.tsx` — wrapper na RN Switch z naszymi kolorami

### Helpers — `sleeper-app/src/lib/`

- [x] `sleep-norms.ts` — `getNormForChild(birthDate, now)` → `{ minHours, maxHours, label }`

### Walidacja Fazy 0

- [x] `npx tsc --noEmit` w `sleeper-app/` = 0 błędów (2026-05-28)
- [x] `npm run lint` w `sleeper-app/` = 0 błędów (2026-05-28)
- [ ] Smoke test: każdy primitive użyty raz na ekranie placeholder (lub w jsdoc-przykładzie) — pokrywa się w Fazach 2-5, gdzie primitives są konsumowane realnie — manual test (patrz `manual-test-faza-0.md`)
- [x] Commit: `feat(ui-redesign): faza 0 — design system foundation`
- [x] Commit log w `docs/commits/`

### Do poprawy po review fazy 0

> Review: ✅ CZYSTE (0 P1, 0 P2, 4 P3). Pełny raport: `review-faza-0.md`. Wszystkie pozycje poniżej to **opcjonalne** sugestie do rozważenia w Fazie 6 polish — NIE blokują kontynuacji.

- [ ] 🟡 [nit] **ProgressRing.tsx:36-37, Switch.tsx:15-17** — HEX literals (`#E8DEF7`, `#7C6BAD`, `#F5F0E8`) duplikują wartości z `tailwind.config.js`. Wyciągnąć do `src/lib/colors.ts` (single source of truth) gdy 3+ duplikacji się utrwali. Rozważ w Fazie 6.
- [ ] 🟡 [nit] **SegmentedControl.tsx:44-48** — `useEffect` deps zawiera `segmentWidth` (SharedValue). Reanimated best practice: usunąć z deps jeśli ESLint plugin akceptuje (`[selectedIndex, durationMs]`).
- [ ] 🟡 [nit] **Wszystkie primitives** — inferred return type zamiast explicit `ReactElement` (formalna odchyłka od reguły §10 coding-rules, ale konwencja React/Expo). Dodać w Fazie 6 polish jeśli zespół tak preferuje.
- [ ] 🟡 [test-future] **sleep-norms.ts** — pierwszy kandydat na unit test gdy projekt dostanie Jest setup. Edge cases: 0m, 4m, 13m, 36m, 72m, 84m + `now < birthDate`.

---

## Faza 1 — Dark mode manual override

### Implementacja

- [x] Potwierdzić `darkMode: 'class'` w `tailwind.config.js` (z Fazy 0)
- [x] `sleeper-app/src/features/settings/useThemeStore.ts` — Zustand + AsyncStorage persist, state `mode: 'system'|'light'|'dark'`, action `setMode(m)`
- [x] `sleeper-app/src/features/settings/ThemeProvider.tsx` — czyta mode + `useColorScheme()`, liczy `effectiveTheme`, opakowuje children w `className={effectiveTheme === 'dark' ? 'dark flex-1' : 'flex-1'}`
- [x] Mount `ThemeProvider` w `sleeper-app/src/app/_layout.tsx` powyżej `Stack`
- [x] `expo-status-bar` `style={effectiveTheme === 'dark' ? 'light' : 'dark'}` z `useThemeStore`

### Walidacja

- [ ] Walidacja po Fazie 5 (gdy toggle w Profilu działa): przełączyć każdą z 3 opcji
- [ ] Sprawdzić persist między restartami appki
- [x] `npx tsc --noEmit` + `npm run lint` PASS (2026-05-28)
- [x] Commit: `feat(ui-redesign): faza 1 — dark mode manual override`
- [x] Commit log w `docs/commits/`

---

## Faza 2 — Tab bar redesign

### Implementacja

- [ ] **Wariant A (preferowany):** `sleeper-app/src/app/(app)/_layout.tsx` — dodać `tabBarIcon` w każdym `Tabs.Screen` z lucide: `Home`, `Calendar`, `BarChart3`, `User`
- [ ] Active/inactive kolory z theme
- [ ] **Wariant B (fallback):** Jeśli A nie pozwala na outlined box → nowy `sleeper-app/src/components/CustomTabBar.tsx`, `Tabs tabBar={...}`

### Walidacja

- [ ] Ikony renderują się w light/dark
- [ ] Focus state widoczny (outlined box jak na screenie)
- [ ] Tap area ≥44pt (a11y)
- [ ] Test on-device iOS + Android
- [ ] Commit: `feat(ui-redesign): faza 2 — tab bar redesign`
- [ ] Commit log w `docs/commits/`

---

## Faza 3 — Dzisiaj redesign

### Nowy komponent

- [ ] `sleeper-app/src/components/HomeHeader.tsx`:
  - [ ] Avatar (z `child.avatar_color`, `child.name` → inicjał)
  - [ ] Greeting based on hour (Dzień dobry/Dobre popołudnie/Dobry wieczór/Dobranoc + `, ${child.name}` bold)
  - [ ] `chevron-down` visual obok imienia (single-child, no dropdown)
  - [ ] Bell `IconButton` po prawej z kropką stanu (mock z `useNotificationDot()`)

### Restyle istniejących

- [ ] `sleeper-app/src/components/ActiveWindowCard.tsx`:
  - [ ] Tło `bg-orange-soft` (lub gradient jeśli zatwierdzone)
  - [ ] Header: kropka `bg-orange` + label "OKNO AKTYWNOŚCI" uppercase tracking-wide
  - [ ] Timer `text-6xl` z `font-variant: tabular-nums`
  - [ ] `ProgressBar` pod timerem (tint orange)
  - [ ] Footer: "Pobudka o HH:MM" (left) + `Badge` "Drzemka za ~Xg Ym" (right)
- [ ] `sleeper-app/src/components/TodayStatsCard.tsx`:
  - [ ] Label "DZISIAJ" uppercase
  - [ ] Wartość "Xg Ym" + `ProgressRing` 98% po prawej
  - [ ] "z 13g zalecanych" text-muted
  - [ ] `ProgressBarStacked` (Sen nocny / Drzemki / Aktywność)
  - [ ] 3 mini-statystyki w grid z kropkami
  - [ ] Reuse `computeAggregates()`
- [ ] `sleeper-app/src/components/BigActionButton.tsx`:
  - [ ] `Moon` lucide ikona przed labelem dla `mode='start'` + `type='night'`
- [ ] `sleeper-app/src/components/QuickActions.tsx`:
  - [ ] 3 białe karty z okrągłym ikonowym chipem: `Sun` (Drzemka, orange-soft bg), `Moon` (Sen, purple-soft bg), `Plus` (Dodaj wstecz, neutral-soft bg)
- [ ] `sleeper-app/src/components/SessionListItem.tsx`:
  - [ ] Polish — w sekcji "Sesje dzisiaj" BEZ "aktywność X" gapów (to tylko Historia)
- [ ] `sleeper-app/src/app/(app)/index.tsx`:
  - [ ] Wymiana headera na `HomeHeader`
  - [ ] Sekcja "Pokaż wszystkie" link → `router.push('/history')`

### Walidacja

- [ ] Porównanie wizualne ze screenem #1 (delta acceptable: kerning fontów)
- [ ] Dark mode parity
- [ ] Test on-device iOS + Android
- [ ] `npx tsc --noEmit` + `npm run lint` PASS
- [ ] Commit: `feat(ui-redesign): faza 3 — dzisiaj redesign`
- [ ] Commit log w `docs/commits/`

---

## Faza 4 — Historia redesign

### Implementacja

- [ ] `sleeper-app/src/app/(app)/history.tsx`:
  - [ ] Header: tytuł "Historia" + subtitle "Wszystkie sesje snu" (text-muted)
  - [ ] `SegmentedControl` Lista (`List` icon) / Kalendarz (`Calendar` icon)
  - [ ] Widok kalendarza = placeholder ("Widok kalendarza wkrótce")
  - [ ] Grupowanie po dniach z header: tytuł + agregat "Xg Ym · N sesji" (text-muted)
  - [ ] Karty sesji wewnątrz jednej Card (rounded-card) z separatorem
  - [ ] Linia "aktywność Xg Ym" między sesjami (text-orange-dark, mała czcionka)
- [ ] `sleeper-app/src/lib/session-gaps.ts` — `computeGapsBetweenSessions(sessions)` (gap = `prev.end_at` → `next.start_at`)
- [ ] `sleeper-app/src/components/SessionListItem.tsx`:
  - [ ] Ikona po lewej: `Sun` (nap orange) / `Moon` (night purple) w okrągłym chipie
  - [ ] Środek: zakres "09:30 — 10:41" (font-display bold large)
  - [ ] Pod zakresem: "Drzemka · 1g 11m" + kropka status
  - [ ] Po prawej: `ChevronRight` → link do `/session/[id]`
  - [ ] Lewa krawędź: `MoreVertical` placeholder (visual only)
  - [ ] Prop `gapBeforeMs?: number` do renderowania "aktywność X"

### Walidacja

- [ ] Aktywność między sesjami liczona prawidłowo (test: dodać 2 sesje w bliskim odstępie)
- [ ] Tap na sesję otwiera detal (`/session/[id]`)
- [ ] Segment "Kalendarz" pokazuje placeholder
- [ ] Dark mode parity
- [ ] `npx tsc --noEmit` + `npm run lint` PASS
- [ ] Commit: `feat(ui-redesign): faza 4 — historia redesign`
- [ ] Commit log w `docs/commits/`

---

## Faza 5 — Profil redesign

### Implementacja

- [ ] `sleeper-app/src/lib/child-age.ts` — `formatChildAge(birthDate)` → "21 miesięcy · ur. 12 sie. 2024" (polski format)
- [ ] `sleeper-app/src/lib/sleep-stats.ts` — `useAvgSleep7d(childId)` hook (TanStack Query, reuse `useSessions`)
- [ ] `sleeper-app/src/app/(app)/profile.tsx` (rewrite):
  - [ ] Header: tytuł "Profil" + subtitle "Dzieci i ustawienia"
  - [ ] Gear `IconButton` po prawej → `router.push('/settings')` (placeholder route, zgodnie z decyzją Fazy 0)
  - [ ] Karta aktywnego dziecka (solid `bg-purple-light` lub gradient):
    - [ ] Avatar size lg + border
    - [ ] Imię (font-display text-2xl bold) + wiek + data ur.
    - [ ] Zagnieżdżona Card: label "NORMA SNU DLA WIEKU" + value "13-15g/dobę"
    - [ ] `ProgressBar` (avgSleep7d / recommendedMax)
    - [ ] "Średnio Xg Ym ostatnie 7 dni · Y% normy" (success/orange color)
  - [ ] Sekcja SKRÓTY:
    - [ ] Row 1: `Bell` + "Przypomnienia" + "Włączone" + `ChevronRight` (no-op / placeholder)
    - [ ] Row 2: `Moon` + "Tryb ciemny" + `Switch` (controlled by `useThemeStore`) lub tri-state bottom sheet (zgodnie z decyzją Fazy 0)
- [ ] Sekcja "Rodzina" → `/settings` placeholder (lub zachowana pod SKRÓTAMI, zgodnie z decyzją Fazy 0)
- [ ] `sleeper-app/src/app/(app)/settings.tsx` (placeholder route) — jeśli decyzja Fazy 0 = `/settings`

### Walidacja

- [ ] Norma snu poprawnie wyliczona dla różnych wieków (test: dziecko 6m vs 24m)
- [ ] Średnia 7d zgodna z `useSessions` (test manual: sprawdzić ostatnie 7 dni w bazie)
- [ ] Toggle Tryb ciemny zmienia całą apkę natychmiast (sprawdzenie po Fazie 1)
- [ ] Persist między restartami (sprawdzenie z Fazy 1)
- [ ] Dark mode parity
- [ ] `npx tsc --noEmit` + `npm run lint` PASS
- [ ] Commit: `feat(ui-redesign): faza 5 — profil redesign`
- [ ] Commit log w `docs/commits/`

---

## Faza 6 — Polish + a11y

### Implementacja

- [ ] VoiceOver/TalkBack: wszystkie `IconButton` z `accessibilityLabel`
- [ ] `Avatar` z `accessibilityRole="image"` + label `{name}`
- [ ] Touch targets ≥44pt (review wszystkich Pressable)
- [ ] Tabular nums: timer w `ActiveWindowCard` i `SleepInProgressCard` używa `style={{ fontVariant: ['tabular-nums'] }}`
- [ ] Pressable feedback: scale 0.97 + opacity 0.85 na press (Reanimated lub `style={({pressed}) => ...}`)
- [ ] SegmentedControl transition: Reanimated `withTiming` 200ms
- [ ] ProgressRing fade-in animation

### Walidacja końcowa

- [ ] `npx tsc --noEmit` PASS
- [ ] `npm run lint` PASS
- [ ] DevTools accessibility inspector: WCAG AA na każdym ekranie (light + dark)
- [ ] Commit: `feat(ui-redesign): faza 6 — polish + a11y`
- [ ] Commit log w `docs/commits/`

---

## Faza 7 — Manual test (skill `expo-rn-testing`)

Checklist na Expo Go (iOS + Android):

### Dzisiaj
- [ ] Avatar z poprawnym kolorem dziecka
- [ ] Greeting zmienia się o porze dnia (Dzień dobry/Dobre popołudnie/Dobry wieczór/Dobranoc)
- [ ] Timer aktywnej sesji odlicza w real-time
- [ ] Ring 98% rośnie po zakończeniu sesji
- [ ] BigActionButton z Moon ikoną dla night start
- [ ] QuickActions z 3 ikonowymi chipami

### Historia
- [ ] Grupowanie po dniach (Dzisiaj/Wczoraj/data po polsku)
- [ ] "aktywność Xg Ym" liczona prawidłowo między sesjami
- [ ] Agregat sekcji "Xg Ym · N sesji" zgodny z danymi
- [ ] Tap na sesję otwiera `/session/[id]`
- [ ] Segment "Kalendarz" pokazuje placeholder
- [ ] Ikony sun/moon w chipach

### Profil
- [ ] Norma snu zgodna z wiekiem (6m vs 24m różna)
- [ ] "Średnio Xg Ym" z ostatnich 7 dni poprawne
- [ ] Toggle Tryb ciemny zmienia całą apkę natychmiast
- [ ] Persist między restartami
- [ ] Gear icon → `/settings` (placeholder)
- [ ] Karta dziecka z gradientem/solid bg-purple-light

### Tab bar
- [ ] Wszystkie 4 ikony renderują (Home/Calendar/BarChart3/User)
- [ ] Active state widoczny w light + dark

### Dark mode
- [ ] Każdy ekran ma czytelny kontrast WCAG AA (DevTools accessibility inspector)
- [ ] System mode → app śledzi systemowe ustawienie
- [ ] Light/Dark override → app ignoruje system

### Regression (sync)
- [ ] Dwa telefony — zmiana sesji na A propaguje na B przez Realtime
- [ ] START/STOP nadal działa
- [ ] Edycja historii nadal działa

### Final
- [ ] Wszystkie testy PASS
- [ ] Brak crashy w Expo Go (sprawdzić console.error)
- [ ] Commit log finalny w `docs/commits/`
- [ ] Wywołać `/dev-docs-complete` → archiwizacja w `docs/completed/ui-redesign/`
- [ ] Wywołać `/dev-compound` → nauki do `docs/solutions/`
