# cddac73: feat(ui-redesign): faza 1 — dark mode manual override

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** ui-redesign / Faza 1 — Dark mode manual override

## Co zostalo zrobione

- Dodano `useThemeStore` (Zustand + AsyncStorage persist) ze stanem `mode: 'system' | 'light' | 'dark'` (default `'system'`) i akcją `setMode(mode)`. Persist key: `theme-mode`.
- Dodano `ThemeProvider` + hook `useEffectiveTheme()` — czyta `useColorScheme()` z react-native i `mode` ze store, oblicza `effectiveTheme: 'light' | 'dark'` (fallback `systemScheme === null` → `'light'`).
- `ThemeProvider` opakowuje children w root `<View>` z klasą `dark flex-1` lub `flex-1` — NativeWind v4 z `darkMode: 'class'` (już ustawione w Fazie 0) propaguje klasę w dół drzewa.
- Mount `ThemeProvider` w `src/app/_layout.tsx` powyżej Stack. `StatusBar.style` bindowany do `effectiveTheme` (`'light'` gdy dark, `'dark'` gdy light).
- Wyciągnięto `RootLayoutContent` jako sub-komponent — `useEffectiveTheme()` musi być wywołane wewnątrz `<ThemeProvider>`, więc nie da się tego użyć w `RootLayout` bezpośrednio.

## Zmienione pliki

- `sleeper-app/src/features/settings/useThemeStore.ts` — nowy plik (store + ThemeMode type).
- `sleeper-app/src/features/settings/ThemeProvider.tsx` — nowy plik (provider + `useEffectiveTheme` hook).
- `sleeper-app/src/app/_layout.tsx` — mount `ThemeProvider` powyżej Stack, StatusBar style bindowany do effectiveTheme, wydzielenie `RootLayoutContent`.
- `docs/active/ui-redesign/ui-redesign-zadania.md` — odhaczone checkboxy Fazy 1 (implementacja + walidacja typecheck/lint/commit).
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — dodany wpis Postęp dla Fazy 1.

## Powod / kontekst

Faza 1 planu UI redesign — fundament pod tri-state toggle dark mode (System/Light/Dark) który zostanie wystawiony przez UI w Fazie 5 (Profil). W tej fazie świadomie NIE budujemy UI bottom sheet — tylko store + provider + integrację z root layout. Dzięki temu reszta faz (2-4) może już używać dark mode jeśli zajdzie potrzeba weryfikacji wariantów.

Decyzja: `RootLayoutContent` wyciągnięte do osobnego komponentu — to konsekwencja tego, że `useEffectiveTheme()` musi być wywołane w drzewie pod `<ThemeProvider>`. Alternatywa (przekazanie effectiveTheme jako prop z `ThemeProvider`) byłaby invazyjna i trudniejsza w utrzymaniu.

Brak odchyleń od planu.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` w `sleeper-app/`, 0 błędów)
- lint: PASS (`npm run lint` = `expo lint`, 0 błędów)
- test: n/a (brak setupu Jest w projekcie)
- runtime: NIE weryfikowano on-device w tej fazie — toggle UI dopiero w Fazie 5, więc smoke test (przełączenie + persist) zostanie wykonany razem z Profil rewrite.
