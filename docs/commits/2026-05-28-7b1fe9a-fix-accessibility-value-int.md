# 7b1fe9a: fix(ui-redesign): accessibilityValue.now wymaga inta, nie float

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** post-autopilot bugfix (zgloszenie usera z runtime Expo Go)

## Co zostalo zrobione
- Naprawiony crash w `ProgressBar` i `ProgressRing` (`Loss of precision during arithmetic conversion: (long long) 0.352114...`)
- Native warstwa RN wymaga inta dla `accessibilityValue.now` — float crash przy próbie cast'u na `long long`
- Skala zmieniona z 0..1 na 0..100, `Math.round` na `now`, `max: 100`

## Zmienione pliki
- `sleeper-app/src/components/ui/ProgressBar.tsx` — `accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}`
- `sleeper-app/src/components/ui/ProgressRing.tsx` — `accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}`

## Powod / kontekst
Zgloszenie od usera podczas pierwszego uruchomienia w Expo Go po autopilocie ui-redesign. Stack: ActiveWindowCard → ProgressBar → crash.

Anti-pattern: `accessibilityValue.now` z float 0..1. RN nakazuje int (`long long` w native). Dokumentacja RN milczy o tym constraincie — bug ujawnia sie dopiero on-device.

Kandydat na regule learned-patterns (rule-worthy: silent failure, RN-specific, latwy do powielenia w innych primitives jak Slider).

## Walidacja
- typecheck: PASS (0 bledow)
- test: n/a (brak Jest)
- runtime: user uruchomil Expo Go i napotkal crash; po fix typecheck PASS, lint PASS. Re-test on-device do potwierdzenia przez usera.
