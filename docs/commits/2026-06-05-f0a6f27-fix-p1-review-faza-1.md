# f0a6f27: fix(sleeper-web-pwa): adresuj P1 z review fazy 1 (bundle + lint)

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 1 (sleeper-web-pwa) — post-review fixy P1

## Co zostalo zrobione

Zaadresowano 4 P1-blocking findings z multi-agent code review Fazy 1:

- **P1.1 (Architecture):** dodano inline komentarze deferred TS errors w `session-gaps.ts:1` i `sleep-stats.ts:4`, wyjasniajace ze import z `@/features/sessions/hooks` jest swiadomie niedzialajacy do IU5. Bez tego przyszly dev/agent uznalby `TS2307` za bug i "naprawil" destrukcyjnie.
- **P1.2 (Architecture):** w `sleep-stats.ts` dodano `// eslint-disable-next-line import/no-unresolved` przy mixed value/type import (`import { useSessions, type SleepSession }`). `session-gaps.ts` uzywa wylacznie `import type` — eslint go nie zglasza, eslint-disable nie byl potrzebny. `pnpm --filter sleeper-web lint` exit 0.
- **P1.3 (Performance):** usunieto `react-native-reanimated@~4.1.1` + `react-native-worklets@0.5.1` z `package.json` dependencies. Grep `reanimated|useSharedValue|withTiming|useAnimatedStyle` w `packages/sleeper-web/src/` zwrocil pustke — zero uzyc w Fazie 1. Re-add nastapi w IU8 gdy `BigActionButton` faktycznie potrzebuje scale animation. `pnpm install` raportuje +1 -148 paczek (~100KB gzipped saving w web bundle).
- **P1.4 (Performance):** dodano alias `'lucide-react-native' -> 'lucide-react'` w `metro.config.js` (`config.resolver.alias`). Dodano `lucide-react@^0.469.0` jako dep. Skopiowany kod z sleeper-app importuje `lucide-react-native` (renderuje przez `react-native-svg` adapter na web, ~2-3x wiekszy bundle) — alias przekierowuje transparentnie na natywne SVG DOM `lucide-react`. Sprawdzono w `ThemeModeBottomSheet.tsx` ze import dziala.

## Zmienione pliki

- `packages/sleeper-web/src/lib/session-gaps.ts` — dodano 2 linie komentarza FAZA 2 (IU5) przed `import type`
- `packages/sleeper-web/src/lib/sleep-stats.ts` — dodano 2 linie komentarza + 1 linia `// eslint-disable-next-line import/no-unresolved` przed mixed import
- `packages/sleeper-web/package.json` — usunieto 2 deps (reanimated + worklets), dodano `lucide-react`
- `packages/sleeper-web/metro.config.js` — dodano `config.resolver.alias` z mapowaniem lucide-react-native -> lucide-react (9 linii)
- `pnpm-lock.yaml` — regenerowany przez `pnpm install`

## Powod / kontekst

Multi-agent code review Fazy 1 zidentyfikowal 4 P1-blocking i ⛔ wymagal poprawek przed Faza 2. Kontekst zadania (`sleeper-web-pwa-kontekst.md:62-71`) udokumentowal 2 deferred TS errors, ale brak inline-komentarzy w kodzie = ryzyko destrukcyjnego "fixa". Dodatkowo bundle bloat (reanimated + lucide-react-native) niepotrzebnie podnosil web shell size od pierwszego deployu — lepiej naprawic teraz niz w Fazie 4.

Decyzja produktowa: 2 deferred TS errors zostaja (do IU5 gdy `features/sessions/` zostanie skopiowane). To swiadoma akceptacja udokumentowana w kontekscie + teraz takze w samym kodzie. `tsc` exit 2 do IU5, ale `lint` exit 0 (quality gate odzyskany).

## Walidacja

- typecheck: FAIL na 2 deferred (oczekiwane, do IU5), sleeper-app regression PASS
- lint: PASS (exit 0, 0 errors, 0 warnings)
- test: PASS (vitest 14/14 PASS)
- runtime: nie weryfikowano (poza scope post-review code fix; smoke test placeholder w manual-test-faza-1.md)
