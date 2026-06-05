# 7f6b22c: feat(sleeper-web-pwa): IU8 UI components — kopia 1:1 + web pickers HTML5

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 3 (UI & Routes) — IU8

## Co zostalo zrobione

- Skopiowano 9 komponentow `ui/*` (Avatar, Badge, Card, IconButton, ProgressBar, ProgressBarStacked, ProgressRing, SegmentedControl, Switch) z sleeper-app jako kopia 1:1 (zweryfikowane diff)
- Skopiowano 8 komponentow base (ActiveWindowCard, BigActionButton, Chip, HomeHeader, QuickActions, SessionListItem, SleepInProgressCard, TodayStatsCard) 1:1
- Stworzono NEW web pickers: `TimePickerField.tsx` i `DatePickerField.tsx` jako wrappery wokol HTML5 `<input type="time">` i `<input type="date">`
- Re-add deps usunietych w P1.3: `react-native-reanimated@~4.1.1`, `react-native-worklets@0.5.1`, `expo-haptics@~15.0.8` (teraz faktycznie uzywane)
- Stworzono 17 testow w `src/components/__tests__/pickers.test.ts`: static invariants + tz-safe conversion pipeline (DST-safe)

## Zmienione pliki

- `packages/sleeper-web/src/components/ui/{9 komponentow}.tsx` — kopia 1:1
- `packages/sleeper-web/src/components/{8 komponentow}.tsx` — kopia 1:1
- `packages/sleeper-web/src/components/TimePickerField.tsx` — NEW web HTML5 input type=time, tz-safe via parseAppTzDateTime
- `packages/sleeper-web/src/components/DatePickerField.tsx` — NEW web HTML5 input type=date, tz-safe via combineDateAndTimeInAppTz
- `packages/sleeper-web/src/components/__tests__/pickers.test.ts` — 17 testow (static invariants 13 + conversion pipeline 4)
- `packages/sleeper-web/package.json` — dodano expo-haptics, react-native-reanimated, react-native-worklets
- `pnpm-lock.yaml` — regeneracja

## Powod / kontekst

Faza 3 IU8 (L). UI components to fundament dla IU10 (routes). Kopia 1:1 z sleeper-app gwarantuje parytet — bug-fix w mobile odziedziczony przy nastepnej kopii. NEW pickers byly konieczne bo `@react-native-community/datetimepicker` nie ma web buildu; HTML5 input rozwiazuje to natywnie (iOS Safari renderuje wheel picker minut bez crop bug znanego z mobile fixu).

Deps re-add: Faza 1 review P1.3 usunal reanimated/worklets jako nieuzywane. Teraz ProgressRing animation + SegmentedControl + BigActionButton scale faktycznie sa potrzebne. expo-haptics ma wbudowany web fallback (Vibration API), wiec dodanie nie wymaga no-op mocka.

## Walidacja

- typecheck: PASS (0 errors)
- lint: PASS (0 warnings)
- test: PASS (82/82, +17 nowych pickers)
- build: PASS (dist/index.html + 4.43MB JS bundle)
- sleeper-app regression: PASS (0 errors)
- runtime: brak (manual test pending dla iOS Safari)

## Manual test pending

- TimePicker iOS Safari wheel minute scroll
- DatePicker iOS Safari natywny calendar
- BigActionButton scale animation (Pressable style fallback bez reanimated)
- ProgressRing SVG fade-in via reanimated worklet
- Brak console errors w Safari iOS
