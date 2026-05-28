# UI Redesign — plan strategiczny

**Branch:** `feature/ui-redesign`
**Ostatnia aktualizacja:** 2026-05-28

## Podsumowanie wykonawcze

Sleeper MVP jest funkcjonalnie kompletny (fazy 0–6 zamknięte, kod CZYSTY po review). Aktualny UI bazuje na poprawnej palecie, ale wizualnie to "first cut" — brakuje finalnych komponentów (avatar, ring, segmented control, gradient karta dziecka, ikon sun/moon), tab bar nie ma ikon, header ekranu Dzisiaj to goła linia tekstu. Cel: przebudować trzy widoczne ekrany (Dzisiaj, Historia, Profil) + tab bar do wyglądu ze screenów #1/#2/#3, BEZ zmian backendu/data flow.

## Cele i zakres

**W scope:**
- Ekran Dzisiaj (`(app)/index.tsx`) — nowy header z avatarem, restyle 5 kart
- Ekran Historia (`(app)/history.tsx`) — segment control Lista/Kalendarz, grupowane sekcje z agregatem, "aktywność Xg Ym" między sesjami
- Ekran Profil (`(app)/profile.tsx`) — duża karta aktywnego dziecka, norma snu dla wieku, sekcja SKRÓTY
- Tab bar (`(app)/_layout.tsx`) — 4 ikony lucide + aktywny stan
- Design system foundation: kolory, radii, shadows, primitives w `src/components/ui/`
- Dark mode manual override (system/light/dark) — migracja `darkMode: 'media' → 'class'`

**Out of scope (potwierdzone z userem 2026-05-27):**
- Ekran Statystyki (`(app)/stats.tsx`)
- Multi-child dropdown (single-child first, brak switchera)
- Sekcja "DZIECI" z listą i przyciskiem "Dodaj dziecko"
- Realny flow `expo-notifications` (Bell + Przypomnienia = visual only, placeholdery)

## Stan obecny

- **Tabs**: `(app)/_layout.tsx` — bez ikon, tylko labels
- **Dzisiaj**: header to "Dzisiaj" + email/name jako text. Komponenty (`SleepInProgressCard`, `ActiveWindowCard`, `TodayStatsCard`, `BigActionButton`, `QuickActions`, `SessionListItem`) istnieją — wymagają **restyle, nie rewrite**
- **Historia**: ma `ModeChip` i grupowanie, brakuje segment control "Lista/Kalendarz", ikon sun/moon, chevron, agregat sekcji, "aktywność X" między sesjami
- **Profil**: ma "Rodzina" + logout. Brakuje karty dziecka z gradientem, kalkulacji norma snu, sekcji SKRÓTY
- **Tailwind**: 7 kolorów (cream, navy, orange, purple, dark-bg/card/surface). Brak `purple-light`, `success`, `text-muted`, custom radii, shadows
- **Brak ikon**: tylko `expo-symbols` (iOS only). Potrzeba `lucide-react-native`
- **Brak primitives**: Avatar, Card, Badge, ProgressRing, ProgressBar, SegmentedControl, Switch
- **Brak sleep-norm calc**: `lib/sleep-norms.ts` nie istnieje
- **Reanimated 4.1, haptics, AsyncStorage**: dostępne

## Fazy implementacji

### Faza 0 — Design system foundation
Tokeny tailwind, ikony, primitives. **Decyzje** (5 blokerów z `design.md` → patrz `ui-redesign-zadania.md`):
- Sleep norm table source
- Gradient karty dziecka — `expo-linear-gradient` vs solid
- Sekcja "Rodzina" → gdzie po redesignie
- Toggle dark mode binary vs tri-state
- Bell dot mock true vs false

Acceptance: `npx tsc --noEmit` PASS, `npm run lint` PASS, każdy primitive użyty raz w smoke teście.

### Faza 1 — Dark mode manual override
Migracja `darkMode: 'media' → 'class'`, `useThemeStore` (Zustand + AsyncStorage persist), `ThemeProvider` w root layout.

Acceptance: przełącznik 3 trybów (System/Light/Dark) działa, persistuje między restartami.

### Faza 2 — Tab bar redesign
4 ikony lucide (`Home`, `Calendar`, `BarChart3`, `User`) + aktywny stan (outlined box). Wariant A: `Tabs.Screen tabBarIcon`. Wariant B: custom `tabBar`.

Acceptance: ikony renderują w light/dark, focus state widoczny, tap area ≥44pt.

### Faza 3 — Dzisiaj redesign
Nowy `HomeHeader` (Avatar + greeting + bell), restyle `ActiveWindowCard` (gradient/soft bg, ProgressBar, Badge), restyle `TodayStatsCard` (ProgressRing 98%, stacked bar, mini-statystyki), `BigActionButton` z Moon ikoną, `QuickActions` z 3 ikonowymi chipami.

Acceptance: porównanie ze screenem #1 (delta dopuszczalna: kerning fontów), dark mode parity.

### Faza 4 — Historia redesign
Header + subtitle, `SegmentedControl` (Lista/Kalendarz — kalendarz placeholder), grupowane sekcje z agregatem, sesje wewnątrz jednej Card z separatorem, "aktywność X" między sesjami (helper `session-gaps.ts`), `SessionListItem` z sun/moon, ChevronRight, MoreVertical visual.

Acceptance: aktywność między sesjami liczona prawidłowo (test ręcznie z 2 sesjami w bliskim odstępie).

