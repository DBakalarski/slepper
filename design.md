# Redesign UI — Dzisiaj / Historia / Profil + Tab Bar

## Context

Sleeper MVP jest funkcjonalnie kompletny (wszystkie fazy 0-6 zamknięte, kod czysty, testy mobile-manual w toku). Aktualny UI bazuje na tej samej palecie (cream/navy/orange/purple) co dostarczone screeny, ale wizualnie jest "first cut" — brakuje finalnych komponentów (avatar, ring, segmented control, gradient karta dziecka, ikon sun/moon), tab bar jest standardowy expo-router bez ikon lucide, a header ekranu Dzisiaj to gołą linijka tekstu. Cel: przebudować trzy widoczne ekrany (Dzisiaj, Historia, Profil) + tab bar do wyglądu ze screenów, BEZ zmiany backendu/data flow. Statystyki zostają w obecnej postaci (poza scope tej rundy).

**Decyzje zakresowe** (potwierdzone z userem 2026-05-27):
- Scope: Dzisiaj + Historia + Profil + tab bar. Statystyki — out of scope.
- Multi-child: **single-child first**. Header bez dropdown switchera (avatar+imię jako label). Profil bez sekcji "DZIECI" z listą i przyciskiem "Dodaj dziecko" — tylko duża karta aktywnego dziecka.
- Dark mode toggle: **manual override** (system / light / dark) w Profilu. Wymaga przełączenia `tailwind.config.darkMode` z `media` na `class`.
- Bell + "Przypomnienia": **visual only** (placeholdery, brak realnego flow `expo-notifications`).

## Stan obecny (wynik eksploracji)

- **Tabs layout**: `sleeper-app/src/app/(app)/_layout.tsx` — standardowy `Tabs` z expo-router, BEZ ikon (tylko labels). Active/inactive kolory inline.
- **Dzisiaj**: `sleeper-app/src/app/(app)/index.tsx` + `ActiveChildSection` w tym samym pliku. Header to "Dzisiaj" + email/name jako text. Komponenty: `SleepInProgressCard`, `ActiveWindowCard`, `TodayStatsCard`, `BigActionButton`, `QuickActions`, `SessionListItem`. Wszystkie istnieją — wymagają **restyle, nie rewrite**.
- **Historia**: `sleeper-app/src/app/(app)/history.tsx` — istnieje grupowanie po dniach (`groupByDay`), ma `ModeChip` (Wybierz dzień / Ostatnie 14 dni). Brakuje: segment control "Lista / Kalendarz" (kalendarz to placeholder), ikony sun/moon na karcie, chevron, "aktywność Xg Ym" między sesjami w grupie, agregat "Xg Ym · N sesji" w nagłówku sekcji.
- **Profil**: `sleeper-app/src/app/(app)/profile.tsx` — obecnie sekcja "Rodzina" (members + invites) + logout. Brakuje: dużej karty aktywnego dziecka z gradientem, kalkulacji "norma snu dla wieku", sekcji SKRÓTY (Przypomnienia + Tryb ciemny).
- **Design tokens**: `sleeper-app/tailwind.config.js` ma 7 kolorów (cream, navy, orange, purple, dark-bg/card/surface). Brakuje doprecyzowania `purple-light` (gradient karta dziecka), `success-green` (badge AKTYWNE, kropki statusu), `text-muted`. Brak custom `borderRadius`/`boxShadow`.
- **Brak ikon**: żadna biblioteka. Mamy `expo-symbols` (tylko iOS). Potrzebujemy `lucide-react-native` (cross-platform).
- **Brak primitives**: `Avatar`, `Card`, `Badge`, `ProgressRing`, `ProgressBar` (stacked), `SegmentedControl`, `Switch`.
- **Brak sleep-norm calc**: nie istnieje `lib/sleep-norms.ts`.
- **Reanimated 4.1, haptics, AsyncStorage** — wszystko dostępne.

## Plan implementacji (7 faz)

### Faza 0 — Design system foundation

Cel: token, ikony, primitives — bez modyfikacji ekranów.

