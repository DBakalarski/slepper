# 440d5cc: feat(sleeper-web-pwa): bootstrap packages/sleeper-web/ — Expo SDK 54 web-only skeleton

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 1 — Bootstrap & Foundation, IU1

## Co zostalo zrobione
- Utworzono nowy package `packages/sleeper-web/` jako Expo SDK 54 web-only.
- Skopiowano wzorce konfiguracji z `packages/sleeper-app/` z deps zredukowanymi do web-compatible.
- Wykluczono native-only deps: `expo-haptics`, `expo-glass-effect`, `expo-notifications`, `expo-keep-awake`, `expo-symbols`, `expo-device`, `@react-native-community/datetimepicker`.
- Web-only `app.json`: `platforms: ["web"]`, `web.output: "static"`, `web.bundler: "metro"`, scheme `sleeperweb`, plugins: `expo-router`, `expo-font`, `expo-web-browser` (bez `expo-splash-screen` z mobile-specific configiem).
- Metro config monorepo-aware (kopia 1:1 z sleeper-app — watchFolders, disableHierarchicalLookup, NativeWind preset).
- Tailwind config: paleta kolorów 1:1 z sleeper-app (cream/navy/orange/purple + dark-bg/card/surface), darkMode 'class'.
- Placeholder ekran "Sleeper Web — Coming soon" w `src/app/index.tsx`, minimal layout z QueryClientProvider w `src/app/_layout.tsx` (Auth/Theme dojdą w IU3/IU4).
- Root `package.json`: dodano skrypty `web:dev`, `web:build`, `web:typecheck`, `web:lint`.

## Zmienione pliki
- `package.json` (root) — dodane 4 skrypty proxy do `pnpm --filter sleeper-web`.
- `pnpm-lock.yaml` — regen po dodaniu nowego packagu (deps reused, 0 downloaded).
- `packages/sleeper-web/package.json` — nowy, deps web-compatible mirror z sleeper-app.
- `packages/sleeper-web/app.json` — web-only config.
- `packages/sleeper-web/babel.config.js` — kopia z sleeper-app (preset-expo + nativewind jsxImportSource + nativewind/babel).
- `packages/sleeper-web/metro.config.js` — monorepo-aware + NativeWind preset, kopia z sleeper-app.
- `packages/sleeper-web/tailwind.config.js` — paleta sleeper 1:1, darkMode 'class', content lokalny.
- `packages/sleeper-web/tsconfig.json` — extends expo/tsconfig.base, strict ON, alias `@/*`.
- `packages/sleeper-web/nativewind-env.d.ts` — ambient typings dla `.css` i nativewind.
- `packages/sleeper-web/expo-env.d.ts` — placeholder (gitignored, expo regenuje).
- `packages/sleeper-web/eslint.config.js` — flat config z eslint-config-expo (kopia z sleeper-app).
- `packages/sleeper-web/.env.example` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `packages/sleeper-web/.gitignore` — mirror sleeper-app (bez `/ios`, `/android` — web-only nie generuje).
- `packages/sleeper-web/src/global.css` — kopia 1:1 z sleeper-app (Tailwind directives + CSS vars dla fontów).
- `packages/sleeper-web/src/app/_layout.tsx` — minimal: QueryClientProvider + Stack `headerShown: false` (bez AuthProvider/ThemeProvider — to IU3/IU4).
- `packages/sleeper-web/src/app/index.tsx` — placeholder `View` z dwoma `Text` ("Sleeper Web" + "Coming soon") z NativeWind tokenami.

## Powod / kontekst
IU1 z planu `docs/active/sleeper-web-pwa/sleeper-web-pwa-plan.md`. Cel: założenie szkieletu PWA do dystrybucji sleeper'a na iPhone bez Apple Developer license, bez ryzyka regresji w mobile sleeper-app (granica R1).

Brak odchyleń od planu. Decyzja inline: skrypt `start` z domyślnym `--web` flagą (`expo start --web`) zamiast samego `expo start` — sleeper-web jest web-only, więc i tak nie ma sensu odpalać native packagera; orchestrator wymienia explicit `--web` flag w root skrypcie `web:dev` co go duplikuje, ale jest bezpieczne (idempotent flag).

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit` exit 0)
- lint: PASS (`pnpm --filter sleeper-web lint` exit 0)
- pnpm install: PASS (reused 1196, downloaded 0)
- regression check sleeper-app: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` exit 0)
- runtime: nie weryfikowane on-device (placeholder screen, brak Auth/Theme — to IU3/IU4); `expo start --web` weryfikowane będzie po IU3 gdy ekran ma sens
