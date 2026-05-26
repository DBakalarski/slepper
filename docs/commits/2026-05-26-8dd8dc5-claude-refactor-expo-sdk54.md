# 8dd8dc5: infra(.claude): adapt skills and agents from web stack to Expo SDK 54

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** n/a (infrastruktura dev pipeline'u, niezależna od faz MVP)

## Co zostalo zrobione

Adaptacja `.claude/skills/` i `.claude/agents/` z poprzedniego stacku (Vite + React 19 web + Tailwind v4 + shadcn/ui + Playwright) na aktualny stack projektu sleeper (Expo SDK 54 + RN 0.81 + NativeWind v4 + Tailwind v3.4 + Supabase + TanStack Query + Zustand + expo-router).

### Skille — edycja in-place (7)
- `tailwind-react-guidelines` — Vite/Tailwind v4/shadcn/ui → Expo + NativeWind + RN built-ins (View/Text/Pressable/TextInput/FlatList), expo-router file-based routing, RHF z `<TextInput>` + KeyboardAvoidingView
- `ux-ui-guidelines` — usunięte: View Transitions API, container queries, OKLCH, `prefers-reduced-motion`; dodane: Safe Area, 44pt touch targets, VoiceOver/TalkBack, react-native-reanimated worklets, NativeWind dark mode
- `code-review` — checklist pod Expo + RN + NativeWind + Supabase; usunięte sekcje Vite/React Router/Vitest+RTL+MSW
- `supabase-dev-guidelines` — nowa sekcja "Supabase + Expo specifics": AsyncStorage persistence, `react-native-url-polyfill/auto`, OAuth flow z `expo-web-browser` + deep links, Realtime + AppState reconnect, SecureStore vs AsyncStorage decision tree
- `sentry-integration` — `@sentry/react-native` v6+, EAS Build sourcemap upload, native crash reporting (iOS NSException, Android Java)
- `security` — dorzucone OWASP Mobile Top 10, deep link URL validation, screenshot blur (expo-screen-capture), token storage decisions
- `bugfix` — dorzucona sekcja "RN/Expo debugging": Metro bundler errors, Hermes runtime, native module crashes, LogBox antipattern, Expo Go vs EAS Build

### Skille — nowe (2)
- `expo-rn-testing` — strategia testów mobile: Jest+RNTL setup (TBD), manual checklist Expo Go, Maestro vs Detox decision, two-device sync (sleeper-specific)
- `eas-build` — pipeline release: eas.json profiles (development/preview/production), credentials, EAS Update OTA, code signing, SDK 54 lock note

### Skille — usunięte (1)
- `agent-browser/` (cały folder z SKILL.md + references + templates) — Playwright/CDP nie ma sensu dla aplikacji RN bez DOM

### Agenty — edycja in-place (6)
- `feature-builder-ui` — komponenty RN + NativeWind, ścieżki `sleeper-app/src/`, Safe Area, a11y RN, KeyboardAvoidingView
- `feature-builder-fullstack` — cross-layer pod Expo + Supabase + Realtime, dekompozycja Data/UI z mobile patterns
- `feature-builder-data` — `EXPO_PUBLIC_*` warning, ścieżki `sleeper-app/`, conditional Jest (brak setup'u)
- `security-sentinel` — Mobile Top 10 (M1-M10), deep link validation, AsyncStorage/SecureStore, WebView injection, `EXPO_PUBLIC_*` leakage checks
- `architecture-strategist` — boundaries `sleeper-app/src/{app,features,components,hooks,lib,store}`, anty-pattern detection (web HTML w RN, useEffect dla data fetch)
- `auto-error-resolver` — pełny rewrite z hardcoded ścieżki "Piszemy Wirale" → `sleeper-app/`, dodane RN-specific error patterns (lucide-react vs lucide-react-native, RN events vs DOM events, NativeWind types)

### Agenty — nowy (1)
- `mobile-feature-tester` — zastępca usuniętego `feature-tester-e2e`. Generuje structured manual test checklist na Expo Go: happy path + edge cases (offline, bg→fg, keyboard, dark mode, a11y) + sleeper-specific two-device sync. NIE uruchamia testów automatycznie

### Agenty — usunięte (2)
- `browser-tester.md` — Playwright tester (brak DOM w RN)
- `feature-tester-e2e.md` — używał agent-browser (Playwright), zastąpiony przez `mobile-feature-tester`

### Pipeline dev-* (4)
- `dev-plan/SKILL.md` — `[E2E]` browser → `[Manual-mobile]` Expo Go scenariusze; Weryfikacja: CLI lub mobile-manual
- `dev-docs-review/SKILL.md` — Agent 5 "E2E Browser Verification" → "Mobile Manual Test Checklist Generator"; kategoria checkboxów "E2E browser" → "Mobile manual"
- `dev-autopilot/SKILL.md` — visual verification przez agent-browser → manual on-device (Expo Go); Agent 5 SKIP handling pod mobile
- `docs/dev-pipeline.md` — aktualizacja stacku w nagłówku; nowa sekcja Implementation/Testing/Utility agentów w mapie

## Zmienione pliki

Łącznie 57 plików: 39 zmodyfikowane (skille + agenty + resources/references), 11 nowych (2 nowe skille SKILL.md + 1 nowy agent + 8 resources w nowych skillach), 7 usuniętych (cały folder agent-browser/, 2 agenty).

Główne:
- `.claude/skills/tailwind-react-guidelines/SKILL.md` — pełny rewrite pod Expo
- `.claude/skills/ux-ui-guidelines/SKILL.md` — pełny rewrite pod mobile
- `.claude/skills/code-review/SKILL.md` — checklist pod Expo
- `.claude/skills/supabase-dev-guidelines/SKILL.md` — dorzucona sekcja Expo
- `.claude/skills/sentry-integration/SKILL.md` — `@sentry/react-native`
- `.claude/skills/security/SKILL.md` — Mobile Top 10
- `.claude/skills/bugfix/SKILL.md` — sekcja RN/Expo debugging
- `.claude/skills/expo-rn-testing/SKILL.md` — NOWY
- `.claude/skills/eas-build/SKILL.md` — NOWY
- `.claude/agents/feature-builder-*.md` — adaptacja pod RN + Supabase
- `.claude/agents/security-sentinel.md` — Mobile Top 10
- `.claude/agents/architecture-strategist.md` — layout sleeper-app
- `.claude/agents/auto-error-resolver.md` — fix hardcoded ścieżki
- `.claude/agents/mobile-feature-tester.md` — NOWY
- `.claude/docs/dev-pipeline.md` — stack header + nowe sekcje agentów

## Powod / kontekst

Skille/agenty pochodziły z innego projektu (web SPA). Bez tej adaptacji pipeline `dev-*` halucynował o web technologiach (Vite, Tailwind v4, shadcn, Playwright), generował niewłaściwe rekomendacje (np. `<div>`/`<button>` w aplikacji RN, container queries niedziałające w RN, `VITE_*` env vars zamiast `EXPO_PUBLIC_*`) i wskazywał na narzędzia bez sensu dla mobile (Playwright na aplikacji bez DOM).

Po refactorze pipeline jest spójny:
- `/dev-plan` generuje plany z `[Manual-mobile]` scenariuszami zamiast `[E2E]` browser
- `/dev-docs-execute` deleguje do feature-builderów z mobile-specific patterns
- `/dev-docs-review` używa `mobile-feature-tester` zamiast browser E2E
- Wszystkie skille spójne ze stackiem zainstalowanym w `sleeper-app/package.json`

Decyzje:
- **Edit in-place** zamiast rename — mniej breaking dla pipeline'u dev-* który referencjonuje skille po nazwie
- **Resources/ jako header notes** zamiast pełnego rewrite — zachowanie wartości generycznych wzorców (TypeScript, Zod, RHF concepts) z notą o web→RN mapping
- **Mobile manual checklist** zamiast automated E2E — Maestro/Detox setup odłożone do Fazy 6+ gdy będzie czas

## Walidacja

- typecheck: n/a (zmiany w `.claude/`, nie w kodzie `sleeper-app/`; hook `stop-build-check-enhanced.sh` nie uruchomił się na te pliki)
- test: n/a (brak setupu testów; planowane w Fazie 2+)
- runtime: n/a (zmiany dotyczą Claude Code metadata, nie runtime aplikacji)
- frontmatter check: PASS (`grep "^name:"` na wszystkich SKILL.md + agent .md → wszystkie OK)
- reference integrity: PASS (zero referencji do usuniętych `agent-browser`/`browser-tester`/`feature-tester-e2e` poza intencjonalnymi notatkami "replacement za...")
- counts: 24 skille (było 23 + 2 nowe − 1 usunięty), 16 agentów (było 17 − 2 usunięte + 1 nowy)