- **Dependencies (1 nowa)**: `lucide-react-native` — poinformować usera przed `npm i` (regula coding-rules §8). Wersja kompatybilna z RN 0.81.
- **tailwind.config.js** — rozszerzyć:
  - `colors`: dodać `'purple-light': '#B8A8D9'`, `'purple-soft': '#E8DEF7'`, `'success': '#5A8B6F'`, `'success-soft': '#D7E5DC'`, `'orange-soft': '#FBE8DD'`, `'text-muted': '#6B6580'`. (Wartości przybliżone z screenów — zwalidować eye-dropperem na finalnym mockupie.)
  - `borderRadius`: `'card': '20px'`, `'pill': '999px'`.
  - `boxShadow`: `'card': '0 4px 12px rgba(30,27,75,0.04)'` (NativeWind v4 renderuje `boxShadow` na iOS przez `shadowColor/Offset/Opacity/Radius` — zweryfikować na obu platformach).
  - `darkMode: 'class'` (przygotowanie pod Fazę 1).
  - `fontFamily`: dodać aliasy `display` (system), `mono` (tabular-nums) — przez NativeWind `style={{ fontVariant: ['tabular-nums'] }}` dla timera.
- **Nowe primitives** w `src/components/ui/`:
  - `Avatar.tsx` — props: `name: string`, `color?: string`, `size?: 'sm'|'md'|'lg'`, `image?: string`. Renderuje kółko z `color` background, inicjały (1 znak) na środku, font-bold. Domyślny color z `child.avatar_color`.
  - `Card.tsx` — wrapper: `<View className="bg-white dark:bg-dark-card rounded-card p-5 shadow-card" />`. Wariant: `gradient?: 'purple' | 'orange'` (uses `LinearGradient` z `expo-linear-gradient` — drugą dependency!) — albo prościej: solidne kolory bg-purple-light/orange-soft bez gradientu, jeśli `expo-linear-gradient` to dodatkowy koszt; finalne uzgodnić w Fazie 0.
  - `Badge.tsx` — props: `variant: 'success' | 'neutral' | 'orange'`, dziecko jako text. Pill kształt.
  - `IconButton.tsx` — round button z lucide ikoną, dla bell/gear.
  - `ProgressBar.tsx` — props: `value: 0..1`, `tintClassName?`. Płaski, rounded.
  - `ProgressBarStacked.tsx` — props: `segments: { value: number, className: string }[]` (dla "Sen nocny / Drzemki / Aktywność" stacked bar w Today card).
  - `ProgressRing.tsx` — props: `value: 0..1`, `size: number`, `strokeWidth: number`, `label?`. Implementacja przez `react-native-svg` (sprawdzić czy jest tranzytywnie via expo-router; jeśli nie — 3-cia dependency). Alternative: bez SVG, dwa nakładające `View` z `transform: rotate` — fragile, lepiej SVG.
  - `SegmentedControl.tsx` — props: `options: { key, label, icon? }[]`, `value`, `onChange`. iOS-style pill z aktywnym tłem (animacja przez Reanimated `useSharedValue`).
  - `Switch.tsx` — wrapper na `<Switch>` z RN z naszymi kolorami (lub własna implementacja Reanimated jeśli wygląd ma odbiegać).
- **Sleep norm helper**: `src/lib/sleep-norms.ts` z mapowaniem wieku (miesięcy) → zalecane godziny snu (np. 0-3m: 14-17h, 4-12m: 12-16h, 1-2y: 11-14h, 3-5y: 10-13h — finalna tabela do uzgodnienia z userem na podstawie WHO/AAP). Function: `getNormForChild(birthDate: string, now = new Date()): { minHours, maxHours, label }`.
- **Walidacja Fazy 0**: `npx tsc --noEmit` + `npm run lint` pass. Storybook nie mamy, więc smoke test: każdy primitive użyty raz na ekranie placeholder (lub w jsdoc-przykładzie).

### Faza 1 — Dark mode manual override

