# UI Redesign — podsumowanie ukończenia

**Data ukończenia:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Status:** GOTOWE (fazy 0-6) + Faza 7 manual test deferred do usera (on-device, non-blocking)

## Co zostało dostarczone

Pełny redesign UI Sleeper MVP zgodny ze screenami #1 (Dzisiaj), #2 (Historia), #3 (Profil) BEZ zmian backendu/data flow. Wszystkie 7 faz dostarczone w autopilocie (commity per faza + commit log per faza w `docs/commits/`):

- **Faza 0 — Design system foundation**: tokeny tailwind (kolory `purple-light/purple-soft/success/success-soft/orange-soft/text-muted`, radii `card/pill`, shadow `card`, fontFamily `display/mono`, `darkMode: 'class'`), 9 primitives w `src/components/ui/` (`Avatar/Card/Badge/IconButton/ProgressBar/ProgressBarStacked/ProgressRing/SegmentedControl/Switch`), helper `sleep-norms.ts` (WHO+AAP hybrid). Dep: `lucide-react-native@1.17.0` (dociągnął `react-native-svg@15.15.5` tranzytywnie). `expo-linear-gradient` SKIPPED.
- **Faza 1 — Dark mode manual override**: `darkMode: 'media' → 'class'`, `useThemeStore` (Zustand + AsyncStorage persist), `ThemeProvider` w root layout, eksportowany hook `useEffectiveTheme()`, `expo-status-bar` bindowany do effective theme.
- **Faza 2 — Tab bar redesign**: 4 ikony lucide (`Home/Calendar/BarChart3/User`) + outlined-pill chip dla active state, `tabBarShowLabel: false`, `useEffectiveTheme()` respektuje manual override.
- **Faza 3 — Dzisiaj redesign**: nowy `HomeHeader` (Avatar + greeting per godzina + Bell IconButton z dot mock), restyle `ActiveWindowCard`/`TodayStatsCard`/`BigActionButton`/`QuickActions` zgodnie ze screenem #1. Nowy helper `useNotificationDot.ts`.
- **Faza 4 — Historia redesign**: rewrite `history.tsx` z `SegmentedControl` Lista/Kalendarz (kalendarz placeholder), grupowane sekcje per dzień z agregatem "Xg Ym · N sesji", nowy helper `session-gaps.ts` (`computeGapsBetweenSessions` TZ-safe), pełen rewrite `SessionListItem` (chip Sun/Moon + zakres godzin + ChevronRight + `gapBeforeMs?`).
- **Faza 5 — Profil redesign**: rewrite `profile.tsx` (karta dziecka solid `bg-purple-light`, norma snu, średnia 7d), nowe helpery `child-age.ts` (`formatChildAge` TZ-safe + polskie liczebniki) + `sleep-stats.ts` (`useAvgSleep7d`). Sekcja "Rodzina" + Wyloguj przeniesione do `/settings` placeholder route (Tabs.Screen `href: null`). `ThemeModeBottomSheet` (RN Modal tri-state, KISS, bez nowych deps).
- **Faza 6 — Polish + a11y**: `src/lib/colors.ts` (`COLORS` const, redukcja 50→22 HEX wystąpień w core UI), batch-fix akumulowanych P3 (TZ-safe `addDays`, accessibility labels z gap context, dead-ternary cleanup, redundant `dark:` classes), `Avatar` accessibility, `IconButton` size=sm hitSlop (44pt+ tap area), Pressable feedback (`scale 0.97 + opacity 0.85`) na 7 callsiteach, tabular-nums w timerach, `ProgressRing` fade-in (Reanimated).
- **Faza 7 — Manual test**: master checklist + 7 per-fazowych checklist (`manual-test-master.md` + `manual-test-faza-{0..6}.md`) wygenerowane przez `expo-rn-testing`. **Manual test on-device pending — user wykonuje po sesji.**

## Walidacja końcowa

