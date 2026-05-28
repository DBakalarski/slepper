# Learned Patterns

Reguły wyciągnięte z rozwiązanych problemów w docs/solutions/. Zarządzane przez /dev-compound i /dev-compound-refresh.

<!-- rule-count: 6 -->

- **Anti-FOWT: inicjalizacja motywu inline w `<head>` przed stylesheetem**: Skrypt ustawiający `data-theme`/klasę dark na `<html>` musi być synchroniczny, inline w `<head>` i **przed** `<link rel="stylesheet">`. Nie używaj `defer`, `async` ani `type="module"` — flash of wrong theme pojawi się od pierwszego paint.
  Source: docs/solutions/ui-bugs/2026-05-19-flash-of-wrong-theme-fowt.md

- **WCAG AA kontrast: waliduj każdą parę kolor/tło narzędziem, nie na oko**: Dla normalnego tekstu wymagany kontrast ≥ 4.5:1, dla large text ≥ 3.0:1. Subiektywna ocena ("wygląda OK") nie wystarcza — używaj `contrast-cli`, axe DevTools lub WebAIM Contrast Checker przed mergem. Sprawdzaj OBA warianty (jasny i ciemny tryb).
  Source: docs/solutions/ui-bugs/2026-05-19-wcag-contrast-link-color.md

- **TZ-safe time: zawsze przez `lib/time.ts` helpers, nigdy `setHours`/`new Date(y,m,d,h,m)` na surowym Date**: Konwersje między domenową strefą (`Europe/Warsaw`) a UTC idą wyłącznie przez `fromZonedTime`/`toZonedTime` (np. `combineDateAndTimeInAppTz`, `dayKeyInAppTz`, `parseAppTzDateTime`). `setHours`/`getDate`/`toDateString` operują w device tz — działają lokalnie w PL, cicho psują się dla usera w innej strefie lub po DST. Operacje "dzień/tydzień" przez `addDays` z `date-fns`, nigdy `+ N * 24 * 60 * 60 * 1000`.
  Source: docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md

- **Theme single source-of-truth: `useEffectiveTheme()`, nigdy raw `useColorScheme()`**: Jeśli aplikacja ma manual theme toggle (System/Light/Dark zapisywany w Zustand persist), raw `useColorScheme()` z `react-native` IGNORUJE override i zwraca wyłącznie ustawienie systemowe. To powoduje cichy rozjazd między klasami Tailwind (`dark:*` driven przez root View) a kodem imperatywnym (kolor ikon lucide, status bar, native tab bar). Eksportuj jeden hook `useEffectiveTheme()` z `ThemeProvider` i używaj go w KAŻDYM miejscu theme-aware. Raw `useColorScheme()` MOŻE wystąpić TYLKO w `ThemeProvider.tsx`.
  Source: docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md

- **TanStack Query: stabilny queryKey przez `useMemo`, nigdy `new Date()`/`Date.now()` inline**: Computed values w queryKey muszą być stabilne referencyjnie między renderami — `new Date().toISOString()` lub `Date.now()` inline generuje nowy string per render, każdy traktowany jako nowy query → refetch loop → battery drain + rate spike. Memoizuj klucz dnia: `const dayKey = useMemo(() => dayKeyInAppTz(new Date()), [])` i zapinaj w queryKey. Cross-midnight refresh → `useFocusEffect` + `invalidateQueries`, nie nowy queryKey. Reguła: queryKey poza `[stringLiteral, prop, stableId]` wymaga memoizacji.
  Source: docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md

- **Touch target <44pt: `hitSlop`, nigdy zwiększanie padding/size**: iOS HIG / WCAG 2.5.5 wymaga 44×44pt minimum dla interaktywnych elementów. Zwiększanie `width`/`height`/`padding` psuje visual layout. `hitSlop` (prop Pressable/Touchable w RN) rozszerza touch area BEZ zmiany visual rozmiaru. Formula: `hitSlop = (44 - visualSize) / 2` per krawędź. Wbuduj `hitSlop` do komponentów `size='sm'` (np. `IconButton`), żeby developerzy nie musieli pamiętać per-callsite. W web nie istnieje — używa się `padding` z `box-sizing` lub pseudo-elementu.
  Source: docs/solutions/ui-bugs/2026-05-28-hitslop-vs-padding-for-touch-targets.md