Cel: toggle "Tryb ciemny" w Profilu działa (System / Light / Dark).

- **Migracja tailwind**: `darkMode: 'media'` → `'class'` w `tailwind.config.js`. Wszystkie istniejące `dark:` classes działają jak były, ale teraz są driven by `className="dark"` na root View, nie systemowo.
- **Theme store**: `src/features/settings/useThemeStore.ts` — Zustand + AsyncStorage persist. State: `mode: 'system' | 'light' | 'dark'`, action: `setMode(m)`.
- **Theme provider**: `src/features/settings/ThemeProvider.tsx` — czyta `mode` + `useColorScheme()` (RN), liczy `effectiveTheme: 'light' | 'dark'`, opakowuje children w `<View className={effectiveTheme === 'dark' ? 'dark flex-1' : 'flex-1'}>`. Mount w `src/app/_layout.tsx` (root), powyżej `Stack`.
- **StatusBar**: `expo-status-bar` `style={effectiveTheme === 'dark' ? 'light' : 'dark'}` (z useThemeStore).
- **Pliki krytyczne**:
  - `sleeper-app/tailwind.config.js`
  - `sleeper-app/src/app/_layout.tsx` (wrap ThemeProvider)
  - nowe: `src/features/settings/useThemeStore.ts`, `src/features/settings/ThemeProvider.tsx`
- **Walidacja**: ręcznie przełączyć każdą z 3 opcji w Profilu (po ukończeniu Fazy 5), sprawdzić persist między restartami.

### Faza 2 — Tab bar redesign

Cel: 4 zakładki z ikonami lucide + aktywny stan (subtelny outlined box jak na screenie Historia/Profil).

- **Wariant A (preferowany)**: zostać przy expo-router `Tabs`, ale dodać `tabBarIcon` (props: `{ color, focused }`) z lucide-react-native. Ikony: `Home` (Dzisiaj), `Calendar` (Historia), `BarChart3` (Statystyki), `User` (Profil). Aktywny stan z `tabBarItemStyle` lub via `focused` w `tabBarIcon`.
- **Wariant B (jeśli A nie pozwala na outlined box wokół całego item)**: custom `tabBar` przez `Tabs` prop `tabBar={(props) => <CustomTabBar {...props} />}`. Daje pełną kontrolę nad kształtem.
- **Pliki**: `sleeper-app/src/app/(app)/_layout.tsx` — dodać `tabBarIcon` w każdym `Tabs.Screen`. Jeśli wariant B: nowy `src/components/CustomTabBar.tsx`.
- **Walidacja**: ikony renderują się w light/dark, focus state widoczny, tap area >= 44pt (a11y).

### Faza 3 — Dzisiaj redesign

Cel: header + 5 kart (timer, today, big button, quick, sessions) zgodne ze screenem #1.

- **Nowy komponent**: `src/components/HomeHeader.tsx`:
  - Avatar (z child.avatar_color, child.name → inicjał)
  - Greeting based on hour: "Dzień dobry" (5-12), "Dobre popołudnie" (12-18), "Dobry wieczór" (18-23), "Dobranoc" (23-5) + `, ${child.name}` na pogrubieniu
  - `chevron-down` ikona obok imienia (visual only — single-child first, no dropdown w tej rundzie)
  - Bell `IconButton` po prawej z kropką stanu (visual placeholder — kropka zawsze widoczna lub controlled przez state z `useNotificationDot()` mock-hook).
- **ActiveWindowCard restyle** (`src/components/ActiveWindowCard.tsx`):
  - Tło: `bg-orange-soft` z opcjonalnym gradientem (jeśli wybrano `expo-linear-gradient` w Fazie 0).
  - Header: kropka `bg-orange` + label `OKNO AKTYWNOŚCI` (uppercase, tracking-wide, text-orange).
  - Timer: większy font (`text-6xl`), `font-variant: tabular-nums`.
  - Progress bar pod timerem (`ProgressBar` tint orange, wartość = elapsed / target).
  - Footer flex-row: po lewej "Pobudka o 17:39" (timer + label), po prawej `Badge variant="orange"` z "Drzemka za ~Xg Ym".
  - Logika obliczania "Pobudka o" + "Drzemka za" — uzgodnić z istniejącym `ActiveWindowCard` (target 105 min) i `lib/time.ts`.
