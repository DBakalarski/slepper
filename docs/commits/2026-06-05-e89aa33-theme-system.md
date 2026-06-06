# e89aa33: feat(sleeper-web-pwa): copy theme system (ThemeProvider + useEffectiveTheme) + wire StatusBar

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** sleeper-web-pwa / IU4 — Theme system

## Co zostalo zrobione

- Skopiowano 1:1 z `sleeper-app` system motywu (tri-state: System / Light / Dark) do `sleeper-web`:
  - `ThemeProvider` z eksportem `useEffectiveTheme()` (single source-of-truth) — jedyne dozwolone uzycie raw `useColorScheme()`.
  - `useThemeStore` (Zustand persist przez AsyncStorage; web mapuje na `localStorage`).
  - `ThemeModeBottomSheet` — bottom sheet wyboru trybu motywu, kopia 1:1 (uzywa tylko RN primitives: `Modal`, `Pressable`, `View`, `Text`, `SafeAreaView`; `react-native-web` wspiera RN `Modal` natywnie — adaptacja na osobny modal NIE byla potrzebna).
- W `_layout.tsx` dodano wrapper `<ThemeProvider>` miedzy `<AuthProvider>` a `<Stack>` oraz `<StatusBar>` z `expo-status-bar` (na web no-op, parytet z sleeper-app).

## Zmienione pliki

- `packages/sleeper-web/src/features/settings/ThemeProvider.tsx` — nowy, kopia 1:1.
- `packages/sleeper-web/src/features/settings/useThemeStore.ts` — nowy, kopia 1:1.
- `packages/sleeper-web/src/features/settings/ThemeModeBottomSheet.tsx` — nowy, kopia 1:1 (decyzja: brak adaptacji, RN `Modal` dziala na web OOTB).
- `packages/sleeper-web/src/app/_layout.tsx` — dodano `ThemeProvider` + `StatusBar` z `expo-status-bar`; wydzielono `RootLayoutContent` zeby `useEffectiveTheme()` mial dostep do contextu Provider.

## Powod / kontekst

R10 (UX mobile-first, theme jako czesc visual identity). Zachowano krytyczny pattern z `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`: raw `useColorScheme()` istnieje TYLKO w `ThemeProvider.tsx`; reszta kodu uzywa `useEffectiveTheme()` jako single source-of-truth — gwarantuje spojnosc miedzy NativeWind `dark:` klasami a imperative color uses.

Decyzja kopia 1:1 dla `ThemeModeBottomSheet`: po przeczytaniu source potwierdzono ze uzywa wylacznie RN primitives bez `@gorhom/bottom-sheet` ani native sheet API — `react-native-web` renderuje `Modal` jako overlay DOM, dziala bez adaptacji.

## Walidacja

- typecheck (sleeper-web): PASS (te same 2 transient errors z IU2 w `lib/session-gaps.ts` + `lib/sleep-stats.ts` — deferred do IU5; ZERO nowych z IU4).
- typecheck (sleeper-app): PASS (regression check OK, exit 0).
- lint (sleeper-web): PASS (1 pre-existing error `import/no-unresolved` w `sleep-stats.ts` z IU2; ZERO nowych).
- audit `useColorScheme` w `packages/sleeper-web/src/`: wystepuje TYLKO w `features/settings/ThemeProvider.tsx` (linie 2, 14) — zgodne z learned pattern.
- runtime: nie testowano on-device w tym IU; manual mobile checks (default System mode, manual override, persist po reload, reactive na zmiane iOS settings) — operator responsibility post-IU.
