---
title: Sleeper Web — PWA — kontekst implementacyjny
branch: feature/sleeper-web-pwa
ostatnia_aktualizacja: 2026-06-05 (Faza 1 ukończona)
---

# Sleeper Web — PWA — kontekst implementacyjny

**Branch:** `feature/sleeper-web-pwa`
**Ostatnia aktualizacja:** 2026-06-05 (Faza 1 ukończona)

## Status: Faza 1 ukończona (2026-06-05)

**IU1-IU4 wykonane:** bootstrap package + foundation lib + auth flow + theme system.

### Stan `packages/sleeper-web/` po Fazie 1

```
packages/sleeper-web/
├── package.json, app.json, babel.config.js, metro.config.js
├── tailwind.config.js, tsconfig.json, nativewind-env.d.ts, expo-env.d.ts
├── eslint.config.js, .env.example, .gitignore, vitest.config.mjs
└── src/
    ├── global.css
    ├── lib/
    │   ├── time.ts (DST-safe, kopia 1:1)
    │   ├── supabase.ts (kopia + detectSessionInUrl: true)
    │   ├── query-client.ts, colors.ts, child-age.ts, email.ts
    │   ├── postgres-errors.ts, extract-error-message.ts
    │   ├── session-gaps.ts ⚠️, sleep-stats.ts ⚠️ (TS errors deferred do IU5)
    │   ├── sleep-norms.ts, database.types.ts
    │   ├── useNow.ts, useNotificationDot.ts
    │   ├── notifications.ts (no-op mock — 5 eksportów: configureNotificationHandler, requestPermissions, cancelNapNotification, scheduleNapNotification, PermissionStatus type)
    │   └── __tests__/time.test.ts (14 tests, PASS)
    ├── features/
    │   ├── auth/
    │   │   ├── AuthProvider.tsx (kopia 1:1)
    │   │   └── translate-auth-error.ts (kopia 1:1)
    │   └── settings/
    │       ├── ThemeProvider.tsx (kopia 1:1 — useEffectiveTheme + jedyne raw useColorScheme)
    │       ├── useThemeStore.ts (kopia 1:1, Zustand persist)
    │       └── ThemeModeBottomSheet.tsx (kopia 1:1, RN Modal działa na web)
    └── app/
        ├── _layout.tsx — Provider chain: SafeAreaProvider → QueryClientProvider → AuthProvider → ThemeProvider → Stack + StatusBar
        ├── index.tsx (placeholder "Sleeper Web — Coming soon")
        └── (auth)/
            ├── _layout.tsx (Stack screenOptions headerShown: false)
            ├── sign-in.tsx (kopia 1:1)
            └── sign-up.tsx (kopia 1:1)
```

### Faza 1 — decyzje implementacyjne

- **Native deps wykluczone z `package.json`** (per kontekst sekcja "Native-only deps WYKLUCZONE"). Zachowane wszystkie web-compatible per plan.
- **`detectSessionInUrl: true`** w `supabase.ts` — różnica vs sleeper-app (`false`). Powód: PKCE callback URL parsing w przeglądarce.
- **`notifications.ts` no-op mock** — 5 eksportów z signaturami 1:1 z sleeper-app, body puste. Pozwala IU5 skopiować `sessions/hooks.ts` bez modyfikacji importów.
- **`ThemeModeBottomSheet.tsx` kopia 1:1** (brak adaptacji) — komponent używa RN `Modal` + primitives, działa OOTB na web.
- **Provider chain:** `SafeAreaProvider → QueryClientProvider → AuthProvider → ThemeProvider → Stack`. Identyczna kolejność z sleeper-app. `configureNotificationHandler()` POMINIĘTE (web no-op).
- **`useEffectiveTheme()` pattern** zachowany — `grep useColorScheme packages/sleeper-web/src/` zwraca tylko `ThemeProvider.tsx` (krytyczne, learned pattern z `docs/solutions/ui-bugs/2026-05-28`).
- **`expo-env.d.ts`** gitignored (mirror sleeper-app) — Expo CLI regen przy pierwszym `start --web`. Lokalnie utworzony żeby `tsc` przeszło na świeżym kloncie.

### Faza 1 — znane TS errors (deferred do IU5)

```
src/lib/session-gaps.ts:1 — Cannot find module '@/features/sessions/hooks'
src/lib/sleep-stats.ts:4 — Cannot find module '@/features/sessions/hooks'
```

