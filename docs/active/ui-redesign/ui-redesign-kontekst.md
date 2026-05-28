# UI Redesign — kontekst

**Branch:** `feature/ui-redesign`
**Ostatnia aktualizacja:** 2026-05-28 (po Fazie 2)

## Postęp

- ✅ **Faza 0 — Design system foundation** (2026-05-28): tokeny tailwind (kolory purple-light/purple-soft/success/success-soft/orange-soft/text-muted, radii card/pill, shadow card, fontFamily display/mono, `darkMode: 'class'`), 9 primitives (`Avatar/Card/Badge/IconButton/ProgressBar/ProgressBarStacked/ProgressRing/SegmentedControl/Switch`), helper `sleep-norms.ts` (WHO+AAP hybrid). `react-native-svg@15.15.5` dociągnięty TRANZYTYWNIE via `lucide-react-native@1.17.0` — brak osobnej instalacji. `expo-linear-gradient` SKIPPED.
- ✅ **Code review Fazy 0** (2026-05-28): severity gate **CZYSTE** — 0 P1, 0 P2, 4 P3 (opcjonalne nity do rozważenia w Fazie 6). Raport: `review-faza-0.md`. Manual test checklist: `manual-test-faza-0.md` (non-blocking, wykonanie on-device dopiero po Fazie 2/3 gdy primitives wejdą na ekran). Walidacja: `tsc --noEmit` PASS, `expo lint` PASS, `npm ls` potwierdza `lucide-react-native@1.17.0` + transitywny `react-native-svg@15.15.5`.
  - **Kluczowe wnioski**: (1) `getNormForChild` jest pure i idealnym kandydatem na pierwszy unit test gdy projekt dostanie test runner; (2) HEX literals w `ProgressRing`/`Switch` duplikują tailwind tokens — uzasadnione (RN API), ale do wyciągnięcia do `src/lib/colors.ts` przy 3+ duplikacji; (3) `SegmentedControl` używa Reanimated `withTiming` 200ms zgodnie z decyzją (NIE withSpring — zacinanie na Android); (4) wszystkie primitives mają WCAG-friendly accessibility props (role + label + value gdzie pasuje).
- ✅ **Faza 1 — Dark mode manual override** (2026-05-28): `useThemeStore` (Zustand + AsyncStorage persist, key `theme-mode`, state `mode: 'system'|'light'|'dark'`, default `'system'`) + `ThemeProvider` (czyta `useColorScheme()`, oblicza `effectiveTheme`, opakowuje children w root `<View>` z klasą `dark` gdy potrzebne). Mount w `src/app/_layout.tsx` — `ThemeProvider` powyżej `RootLayoutContent` (Stack + StatusBar). `StatusBar.style` bindowany do `effectiveTheme` (`'light'` w dark, `'dark'` w light). **UI bottom sheet w Fazie 5** — store gotowy do konsumpcji. Walidacja: `tsc --noEmit` PASS, `expo lint` PASS.
  - **Kluczowe decyzje**: (1) `useEffectiveTheme()` jako exportowany hook z `ThemeProvider.tsx` — będzie konsumowany przez Profil (Faza 5) i potencjalnie inne komponenty wymagające bezpośredniego dostępu do `'light'|'dark'` (np. wybór koloru SVG); (2) `RootLayoutContent` wyciągnięte jako sub-component — `useEffectiveTheme()` musi być wywołane WEWNĄTRZ `<ThemeProvider>`, więc nie da się tego zrobić w `RootLayout` bezpośrednio; (3) fallback `systemScheme === null` → `'light'` (RN może zwrócić null przed inicjalizacją modulu).