- **TodayStatsCard redesign** (`src/components/TodayStatsCard.tsx`):
  - Layout: label "DZISIAJ" uppercase, duża wartość "Xg Ym" po lewej, `ProgressRing` 98% po prawej (procent = totalSleep / recommendedSleep).
  - "z 13g zalecanych" — mały text-muted pod wartością.
  - `ProgressBarStacked` z 3 segmentami (Sen nocny purple, Drzemki orange-light, Aktywność dłuższa — albo placeholder z 3 spojonymi proporcjami).
  - 3 mini-statystyki w grid z kropkami: Sen nocny (purple dot), Drzemki (orange dot + count "N · Xg Ym"), Najdł. aktyw. (orange-dark dot).
  - Reuse istniejącej kalkulacji `computeAggregates()` z obecnego TodayStatsCard.
- **BigActionButton** (`src/components/BigActionButton.tsx`):
  - Dodać `Moon` lucide ikona przed labelem dla mode='start' z type='night'.
  - Reszta layoutu i haptics bez zmian.
- **QuickActions** (`src/components/QuickActions.tsx`):
  - 3 białe karty z okrągłym ikonowym chipem na górze: `Sun` (Drzemka teraz, orange-soft bg), `Moon` (Sen nocny, purple-soft bg), `Plus` (Dodaj wstecz, neutral-soft bg).
  - Label pod ikoną, font-medium.
- **SessionListItem polish** (`src/components/SessionListItem.tsx`):
  - Render w sekcji "Sesje dzisiaj" — dla home pokazujemy bez "aktywność X" gapów (te są tylko w Historii).
  - Sekcja "Pokaż wszystkie" link → `router.push('/history')`.
- **Pliki krytyczne**:
  - `sleeper-app/src/app/(app)/index.tsx` (wymiana headera, użycie nowego HomeHeader)
  - `sleeper-app/src/components/ActiveWindowCard.tsx`
  - `sleeper-app/src/components/TodayStatsCard.tsx`
  - `sleeper-app/src/components/BigActionButton.tsx`
  - `sleeper-app/src/components/QuickActions.tsx`
  - nowe: `src/components/HomeHeader.tsx`
- **Walidacja**: porównanie wizualne ze screenem #1 (delta acceptable: kerning fontów systemowych vs custom). Dark mode parity.

### Faza 4 — Historia redesign

Cel: zgodne ze screenem #2.

- **Header**: tytuł "Historia" + subtitle "Wszystkie sesje snu" (text-muted).
- **Segment control**: nowy primitive `SegmentedControl` z dwiema opcjami: ikona `List` "Lista" / ikona `Calendar` "Kalendarz". Kalendarz w tej rundzie to **placeholder view** ("Widok kalendarza wkrótce") — brak wymagań kalendarza w tej rundzie.
- **Grupowane sekcje** (Dzisiaj / Wczoraj / Piątek, 22 Maja):
  - Header sekcji: po lewej tytuł, po prawej agregat `${formatDuration(totalMs)} · ${count} sesji` (text-muted).
  - Karty sesji **wewnątrz jednej Card** (rounded-card białe tło) — separator między sesjami w karcie.
  - Między sesjami w karcie: linia z "aktywność Xg Ym" (text-orange-dark, mała czcionka) — kalkulacja: `prev.end_at` → `next.start_at`. Helper: `src/lib/session-gaps.ts` (function `computeGapsBetweenSessions`).