**Powód:** sleeper-app ma architectural smell — `lib/` importuje typ `SleepSession` z `features/sessions/hooks`. Kopia 1:1 zachowała ten dług. IU5 (skopiowanie features/sessions/) automatycznie rozwiąże.

**Decyzja:** akceptujemy te 2 errors do końca IU5. Zero ryzyka regresji w sleeper-app (potwierdzone `pnpm --filter sleeper-app exec tsc --noEmit` exit 0 po każdym IU).

### Faza 1 — System-Wide Test Check (sekcja 4.5)

1. **Typecheck bez nowych błędów:** ✅ (2 deferred z IU2 są jedyne, resolve w IU5)
2. **Istniejące testy przechodzą:** ✅ (`time.test.ts` 14/14 PASS w sleeper-web)
3. **Nowe testy pokrywają happy path:** ✅ (kopia testów `time.test.ts`; auth/theme nie mają unit testów ani w sleeper-app — parytet)
4. **Nowe importy nie łamią modułów:** ✅ (sleeper-app regression check PASS po każdym IU)
5. **Build przechodzi:** N/A — `expo export --platform web` nie był uruchamiany (IU12). Tsc + lint przechodzą.

---

## Część referencyjna (oryginalna treść)

## Powiązane pliki

### Referencja: pliki do skopiowania z sleeper-app

**Foundation (`packages/sleeper-app/src/lib/`):**
- `time.ts` — DST-safe time helpers (krytyczne, kopia 1:1)
- `supabase.ts` — modyfikacja: `detectSessionInUrl: true` (web flow)
- `query-client.ts`, `colors.ts`, `child-age.ts`, `email.ts`, `postgres-errors.ts`, `extract-error-message.ts`, `session-gaps.ts`, `sleep-norms.ts`, `sleep-stats.ts`, `database.types.ts`, `useNow.ts`, `useNotificationDot.ts` — kopia 1:1
- `notifications.ts` — **NIE kopiować, zastąpić no-op mockiem** w sleeper-web

**Auth (`packages/sleeper-app/src/features/auth/`):**
- `AuthProvider.tsx` — kopia 1:1, działa identycznie na web
- `translate-auth-error.ts` — kopia 1:1

**Sessions (`packages/sleeper-app/src/features/sessions/`):**
- `hooks.ts` — kopia 1:1 (9 hooks)
- `useRealtimeSessions.ts`, `useSessionTimer.ts`, `translate-session-error.ts` — kopia 1:1
- `schedule-nap-side-effects.ts` — **NIE kopiować, zastąpić no-op mockiem**

**Children/family (`packages/sleeper-app/src/features/children/`, `family/`):**
- Wszystkie pliki — kopia 1:1

**Recommendation (`packages/sleeper-app/src/features/recommendation/`):**
- `adapter.ts`, `useSleepRecommendation.ts`, `RecommendationCard.tsx` — kopia 1:1

**Settings (`packages/sleeper-app/src/features/settings/`):**
- `ThemeProvider.tsx`, `useThemeStore.ts` — kopia 1:1
- `ThemeModeBottomSheet.tsx` — kopia z adaptacją (bottom sheet → centered modal dla web)

**Components (`packages/sleeper-app/src/components/`):**
- `components/ui/` (Avatar, Badge, Card, IconButton, ProgressBar, ProgressBarStacked, ProgressRing, SegmentedControl, Switch) — kopia 1:1
- `ActiveWindowCard`, `BigActionButton`, `Chip`, `HomeHeader`, `QuickActions`, `SessionListItem`, `SleepInProgressCard`, `TodayStatsCard` — kopia 1:1
- `TimePickerField`, `DatePickerField` — **NIE kopiować, web implementation z HTML5 input**

**Routes (`packages/sleeper-app/src/app/`):**
- `_layout.tsx` — kopia z modyfikacją: usunąć `configureNotificationHandler()` call
- `(auth)/sign-in.tsx`, `(auth)/sign-up.tsx`, `(auth)/_layout.tsx` — kopia 1:1
- `(app)/index.tsx`, `history.tsx`, `profile.tsx`, `settings.tsx`, `stats.tsx`, `sleep-fullscreen.tsx` — kopia 1:1
- `(app)/child/[id].tsx`, `(app)/session/[id].tsx` — kopia 1:1
- `(app)/_layout.tsx` — kopia, sprawdzić Tabs na web

