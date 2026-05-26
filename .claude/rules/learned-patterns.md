# Learned Patterns

Reguły wyciągnięte z rozwiązanych problemów w docs/solutions/. Zarządzane przez /dev-compound i /dev-compound-refresh.

<!-- rule-count: 2 -->

- **Anti-FOWT: inicjalizacja motywu inline w `<head>` przed stylesheetem**: Skrypt ustawiający `data-theme`/klasę dark na `<html>` musi być synchroniczny, inline w `<head>` i **przed** `<link rel="stylesheet">`. Nie używaj `defer`, `async` ani `type="module"` — flash of wrong theme pojawi się od pierwszego paint.
  Source: docs/solutions/ui-bugs/2026-05-19-flash-of-wrong-theme-fowt.md

- **WCAG AA kontrast: waliduj każdą parę kolor/tło narzędziem, nie na oko**: Dla normalnego tekstu wymagany kontrast ≥ 4.5:1, dla large text ≥ 3.0:1. Subiektywna ocena ("wygląda OK") nie wystarcza — używaj `contrast-cli`, axe DevTools lub WebAIM Contrast Checker przed mergem. Sprawdzaj OBA warianty (jasny i ciemny tryb).
  Source: docs/solutions/ui-bugs/2026-05-19-wcag-contrast-link-color.md