- **SessionListItem redesign**:
  - Ikona po lewej: `Sun` (nap, kolor orange) w okrągłym chipie orange-soft / `Moon` (night_sleep, kolor purple) w okrągłym chipie purple-soft.
  - Środek: zakres "09:30 — 10:41" (font-display, font-bold, dużo).
  - Pod zakresem: "Drzemka · 1g 11m" + kropka status (kolor zależny — może `success` jeśli completed, `orange` jeśli trwa).
  - Po prawej: `ChevronRight` ikona — link do `/session/[id]` (już istnieje).
  - Lewa krawędź karty: 3-kropki "menu" placeholder (`MoreVertical`) — visual only w tej rundzie (no action handler).
- **Pliki krytyczne**:
  - `sleeper-app/src/app/(app)/history.tsx` (przepisanie sekcji + użycie SegmentedControl)
  - `sleeper-app/src/components/SessionListItem.tsx` (wariant `gapBeforeMs?: number` do renderowania "aktywność X" lub bez)
  - nowe: `src/lib/session-gaps.ts`
- **Walidacja**: aktywność między sesjami liczona prawidłowo dla każdej grupy (test ręcznie: dodać 2 sesje w bliskim odstępie i sprawdzić wartość).

### Faza 5 — Profil redesign

Cel: zgodne ze screenem #3, bez listy "DZIECI" (single-child first).

- **Header**: tytuł "Profil" + subtitle "Dzieci i ustawienia". Gear icon (`IconButton`) po prawej → `/settings` (placeholder route lub `router.push('/settings')` z prostym ekranem "Wkrótce" — albo no-op).
- **Karta aktywnego dziecka** (gradient purple lub solid `bg-purple-light`):
  - Lewa: duży Avatar (size lg, `name` inicjał, jasne kółko z border).
  - Prawa: imię (font-display, text-2xl, bold), pod nim "21 miesięcy · ur. 12 sie. 2024" (helper: `formatChildAge(birthDate)` w `src/lib/child-age.ts` — miesiące lub lata, polski format daty).
  - Pod tym: zagnieżdżona Card z label "NORMA SNU DLA WIEKU" + value "13-15g/dobę" (z `lib/sleep-norms.ts`), `ProgressBar` (avgSleep7d / recommendedMax), "Średnio 13g 34m ostatnie 7 dni · X% normy" (X% w kolorze success jeśli >=85%, orange jeśli <85%).
  - Helper: `src/lib/sleep-stats.ts` `useAvgSleep7d(childId)` (hook z TanStack Query — query sessions z ostatnich 7 dni, agreguj). Reuse istniejących `useSessions`.
- **Sekcja SKRÓTY** (label uppercase tracking-wide, text-muted):
  - Row 1: `Bell` ikona + "Przypomnienia" + po prawej "Włączone" + `ChevronRight`. Tap → placeholder route lub no-op.
  - Row 2: `Moon` ikona + "Tryb ciemny" + po prawej `Switch` (controlled by `useThemeStore`). Switch wartość: `mode === 'dark'` (system traktujemy jako "off" dla prostoty UI — lub dodać 3-stan później; w tej rundzie binary). **Decyzja**: binary toggle (light vs dark), opcja "system" via long-press? Albo prościej: switch przełącza między 'light' i 'dark' (overrides system). Uzgodnić w Fazie 5.
- **Pliki krytyczne**:
  - `sleeper-app/src/app/(app)/profile.tsx` (rewrite — usunięcie sekcji rodziny lub przeniesienie do `/settings` placeholder; user potwierdził single-child first, ale FamilyMembersList + invites trzeba gdzieś zachować, bo to istniejąca funkcjonalność. **Propozycja**: zostawić sekcję "Rodzina" pod sekcją SKRÓTY na razie, bo wygląd "Dzieci" w screenie nie ma rodziny w ogóle — uzgodnić w Fazie 5).
  - nowe: `src/lib/child-age.ts`, `src/lib/sleep-stats.ts`
  - reuse: istniejące `useChildren`, `useActiveChild`
- **Walidacja**: norma snu poprawnie wyliczona dla różnych wieków (test: dziecko 6 miesięcy vs 24 miesiące).

### Faza 6 — Polish + a11y + manual test