- ✅ **Code review Fazy 1** (2026-05-28): severity gate **CZYSTE** — 0 P1, 0 P2, 4 P3 (opcjonalne nity + heads-up). Raport: `review-faza-1.md`. Manual test checklist: `manual-test-faza-1.md` (DEFERRED do Fazy 5 — 5 scenariuszy: toggle 3 trybów, persist po restarcie, dark mode parity ekranów, edge cases, two-device sync).
  - **Kluczowe wnioski**: (1) **Heads-up dla Fazy 2**: `(app)/_layout.tsx:11` nadal używa raw `useColorScheme()` zamiast `useEffectiveTheme()` — tab bar IGNORUJE manual override. `feature-builder-ui` Fazy 2 MUSI podmienić import w trakcie tab bar redesign. (2) Race hydratacji AsyncStorage: przed hydratacją Zustand persist `mode='system'`, więc po restarcie z zapisanym `'dark'` może wystąpić milisekundowy flash systemowego trybu → settle. Acceptable dla MVP, walidacja wizualna w Scenariuszu 2 manual checklist. (3) `useEffectiveTheme()` to pure derived hook — idealny kandydat na pierwszy unit test gdy projekt dostanie Jest + RNTL (5 cases: system×3 + override×2).
- ✅ **Faza 2 — Tab bar redesign** (2026-05-28): `(app)/_layout.tsx` zaktualizowany — `tabBarIcon` z lucide (`Home`/`Calendar`/`BarChart3`/`User`) dla 4 zakładek, `tabBarShowLabel: false` (ikony mówią same za siebie zgodnie ze screenem #1). **Wariant A wystarczył** — outlined chip dla active state uzyskany przez wrapper `<TabIcon>` w `tabBarIcon` (border 2px + rounded-pill + paddingHorizontal 14 / paddingVertical 6). **Heads-up review Fazy 1 zaadresowany**: `useColorScheme()` podmienione na `useEffectiveTheme()` z `ThemeProvider` — tab bar respektuje manual override. Kolory z palety: active `#1E1B4B` (navy) / `#F5F0E8` (cream) dark, inactive `#6B6580` (text-muted) / `#B8A8D9` (purple-light) dark. Walidacja: `tsc --noEmit` PASS, `expo lint` PASS.
  - **Kluczowe decyzje**: (1) `tabBarShowLabel: false` — screen #1 pokazuje TYLKO ikony w pill (chip otacza samą ikonę, label byłby redundantny); (2) `TabIcon` jako lokalny komponent (nie wynosimy do `src/components/ui/` — 1 użycie, YAGNI); (3) `LucideIcon` typ jako `ComponentType<{color,size,strokeWidth?}>` — match lucide-react-native API, zero `any`; (4) `strokeWidth` lekko bolder (2.25) dla focused — subtelny visual hint extra do borderu.

## Powiązane pliki

### Modyfikowane (11)

| Plik | Cel zmiany | Faza |
|---|---|---|
| `sleeper-app/tailwind.config.js` | Kolory, radii, shadows, `darkMode: 'class'`, fontFamily | 0, 1 |
| `sleeper-app/src/app/_layout.tsx` | Mount `ThemeProvider` powyżej `Stack` | 1 |
| `sleeper-app/src/app/(app)/_layout.tsx` | `tabBarIcon` z lucide (Home/Calendar/BarChart3/User) | 2 |
| `sleeper-app/src/app/(app)/index.tsx` | Nowy `HomeHeader`, restyle wewnętrznych komponentów | 3 |
| `sleeper-app/src/app/(app)/history.tsx` | Header + subtitle, SegmentedControl, grupowane sekcje | 4 |
| `sleeper-app/src/app/(app)/profile.tsx` | Rewrite — karta dziecka + SKRÓTY (sekcja Rodzina → /settings) | 5 |
| `sleeper-app/src/components/ActiveWindowCard.tsx` | Soft bg, ProgressBar, Badge "Drzemka za" | 3 |
| `sleeper-app/src/components/TodayStatsCard.tsx` | ProgressRing 98%, stacked bar, mini-statystyki z kropkami | 3 |
| `sleeper-app/src/components/BigActionButton.tsx` | Moon ikona przed labelem dla night start | 3 |
| `sleeper-app/src/components/QuickActions.tsx` | 3 białe karty z okrągłym ikonowym chipem (Sun/Moon/Plus) | 3 |
| `sleeper-app/src/components/SessionListItem.tsx` | Ikona sun/moon, zakres godzin large, ChevronRight, prop `gapBeforeMs?` | 3, 4 |

### Nowe (15+)

**Primitives UI** (`sleeper-app/src/components/ui/`, Faza 0):
- `Avatar.tsx` — kółko z color bg + inicjał + opcjonalny image, sizes sm/md/lg
- `Card.tsx` — wrapper `bg-white dark:bg-dark-card rounded-card p-5 shadow-card`, wariant `gradient?: 'purple'|'orange'`
- `Badge.tsx` — pill kształt, warianty success/neutral/orange
- `IconButton.tsx` — round button z lucide ikoną (dla bell, gear)
- `ProgressBar.tsx` — płaski rounded, prop `value: 0..1`, `tintClassName?`
- `ProgressBarStacked.tsx` — segments `{ value, className }[]`
- `ProgressRing.tsx` — SVG ring (react-native-svg), prop `value, size, strokeWidth, label?`
- `SegmentedControl.tsx` — iOS-style pill z animacją Reanimated `useSharedValue`
- `Switch.tsx` — wrapper na RN `<Switch>` z naszymi kolorami (lub custom Reanimated)

**Komponenty wyższego rzędu:**
- `sleeper-app/src/components/HomeHeader.tsx` — Avatar + greeting (time-of-day) + bell IconButton (Faza 3)
- `sleeper-app/src/components/CustomTabBar.tsx` — *opcjonalny* (wariant B Fazy 2, jeśli `tabBarIcon` nie wystarczy)

**Theme system** (`sleeper-app/src/features/settings/`, Faza 1):
- `useThemeStore.ts` — Zustand + AsyncStorage persist, state: `mode: 'system'|'light'|'dark'`
- `ThemeProvider.tsx` — czyta mode + `useColorScheme()`, liczy `effectiveTheme`, opakowuje children w `className="dark"` na root View

**Helpers** (`sleeper-app/src/lib/`, Faza 0/4/5):
- `sleep-norms.ts` — `getNormForChild(birthDate, now)` → `{ minHours, maxHours, label }`. Tabela wiekowa (decyzja Fazy 0)
- `sleep-stats.ts` — `useAvgSleep7d(childId)` hook, TanStack Query, reuse `useSessions`
- `child-age.ts` — `formatChildAge(birthDate)` → "21 miesięcy" lub "2 lata · ur. DD MMM RRRR"
- `session-gaps.ts` — `computeGapsBetweenSessions(sessions)` → "aktywność Xg Ym" między `prev.end_at` i `next.start_at`

## Decyzje techniczne

1. **`darkMode: 'media' → 'class'`** — manual override z 3 trybami. Wszystkie istniejące `dark:` classes działają jak były, ale teraz driven by `className="dark"` na root View.
2. **Single-child first** — header bez dropdown switchera (avatar+imię jako label), Profil bez sekcji "DZIECI".
3. **Bell + Przypomnienia visual only** — placeholdery, brak `expo-notifications` flow w tej rundzie.
4. **Statystyki out of scope** — ekran `(app)/stats.tsx` pozostaje bez zmian.
5. **expo-router `Tabs`** (nie `NativeTabs`) — utrzymujemy konwencję MVP, dodajemy tylko `tabBarIcon` z lucide.
6. **`react-native-svg` dla ProgressRing** — solidne, cross-platform. Alternative (2 nakładające View z `transform: rotate`) odrzucone jako fragile.
7. **Reanimated `withTiming` 200ms** dla SegmentedControl — bez `withSpring` (zacinanie na Android).

## Dependencies (3 nowe, regula §8 coding-rules)

| Dep | Cel | Status | Rekomendacja |
|---|---|---|---|
| `lucide-react-native` | Ikony cross-platform | DO ZATWIERDZENIA przez usera | Install — ~10KB tree-shaken |
| `react-native-svg` | ProgressRing | Sprawdzić `npm ls react-native-svg` (może już być tranzytywnie via expo-router) | Install tylko jeśli brak |
| `expo-linear-gradient` | Gradient karty dziecka | DO ZATWIERDZENIA | **SKIP** — użyć solid `bg-purple-light` (alternatywa zaakceptowalna wizualnie) |

User MUSI zatwierdzić instalację przed `npm i` (regula §8).

## Designerski kontekst

- **DESIGN.md (projekt-wide):** `design.md` w root projektu (NIE klasyczna struktura `docs/design/` — ten plik pełni rolę DESIGN.md dla tego zadania)
- **SPEC.md (per-feature, pomiary z Figmy):** `null` — brak Figmy w tym zadaniu (design opisowy + referenced screeny #1/#2/#3 w tekście `design.md`)
- **Screeny referencyjne:** lista pusta (user wskazał screeny ustnie w sesji `/design` poprzedzającej; brak persisted PNG w repo)

> **Subagenci buildujący UI w Fazach 3/4/5 dostają `design.md` jako MANDATORY context.** `dev-docs-execute` wstrzykuje ten plik do promptu Agent tool.

## Zależności faz

```
Faza 0 (foundation)
   ↓
Faza 1 (dark mode) — wymaga `darkMode: 'class'` z Fazy 0
   ↓
Faza 2 (tab bar) — wymaga `lucide-react-native` z Fazy 0
   ↓
Faza 3 (Dzisiaj) ─┐
Faza 4 (Historia) ─┼── równolegle dopuszczalne (różne pliki, wspólne primitives już gotowe)
Faza 5 (Profil) ──┘
   ↓
Faza 6 (polish + a11y)
   ↓
Faza 7 (manual test)
```

## Rekomendowane skille / agenci

**Przed implementacją:**
- `ux-ui-guidelines` — przy projektowaniu primitives Fazy 0 (a11y, concentric radius, touch targets)
- `tailwind-react-guidelines` — każda faza UI (NativeWind v4 patterns)

**Implementacja per faza:**
- `feature-builder-ui` (agent) — fazy 0/2/3/4/5/6 (UI only)
- `feature-builder-fullstack` (agent) — Faza 1 graniczna; prościej trzymać w `feature-builder-ui` z drobnym Zustand store

**Po każdej fazie:**
- `code-review` — review przed merge fazy
- `code-quality` — po Fazie 6, audyt całości

**Manual testing:**
- `expo-rn-testing` — Faza 7 checklist
- `mobile-feature-tester` (agent) — generowanie listy testów per faza

**Po ukończeniu:**
- `dev-docs-complete` — archiwizacja
- `dev-compound` — nauki do `docs/solutions/` (dark mode 'class' migration, ProgressRing w RN)

## Otwarte pytania (do uzgodnienia w Fazie 0)

Wszystkie 5 są w `ui-redesign-zadania.md` jako blokery Fazy 0 z prefixem `Decyzja:`. Rekomendacje z `design.md`:

1. Sleep norm source → **WHO+AAP hybrid** (do potwierdzenia)
2. Gradient karty dziecka → **solid `bg-purple-light`** (SKIP `expo-linear-gradient`)
3. Sekcja "Rodzina" w Profilu → **`/settings` placeholder route** za gear icon
4. Toggle dark mode → **tri-state bottom sheet** (System/Light/Dark, iOS-idiomatic)
5. Bell icon dot → **mock `true`** (matchuje screen #1)

## Źródła

- Requirements doc: `null` (brak `docs/brainstorms/`)
- Plan techniczny: `null` (brak `docs/plans/`)
- **Source-of-truth:** `design.md` w root projektu (commit w tym branchu)
