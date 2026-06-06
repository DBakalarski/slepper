---
title: "feat: Sleeper Web — PWA jako osobny package (Expo SDK 54 web-only)"
type: feat
status: active
date: 2026-06-05
origin: docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md
design_md: null
figma_spec: null
figma_screens: {}
---

# feat: Sleeper Web — PWA jako osobny package (Expo SDK 54 web-only)

## Przegląd

Tworzymy nowy package `packages/sleeper-web/` jako Expo SDK 54 web-only PWA z portem feature'ów sleeper-app (start/stop sesji, pełna edycja historii, algorytmy Galland/Kotki + rekomendacje). PWA współdzieli bazę Supabase z sleeper-app — cross-device sync między mobile (Expo Go) i web (PWA na iPhone Safari) działa identycznie jak obecny sync między dwoma telefonami.

**Cel biznesowy:** dystrybucja sleeper'a na iPhone'y bez Apple Developer license ($99/rok) — user + partner instalują PWA przez Safari → "Add to Home Screen".

**Cel architektoniczny:** pełna izolacja od `packages/sleeper-app/` — zero modyfikacji w mobile, żeby wyeliminować ryzyko regresji. Logika domenowa kopiowana 1:1, algorytmy konsumowane przez workspace deps.

## Ujęcie problemu