- **VoiceOver/TalkBack labels** — wszystkie `IconButton` z `accessibilityLabel`, `Avatar` z `accessibilityRole="image"` + label "{name}".
- **Touch targets** — wszystkie tap-able elementy ≥44pt.
- **Tabular nums** — timer w `ActiveWindowCard` i `SleepInProgressCard` używa `style={{ fontVariant: ['tabular-nums'] }}`.
- **Pressable feedback** — wszystkie karty/buttons z `Pressable` mają `style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 }]}` (lub Reanimated worklet).
- **Animacje delikatne** — segment control transition (Reanimated `withTiming` 200ms), progress ring fade-in.
- **Walidacja końcowa**: `npx tsc --noEmit` + `npm run lint` PASS. Manual test wg checklisty (Faza 7).

### Faza 7 — Manual test (wygenerowany przez skill `expo-rn-testing`)

Checklist na Expo Go (iOS + Android):
- **Dzisiaj**: avatar z poprawnym kolorem dziecka; greeting zmienia się o porze; timer aktywnej sesji odlicza; ring 98% rośnie po zakończeniu sesji.
- **Historia**: grupowanie po dniach (Dzisiaj/Wczoraj/data); "aktywność X" liczona prawidłowo; tap na sesję otwiera detal; segment "Kalendarz" pokazuje placeholder.
- **Profil**: norma snu zgodna z wiekiem; "Średnio Xg Ym" z ostatnich 7 dni poprawne; toggle Tryb ciemny zmienia całą apkę natychmiast i persist między restartami.
- **Tab bar**: wszystkie 4 ikony renderują, active state widoczny w light/dark.
- **Dark mode**: każdy ekran ma czytelny kontrast (WCAG AA — sprawdzić z DevTools accessibility inspector).
- **Sync**: dwa telefony — zmiana na A propaguje na B przez Realtime (regression check, nie nowa funkcjonalność).

## Pliki krytyczne (zbiorczo)

**Modyfikowane:**
- `sleeper-app/tailwind.config.js` — kolory, radii, shadows, darkMode 'class'
- `sleeper-app/src/app/_layout.tsx` — ThemeProvider mount
- `sleeper-app/src/app/(app)/_layout.tsx` — tab icons
- `sleeper-app/src/app/(app)/index.tsx` — nowy header + restyle
- `sleeper-app/src/app/(app)/history.tsx` — segment + grouped sections
- `sleeper-app/src/app/(app)/profile.tsx` — child card + sleep norm + SKRÓTY
- `sleeper-app/src/components/ActiveWindowCard.tsx`
- `sleeper-app/src/components/TodayStatsCard.tsx`
- `sleeper-app/src/components/BigActionButton.tsx`
- `sleeper-app/src/components/QuickActions.tsx`
- `sleeper-app/src/components/SessionListItem.tsx`

**Nowe:**
- `sleeper-app/src/components/ui/{Avatar,Card,Badge,IconButton,ProgressBar,ProgressBarStacked,ProgressRing,SegmentedControl,Switch}.tsx`
- `sleeper-app/src/components/HomeHeader.tsx`
- `sleeper-app/src/components/CustomTabBar.tsx` (jeśli wariant B w Fazie 2)
- `sleeper-app/src/features/settings/{useThemeStore.ts,ThemeProvider.tsx}`
- `sleeper-app/src/lib/{sleep-norms.ts,sleep-stats.ts,child-age.ts,session-gaps.ts}`

**Dependencies do zatwierdzenia przez usera** (regula §8):
1. `lucide-react-native` — ikony cross-platform (~10KB tree-shaken)
2. `react-native-svg` — pod `ProgressRing` (najprawdopodobniej już tranzytywnie via expo-router; zweryfikować `npm ls react-native-svg`)
3. **Opcjonalnie**: `expo-linear-gradient` — pod gradient karty Profil (alternatywa: solid bg-purple-light bez gradientu, zaakceptowalny kompromis wizualny → propozycja: SKIP tę dependency, użyć solid color)

## Rekomendowane skille / agenci