### Pliki do stworzenia od zera w sleeper-web

- `packages/sleeper-web/package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `tsconfig.json`, `nativewind-env.d.ts`, `expo-env.d.ts`, `eslint.config.js`, `.env.example`, `.gitignore`, `vitest.config.mjs`
- `packages/sleeper-web/src/global.css` (kopia ale w nowej lokalizacji)
- `packages/sleeper-web/src/lib/notifications.ts` (no-op mock)
- `packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` (no-op mock)
- `packages/sleeper-web/src/components/TimePickerField.tsx` (web HTML5 input)
- `packages/sleeper-web/src/components/DatePickerField.tsx` (web HTML5 input)
- `packages/sleeper-web/public/manifest.json` (PWA manifest)
- `packages/sleeper-web/public/sw.js` (Service Worker ~50 LOC)
- `packages/sleeper-web/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180×180)
- `packages/sleeper-web/public/favicon.png`
- `packages/sleeper-web/src/app/+html.tsx` (custom HTML wrapper z iOS meta tagi)
- `packages/sleeper-web/src/features/pwa/registerSW.ts` (SW registration)
- `packages/sleeper-web/vercel.json` (jeśli potrzeba SPA rewrites)
- `docs/runbook/sleeper-web-deploy.md` (deploy/rollback runbook)

### Pliki do modyfikacji poza sleeper-web

- `package.json` (root) — dodać skrypty `web:dev`, `web:build`, `web:typecheck`, `web:lint`
- `CLAUDE.md` (root) — sekcja "Layout repozytorium" dodać `packages/sleeper-web/`, sekcja "Walidacja" dodać komendy

**ZABRONIONE:** żadne modyfikacje w `packages/sleeper-app/**`.

## Decyzje techniczne

### Stack i izolacja
- **Stack:** Expo SDK 54 web-only — `react-native-web` jako backend RN→DOM, expo-router, metro bundler, NativeWind v4.
- **Izolacja:** osobny package `packages/sleeper-web/`, zero modyfikacji w `packages/sleeper-app/`.
- **Share kodu:** workspace deps dla `sleeper-machine`/`sleeper-machine-kotki`; logika domenowa kopiowana 1:1 (snapshot przy starcie, YAGNI dla shared lib).

### Hosting i deploy
- **Hosting:** Vercel (free hobby tier, najprostszy DX).
- **Vercel config:** Root Directory `packages/sleeper-web`, Build Command `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter sleeper-web build`, Output Directory `dist`.
- **Env vars w Vercel:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (te same co sleeper-app).
- **Auto-deploy:** każdy push na `main` triggeruje prod deploy (Vercel gh integration).

### PWA i Service Worker
- **Manifest:** standard `display: standalone`, theme_color `#208AEF`, background_color `#F5F0E8`, ikony 192/512/apple-touch-icon 180×180.
- **Service Worker:** manual ~50 LOC w `public/sw.js`. Cache-first dla static assets, network-first dla `/rest/v1/*`, `/auth/v1/*`, `/realtime/v1/*`. Wersjonowanie: hardcoded `sleeper-shell-v{N}` bumped manual przy deploy.
- **iOS meta tagi w `+html.tsx`:** `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-touch-icon`, `viewport-fit=cover`, `theme-color`.

### Auth
- **Email + password** (Supabase `signInWithPassword`) — identyczny flow z sleeper-app.
- **`detectSessionInUrl: true`** w sleeper-web (różnica vs mobile `false`) — dla magic link / password reset future use.

### TimePicker / DatePicker
- **HTML5 `<input type="time">` / `<input type="date">`** wrapped w React component z Tailwind styling.
- iOS Safari pokazuje natywny wheel picker dla `time` — rozwiązuje wzorzec z mobile fix (`docs/active/fixy-edycja-aktywnosc-smart-start/`).
- Font-size ≥ 16px (Tailwind `text-base`) — zapobiega auto-zoom przy focusie.

### Side effects (notifications)
- **No-op mock** w `sleeper-web/src/lib/notifications.ts` i `sleeper-web/src/features/sessions/schedule-nap-side-effects.ts`.
- Zachować identyczne signatures eksportów co sleeper-app — żeby skopiowany `sessions/hooks.ts` resolve bez zmian.
- Komentarz: "Web PWA — no-op (notifications wykluczone w scope)".