- `npx tsc --noEmit` PASS (0 błędów) dla każdej fazy 0-6
- `npm run lint` (expo lint) PASS (0 błędów) dla każdej fazy 0-6
- Wszystkie code reviews CZYSTE: 0 P1, 0 P2 per faza. Łącznie ~24 P3 (większość batch-fixed w Fazie 6, pozostałe zaakceptowane jako opcjonalne nity lub design-questions do walidacji manual)
- Manual test on-device: **deferred do usera** (38 scenariuszy w `manual-test-master.md` + per-fazowe checklist)

## Podjęte kluczowe decyzje

1. **5 decyzji blokerów Fazy 0 zatwierdzonych 2026-05-28** (zgodnie z rekomendacjami `design.md`):
   - Sleep norm table → **WHO+AAP hybrid** (0-3m: 14-17h, 4-12m: 12-16h, 1-2y: 11-14h, 3-5y: 10-13h)
   - Gradient karty dziecka → **solid `bg-purple-light`** (SKIP `expo-linear-gradient`)
   - Sekcja "Rodzina" → **`/settings` placeholder route** za gear icon w Profilu
   - Toggle dark mode → **tri-state bottom sheet** (System/Light/Dark via RN Modal)
   - Bell icon dot → **mock `true`** (matchuje screen #1, podłączenie pod `expo-notifications` poza scope)
2. **Brak nowych zależności poza `lucide-react-native`** — `react-native-svg` dociągnięty tranzytywnie, `expo-linear-gradient` SKIP. Regula §8 dotrzymana.
3. **`darkMode: 'media' → 'class'`** — manual override z 3 trybami, wszystkie istniejące `dark:` classes działają jak były ale teraz driven przez `className="dark"` na root View.
4. **`useEffectiveTheme()` jako single source-of-truth dla light/dark w komponentach** (nie raw `useColorScheme`). Wzorzec konsumowany przez tab bar, lucide iconColor, theme toggle.
5. **`react-native-svg` dla ProgressRing** (solidne, cross-platform). Alternative (2 nakładające View z transform) odrzucone jako fragile.
6. **Reanimated `withTiming` 200ms dla SegmentedControl** (NIE `withSpring` — zacinanie na Android).
7. **Tri-state bottom sheet via RN `Modal`** (KISS, brak `@gorhom/bottom-sheet` — YAGNI dla pojedynczego sheeta).
8. **Routing `/settings` via `<Tabs.Screen href: null>`** (pattern z `sleep-fullscreen`/`session/[id]`). Sign out i sekcja "Rodzina" przeniesione tu, nie zduplikowane.
9. **`src/lib/colors.ts`** jako shared HEX constants po przekroczeniu progu 3+ duplikacji (Faza 6 batch). `tailwind.config.js` pozostaje collegial source-of-truth (brak deep import tokenów Tailwinda bez build stepu).
10. **Pressable feedback przez inline `style={({pressed}) => ...}`** (NIE Reanimated per-component) — KISS dla 7 callsiteów, gładkie animacje transformu bez worklet overhead.
11. **`ProgressRing` fade-in PRZEZ Reanimated** (`useSharedValue` + `withTiming`) — 0 cost przy re-renderach, ekran Dzisiaj odświeża się co 30s.
12. **`SessionListItem.onPress` jako optional override** — Historia jawnie przekazuje `router.push('/session/[id]')`, Dzisiaj korzysta z default. Backward-compat z `<SessionListItem session={s} />` zachowany.
13. **Sortowanie sesji wewnątrz dnia ASCENDING** (najwcześniejsza u góry) — by gap "aktywność X" miał sens chronologiczny (gap = `prev.end_at` → `next.start_at`, renderowany NAD itemem).

## Utworzone / zmodyfikowane pliki (główne)

### Modyfikowane (11)

- `sleeper-app/tailwind.config.js` — kolory, radii, shadows, `darkMode: 'class'`, fontFamily
- `sleeper-app/src/app/_layout.tsx` — mount `ThemeProvider` powyżej Stack, status bar bindowany
- `sleeper-app/src/app/(app)/_layout.tsx` — `tabBarIcon` z lucide, `TabIcon` wrapper, `useEffectiveTheme`
- `sleeper-app/src/app/(app)/index.tsx` — `HomeHeader`, "Pokaż wszystkie" jako Pressable
- `sleeper-app/src/app/(app)/history.tsx` — header + `SegmentedControl`, grouped sections, `addDays` TZ-safe
- `sleeper-app/src/app/(app)/profile.tsx` — rewrite (karta dziecka + SKRÓTY, gear → `/settings`)
- `sleeper-app/src/components/ActiveWindowCard.tsx` — soft bg, ProgressBar, Badge "Drzemka za"
- `sleeper-app/src/components/TodayStatsCard.tsx` — ProgressRing, stacked bar, mini-statystyki
- `sleeper-app/src/components/BigActionButton.tsx` — Moon ikona, accessibilityLabel, pressable feedback
- `sleeper-app/src/components/QuickActions.tsx` — 3 białe karty z ikonowymi chipami
- `sleeper-app/src/components/SessionListItem.tsx` — Sun/Moon chip, zakres godzin, ChevronRight, `gapBeforeMs?`

### Nowe (16)

**Primitives** (`src/components/ui/`, Faza 0):
- `Avatar.tsx` · `Card.tsx` · `Badge.tsx` · `IconButton.tsx` · `ProgressBar.tsx` · `ProgressBarStacked.tsx` · `ProgressRing.tsx` · `SegmentedControl.tsx` · `Switch.tsx`

**Theme system** (`src/features/settings/`, Fazy 1/5):
- `useThemeStore.ts` — Zustand + AsyncStorage persist
- `ThemeProvider.tsx` — `effectiveTheme` + eksport `useEffectiveTheme()`
- `ThemeModeBottomSheet.tsx` — RN Modal tri-state

**Helpers** (`src/lib/`, Fazy 0/3/4/5/6):
- `sleep-norms.ts` — WHO+AAP hybrid table
- `sleep-stats.ts` — `useAvgSleep7d` hook (TanStack Query)
- `child-age.ts` — `formatChildAge` (TZ-safe + polskie liczebniki)
- `session-gaps.ts` — `computeGapsBetweenSessions` (TZ-safe per-day grouping)
- `useNotificationDot.ts` — mock hook (`() => true`)
- `colors.ts` — `COLORS` const (single source-of-truth dla HEX literals w RN API)

**Komponent wyższego rzędu:**
- `src/components/HomeHeader.tsx` — Avatar + greeting + Bell IconButton

**Routing:**
- `sleeper-app/src/app/(app)/settings.tsx` — placeholder route z sekcją Rodzina + sign out

### Zmiany zależności (1)

- `+ lucide-react-native@1.17.0` (tranzytywnie `react-native-svg@15.15.5`)

## Wyciągnięte wnioski

### Wzorce architektoniczne

1. **`useEffectiveTheme()` jako single source-of-truth** dla light/dark w komponentach (nie raw `useColorScheme()`). Pattern: hook eksportowany z `ThemeProvider`, czyta system + manual override z store, zwraca `'light'|'dark'`. **Heads-up wprowadzony po Fazie 1** ratował refaktor tab bara w Fazie 2 (uniknięcie regression: manual override IGNOROWANY przez tab bar).
2. **Lucide named imports + `ComponentType<{color,size,strokeWidth?}>` typ** — zero `any`, type-safe iconography cross-platform. Wzorzec replikowany w `TabIcon` (Faza 2), `HomeHeader` (Faza 3), `QuickActions`/`SessionListItem` (Fazy 3/4), Profil/ThemeModeBottomSheet (Faza 5).
3. **Lokalne komponenty (1 użycie) NIE w `src/components/ui/`** — `TabIcon`, `ShortcutRow`, `ActionCard` zostały lokalne. YAGNI sprawdziło się. Wynosić dopiero przy 2+ użyciu.
4. **HEX literals w shared constants** dopiero po przekroczeniu progu 3+ duplikacji (zaobserwowane w Fazie 3, batch-fix w Fazie 6). `src/lib/colors.ts` + komentarz że `tailwind.config.js` jest collegial source-of-truth (brak deep import bez build stepu).
5. **Pressable feedback przez inline `style={({pressed}) => ...}`** dla 1-shot animacji transformu — KISS, brak worklet overhead. **Reanimated TYLKO** dla animacji które mogą re-fire często (ProgressRing fade-in mount-only, SegmentedControl indicator transition).

### TZ-safety (rozszerzenie `learned-patterns.md`)

6. **`useMemo([todayKey])` w queryKey** zapobiega refetch petli — `new Date()` per render generowałby nowy ISO i nieskończony refetch w `useSessions` (queryKey zawiera `toISOString()`). Zastosowany w `useAvgSleep7d`.
7. **`addDays` z `date-fns` zamiast `setDate(getDate() - N)`** — zgodne z `learned-patterns.md` TZ-safe time. Batch-fix w Fazie 6 (`history.tsx`, `dayTitleFor`).
8. **`toZonedTime(APP_TIMEZONE)` dla wyświetlania dat** (np. data urodzenia w `formatChildAge`) — user widzi datę w Warsaw niezależnie od device tz. Edge case: `new Date('YYYY-MM-DD')` parsuje jako UTC midnight — off-by-one dnia w skrajnych godzinach dla user w innym TZ. MVP single-tz OK, ale do udokumentowania.

### Routing

9. **`<Tabs.Screen href: null>` pattern** dla ukrytych route w grupie `(app)` — `/settings`, `/sleep-fullscreen`, `/session/[id]`. Push-able przez `router.push`, ukryte w tab barze. Mniej kosztu niż Stack.Screen w root layout (auth-aware layouting nieruszony).

### Dark mode

10. **`darkMode: 'class'` zachowuje kompatybilność wsteczną** — wszystkie istniejące `dark:` classes działają jak były, ale teraz driven przez `className="dark"` na root View. Pre-existing dark variants nie wymagały zmian.
11. **Race hydratacji AsyncStorage**: przed hydratacją Zustand persist `mode='system'`, więc po restarcie z zapisanym `'dark'` może wystąpić milisekundowy flash systemowego trybu → settle. Acceptable dla MVP, walidacja wizualna w manual checklist.
12. **`ActiveWindowCard` świadomie BEZ `dark:bg-*` variantu** — `bg-orange-soft` zostaje pomarańczowe w dark mode (decyzja designerska do walidacji manual). Inne karty idą w `bg-dark-card`.

### A11y

13. **`hitSlop` zamiast zwiększania padding** dla touch targets <44pt — zachowuje visual layout, rozszerza tap area niewidocznie (iOS pattern). Zastosowany w `IconButton size='sm'`, settings back button, "Pokaż wszystkie".
14. **`accessible={false}` na stop-propagation Pressable** (`ThemeModeBottomSheet`) — inner Pressable z no-op `onPress` nie powinien być w VoiceOver tree. Wewnętrzne opcje sheetu pozostają accessible.

### Pure functions kandydaci na unit testy (gdy Jest dojdzie)

15. `getNormForChild` (sleep-norms), `greetingForHour` (HomeHeader), `computeAggregates` (TodayStatsCard), `computeGapsBetweenSessions` (session-gaps), `formatChildAge` (child-age), `useEffectiveTheme()` (ThemeProvider). Wszystkie pure/derived, edge cases udokumentowane w review reports.

### Anti-patterns uniknięte

16. **NIE rozszerzano `IconButton` do `size='lg'`** mimo że Profil/Settings tego "potrzebowały" — istniejące `size='md/sm'` wystarczyło. YAGNI.
17. **NIE wprowadzono `@gorhom/bottom-sheet`** dla tri-state toggle — RN `Modal` + 2 Pressable (backdrop + sheet) wystarczył. KISS, zero nowych deps.
18. **NIE wynoszono `TabIcon`/`ShortcutRow`/`ActionCard` do `src/components/ui/`** — 1 użycie każdy, YAGNI.
19. **NIE refaktorowano ScrollView → FlatList w `history.tsx`** mimo P3 sugestii — 14 dni × ~5 sesji = ~70 itemów, ScrollView wystarczający. Inline TODO comment dla przyszłej skalowalności.

## Pozostałe pozycje (non-blocking)

### Faza 7 manual test (user wykonuje on-device)

- Master checklist: `manual-test-master.md` (38 scenariuszy)
- Per-fazowe checklists: `manual-test-faza-{0..6}.md`
- Kluczowe scenariusze: dark mode parity wszystkich ekranów (WCAG AA), Realtime sync regression dwa telefony, gap "aktywność X" liczone prawidłowo, norma snu różny wiek, persist toggle dark mode po restarcie.

### Opcjonalne P3 nity nieobjęte batch-fix Fazy 6

- `Switch.tsx:18`, `ProgressRing.tsx:44` — `#E8DEF7` (purple-soft) inline; dodać `purpleSoft` do `COLORS` przy następnej modyfikacji palety (redukcja 22→20)
- `ThemeModeBottomSheet.tsx:64` — stop-propagation Pressable → `View + onStartShouldSetResponder` (kosmetyka, niski ROI)
- "Scale dla CTA/cards, opacity dla list rows/secondary" — reguła do udokumentowania w kontekście
- `MoreVertical` placeholder w `SessionListItem` — pominięty (visual decision), rozważyć w Fazie 6+ jeśli manual S1 wykaże brak parity ze screenem #2
- Cross-midnight session UI clarity — sesja 23:30 → 01:30 wyświetla "23:30 — 01:30" bez wskazania że kończy się następnego dnia; manual S7 zweryfikuje czy UX akceptowalny dla MVP
- `useAvgSleep7d` design-question — `daysCovered = liczba dni aktywnych` vs `sumMs/7`; decyzja produktowa po manual S2

## Powiązane commity

| Faza | Implementation | Commit log |
|---|---|---|
| Init | `93e510f docs: inicjalizacja planu dla ui-redesign` | `bdd1324` |
| 0 | `3018f78 feat(ui-redesign): faza 0 — design system foundation` | `fa6db0d` |
| 1 | `cddac73 feat(ui-redesign): faza 1 — dark mode manual override` | `b4e0345` |
| 2 | `8e2be5a feat(ui-redesign): faza 2 — tab bar redesign` | `49cf9e9` |
| 3 | `2220c5d feat(ui-redesign): faza 3 — dzisiaj redesign` | `a71aae7` |
| 4 | `22dd268 feat(ui-redesign): faza 4 — historia redesign` | `460a2aa` |
| 5 | `e798dea feat(ui-redesign): faza 5 — profil redesign` | `0b41604` |
| 6 | `aa8e6d8 feat(ui-redesign): faza 6 — polish + a11y` | `c9e6109` |
| 7 | `f67fc20 docs(ui-redesign): faza 7 — manual test master checklist + autopilot finalize` | `5995f50` |
| Archive prep | `7006a8a docs(ui-redesign): archive review + manual-test artifacts (faz 0-6)` | `47e7a6c` |

## Następne kroki

1. **User wykonuje manual test on-device** (Expo Go iOS + Android) — checklist `manual-test-master.md`. Po PASS → merge do `main` lub release.
2. **Opcjonalnie: `/dev-compound`** — wyciągnięcie rozwiązanych problemów do `docs/solutions/` (kandydaty: `darkMode: class` migration pattern, ProgressRing w RN, `useEffectiveTheme` jako theme single source-of-truth).
3. **Future**: Jest + RNTL setup → pierwsze unit testy dla 6 pure functions (`getNormForChild`, `greetingForHour`, `computeAggregates`, `computeGapsBetweenSessions`, `formatChildAge`, `useEffectiveTheme`).