**Przed implementacją:**
- `/dev-plan` (skill) — wygenerować z tego planu Implementation Units z dokładnymi krokami per faza (zapisać w `docs/active/ui-redesign-tranquil-duckling/`).
- `/dev-docs` (skill) — utworzyć folder kontekstowy zadania.
- `ux-ui-guidelines` (skill) — załadować przy projektowaniu primitives Fazy 0 (a11y, concentric radius, touch targets, scale-on-press).
- `tailwind-react-guidelines` (skill) — przy każdej fazie UI (NativeWind v4 patterns, formularze, lazy loading).

**Implementacja per faza:**
- `feature-builder-ui` (agent) — dispatched per fazę 0/2/3/4/5/6 (każda dotyka tylko UI, brak data-layer changes poza nowymi pure helpers w `lib/`).
- `feature-builder-fullstack` (agent) — Faza 1 (dark mode) dotyka root layout + store + theme — graniczne fullstack vs UI, ale prościej trzymać w feature-builder-ui z drobnym zustand store.

**Po każdej fazie:**
- `/code-review` (skill) — review kodu wg standardów projektu przed merge fazy.
- `code-quality` (skill) — po Fazie 6, audyt całości redesignu.

**Manual testing:**
- `expo-rn-testing` (skill) — wygenerowanie checklisty manual testing dla Fazy 7 (38+ scenariuszy jak przy MVP).
- `mobile-feature-tester` (agent) — generowanie listy testów per faza, mapowanie wymagań z planu na test steps.

**Po ukończeniu:**
- `/dev-docs-complete` (skill) — archiwizacja zadania.
- `/dev-compound` (skill) — wyciągnięcie nauk do `docs/solutions/` (np. wzorzec dark mode 'class' migration, wzorzec ProgressRing w RN).

## Weryfikacja end-to-end

W `sleeper-app/`:
```bash
npx tsc --noEmit        # 0 błędów
npm run lint            # 0 błędów
npx expo start          # QR → Expo Go iOS + Android
```

Manual:
1. Otwórz każdą z 3 zakładek (Dzisiaj, Historia, Profil), porównaj wizualnie ze screenami #1, #2, #3.
2. Toggle dark mode w Profilu, sprawdź czy każdy ekran ma poprawny kontrast (AA).
3. Restart aplikacji — dark mode setting persistuje.
4. Rozpocznij sesję → wróć do Dzisiaj → timer leci → ring rośnie po zakończeniu.
5. W Historii: 3+ sesje w jednym dniu → "aktywność X" między nimi.
6. Profil: dziecko 6 miesięcy vs 24 miesiące → norma snu różna (np. 12-16h vs 11-14h).
7. Dwa telefony: zmiana sesji na A → B widzi update przez Realtime (regression).

## Otwarte pytania (do uzgodnienia na początku Fazy 0)

1. **Sleep norm table** — z którego źródła brać wartości (WHO, AAP, polskie zalecenia pediatryczne)? Decyzja wpływa na wartości w `sleep-norms.ts`.
2. **Gradient karty dziecka w Profilu** — `expo-linear-gradient` (extra dep) vs solid color? **Rekomendacja**: solid, bez gradientu.
3. **Sekcja "Rodzina" / invites w Profilu** — gdzie jej miejsce po redesignie? Screen #3 nie pokazuje rodziny. **Propozycja**: przenieść do `/settings` placeholder route (gear icon) — bez utraty funkcjonalności.
4. **Toggle dark mode binary vs tri-state** — switch w SKRÓTACH: tylko on/off (light/dark) czy 3 opcje (System/Light/Dark) ukryte za tap → bottom sheet? **Rekomendacja**: tri-state w bottom sheet, bo to bardziej iOS-idiomatic i bezpieczne dla osób z system-wide dark mode preferencją.
5. **Bell icon dot** — kropka stanu zawsze widoczna (mock) czy controlled? **Rekomendacja**: mock `useNotificationDot()` zwraca `false` (no dot) — wygląd matchuje screen #1 (kropka jest tam) → wracam: mock zwraca `true` na start, do późniejszego wiring.