### Faza 5 — Profil redesign
Header + gear icon → `/settings` placeholder, karta aktywnego dziecka (Avatar + imię + wiek + norma snu + ProgressBar 7d), sekcja SKRÓTY (Przypomnienia + Tryb ciemny).

Acceptance: norma snu poprawnie wyliczona dla różnych wieków (test: 6m vs 24m).

### Faza 6 — Polish + a11y
VoiceOver/TalkBack labels, touch targets ≥44pt, tabular nums, pressable feedback (scale 0.97), animacje delikatne (Reanimated 200ms).

Acceptance: `npx tsc --noEmit` PASS, `npm run lint` PASS.

### Faza 7 — Manual test
Checklist na Expo Go (iOS + Android) wygenerowana przez skill `expo-rn-testing`:
- Dzisiaj: avatar, greeting, timer, ring 98%
- Historia: grupowanie, "aktywność X", segment Kalendarz placeholder
- Profil: norma snu, średnia 7d, toggle dark mode + persist
- Tab bar: 4 ikony, active state w light/dark
- Dark mode: WCAG AA kontrast na każdym ekranie
- Sync: regression check Realtime między dwoma telefonami

## Pliki krytyczne

**Modyfikowane:**
- `sleeper-app/tailwind.config.js` — kolory, radii, shadows, `darkMode: 'class'`
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

## Dependencies do zatwierdzenia (regula §8 coding-rules)

1. **`lucide-react-native`** — ikony cross-platform (~10KB tree-shaken). Wersja kompatybilna z RN 0.81.
2. **`react-native-svg`** — pod `ProgressRing`. Sprawdzić tranzytywnie via `npm ls react-native-svg` przed instalacją.
3. **`expo-linear-gradient`** (opcjonalne) — gradient karty Profil. **Rekomendacja: SKIP**, użyć solid `bg-purple-light`.

## Ryzyka i mitygacja

| Ryzyko | Mitygacja |
|---|---|
| `darkMode: 'class'` łamie wszystkie istniejące `dark:` classes | Walidacja po Fazie 1 na każdym ekranie; wszystkie `dark:` działają jak były, ale teraz driven by className "dark" na root |
| `boxShadow` w NativeWind v4 inaczej renderuje się na iOS/Android | Test na obu platformach po Fazie 0; fallback: native `shadowColor/Offset/Opacity/Radius` props |
| Sleep norm table — różne źródła (WHO/AAP/PL) dają różne zakresy | Decyzja Fazy 0 (bloker); jedno źródło, udokumentowane w `sleep-norms.ts` |
| Sekcja "Rodzina" — usunięcie z Profilu może zaburzyć invite flow | Przeniesienie do `/settings` placeholder route (decyzja Fazy 0); funkcjonalność zachowana |
| Reanimated animacje SegmentedControl zacinają się na Android | Test on-device, fallback do `withTiming` bez `withSpring` |

## Mierniki sukcesu

- Porównanie wizualne każdego ekranu ze screenem #1/#2/#3 — match w 90%+ (delta: fonty systemowe vs custom)
- Dark mode toggle działa w 3 trybach i persistuje
- `npx tsc --noEmit` + `npm run lint` = 0 błędów
- Manual test checklist (Faza 7) = 100% PASS na iOS + Android
- Brak regresji: timer leci, sesje sync między telefonami, START/STOP działa

## Wymagane zasoby

- **Skille**: `dev-docs-execute`, `dev-docs-review`, `dev-compound`, `dev-docs-complete`, `expo-rn-testing`, `tailwind-react-guidelines`, `ux-ui-guidelines`, `code-review`
- **Agenci**: `feature-builder-ui` (fazy 0/2/3/4/5/6), `mobile-feature-tester` (per faza)
- **Dostęp do urządzeń**: iPhone + Android dla manual testów

## Szacunki czasowe

| Faza | Effort | Uwagi |
|---|---|---|
| 0 | L | 5 decyzji + 9 primitives + sleep-norms.ts |
| 1 | M | darkMode migration, ThemeProvider, persist |
| 2 | S | Tabs.Screen icons (wariant A) lub custom tabBar (B) |
| 3 | L | 5 komponentów restyle + nowy HomeHeader |
| 4 | M | Segment, grouped sections, session-gaps |
| 5 | M | Child card + sleep norm + SKRÓTY |
| 6 | S | A11y polish, animations |
| 7 | M | Manual test checklist execution |

Suma: ~XL (7 faz, ~2–3 tygodnie solo dev z testami)

## Weryfikacja end-to-end

W `sleeper-app/`:
```bash
npx tsc --noEmit        # 0 błędów
npm run lint            # 0 błędów
npx expo start          # QR → Expo Go iOS + Android
```

Manual (skrócone — pełna checklist w Fazie 7):
1. Otwórz Dzisiaj/Historia/Profil — porównanie wizualne ze screenami
2. Toggle dark mode — każdy ekran ma WCAG AA kontrast
3. Restart appki — dark mode setting persistuje
4. Rozpocznij sesję → timer leci → ring rośnie po zakończeniu
5. Historia: 3+ sesje w jednym dniu → "aktywność X" między nimi
6. Profil: dziecko 6m vs 24m → norma snu różna
7. Dwa telefony: zmiana na A → B widzi update przez Realtime

## Źródła

- Requirements doc: `null` (brak `docs/brainstorms/`)
- Plan techniczny: `null` (brak `docs/plans/`)
- **Source-of-truth:** `design.md` w root projektu (commit w tym branchu)
