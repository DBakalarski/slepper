# 12bffeb: chore(setup): downgrade to Expo SDK 54 for Expo Go compatibility

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 0 — Setup projektu

## Co zostalo zrobione
- Downgrade `expo`: `~56.0.4` -> `~54.0.0`
  - `react`: 19.2.3 -> 19.1.0
  - `react-native`: 0.85.3 -> 0.81.5
  - `expo-router`: bumped to `~6.0.23`
- `npx expo install --fix -- --legacy-peer-deps` zsynchronizowal wszystkie expo-* deps z SDK 54
- Usunieto martwy kod template'u SDK 56 (nieuzywany przez nasze routes):
  - `src/components/animated-icon{.tsx,.web.tsx,.module.css}`
  - `src/components/app-tabs{.tsx,.web.tsx}`
  - `src/components/external-link.tsx`, `hint-row.tsx`, `themed-text.tsx`, `themed-view.tsx`, `web-badge.tsx`
  - `src/components/ui/collapsible.tsx`
  - `src/constants/theme.ts`
  - `src/hooks/use-color-scheme.ts`, `use-color-scheme.web.ts`, `use-theme.ts`
- `expo install --fix` dodal pluginy `expo-font`, `expo-web-browser` do `app.json` (wymagane przez SDK 54 template)
- `tsconfig.json` automatycznie dodal `nativewind-env.d.ts` do `include`

## Zmienione pliki
- `sleeper-app/package.json`, `package-lock.json` — wersje
- `sleeper-app/app.json` — plugins
- `sleeper-app/tsconfig.json` — include
- 15 plikow `src/components/`, `src/constants/`, `src/hooks/` — usuniete (-2239 linii)

## Powod / kontekst
**Root cause:** Expo Go w App Store/Play Store wspiera SDK z opoznieniem 1-2 wersje. Projekt na SDK 56 odrzucany przez Expo Go z bledem `Project is incompatible with this version of Expo Go`.

**Decyzja:** Downgrade do SDK 54 (najbezpieczniej w stores). MVP nie wymaga zadnych features SDK 55/56 wiec brak utraty funkcjonalnosci.

**Alternatywa odrzucona:** EAS dev build pozwoliloby zostac na SDK 56 ale wymaga konta EAS + 10-20 min build w cloud — to Faza 6.

## Walidacja
- typecheck: PASS (0 bledow po usunieciu martwego template'u)
- test: n/a
- runtime: bundler odpalil sie poprawnie po `npx expo start --clear`. Expo Go zaakceptowal projekt (brak bledu kompatybilnosci). User zweryfikowal health probe w UI.