Sleeper-app działa w Expo Go i jest używany przez user'a + partnera na iPhone'ach. Dystrybucja poza Expo Go wymaga Apple Dev license (~400zł/rok) i App Store/TestFlight friction. Expo Go ma 30-dniowe builds i wymaga dev serwera. PWA omija oba problemy — instalacja przez Safari "Add to Home Screen" + auto-update przez Service Worker. Trade-off: brak push notifications i background tasks na iOS Safari (świadomie wykluczone, patrz Granice scope'u).

*(zob. źródło: docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md)*

## Śledzenie wymagań

- R1. Nowy package `packages/sleeper-web/` jako Expo SDK 54 web-only target. Zero modyfikacji w `packages/sleeper-app/`.
- R2. PWA współdzieli tę samą bazę Supabase — cross-device sync between mobile i web działa via Supabase Realtime (WebSocket).
- R3. Feature: start/stop sesji + lista historii.
- R4. Feature: pełna edycja historii (czas start/end picker, typ sesji, cross-day night sleeps via `addDaysInAppTz`).
- R5. Feature: algorytmy `sleeper-machine` (Galland) + `sleeper-machine-kotki` + smart-start rekomendacje per `children.algorithm`.
- R6. Model danych identyczny z sleeper-app (te same tabele, RLS).
- R7. Instalowalność PWA: manifest, service worker (cache shell + offline fallback), ikony, iOS meta tagi.
- R8. Auth: zgodny z sleeper-app (email + password Supabase `signInWithPassword`).
- R9. Strefa czasowa: `Europe/Warsaw` w UI, UTC w bazie — helpery `lib/time.ts` kopiowane 1:1.
- R10. UX: mobile-first (PWA głównie na iPhone Safari po "Add to Home Screen").

## Granice scope'u

- **Brak push notifications.** iOS Safari PWA wymaga skomplikowanego Web Push setup, niska niezawodność. Wykluczone.
- **Brak działania w tle.** Timer to derived state z bazy (`start_at` + `setInterval` w UI) — działa OOTB bez background tasks.
- **Brak desktop-first UX.** Mobile-first wystarczy, telefon-podobny widok na laptopie akceptowalny.
- **Brak shared lib package na start.** Logika domenowa kopiowana z sleeper-app. Wydzielenie do `packages/sleeper-shared/` odroczone (YAGNI).
- **Brak modyfikacji w sleeper-app.** Twarda granica.
- **Brak SSR / SEO.** Authenticated app, hosting = static + client-side routing.
- **Brak Next.js / innego frameworka.** Expo SDK 54 web-only.
- **Brak refactoru shared lib w sleeper-app.** Side-effects notifications (`schedule-nap-side-effects.ts`) w sleeper-web będą mockowane jako no-op, nie wydzielane.
- **Brak migracji bazy.** Schemat children/sessions stabilny, sleeper-web konsumuje istniejący.

## Kontekst i research

### Relevantny kod i wzorce

- `packages/sleeper-app/package.json` — referencja deps Expo SDK 54 (web-compatible vs native-only). `react-native-web ~0.21.0` już jest w deps.
- `packages/sleeper-app/app.json` — wzorzec `web.output: "static"` (linia 23-26) do skopiowania.
- `packages/sleeper-app/metro.config.js` — monorepo-aware config (watchFolders, disableHierarchicalLookup, NativeWind preset).
- `packages/sleeper-app/babel.config.js`, `tsconfig.json`, `tailwind.config.js`, `nativewind-env.d.ts` — do skopiowania jako baseline.
- `packages/sleeper-app/src/lib/supabase.ts` — supabase client; **modyfikacja w web: `detectSessionInUrl: true`** (dla magic link/reset password flow).
- `packages/sleeper-app/src/lib/time.ts` — DST-safe helpers (`combineDateAndTimeInAppTz`, `dayKeyInAppTz`, `parseAppTzDateTime`, `addDaysInAppTz`, `startOfDayInAppTz`). Kopia 1:1.
- `packages/sleeper-app/src/features/auth/AuthProvider.tsx` — Supabase auth state machine (`loading` → `signed_in`/`signed_out`). Kopia 1:1.
- `packages/sleeper-app/src/app/(auth)/sign-in.tsx`, `sign-up.tsx` — email/password form (Supabase `signInWithPassword`). Kopia z drobnym adaptacją (SafeAreaView → View dla web jeśli safe-area-context nie działa).
- `packages/sleeper-app/src/features/sessions/hooks.ts` — 9 hooks (queries + mutations + optimistic updates). Kopia 1:1, side effects do mockowania.
- `packages/sleeper-app/src/features/sessions/useRealtimeSessions.ts` — Supabase Realtime subscription (WebSocket). Działa na web OOTB.
- `packages/sleeper-app/src/features/sessions/useSessionTimer.ts` — derived timer state. Kopia 1:1.
- `packages/sleeper-app/src/features/sessions/schedule-nap-side-effects.ts` — **NIE kopiujemy**; zamiast tego mock w `sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` = no-op (PWA nie ma push notif).
- `packages/sleeper-app/src/features/recommendation/adapter.ts`, `useSleepRecommendation.ts` — adapter app types ↔ sleeper-machine, hook do rekomendacji. Kopia 1:1.
- `packages/sleeper-app/src/features/children/`, `family/`, `settings/` — kopia 1:1 z adaptacją importów.
- `packages/sleeper-app/src/components/` + `components/ui/` — 9 base UI components + feature components. Kopia 1:1, TimePickerField/DatePickerField wymagają web fallback.
- `packages/sleeper-app/src/app/_layout.tsx`, `(auth)/_layout.tsx`, `(app)/_layout.tsx`, oraz wszystkie screens — kopia 1:1.

### Wiedza instytucjonalna

- `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md` — TZ-safe konwersje wyłącznie przez `lib/time.ts` helpers. Krytyczne dla R9.
- `docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md` — `endTime <= startTime` → `addDaysInAppTz(date, 1)` dla cross-day night sleeps. Krytyczne dla R4.
- `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md` — `useEffectiveTheme()` w każdym theme-aware miejscu (nie raw `useColorScheme()`). Krytyczne przy kopiowaniu ThemeProvider.
- `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md` — stabilny `queryKey` przez `dayKeyInAppTz` (nie `toISOString()`). Już zastosowane w `hooks.ts` — przeniesie się przy kopiowaniu.
- `docs/solutions/build-errors/2026-05-29-expo-start-from-monorepo-root.md` — `expo start` ZAWSZE per-package, NIGDY z roota. Stosuje się też do sleeper-web: `pnpm --filter sleeper-web start --web`.
- `docs/active/fixy-edycja-aktywnosc-smart-start/` — kontekst dla TimePicker wzorca (iOS minute scroll fix był recent). Web używa HTML5 `<input type="time">` — Safari iOS pokazuje native wheel picker, działa OOTB.

### Referencje zewnętrzne

- Expo Web docs (SDK 54): https://docs.expo.dev/versions/v54.0.0/ — sekcje web, static rendering, expo-router web
- Expo static rendering: `expo export --platform web --output-dir dist` produkuje static SPA
- PWA manifest spec: https://developer.mozilla.org/en-US/docs/Web/Manifest
- iOS Safari PWA meta tagi: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` (180×180)
- Service Worker minimum (cache-first dla shell, network-first dla `/rest/v1/*` i `/auth/v1/*`)

## Kluczowe decyzje techniczne

- **Hosting: Vercel** — najprostszy DX dla static SPA, free hobby tier wystarczy, env vars w UI, deploy z git push. Cloudflare Pages jako alternatywa jeśli koszty/quota kiedyś będą problemem. Decyzja podejmowana w IU12.
- **Service Worker: minimalny manual SW** (bez Workbox) — precache app shell (HTML/JS/CSS bundles), network-first dla Supabase API (`/rest/v1/*`, `/auth/v1/*`, `/realtime/v1/*`). Powód: Workbox to extra dep + complexity, minimal SW (~50 LOC) wystarczy dla MVP. Upgrade do Workbox jako późniejsza optymalizacja.
- **TimePicker/DatePicker na web: HTML5 `<input type="time">` / `<input type="date">`** wrapped w React component z Tailwind styling. Safari iOS pokazuje natywny wheel picker (rozwiązuje wzorzec z mobile fix). Brak custom date picker library — eliminacja dep.
- **Auth flow: identyczny z sleeper-app** — `supabase.auth.signInWithPassword({ email, password })`. ZERO OAuth complexity. Plus: `detectSessionInUrl: true` na web (różnica vs mobile) — dla potencjalnego magic link/password reset flow.
- **Strategia share kodu:** kopiowanie 1:1 z sleeper-app (snapshot przy starcie projektu). YAGNI dla `packages/sleeper-shared/`. Sync ręczny przy zmianach domeny — akceptowane 2× pracy per feature jako trade-off za izolację (zgodnie z requirements doc).
- **Side effects (notifications): no-op mock** — `sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` eksportuje funkcje o tej samej sygnaturze co sleeper-app, ale puste body. Powód: zachowanie shape import'ów w skopiowanym `hooks.ts` bez modyfikacji + brak push notif jako świadome wykluczenie scope'u.
- **NativeWind v4 + Tailwind 3.4 na web:** używamy istniejącego presetu (`nativewind/preset`) — działa na web via CSS variables. `tailwind.config.js` skopiowany 1:1.
- **`react-native-web ~0.21.0`** jako backend RN → DOM. Już w sleeper-app deps, kopia do sleeper-web bez zmian wersji.
- **Native-only deps wykluczone z sleeper-web:** `expo-haptics`, `expo-glass-effect`, `expo-notifications`, `expo-keep-awake`, `expo-symbols`, `@react-native-community/datetimepicker`. Komponenty używające ich (np. fragmenty z haptic feedback) — usunąć w kopii lub zastąpić no-op.
- **`react-native-screens`, `react-native-gesture-handler`** — pozostawić (web fallback OK w expo-router 6), zminimalizować użycie gestów.
- **`react-native-reanimated 4`** — pozostawić, animacje (scale 0.96 on press, timer pulse) działają na web w SDK 54. Jeśli któryś worklet sprawia problem na web — fallback CSS animation in-place.
- **Build pipeline:** `pnpm --filter sleeper-web build` → `expo export --platform web --output-dir dist`. Vercel buduje przez ten skrypt + output dir = `dist`.
- **PWA manifest umieszczony w `public/manifest.json`** — Expo SDK 54 web static rendering kopiuje zawartość `public/` do `dist/` przy build. Service worker `public/sw.js` rejestrowany w `_layout.tsx` (root) przez `if (typeof window !== 'undefined' && 'serviceWorker' in navigator)`.

## Otwarte pytania

### Rozwiązane podczas planowania

- **Auth provider w sleeper-app?** Email + password (Supabase `signInWithPassword`). Web flow identyczny.
- **Strategia share kodu?** Kopiowanie 1:1, brak shared lib (YAGNI). Sync ręczny.
- **Service Worker stack?** Minimalny manual SW (~50 LOC) zamiast Workbox.
- **Hosting?** Vercel (free hobby, najprostszy DX).
- **TimePicker na web?** HTML5 `<input type="time">` + Tailwind wrapper.
- **DESIGN.md / Figma?** Skip — PWA jako port 1:1 sleeper-app (tailwind.config.js + komponenty = source of truth).
- **Supabase realtime na web?** Działa OOTB (WebSocket standard, nie wymaga polyfilli).
- **Native-only deps?** Wykluczone z sleeper-web/package.json (lista w "Kluczowe decyzje techniczne").

### Odroczone do implementacji

- **`react-native-reanimated 4` worklets na web — które konkretnie działają w SDK 54 web?** Sprawdzić przy IU8/IU10 (timer pulse, scale 0.96). Jeśli problem — CSS animation fallback in-place.
- **iOS Safari PWA quirks runtime:** `safe-area-inset` (notch handling), keyboard handling (`visualViewport`), gesture handling (Safari swipe back), input zoom prevention (`font-size: 16px` na inputs). Adresowane przy IU11 (PWA shell).
- **Vercel env vars setup** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — konkretne kroki przy IU12.
- **Service Worker precache strategy** — czy precache JS/CSS bundles (zalety: offline shell, wada: complexity przy hash'owanych nazwach plików). Zaczynamy minimalnie (HTML + manifest), Expo `dist/` ma asset-manifest który można sparsować runtime.
- **Czy `react-native-safe-area-context` działa na web?** Powinno (provider noop, `useSafeAreaInsets` zwraca zera). Sprawdzić przy IU3 (Auth screen z SafeAreaView).
- **lucide-react-native na web** — wymaga `react-native-svg` na web (też w deps). Sprawdzić runtime przy IU8.
- **Theme persistence przez AsyncStorage na web** — `@react-native-async-storage/async-storage` ma web fallback do `localStorage`. Sprawdzić runtime przy IU4.
- **Krzyż-platformowy `useColorScheme` na web** — react-native-web ma implementację dla `prefers-color-scheme`. Adresowane w IU4 (ThemeProvider).
- **expo-router web routing** — czy `(auth)`/`(app)` groups działają identycznie na web jako URL paths. Sprawdzić przy IU9/IU10.

## Implementation Units

- [ ] **Unit 1: Bootstrap package skeleton `packages/sleeper-web/`**

**Cel:** Stworzyć Expo SDK 54 web-only package z minimalnym szkieletem (config files + pusty entry point). Po tym IU `pnpm --filter sleeper-web start --web` uruchamia metro web na localhost.

**Wymagania:** R1, R10

**Zależności:** Brak

**Pliki:**
- Stwórz: `packages/sleeper-web/package.json`
- Stwórz: `packages/sleeper-web/app.json` (web-only platforms, output: "static")
- Stwórz: `packages/sleeper-web/babel.config.js`
- Stwórz: `packages/sleeper-web/metro.config.js` (monorepo-aware, mirror sleeper-app)
- Stwórz: `packages/sleeper-web/tailwind.config.js` (kopia z sleeper-app)
- Stwórz: `packages/sleeper-web/tsconfig.json` (extends expo/tsconfig.base, alias `@/*` → `./src/*`)
- Stwórz: `packages/sleeper-web/nativewind-env.d.ts`
- Stwórz: `packages/sleeper-web/expo-env.d.ts`
- Stwórz: `packages/sleeper-web/eslint.config.js`
- Stwórz: `packages/sleeper-web/.env.example` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Stwórz: `packages/sleeper-web/.gitignore`
- Stwórz: `packages/sleeper-web/src/global.css` (kopia z sleeper-app)
- Stwórz: `packages/sleeper-web/src/app/_layout.tsx` (minimal: pusty `<Stack />` w Providers stub)
- Stwórz: `packages/sleeper-web/src/app/index.tsx` (placeholder "Sleeper Web — coming soon")
- Modyfikuj: `package.json` (root) — dodaj skrypty `web:dev`, `web:build`, `web:typecheck`, `web:lint`

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Mirror struktura z `packages/sleeper-app/`, usuń native-only deps z `package.json`. Lista deps do pominięcia: `expo-haptics`, `expo-glass-effect`, `expo-notifications`, `expo-keep-awake`, `expo-symbols`, `@react-native-community/datetimepicker`, `@types/react` only as devDep.
- Lista deps do zostawienia: `expo`, `expo-router`, `expo-status-bar`, `expo-linking`, `expo-constants`, `expo-font`, `expo-splash-screen`, `expo-web-browser`, `expo-image`, `react`, `react-dom`, `react-native`, `react-native-web`, `nativewind`, `tailwindcss`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `date-fns`, `date-fns-tz`, `react-native-safe-area-context`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`, `react-native-screens`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-svg`, `lucide-react-native`, `sleeper-machine: workspace:*`, `sleeper-machine-kotki: workspace:*`.
- `app.json`: `platforms: ["web"]` (NIE iOS/android), `web.output: "static"`, `scheme: "sleeperweb"`, `slug: "sleeper-web"`, `name: "Sleeper"` (skrót dla iOS home screen).
- `metro.config.js`: kopia z sleeper-app (watchFolders, disableHierarchicalLookup, NativeWind).
- `tailwind.config.js`: kopia 1:1, content path zmieniony na lokalny `./src/**/*.{js,jsx,ts,tsx}`.
- `pnpm install` w roocie wykrywa nowy workspace member (pnpm-workspace.yaml ma `packages/*`).

**Wzorce do naśladowania:**
- `packages/sleeper-app/package.json`
- `packages/sleeper-app/app.json`
- `packages/sleeper-app/metro.config.js`
- `packages/sleeper-app/tailwind.config.js`
- `packages/sleeper-app/tsconfig.json`

**Scenariusze testowe:**
- [Unit] `pnpm install` w roocie kończy się sukcesem, sleeper-web pojawia się w `pnpm list -r --depth=0`.
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi bez błędów (alias `@/*` resolves, brak missing deps).
- [Unit] `pnpm --filter sleeper-web lint` przechodzi.
- [Manual-mobile] `pnpm --filter sleeper-web start --web` → metro bundler uruchamia się, otwiera `http://localhost:8081` → placeholder "Sleeper Web — coming soon" widoczny w Safari iOS na localhost (tunnel przez Expo CLI lub LAN IP).
- [Manual-mobile] Mobile `pnpm app:dev` nadal działa, brak regresji w sleeper-app (smoke test).

**Weryfikacja:**
- `pnpm install` exit code 0
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- `pnpm --filter sleeper-web lint` exit code 0
- `pnpm --filter sleeper-app exec tsc --noEmit` exit code 0 (regression check)
- Mobile-manual: localhost web renderuje placeholder — manual test (patrz manual-test-IU1.md)
- Mobile-manual: sleeper-app w Expo Go pokazuje home screen jak przed zmianą — manual test

**Operator checklist:**
- [ ] User uruchamia `pnpm --filter sleeper-web start --web` i potwierdza że localhost otwiera placeholder w przeglądarce.

---

- [ ] **Unit 2: Foundation — lib/ helpers (time, supabase, query-client, error utils)**

**Cel:** Skopiować całą warstwę `src/lib/` z sleeper-app, z modyfikacją `supabase.ts` (`detectSessionInUrl: true`) i zastąpieniem `notifications.ts` no-op mockiem.

**Wymagania:** R2, R6, R9

**Zależności:** Unit 1

**Pliki:**
- Stwórz: `packages/sleeper-web/src/lib/time.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/supabase.ts` (kopia + `detectSessionInUrl: true`)
- Stwórz: `packages/sleeper-web/src/lib/query-client.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/colors.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/child-age.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/email.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/postgres-errors.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/extract-error-message.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/session-gaps.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/sleep-norms.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/sleep-stats.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/database.types.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/useNow.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/lib/useNotificationDot.ts` (kopia 1:1, ale wewnątrz no-op gdy notifications nieaktywne)
- Stwórz: `packages/sleeper-web/src/lib/notifications.ts` (**NEW — no-op web mock**: `configureNotificationHandler` = noop, `scheduleNapNotification` = noop returning resolved promise, `cancelNapNotification` = noop, eksportuje te same signatures co sleeper-app)
- Stwórz: `packages/sleeper-web/src/lib/__tests__/time.test.ts` (kopia 1:1, jeśli istnieje w sleeper-app)
- Stwórz: `packages/sleeper-web/vitest.config.mjs` (kopia z sleeper-app)

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Kopia 1:1 plików z `packages/sleeper-app/src/lib/`, jeden po drugim. Sprawdzić alias `@/*` resolves po imporcie.
- W `supabase.ts`: jedyna zmiana — `detectSessionInUrl: true` zamiast `false`. Powód: na web musi parsować `#access_token=...` z URL dla magic link / OAuth redirect (na przyszłość) / password reset.
- `notifications.ts` — kompletnie inny plik. Zachować dokładnie te same eksporty (`configureNotificationHandler`, `scheduleNapNotification`, `cancelNapNotification`) z pustym body. Komentarz wyjaśniający: "Web PWA — no-op mock (notifications wykluczone w scope, patrz docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md)".
- Testy `__tests__/`: kopia 1:1, vitest config zaadaptowany.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/lib/` — wszystkie pliki
- `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md` — zachowane przez kopiowanie 1:1 `time.ts`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web test` przechodzi (time, sleep-stats, session-gaps).
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi (typy `Database` resolve, alias działa).
- [Unit] `supabase.ts` eksportuje skonfigurowany client z `detectSessionInUrl: true` (grep test).
- [Unit] `notifications.ts` eksportuje wszystkie 3 funkcje jako no-op (grep test).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- `pnpm --filter sleeper-web test` exit code 0
- `grep -l "detectSessionInUrl: true" packages/sleeper-web/src/lib/supabase.ts` zwraca match
- `grep -L "expo-notifications" packages/sleeper-web/src/lib/notifications.ts` zwraca match (NIE zawiera importu)

---

- [ ] **Unit 3: Auth flow (AuthProvider + sign-in + sign-up)**

**Cel:** Skopiować Supabase auth state machine i ekrany logowania/rejestracji. Po tym IU user może się zalogować w PWA tym samym kontem co w sleeper-app.

**Wymagania:** R8

**Zależności:** Unit 2

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/auth/AuthProvider.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/auth/translate-auth-error.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(auth)/_layout.tsx` (kopia 1:1, screenOptions: headerShown: false)
- Stwórz: `packages/sleeper-web/src/app/(auth)/sign-in.tsx` (kopia z weryfikacją SafeAreaView na web)
- Stwórz: `packages/sleeper-web/src/app/(auth)/sign-up.tsx` (kopia)
- Modyfikuj: `packages/sleeper-web/src/app/_layout.tsx` (dodaj `<AuthProvider>` wrapper między QueryClientProvider a Stack)

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- AuthProvider: kopia 1:1, działa identycznie (`supabase.auth.getSession()`, `onAuthStateChange`).
- sign-in/sign-up: kopia 1:1; `SafeAreaView` z `react-native-safe-area-context` ma web fallback (provider noop) — działa OOTB.
- `KeyboardAvoidingView` na web jest no-op — to OK, web ma natywne keyboard handling.
- iOS Safari quirk: `font-size: 16px` minimum na inputs prevenuje auto-zoom przy focusie. Tailwind klasy używają `text-base` (16px) — bez zmian potrzebnych.
- `_layout.tsx` (root) progresywnie rozbudowywany — w tym IU dodajemy AuthProvider, w IU4 ThemeProvider.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/features/auth/AuthProvider.tsx`
- `packages/sleeper-app/src/app/(auth)/sign-in.tsx`
- `packages/sleeper-app/src/app/(auth)/sign-up.tsx`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Manual-mobile] PWA otwarta w Safari → ekran sign-in renderuje się z placeholderem email/hasło, klawiatura otwiera się bez auto-zoom (font-size ≥ 16px).
- [Manual-mobile] Logowanie tym samym kontem co w sleeper-app (Expo Go) → przekierowanie na `/` (placeholder strona main).
- [Manual-mobile] Po reloadzie strony → user nadal zalogowany (persist w localStorage via AsyncStorage adapter).
- [Manual-mobile] Sign-out → przekierowanie na `(auth)/sign-in`.
- [Manual-mobile] Cross-device: zaloguj w PWA → otwórz sleeper-app na drugim telefonie → ta sama sesja widoczna (sync via Supabase).
- [Manual-mobile] Zalogowany w Expo Go → otwórz PWA → sign-in screen (separate session na innym urządzeniu OK, ale to ten sam user).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- Mobile-manual: logowanie istniejącym kontem działa — manual test (patrz manual-test-IU3.md)
- Mobile-manual: persist po reload — manual test
- Mobile-manual: sign-out + ponowne sign-in — manual test

**Operator checklist:**
- [ ] User loguje się w PWA tym samym kontem co w sleeper-app, potwierdza że auth state = signed_in.
- [ ] User reload strony, potwierdza że sesja persistuje.

---

- [ ] **Unit 4: Theme system (ThemeProvider + useThemeStore)**

**Cel:** Skopiować tri-state theme (System/Light/Dark) z `useEffectiveTheme()` hookiem. Po tym IU PWA respektuje wybór trybu jasny/ciemny + system default.

**Wymagania:** R10

**Zależności:** Unit 2

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/settings/ThemeProvider.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/settings/useThemeStore.ts` (kopia 1:1 — Zustand persist z AsyncStorage)
- Stwórz: `packages/sleeper-web/src/features/settings/ThemeModeBottomSheet.tsx` (kopia z adaptacją — bottom sheet zastąpiony prostym modal/dialog dla web)
- Modyfikuj: `packages/sleeper-web/src/app/_layout.tsx` (dodaj `<ThemeProvider>` wrapper między AuthProvider a Stack)

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, figma:figma-use, figma:figma-implement-design

**Podejście:**
- ThemeProvider używa `useColorScheme` z `react-native` — w `react-native-web` to mapuje na CSS `prefers-color-scheme` (działa OOTB).
- `useEffectiveTheme()` musi być eksportowany i używany WSZĘDZIE gdzie potrzebny color — krytyczne, patrz `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`.
- AsyncStorage na web: `@react-native-async-storage/async-storage` ma web fallback do `localStorage` — Zustand persist działa OOTB.
- Bottom sheet w web: zamiast `@gorhom/bottom-sheet` (nie ma) lub native sheet, prosty centered modal z `<View>` + `Pressable` overlay. Adaptacja w `ThemeModeBottomSheet.tsx`.
- `<StatusBar>` z `expo-status-bar`: na web no-op, bezpieczne zostawić.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/features/settings/ThemeProvider.tsx`
- `packages/sleeper-app/src/features/settings/useThemeStore.ts`
- `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Manual-mobile] Default (System) — PWA respektuje iOS dark/light mode (Settings → Display → Dark).
- [Manual-mobile] Manual override Dark — interfejs przełącza się na dark variant niezależnie od iOS settings.
- [Manual-mobile] Reload strony — wybór trybu persistuje (localStorage).
- [Manual-mobile] Zmiana w iOS settings (Dark → Light) z PWA otwartą → interfejs reaguje natychmiast jeśli theme = System.

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- Mobile-manual: dark/light/system mode działa — manual test (patrz manual-test-IU4.md)

---

- [ ] **Unit 5: Sessions data layer (hooks + realtime + timer)**

**Cel:** Skopiować wszystkie hooks sesji (queries + mutations) + Supabase Realtime + derived timer. Po tym IU PWA może czytać i mutować sesje z cross-device sync.

**Wymagania:** R2, R3, R4, R9

**Zależności:** Unit 2, Unit 3

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/sessions/hooks.ts` (kopia 1:1 — wszystkie 9 hooks)
- Stwórz: `packages/sleeper-web/src/features/sessions/useRealtimeSessions.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/sessions/useSessionTimer.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/sessions/translate-session-error.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` (**NEW — no-op mock** eksportujący `rescheduleNapNotification`, `cancelNapNotificationSafe`, `rescheduleFromLastEnded` jako resolved promises bez side effects)
- Stwórz: `packages/sleeper-web/src/features/sessions/components/` (folder pusty na razie — components w IU8)

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `hooks.ts`: kopia 1:1. Importy `schedule-nap-side-effects` resolve do no-op mocku — `useStartSession`/`useEndSession`/`useUpdateSession`/`useDeleteSession` wywołują funkcje, te nic nie robią, mutacje nadal się powodzą.
- `useRealtimeSessions.ts`: kopia 1:1. Supabase Realtime via WebSocket działa na web bez polyfilli. `queryClient.invalidateQueries(['sessions'])` pattern przeniesiony bez zmian.
- `useSessionTimer.ts`: kopia 1:1. `useNow` (1s tick) + derived state z `start_at`.
- Stabilny `queryKey` przez `dayKeyInAppTz` (nie `toISOString()`) — przeniesione automatycznie przez kopiowanie.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/features/sessions/hooks.ts`
- `packages/sleeper-app/src/features/sessions/useRealtimeSessions.ts`
- `packages/sleeper-app/src/features/sessions/useSessionTimer.ts`
- `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Unit] Wszystkie hooks eksportowane: `useSessions`, `useSessionById`, `useActiveSession`, `useLastEndedSession`, `useStartSession`, `useEndSession`, `useUpdateSession`, `useDeleteSession`, `useInsertBackdatedSession`.
- [Unit] `schedule-nap-side-effects.ts` nie importuje `expo-notifications` (grep test).
- [Manual-mobile] (Po IU10) Start sesji w PWA → optimistic update widoczny, po response Supabase potwierdzony. Druga osoba w sleeper-app widzi aktywną sesję przez Realtime.

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- `grep -c "expo-notifications" packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` zwraca 0

---

- [ ] **Unit 6: Children + family data layer**

**Cel:** Skopiować hooks dzieci i rodzin (queries + mutations + `useActiveChild`). Po tym IU PWA może czytać listę dzieci i wybrać aktywne.

**Wymagania:** R5, R6

**Zależności:** Unit 2, Unit 3

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/children/hooks.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/children/useActiveChild.ts` (kopia 1:1 — Zustand store)
- Stwórz: `packages/sleeper-web/src/features/children/components/` (folder pusty na razie — components w IU8)
- Stwórz: `packages/sleeper-web/src/features/family/hooks.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/family/translate-family-error.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/family/components/` (folder pusty na razie)

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Kopia 1:1 wszystkich plików.
- `useActiveChild` to Zustand store (persist via AsyncStorage → localStorage na web) — działa OOTB.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/features/children/hooks.ts`
- `packages/sleeper-app/src/features/children/useActiveChild.ts`
- `packages/sleeper-app/src/features/family/hooks.ts`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Unit] Eksportowane hooks: `useChildren`, `useChildById`, `useCreateChild`, `useUpdateChild`, `useDeleteChild`, `useActiveChild`, family hooks (`useFamily`, `useMembers`, etc.).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0

---

- [ ] **Unit 7: Recommendation data + algorytm wiring**

**Cel:** Skopiować adapter i hook rekomendacji. Po tym IU PWA może liczyć smart-start rekomendacje przez algorytmy `sleeper-machine` (Galland) i `sleeper-machine-kotki`.

**Wymagania:** R5, R6

**Zależności:** Unit 2, Unit 5, Unit 6

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/recommendation/adapter.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` (kopia, sprawdzić ikony lucide-react-native na web)

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Adapter konsumuje `sleeper-machine` i `sleeper-machine-kotki` przez workspace deps — działa OOTB.
- `useSleepRecommendation` wybiera algorytm na podstawie `children.algorithm` ('galland' | 'kotki_dwa').
- `RecommendationCard` — UI component, kopia z drobnym dostosowaniem jeśli używa native-only props (raczej nie).

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/features/recommendation/adapter.ts`
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi (workspace deps `sleeper-machine`, `sleeper-machine-kotki` resolve).
- [Unit] `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build` produkują `dist/` — sleeper-web konsumuje types z `dist/`.
- [Manual-mobile] (Po IU10) Rekomendacja widoczna na ekranie main z poprawnym czasem next sleep window.

**Weryfikacja:**
- `pnpm --filter sleeper-machine build` exit code 0
- `pnpm --filter sleeper-machine-kotki build` exit code 0
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0

---

- [ ] **Unit 8: UI components (base + feature components + web pickers)**

**Cel:** Skopiować bazowe komponenty UI (`components/`, `components/ui/`) + zaimplementować web fallback dla `TimePickerField` i `DatePickerField` używając HTML5 inputs.

**Wymagania:** R3, R4, R10

**Zależności:** Unit 1, Unit 4

**Pliki:**
- Stwórz: `packages/sleeper-web/src/components/ui/Avatar.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/Badge.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/Card.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/IconButton.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/ProgressBar.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/ProgressBarStacked.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/ProgressRing.tsx` (kopia 1:1 — sprawdzić `react-native-svg` na web)
- Stwórz: `packages/sleeper-web/src/components/ui/SegmentedControl.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ui/Switch.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/ActiveWindowCard.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/BigActionButton.tsx` (kopia 1:1 — sprawdzić scale animation na web)
- Stwórz: `packages/sleeper-web/src/components/Chip.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/HomeHeader.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/QuickActions.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/SessionListItem.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/SleepInProgressCard.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/TodayStatsCard.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/components/TimePickerField.tsx` (**NEW — web implementacja** z `<input type="time">` w `Pressable` wrapper, Tailwind styling, accessibility label)
- Stwórz: `packages/sleeper-web/src/components/DatePickerField.tsx` (**NEW — web implementacja** z `<input type="date">`)

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, figma:figma-use, figma:figma-implement-design

**Podejście:**
- Większość komponentów to czysty `View/Text/Pressable` + NativeWind classes → kopia 1:1, działa na web bez zmian.
- `react-native-svg` na web używa standardowego SVG renderingu — `ProgressRing` (oparty na `Svg`/`Circle`) powinien działać. Test runtime.
- `lucide-react-native` na web używa `react-native-svg` — działa.
- `BigActionButton` z scale animation (`Animated.View` lub Reanimated) — testować runtime na web. Jeśli pulse/scale nie działa, fallback do CSS `transition: transform 0.1s` przez NativeWind `active:scale-95`.
- **`TimePickerField` na web:** komponent wrappuje `<input type="time">` (przez RN `<TextInput>` z `inputMode="none"` nie działa — trzeba surowy DOM input via `<input>` w `View` wrapped via `Pressable`). Patrz [react-native-web Platform.select pattern]. Alternatywa: render HTML `<input type="time">` directly w `View` (RN web wspiera DOM children).
- **`DatePickerField` na web:** podobnie z `<input type="date">`.
- iOS Safari quirk: `<input type="time">` pokazuje natywny wheel picker (rozwiązuje problem z fixu mobile). Default font-size ≥ 16px żeby uniknąć auto-zoom.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/components/` — wszystkie pliki
- `packages/sleeper-app/src/components/TimePickerField.tsx` — referencja API; web używa innego underlying input
- `docs/solutions/ui-bugs/2026-05-28-hitslop-vs-padding-for-touch-targets.md` — `hitSlop` nie działa na web; używać `padding` lub min-height 44px dla touch targets

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Manual-mobile] PWA otwarta w Safari iOS — wszystkie komponenty renderują się bez błędów konsoli.
- [Manual-mobile] `TimePickerField` tap → iOS Safari pokazuje natywny wheel picker time → select 14:30 → wartość przekazana do parenta.
- [Manual-mobile] `DatePickerField` tap → iOS Safari pokazuje natywny date picker → select date → wartość przekazana.
- [Manual-mobile] `BigActionButton` press → animacja scale (Reanimated lub CSS fallback) widoczna.
- [Manual-mobile] `ProgressRing` renderuje SVG poprawnie (`react-native-svg` na web).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- Mobile-manual: TimePicker/DatePicker pokazują natywne pickery iOS — manual test (patrz manual-test-IU8.md)
- Mobile-manual: brak white screen / console errors — manual test
- Mobile-manual: scale animation BigActionButton działa — manual test

**Operator checklist:**
- [ ] User testuje `TimePickerField` w Safari iOS i potwierdza że wheel picker pokazuje minute scroll bez problemów (parytet z mobile fix).

---

- [ ] **Unit 9: Routes (auth) — sign-in/sign-up/_layout**

**Cel:** Auth routes funkcjonalnie. (Pliki już skopiowane w IU3, ale tu doprecyzowane jako odrębna jednostka jeśli IU3 zostawił to jako placeholder.)

**Wymagania:** R8

**Zależności:** Unit 3

**Pliki:**
- Modyfikuj: `packages/sleeper-web/src/app/(auth)/_layout.tsx` (jeśli wymaga doprecyzowania ws. routing/redirect logic)
- Modyfikuj: `packages/sleeper-web/src/app/_layout.tsx` (warunkowy redirect: jeśli `auth.status === 'signed_out'` i path nie zaczyna się od `(auth)` → redirect do `/sign-in`)

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Sprawdzić jak sleeper-app robi auth gate między `(auth)` a `(app)` w `app/_layout.tsx`. Najprawdopodobniej `<Redirect>` z expo-router lub `router.replace()` w useEffect.
- expo-router web mapuje `(auth)/sign-in` na URL `/sign-in`, `(app)/index` na `/`. Działa OOTB.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/app/_layout.tsx` — analogiczny gate (jeśli istnieje)

**Scenariusze testowe:**
- [Manual-mobile] Niezalogowany user otwiera `/` → redirect do `/sign-in`.
- [Manual-mobile] Zalogowany user otwiera `/sign-in` → redirect do `/`.
- [Manual-mobile] URL `/sign-up` działa standalone.

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- Mobile-manual: auth gate działa — manual test (patrz manual-test-IU9.md)

---

- [ ] **Unit 10: Routes (app) — main screens (index, history, settings, profile, stats, sleep-fullscreen, child/[id], session/[id])**

**Cel:** Skopiować wszystkie screens z `(app)/` i podpiąć je w `(app)/_layout.tsx`. Po tym IU PWA ma pełną funkcjonalność feature-parity ze sleeper-app (minus notyfikacje).

**Wymagania:** R3, R4, R5, R10

**Zależności:** Unit 5, Unit 6, Unit 7, Unit 8, Unit 9

**Pliki:**
- Stwórz: `packages/sleeper-web/src/app/(app)/_layout.tsx` (kopia, sprawdzić `Tabs` z expo-router na web)
- Stwórz: `packages/sleeper-web/src/app/(app)/index.tsx` (kopia 1:1 — main dashboard)
- Stwórz: `packages/sleeper-web/src/app/(app)/history.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(app)/profile.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(app)/settings.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(app)/stats.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` (kopia 1:1)
- Stwórz: `packages/sleeper-web/src/app/(app)/child/[id].tsx` (kopia 1:1, expo-router dynamic route)
- Stwórz: `packages/sleeper-web/src/app/(app)/session/[id].tsx` (kopia 1:1 — edycja sesji + cross-day handling)
- Stwórz: `packages/sleeper-web/src/features/sessions/components/` — wszystkie feature components (BackdatedSessionModal, EditSessionForm, itp. — kopia 1:1 z sleeper-app jeśli istnieją)
- Stwórz: `packages/sleeper-web/src/features/children/components/` — feature components
- Stwórz: `packages/sleeper-web/src/features/family/components/` — feature components

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Kopia 1:1 wszystkich plików; dependency graph powinien resolve się sam (hooks z IU5-7, components z IU8).
- `Tabs` z expo-router na web renderuje się jako horizontal tab bar (na desktop) lub responsive layout. Mobile-first via Tailwind `md:` prefixes — bez zmian.
- Cross-day editing pattern: `endTime <= startTime` → `addDaysInAppTz(date, 1)` — przeniesione automatycznie przez kopiowanie (patrz `docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md`).
- `sleep-fullscreen.tsx` — używa `expo-keep-awake` w mobile; na web zastąpione no-op lub Web Wake Lock API (`navigator.wakeLock`) jako opcjonalny progressive enhancement. **Decyzja:** zostawić no-op na MVP, Web Wake Lock jako TODO post-MVP.
- Native-only deps w screens (np. `expo-haptics` press feedback) — usunąć w kopii, zachować base flow.

**Wzorce do naśladowania:**
- `packages/sleeper-app/src/app/(app)/` — wszystkie pliki
- `docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md`

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Unit] `pnpm --filter sleeper-web lint` przechodzi.
- [Manual-mobile] Main dashboard (`/`) — widoczna ostatnia aktywność, smart-start recommendation, BigActionButton START.
- [Manual-mobile] Start sesji → optimistic UI → druga osoba w sleeper-app widzi aktywną sesję przez Realtime.
- [Manual-mobile] Historia (`/history`) — lista sesji per dzień, grupowanie poprawne (dayKey w app tz).
- [Manual-mobile] Edycja sesji (`/session/[id]`) — TimePicker działa, cross-day night sleep (start 22:00, end 06:00) zapisuje się z `end_at` na następnym dniu.
- [Manual-mobile] Stats (`/stats`) — wykresy sleep stats per ostatnie 7 dni.
- [Manual-mobile] Settings (`/settings`) — toggle theme (System/Light/Dark) + sign-out.
- [Manual-mobile] Profile (`/profile`) — edycja profilu user'a.
- [Manual-mobile] Child detail (`/child/[id]`) — edycja dziecka, zmiana algorytmu (galland/kotki_dwa) → recommendation card aktualizuje się.
- [Manual-mobile] Backdated session insert — formularz pre-fill `todayDateInAppTz(now)`, walidacja `endAt > startAt`.

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- `pnpm --filter sleeper-web lint` exit code 0
- Mobile-manual: wszystkie screens renderują się — manual test (patrz manual-test-IU10.md)
- Mobile-manual: cross-day night sleep editing zapisuje poprawnie — manual test
- Mobile-manual: cross-device sync z sleeper-app (start na PWA → widoczne w mobile) — manual test

**Operator checklist:**
- [ ] User wykonuje pełny flow: start sesji → end sesji → edytuj historię → sprawdź stats. Każdy krok widoczny na drugim urządzeniu (sleeper-app w Expo Go).
- [ ] User testuje cross-day night sleep (start 22:00 → end 06:00) i potwierdza że `end_at` ląduje na następnym dniu w bazie.

---

- [ ] **Unit 11: PWA shell (manifest + service worker + iOS meta tagi + ikony)**

**Cel:** Dodać warstwę PWA — `manifest.json`, `sw.js`, ikony, iOS Safari meta tagi w HTML head. Po tym IU PWA jest installable (Safari → Share → Add to Home Screen).

**Wymagania:** R7

**Zależności:** Unit 10

**Pliki:**
- Stwórz: `packages/sleeper-web/public/manifest.json` (name: "Sleeper", short_name: "Sleeper", description, theme_color: "#208AEF", background_color: "#F5F0E8", display: "standalone", orientation: "portrait", start_url: "/", icons: 192/512)
- Stwórz: `packages/sleeper-web/public/sw.js` (minimalny SW — install/activate hooks, fetch handler: cache-first dla static assets, network-first dla `/rest/v1/*`, `/auth/v1/*`, `/realtime/v1/*`)
- Stwórz: `packages/sleeper-web/public/icons/icon-192.png` (skopiować z sleeper-app/assets/images/icon.png lub regenerować)
- Stwórz: `packages/sleeper-web/public/icons/icon-512.png` (skopiować/regenerować)
- Stwórz: `packages/sleeper-web/public/icons/apple-touch-icon.png` (180×180, iOS home screen icon)
- Stwórz: `packages/sleeper-web/public/favicon.png` (skopiować z sleeper-app)
- Stwórz: `packages/sleeper-web/public/+html.tsx` lub modyfikuj entry HTML template (Expo SDK 54 web: custom `+html.tsx` w `src/app/` — Expo Router HTML wrapper)
- Stwórz: `packages/sleeper-web/src/app/+html.tsx` (custom HTML: iOS meta tagi, manifest link, viewport)
- Stwórz: `packages/sleeper-web/src/features/pwa/registerSW.ts` (`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`)
- Modyfikuj: `packages/sleeper-web/src/app/_layout.tsx` (call `registerSW()` w useEffect na mount)

**Delegate to:** feature-builder-fullstack

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- `+html.tsx` w Expo Router 6 to mechanizm custom HTML wrapper (web only). Zawiera `<head>` + iOS meta tagi:
  ```
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Sleeper" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#208AEF" />
  ```
- `sw.js` minimalny (~50 LOC):
  - `install` event: skip waiting, populate cache `sleeper-shell-v1` z `[/, /sign-in, /manifest.json]`
  - `activate` event: clean old caches, claim clients
  - `fetch` event: dla URL z `/rest/v1/*`, `/auth/v1/*`, `/realtime/v1/*` → network-first (fall back na network error). Dla pozostałych → cache-first (fall back na network).
- Wersjonowanie cache: hardcoded `sleeper-shell-v1`, bump przy każdym znaczącym update.
- `registerSW.ts`: idempotentny `navigator.serviceWorker.register('/sw.js', { scope: '/' })`, log do console przy sukcesie/błędzie.
- iOS quirks adresowane:
  - `viewport-fit=cover` + `env(safe-area-inset-*)` w Tailwind (dla notch)
  - `apple-mobile-web-app-status-bar-style: black-translucent` → status bar nakłada się na app, treść pod nim. Wymaga safe-area-inset top padding na header.
  - `font-size: 16px` na inputs zapobiega auto-zoom (już ustawione przez Tailwind `text-base`)
  - Input keyboard handling: `visualViewport` API jeśli klawiatura blokuje treść (deferred — sprawdzić runtime).

**Wzorce do naśladowania:**
- Expo Router docs: https://docs.expo.dev/router/reference/static-rendering/#root-html
- PWA manifest standard: web.dev/install-criteria
- iOS Safari PWA: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- [Unit] `pnpm --filter sleeper-web start --web` — `/manifest.json` zwraca poprawny JSON.
- [Unit] `pnpm --filter sleeper-web start --web` — `/sw.js` zwraca poprawny JS.
- [Manual-mobile] Safari iOS otwiera PWA → menu Share → "Add to Home Screen" → ikona pojawia się z `apple-touch-icon.png`, nazwa "Sleeper".
- [Manual-mobile] Tap ikony z home screen → PWA otwiera się full-screen (bez Safari chrome) — `display: standalone` zadziałało.
- [Manual-mobile] Status bar widoczny (black-translucent), content nie chowa się pod notch (safe-area-inset OK).
- [Manual-mobile] Lighthouse PWA audit (Chrome desktop emulując mobile) — wynik: installable ✓, service worker ✓, manifest valid ✓.
- [Manual-mobile] Service Worker zarejestrowany (DevTools → Application → Service Workers → status: activated).
- [Manual-mobile] Offline test: po pierwszym wejściu, włącz airplane mode → reload → app shell wciąż widoczny (cache-first), API calls failują gracefully (network-first).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- `pnpm --filter sleeper-web build` produkuje `dist/manifest.json` i `dist/sw.js`
- Mobile-manual: Lighthouse PWA audit pass — manual test (patrz manual-test-IU11.md)
- Mobile-manual: Add to Home Screen + standalone launch — manual test
- Mobile-manual: safe-area-inset działa (status bar nie nakłada się na header) — manual test

**Operator checklist:**
- [ ] User instaluje PWA na iPhone (Safari → Share → Add to Home Screen) i potwierdza że ikona pojawia się z poprawną nazwą i obrazkiem.
- [ ] User otwiera PWA z home screen i potwierdza standalone mode (bez Safari address bar).

---

- [ ] **Unit 12: Build pipeline + deploy na Vercel**

**Cel:** Skonfigurować `pnpm --filter sleeper-web build` żeby produkował `dist/` gotowy do uploadu. Połączyć repo z Vercel, ustawić env vars, deploy na prod URL.

**Wymagania:** R1, R7

**Zależności:** Unit 11

**Pliki:**
- Modyfikuj: `packages/sleeper-web/package.json` (script: `"build": "expo export --platform web --output-dir dist"`, `"build:check": "tsc --noEmit && eslint . && expo export --platform web --output-dir dist"`)
- Stwórz: `packages/sleeper-web/vercel.json` (jeśli wymaga custom config — output dir, rewrites dla SPA: `[{ "source": "/(.*)", "destination": "/" }]` dla client-side routing fallback)
- Modyfikuj: `package.json` (root) — `"web:deploy": "pnpm --filter sleeper-web build && vercel --prod"` (opcjonalnie, jeśli używamy Vercel CLI; alternatywa: deploy przez gh integration)
- Modyfikuj: `.gitignore` w sleeper-web — exclude `dist/`, `.expo/`
- Stwórz: `docs/runbook/sleeper-web-deploy.md` (krótki runbook: jak deploy, jak rollback, jak update env vars)

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Build command: `expo export --platform web --output-dir dist` — produkuje statyczny SPA w `dist/`.
- Vercel integration:
  1. User loguje się na vercel.com, łączy gh repo `sleeper`.
  2. Project settings:
     - Framework Preset: Other
     - Root Directory: `packages/sleeper-web`
     - Build Command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter sleeper-web build` (monorepo build z root)
     - Output Directory: `dist`
     - Install Command: (puste, build command obejmuje install)
  3. Environment Variables (Production + Preview + Development):
     - `EXPO_PUBLIC_SUPABASE_URL` = wartość z `.env`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = wartość z `.env`
  4. Deploy: każdy push na `main` triggeruje auto-deploy.
- SPA routing fallback: Vercel domyślnie obsługuje 404 dla client-side routing przez `_next/index.html`. Jeśli `expo export` produkuje multiple HTML files (jeden per route), to OK; jeśli single SPA, potrzebny `vercel.json` rewrites do `/`.
- Service Worker scope: `/sw.js` musi być dostarczony z root scope (`/`). Vercel hostuje pliki z `public/` w root — OK.
- Custom domain: opcjonalne (np. `sleeper.bakalarski.dev`), Vercel obsługuje DNS + SSL automatycznie.

**Wzorce do naśladowania:**
- Expo Web static rendering docs (`https://docs.expo.dev/router/reference/static-rendering/`)
- Vercel monorepo guide (root directory config)

**Scenariusze testowe:**
- [Unit] `pnpm --filter sleeper-web build` exit code 0, produkuje `dist/` z `index.html`, `manifest.json`, `sw.js`, `_expo/static/js/*.js`, `_expo/static/css/*.css`.
- [Unit] `dist/manifest.json` poprawnie sparsuje się jako JSON.
- [Manual-mobile] Vercel deploy production URL otwiera się w Safari iOS.
- [Manual-mobile] Production URL: sign-in działa, sesja persistuje (po reload nadal zalogowany).
- [Manual-mobile] Production URL: Add to Home Screen → standalone PWA na iPhone.
- [Manual-mobile] Cross-device: prod PWA + sleeper-app w Expo Go — start sesji na PWA → widoczne w mobile via Realtime.
- [Manual] Vercel env vars setup poprawnie (build log pokazuje obecność `EXPO_PUBLIC_SUPABASE_URL`).

**Weryfikacja:**
- `pnpm --filter sleeper-web build` exit code 0
- `ls packages/sleeper-web/dist/manifest.json packages/sleeper-web/dist/sw.js packages/sleeper-web/dist/index.html` — wszystkie istnieją
- Mobile-manual: Vercel prod URL otwiera się i logowanie działa — manual test (patrz manual-test-IU12.md)
- Mobile-manual: PWA installable z prod URL — manual test

**Operator checklist:**
- [ ] User konfiguruje Vercel project (root: `packages/sleeper-web`, build/output config, env vars).
- [ ] User uruchamia pierwszy deploy, potwierdza że prod URL otwiera PWA.
- [ ] User instaluje PWA z prod URL na swój iPhone + iPhone partnera. Potwierdza że oboje widzą ten sam stan po zalogowaniu.

## Wpływ systemowy

- **Graf interakcji:** sleeper-web → Supabase (te same endpoints co sleeper-app: `/rest/v1/sessions`, `/rest/v1/children`, `/auth/v1/*`, `/realtime/v1/websocket`). Brak nowych endpoint'ów, brak nowych RLS policies, brak migracji bazy.
- **Propagacja błędów:** błędy z Supabase → `translateSessionError`/`translateAuthError`/`translateFamilyError` (kopia 1:1) → toast/error message w UI. Jeśli SW handler się wywróci → log do console, fallback na network — nie blokuje funkcjonalności.
- **Ryzyka cyklu życia stanu:**
  - Optimistic updates start/end sesji: rollback na error — identyczna logika z sleeper-app.
  - Race condition cross-device (start sesji jednocześnie na PWA i mobile): partial unique idx w bazie odrzuca drugi insert → user dostaje error "Sesja już aktywna". Behavior identyczny z sleeper-app.
  - Service Worker cache invalidation: bump `sleeper-shell-v{N}` przy każdym deploycie żeby uniknąć stale assets. Activation handler usuwa stare cache.
- **Parytet surface API:** brak — sleeper-web konsumuje istniejące Supabase API bez zmian. Schemat bazy i RLS policies sterowane przez sleeper-app/supabase/migrations (nie dotykamy).
- **Pokrycie integracyjne:**
  - Cross-device sync: PWA → mobile i mobile → PWA (Realtime WebSocket). Weryfikacja manual w IU10 (Operator checklist).
  - Cross-day night sleep editing: zaadresowane scenariuszem [Manual-mobile] w IU10.
  - Sign-out clears query cache: zaadresowane w AuthProvider kopii (identyczna logika).
  - Service Worker offline fallback: zaadresowane w IU11 scenariuszem [Manual-mobile].

## Ryzyka i zależności

- **Ryzyko: `react-native-reanimated 4` worklets na web mogą nie działać dla wszystkich animacji.** Mitygacja: jeśli timer pulse lub scale 0.96 nie renderuje się — fallback do CSS animation przez NativeWind `active:scale-95` lub `animate-pulse`. Adresowane w IU8 (Podejście).
- **Ryzyko: iOS Safari PWA quirks runtime** (input zoom, keyboard handling, safe-area). Mitygacja: testowanie on-device w IU11 scenariuszach Operator checklist. Fallbacki dokumentowane w `docs/runbook/sleeper-web-deploy.md`.
- **Ryzyko: SW cache invalidation może serwować stale JS po deploy.** Mitygacja: hardcoded version `sleeper-shell-v{N}` bumped manual przy deploy + activation handler clean. Long-term: read Expo `dist/assets.json` runtime żeby zsync wersje (deferred do post-MVP).
- **Ryzyko: feature drift między sleeper-web i sleeper-app.** Mitygacja: świadomy trade-off z brainstormu — kopiowanie 1:1 z snapshot dnia. Plan re-sync co 2-4 tygodnie lub przy znaczących zmianach domeny. Long-term: shared lib package jeśli ból ≥ próg (YAGNI).
- **Ryzyko: Vercel quota dla free tier** — Hobby plan ma limit 100GB bandwidth/miesiąc. Dla user + partner (~kilka MB/dzień) to nieosiągalne, ale monitorować.
- **Ryzyko: `lucide-react-native` na web wymaga `react-native-svg`** które ma swój web fallback. Sprawdzić runtime w IU7/IU8. Mitygacja: jeśli problem — switch do `lucide-react` (pure DOM SVG, no RN dependency).
- **Zależność: `sleeper-machine` i `sleeper-machine-kotki` muszą być zbudowane (`dist/`) przed `pnpm --filter sleeper-web exec tsc --noEmit`** — workspace deps importują types z `dist/`. Build order: machine + kotki → sleeper-web. Adresowane w `pnpm install` lifecycle.
- **Zależność: stabilna sieć dla initial install PWA** — service worker rejestruje się przy pierwszym wejściu. Bez sieci nie ma cache (Add to Home Screen wymaga online raz).

## Dokumentacja / Notatki operacyjne

- Stworzyć `docs/runbook/sleeper-web-deploy.md` w IU12: jak deploy (Vercel auto on push), jak update env vars, jak rollback, jak debug SW (Safari Web Inspector).
- Po IU12: zaktualizować `CLAUDE.md` (root) — sekcja "Layout repozytorium" dodać `packages/sleeper-web/`; sekcja "Walidacja" dodać `pnpm --filter sleeper-web exec tsc --noEmit`, `pnpm --filter sleeper-web build`.
- Po deploy: prod URL + instrukcja "Add to Home Screen" wysłane partnerowi (jednorazowy onboarding).
- Wzorzec re-sync: gdy sleeper-app dostaje znaczący update (np. nowy feature, refactor lib/time), checklist co skopiować do sleeper-web. Deferred do faktycznego momentu re-sync — YAGNI dla formalizacji teraz.
- Monitoring: brak (PWA nie ma Sentry per brainstorm — out of scope). Console errors widoczne przez Safari Web Inspector remote debugging. Jeśli ból → dodać Sentry w follow-up.

## Źródła i referencje

- **Dokument źródłowy:** [docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md](../dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md)
- Powiązany kod: `packages/sleeper-app/` (referencja dla kopiowania)
- Algorithms: `packages/sleeper-machine/`, `packages/sleeper-machine-kotki/` (workspace deps)
- Wzorce learned: `.claude/rules/learned-patterns.md` (TZ-safe time, theme single source, queryKey memoization, hitSlop, cross-day editing, expo monorepo)
- Expo Web docs: https://docs.expo.dev/versions/v54.0.0/
- Expo Router web (static rendering): https://docs.expo.dev/router/reference/static-rendering/
- PWA manifest: https://developer.mozilla.org/en-US/docs/Web/Manifest
- Vercel monorepo: https://vercel.com/docs/monorepos