### Animacje
- **Reanimated 4** zostawić, animacje (scale 0.96 press, timer pulse) testować runtime na web.
- **Fallback** jeśli worklets nie działają: NativeWind `active:scale-95` / `animate-pulse` (czyste CSS).

### Theme
- **Tri-state** (System/Light/Dark) z Zustand persist via AsyncStorage (→ localStorage na web).
- **`useEffectiveTheme()`** w każdym theme-aware miejscu (krytyczne, patrz learned-patterns).
- `useColorScheme` z `react-native` na web → mapuje na CSS `prefers-color-scheme`.

## Zależności

### Workspace
- `sleeper-machine` (Galland) — `pnpm --filter sleeper-machine build` przed pierwszym `tsc` w sleeper-web
- `sleeper-machine-kotki` (Kotki Dwa) — j.w.

### Cross-package guarantee
- Schemat bazy Supabase stabilny — sleeper-web konsumuje istniejące tabele (children, sessions, etc.) i RLS policies bez migracji.

### Build order
1. `pnpm install` (root) — wykrywa nowy workspace member sleeper-web
2. `pnpm --filter sleeper-machine build` + `pnpm --filter sleeper-machine-kotki build` (workspace types resolve)
3. `pnpm --filter sleeper-web exec tsc --noEmit` — typecheck
4. `pnpm --filter sleeper-web build` — expo export → `dist/`
5. Vercel deploy z `dist/`

### Pre-build dependencies dla CI/Vercel
- `pnpm install --frozen-lockfile` z root
- `pnpm --filter sleeper-web build` z root

## Learned patterns relevantne dla tego zadania

- **TZ-safe time:** ZAWSZE przez `lib/time.ts` helpers, nigdy raw `setHours`/`new Date(y,m,d,h,m)`. Przenoszone przez kopię `time.ts` 1:1. (`docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md`)
- **Theme single source-of-truth:** `useEffectiveTheme()` zamiast raw `useColorScheme()`. Przenoszone przez kopię ThemeProvider. (`docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`)
- **Stabilny `queryKey`:** `dayKeyInAppTz()` zamiast `toISOString()` inline w queryKey. Przenoszone przez kopię `hooks.ts`. (`docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`)
- **Cross-day night sleep edit:** `endTime <= startTime` → `addDaysInAppTz(date, 1)`. Przenoszone przez kopię edit form. (`docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md`)
- **`hitSlop` vs padding:** na web `hitSlop` nie działa, używać `padding` lub min-height 44px. Adresowane w IU8 dla custom pickerów. (`docs/solutions/ui-bugs/2026-05-28-hitslop-vs-padding-for-touch-targets.md`)
- **Expo CLI per-package:** `pnpm --filter sleeper-web start --web`, NIGDY z roota. (`docs/solutions/build-errors/2026-05-29-expo-start-from-monorepo-root.md`)

## Native-only deps WYKLUCZONE z sleeper-web

NIE dodawać do `packages/sleeper-web/package.json`:
- `expo-haptics` (mobile native)
- `expo-glass-effect` (iOS native)
- `expo-notifications` (out of scope)
- `expo-keep-awake` (mobile native — opcjonalny progressive Web Wake Lock API jako post-MVP)
- `expo-symbols` (iOS native)
- `@react-native-community/datetimepicker` (brak web build — używamy HTML5)
- `expo-device` (mobile, można dodać tylko jeśli faktycznie używane)

## Otwarte pytania techniczne (deferred do implementacji)

- Czy Reanimated 4 worklets działają w SDK 54 web dla scale/pulse animacji
- iOS Safari PWA quirks runtime (safe-area, keyboard, gesture)
- Czy `react-native-safe-area-context` ma poprawny noop na web
- Czy `lucide-react-native` na web wymaga przełącznika na `lucide-react`
- Konkretna strategia precache SW (hash assets z `dist/`)
- Czy `Tabs` z expo-router na web renderuje poprawnie mobile-first layout

## Środowisko developerskie

- macOS Sequoia, zsh, pnpm
- Node ≥ 20 (Expo SDK 54 requirement)
- Safari iOS na iPhone — primary testing target
- Chrome desktop — Lighthouse PWA audit
- Safari Web Inspector — remote debugging PWA na iPhone (Mac → iPhone via cable)

## Źródła

- Requirements doc: `docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md`
- Plan techniczny: `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`
