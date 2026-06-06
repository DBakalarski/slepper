---
title: Sleeper Web — PWA — checklista zadań
branch: feature/sleeper-web-pwa
ostatnia_aktualizacja: 2026-06-06 (Faza 4 ukończona — kod gotowy, deploy = user action)
---

# Sleeper Web — PWA — checklista zadań

**Branch:** `feature/sleeper-web-pwa`
**Ostatnia aktualizacja:** 2026-06-06 (Faza 4 ukończona kodowo, deploy Vercel = user action)

Pełne szczegóły IU w `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`.

## Status faz

- ✅ **Faza 1: Bootstrap & Foundation** (IU1-IU4) — ukończono 2026-06-05
- ✅ **Faza 2: Data Layer** (IU5-IU7) — ukończono 2026-06-05
- ✅ **Faza 3: UI & Routes** (IU8-IU10) — ukończono 2026-06-05
- ✅ **Faza 4: PWA & Deploy** (IU11-IU12) — ukończono kodowo 2026-06-06 (deploy + mobile-manual czeka na user)

**Faza 4 — commits:**
- `690569d` IU11 PWA shell + Faza 1/2 P2 hardening + log `39cdfee`
- `d5471a3` IU12 build pipeline + Vercel config + runbook + log `c02b638`

**Faza 3 — commits:**
- `7f6b22c` IU8 UI components (kopia 1:1 + web pickers HTML5) + log `b11a7d9`
- `ba2fc38` IU9 Auth gate + root layout sync + log `b648777`
- `e952e19` IU10 Main screens (9 routes + 8 feature components) + log `43aea50`

**Faza 1 — commits:**
- `440d5cc` IU1 Bootstrap + `7f2615c` log
- `cc2d3a9` IU2 Foundation lib + `0141111` log
- `f4c0afa` IU3 Auth flow + `9b038b2` log
- `e89aa33` IU4 Theme system + `4fd66fb` log

**Faza 2 — commits:**
- `9cf21b9` IU5 Sessions data layer + `9f35009` log
- `c0c41b5` IU6 Children + family data layer + `508165c` log
- `d694448` IU7 Recommendation data + algorytm wiring + `295c7df` log

**Faza 1 — deferrals: ROZWIĄZANE w IU5** ✅ — `lib/session-gaps.ts` i `lib/sleep-stats.ts` importują teraz `SleepSession` z `features/sessions/hooks` poprawnie. Komentarze + eslint-disable usunięte.

---

## Faza 1: Bootstrap & Foundation ✅

### IU1: Bootstrap package skeleton `packages/sleeper-web/` ✅

**Delegate to:** feature-builder-fullstack | **Estymata:** S | **Wymagania:** R1, R10 | **Commits:** `440d5cc` + log `7f2615c`

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/package.json` (Expo SDK 54 web-only deps, lista z planu)
- [ ] Stwórz `packages/sleeper-web/app.json` (`platforms: ["web"]`, `web.output: "static"`, scheme/slug/name)
- [ ] Stwórz `packages/sleeper-web/babel.config.js`
- [ ] Stwórz `packages/sleeper-web/metro.config.js` (monorepo-aware, NativeWind preset)
- [ ] Stwórz `packages/sleeper-web/tailwind.config.js` (kopia z sleeper-app, content path local)
- [ ] Stwórz `packages/sleeper-web/tsconfig.json` (extends `expo/tsconfig.base`, alias `@/*` → `./src/*`)
- [ ] Stwórz `packages/sleeper-web/nativewind-env.d.ts`
- [ ] Stwórz `packages/sleeper-web/expo-env.d.ts`
- [ ] Stwórz `packages/sleeper-web/eslint.config.js`
- [ ] Stwórz `packages/sleeper-web/.env.example` (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)
- [ ] Stwórz `packages/sleeper-web/.gitignore`
- [ ] Stwórz `packages/sleeper-web/src/global.css` (kopia)
- [ ] Stwórz `packages/sleeper-web/src/app/_layout.tsx` (minimal Stack)
- [ ] Stwórz `packages/sleeper-web/src/app/index.tsx` (placeholder "Sleeper Web — coming soon")
- [ ] Modyfikuj root `package.json` — dodaj skrypty `web:dev`, `web:build`, `web:typecheck`, `web:lint`

**Testy:**
- [ ] Test: `pnpm install` w roocie kończy się sukcesem, sleeper-web w `pnpm list -r --depth=0`
- [ ] Test: alias `@/*` resolves
- [ ] Test: brak missing deps
- [ ] Test: [Manual-mobile] `pnpm --filter sleeper-web start --web` → localhost otwiera placeholder w Safari iOS
- [ ] Test: [Manual-mobile] mobile `pnpm app:dev` nadal działa (smoke regression)

**Weryfikacja:**
- [x] Weryfikacja: `pnpm install` exit code 0
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (FAIL: 2 deferred TS errors → IU5, fix przez review P1.1)
- [x] Weryfikacja: `pnpm --filter sleeper-web lint` exit code 0 (PASS po fix P1.2)
- [x] Weryfikacja: `pnpm --filter sleeper-app exec tsc --noEmit` exit code 0 (regression check)
- [ ] Weryfikacja: [Mobile-manual] localhost web placeholder działa — manual test (patrz manual-test-faza-1.md)
- [ ] Weryfikacja: [Mobile-manual] sleeper-app w Expo Go bez zmian — manual test (patrz manual-test-faza-1.md)

**Operator checklist:**
- [ ] User uruchamia `pnpm --filter sleeper-web start --web` i potwierdza placeholder w przeglądarce

---

### IU2: Foundation lib (time, supabase, query-client, error utils) ✅

**Delegate to:** feature-builder-data | **Estymata:** M | **Wymagania:** R2, R6, R9 | **Zależności:** IU1 | **Commits:** `cc2d3a9` + log `0141111`

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/src/lib/time.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/supabase.ts` (kopia + `detectSessionInUrl: true`)
- [ ] Stwórz `packages/sleeper-web/src/lib/query-client.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/colors.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/child-age.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/email.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/postgres-errors.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/extract-error-message.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/session-gaps.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/sleep-norms.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/sleep-stats.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/database.types.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/useNow.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/useNotificationDot.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/lib/notifications.ts` (**NEW — no-op mock**)
- [ ] Stwórz `packages/sleeper-web/src/lib/__tests__/` (kopia testów z sleeper-app)
- [ ] Stwórz `packages/sleeper-web/vitest.config.mjs`

**Testy:**
- [ ] Test: `pnpm --filter sleeper-web test` (time, sleep-stats, session-gaps)
- [ ] Test: `pnpm --filter sleeper-web exec tsc --noEmit` (typy Database, alias)
- [ ] Test: supabase.ts ma `detectSessionInUrl: true` (grep)
- [ ] Test: notifications.ts NIE importuje `expo-notifications` (grep)

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (FAIL: 2 deferred TS errors → IU5, fix przez review P1.1)
- [x] Weryfikacja: `pnpm --filter sleeper-web test` exit code 0 (14/14 PASS)
- [x] Weryfikacja: `grep -l "detectSessionInUrl: true" packages/sleeper-web/src/lib/supabase.ts` zwraca match
- [x] Weryfikacja: `grep -L "expo-notifications" packages/sleeper-web/src/lib/notifications.ts` zwraca match (0 references)

---

### IU3: Auth flow (AuthProvider + sign-in + sign-up) ✅

**Delegate to:** feature-builder-fullstack | **Estymata:** M | **Wymagania:** R8 | **Zależności:** IU2 | **Commits:** `f4c0afa` + log `9b038b2`

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/src/features/auth/AuthProvider.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/features/auth/translate-auth-error.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(auth)/_layout.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(auth)/sign-in.tsx` (kopia)
- [ ] Stwórz `packages/sleeper-web/src/app/(auth)/sign-up.tsx` (kopia)
- [ ] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (dodaj `<AuthProvider>` wrapper)

**Testy:**
- [ ] Test: [Manual-mobile] sign-in ekran renderuje się w Safari iOS bez auto-zoom
- [ ] Test: [Manual-mobile] logowanie tym samym kontem co w sleeper-app → redirect na `/`
- [ ] Test: [Manual-mobile] persist po reload strony
- [ ] Test: [Manual-mobile] sign-out → redirect na sign-in
- [ ] Test: [Manual-mobile] cross-device: PWA zalogowana + sleeper-app na drugim telefonie pokazują ten sam user
- [ ] Test: [Manual-mobile] zalogowany w Expo Go → otwórz PWA → sign-in screen (oczekiwane: separate session per device)

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (FAIL: 2 deferred TS errors → IU5, fix przez review P1.1)
- [ ] Weryfikacja: [Mobile-manual] logowanie istniejącym kontem działa — manual test (patrz manual-test-faza-1.md)
- [ ] Weryfikacja: [Mobile-manual] persist po reload — manual test (patrz manual-test-faza-1.md)

**Operator checklist:**
- [ ] User loguje się w PWA tym samym kontem co w sleeper-app
- [ ] User reload strony, potwierdza persist sesji

---

### IU4: Theme system (ThemeProvider + useThemeStore) ✅

**Delegate to:** feature-builder-ui | **Estymata:** S | **Wymagania:** R10 | **Zależności:** IU2 | **Commits:** `e89aa33` + log `4fd66fb`

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/src/features/settings/ThemeProvider.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/features/settings/useThemeStore.ts` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/features/settings/ThemeModeBottomSheet.tsx` (kopia z adaptacją bottom sheet → centered modal)
- [ ] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (dodaj `<ThemeProvider>` wrapper)

**Testy:**
- [ ] Test: [Manual-mobile] default (System) respektuje iOS Settings → Display → Dark
- [ ] Test: [Manual-mobile] manual override Dark działa niezależnie od iOS
- [ ] Test: [Manual-mobile] wybór trybu persist po reload (localStorage)
- [ ] Test: [Manual-mobile] zmiana iOS settings z PWA otwartą → reaktywnie jeśli theme=System

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (FAIL: 2 deferred TS errors → IU5, fix przez review P1.1)
- [ ] Weryfikacja: [Mobile-manual] dark/light/system działa — manual test (patrz manual-test-faza-1.md)

---

## Do poprawy po review fazy 1

✅ **Status P1:** ZAADRESOWANE 2026-06-05 — `pnpm lint` exit 0, sleeper-app regression PASS, tsc nadal failuje na 2 deferred (świadomie do IU5).
⚠️ **Status P2/P3:** otwarte, do naprawy przed Fazą 4 (PWA deploy).

**Pełny raport:** [review-faza-1.md](./review-faza-1.md)

### 🔴 P1-blocking (zaadresowane)

- [x] 🔴 [blocking] **packages/sleeper-web/src/lib/session-gaps.ts:1** — dodano inline komentarz wyjaśniający deferred TS error (import type — eslint-disable nie był potrzebny). (Architecture P1.1) ✅
- [x] 🔴 [blocking] **packages/sleeper-web/src/lib/sleep-stats.ts:4** — dodano komentarz + `// eslint-disable-next-line import/no-unresolved`. `pnpm lint` przechodzi exit 0. (Architecture P1.1+P1.2) ✅
- [x] 🔴 [blocking] **packages/sleeper-web/package.json** — usunięto `react-native-reanimated` + `react-native-worklets` z dependencies (zero użyć w Fazie 1 zweryfikowane greppem, -148 paczek). Re-add w IU8 gdy `BigActionButton` faktycznie użyje animacji. (Performance P1.3) ✅
- [x] 🔴 [blocking] **packages/sleeper-web/metro.config.js** — dodano alias `'lucide-react-native' → 'lucide-react'` w `config.resolver.alias`. Dodano `lucide-react@^0.469.0` jako dep. (Performance P1.4) ✅

### 🟠 P2-important (do naprawy przed deployem prod / Fazą 4)

- [x] 🟠 [important] **packages/sleeper-web/src/lib/supabase.ts** — dodano `flowType: 'pkce'` w `auth` config. (Faza 4 IU11, commit `690569d`)
- [x] 🟠 [important] **packages/sleeper-web/src/app/(auth)/sign-in.tsx** — walidacja parytet z sign-up (`isValidEmail` + `MIN_PASSWORD` early return) + `maxLength={254}` (email) + `maxLength={128}` (password). Sign-up dostal te same `maxLength` dla parytetu. (Faza 4 IU11, commit `690569d`)
- [x] 🟠 [important] **packages/sleeper-web/src/app/_layout.tsx** — zaadresowane w Fazie 3 (queryClient juz w `lib/query-client.ts` jako singleton modulowy). (P2.3 deferred do Fazy 3 — POTWIERDZONE NAPRAWIONE)
- [x] 🟠 [important] **packages/sleeper-web/src/features/settings/useThemeStore.ts** — `webLocalStorage` adapter z `Platform.OS === 'web'` guard. Synchroniczny localStorage eliminuje FOWT. (Faza 4 IU11, commit `690569d`)
- [x] 🟠 [important] **packages/sleeper-web/src/app/_layout.tsx** — `<Stack.Screen name="(app)" />` zaadresowane w Fazie 3 (segment `(app)/` istnieje). (P2.5 — POTWIERDZONE NAPRAWIONE)
- [x] 🟠 [important] **packages/sleeper-web/src/app/index.tsx** — placeholder usuniety w Fazie 3 (auth gate przez `(auth)/_layout.tsx` + `(app)/_layout.tsx`). (P2.6 — POTWIERDZONE NAPRAWIONE)
- [x] 🟠 [important] **packages/sleeper-web/src/features/auth/__tests__/translate-auth-error.test.ts** — unit test dodany (10 cases: 8 branchy + fallback security + edge). (Faza 4 IU11, commit `690569d`)

### 🟡 P3-nit (sugestie)

- [x] 🟡 [nit] **packages/sleeper-web/src/features/auth/translate-auth-error.ts** — fallback zmieniona na generic `"Nie udalo sie. Sprobuj ponownie."` (Security P3). (Faza 4 IU11, commit `690569d`)
- [x] 🟡 [nit] **packages/sleeper-web/src/lib/supabase.ts** — missing env vars → `throw` w `NODE_ENV=production`, `console.warn` w dev (fail-loud build-time). (Faza 4 IU11, commit `690569d`)
- [x] 🟡 [nit] **packages/sleeper-web/scripts/check-no-native-imports.sh** — invariant check dodany + integrowany w `pnpm web:build:check`. (Faza 4 IU11, commit `690569d`)

---

## Faza 2: Data Layer ✅

### IU5: Sessions data layer (hooks + realtime + timer) ✅

**Delegate to:** feature-builder-data | **Estymata:** M | **Wymagania:** R2, R3, R4, R9 | **Zależności:** IU2, IU3 | **Commits:** `9cf21b9` + log `9f35009`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/src/features/sessions/hooks.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/sessions/useRealtimeSessions.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/sessions/useSessionTimer.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/sessions/translate-session-error.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` (**NEW — no-op mock**)

**Testy:**
- [x] Test: wszystkie 9 hooks eksportowane (tsc PASS przez konsumentów `lib/session-gaps.ts`, `lib/sleep-stats.ts`)
- [x] Test: schedule-nap-side-effects.ts NIE importuje expo-notifications (grep + unit test invariant)
- [x] Test: translate-session-error pure function (7 cases: 23505, walidacje, network, fallback)
- [x] Test: schedule-nap-side-effects no-op behavior + grep invariants (5 cases)
- [ ] Test: [Manual-mobile] (po IU10) start sesji w PWA → druga osoba w sleeper-app widzi via Realtime — manual test (patrz manual-test-faza-2.md TBD, depends IU10)

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [x] Weryfikacja: `grep -c "expo-notifications" packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` zwraca 0

---

### IU6: Children + family data layer ✅

**Delegate to:** feature-builder-data | **Estymata:** S | **Wymagania:** R5, R6 | **Zależności:** IU2, IU3 | **Commits:** `c0c41b5` + log `508165c`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/src/features/children/hooks.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/children/useActiveChild.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/family/hooks.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/family/translate-family-error.ts` (kopia 1:1)

**Testy:**
- [x] Test: hooks eksportowane (tsc PASS = importy konsumentów resolve; pure-functions pokryte unit testami)
- [x] Test: translate-family-error pure function (9 cases: 23505, P0001, last-owner, auth, email, network, fallback, non-Error)

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0

---

### IU7: Recommendation data + algorytm wiring ✅

**Delegate to:** feature-builder-data | **Estymata:** S | **Wymagania:** R5, R6 | **Zależności:** IU2, IU5, IU6 | **Commits:** `d694448` + log `295c7df`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/src/features/recommendation/adapter.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` (kopia 1:1)

**Testy:**
- [x] Test: workspace deps `sleeper-machine`, `sleeper-machine-kotki` resolve (tsc PASS po build)
- [x] Test: adapter.ts pure functions (11 cases: toLibSessions 4, toLibProfile 7)
- [ ] Test: [Manual-mobile] (po IU10) RecommendationCard widoczna z poprawnym czasem next sleep window — manual test (patrz manual-test-faza-2.md TBD, depends IU10)

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-machine build` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-machine-kotki build` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0

---

## Do poprawy po review fazy 2

✅ **Status P1:** ZAADRESOWANE 2026-06-05 — `pnpm --filter sleeper-web build` PASS (dist/index.html + _expo/static/* wygenerowane), engines.node >=22 dodane.
✅ **Status P2:** ZAADRESOWANE 2026-06-05 (cykl 2) — P2.2 naprawione (19 nowych testow hookow), P2.1+P2.3 deferred do IU10/IU11 (znow-issues.md). 5 P3 otwarte (parytet z sleeper-app).

**Pelny raport:** [review-faza-2.md](./review-faza-2.md)

### 🔴 P1-blocking (PRE-IU11) — zaadresowane

- [x] 🔴 [blocking] **packages/sleeper-web/app.json** — zmienione `web.output: "static"` na `web.output: "single"`. Static SSR uruchamiał AsyncStorage (`window` undefined w Node) i Realtime WebSocket w module-scope `lib/supabase.ts:18` podczas `expo export`. SPA shell wystarczy dla PWA. **`pnpm --filter sleeper-web build` exit 0, dist/index.html + assety wygenerowane.** (Agent 5 E2E P1.1) ✅
- [x] 🔴 [blocking] **packages/sleeper-web/package.json** — dodano `"engines": { "node": ">=22" }` zeby zablokowac Vercel CI od Node 20 (gdzie `@supabase/realtime-js` failuje bez `ws` polyfill). (Agent 5 E2E P1.1) ✅

### 🟠 P2-important (przed Faza 4 deploy / w trakcie IU10-IU11)

- [x] 🟠 [important] **packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:66** — `useFocusEffect` z `expo-router` na web nie ma deterministic focus event (tylko `visibilitychange`). Cross-midnight refresh moze nie zadzialac jak na native. Weryfikuj manualnie w IU10 (zostaw otwarte ~23:55, sprawdz po polnocy). Fallback: `useEffect` z `setInterval` co 5min sprawdzajacy `dayKeyInAppTz(new Date())` vs stale. (Architecture P2.1) — deferred: known-issues.md / IU10
- [x] 🟠 [important] **packages/sleeper-web/src/features/sessions/__tests__/** — dodano `hooks.test.ts` (12 cases: export smoke, useStartSession optimistic/rollback/cancelQueries, useEndSession optimistic, stable queryKey regression, domain constraints, error translation) + `useRealtimeSessions.test.ts` (7 cases: cleanup removeChannel, deps array, filter, prefix invalidation, channel name). Strategia: static invariants przez `readFileSync` (parytet z `schedule-nap-side-effects.test.ts`) — pelne renderHook+jsdom wymagaloby dodania `@testing-library/react` + mockowania `@/lib/supabase` (transitive react-native), co bez zgody usera nie mozemy. ~190 LOC, 19/19 PASS. (Spec-flow P2.2) ✅
- [x] 🟠 [important] **packages/sleeper-web/babel.config.js** — `babel-plugin-transform-remove-console` (exclude error) pod `NODE_ENV=production`. Eliminuje wszystkie `console.warn/log` leaki naraz (hooks.ts:293 + supabase.ts dev warn + Faza 3 P3.2). (Faza 4 IU11, commit `690569d`)

### 🟡 P3-nit (sugestie)

- [ ] 🟡 [nit] **packages/sleeper-web/src/features/sessions/hooks.ts:223** — `optimistic-${Date.now()}` theoretical collision risk. `crypto.randomUUID()` bezpieczne na web + RN 0.81. Parytet z sleeper-app — nie ruszac bez sync. (KOD P3.1)
- [ ] 🟡 [nit] **packages/sleeper-web/src/features/sessions/useRealtimeSessions.ts:42-50** — duplicate prefix invalidation (`['sessions']` + `['session']`). Komentarz wyjasnia ale subtelny smell. Parytet — nie tykac. (Architecture P3.2)
- [ ] 🟡 [nit] **packages/sleeper-web/src/features/sessions/hooks.ts:35-38**, **packages/sleeper-web/src/features/family/hooks.ts:99-102** — `parseSessionType` / `parseRole` rzuca przy nieznanej wartosci z DB. Fail-loud OK, ale w `useRealtimeSessions` invalidate moze wywolac queryFn z corrupted row → error UI. Parytet — zostaw. (KOD P3.3)
- [ ] 🟡 [nit] **packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:94** — `error: sessionsQuery.error as Error | null` type assertion lamie `coding-rules.md` §10. Parytet z sleeper-app. (Type safety P3.4)
- [ ] 🟡 [nit] **packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts:74-92** — `parseTimeString` (non-exported) testowany posrednio przez `toLibProfile`. Dodaj edge cases: `'24:00'`, `'09:30'` (leading zero), `'12:00'` (dwucyfrowy hour). (Spec-flow P3.5)

---

## Faza 3: UI & Routes ✅

### IU8: UI components (base + feature + web pickers) ✅

**Delegate to:** feature-builder-ui | **Estymata:** L | **Wymagania:** R3, R4, R10 | **Zależności:** IU1, IU4 | **Commits:** `7f6b22c` + log `b11a7d9`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/src/components/ui/Avatar.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/Badge.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/Card.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/IconButton.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/ProgressBar.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/ProgressBarStacked.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/ProgressRing.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/SegmentedControl.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ui/Switch.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/ActiveWindowCard.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/BigActionButton.tsx` (kopia 1:1; Pressable style scale fallback dla web)
- [x] Stwórz `packages/sleeper-web/src/components/Chip.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/HomeHeader.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/QuickActions.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/SessionListItem.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/SleepInProgressCard.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/TodayStatsCard.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/components/TimePickerField.tsx` (**NEW — HTML5 input type=time wrapper, tz-safe**)
- [x] Stwórz `packages/sleeper-web/src/components/DatePickerField.tsx` (**NEW — HTML5 input type=date wrapper, tz-safe**)
- [x] Re-add deps: react-native-reanimated@~4.1.1, react-native-worklets@0.5.1, expo-haptics@~15.0.8 (uzywane przez ProgressRing/SegmentedControl/BigActionButton)
- [x] Test: `pickers.test.ts` — 17 testow (13 static invariants + 4 conversion pipeline DST-safe)

**Testy:**
- [ ] Test: [Manual-mobile] wszystkie komponenty renderują się w Safari iOS bez console errors, manual test pending
- [ ] Test: [Manual-mobile] TimePickerField tap → iOS native wheel picker minutes scroll OK, manual test pending
- [ ] Test: [Manual-mobile] DatePickerField tap → iOS native date picker, manual test pending
- [ ] Test: [Manual-mobile] BigActionButton press → scale animation (Reanimated lub CSS fallback), manual test pending
- [ ] Test: [Manual-mobile] ProgressRing renderuje SVG poprawnie, manual test pending

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS — review faza 3)
- [ ] Weryfikacja: [Mobile-manual] TimePicker pokazuje natywny iOS wheel — manual test (patrz manual-test-faza-3.md TBD; wymaga fixu P1.1)
- [ ] Weryfikacja: [Mobile-manual] brak white screen / console errors — manual test (BLOKADA: P1.1 bundle parse error)
- [ ] Weryfikacja: [Mobile-manual] BigActionButton animation działa — manual test (wymaga fixu P1.1)

**Operator checklist:**
- [ ] User testuje TimePickerField w Safari iOS, potwierdza parytet z mobile fix (minute scroll)

---

### IU9: Routes (auth) — auth gate ✅

**Delegate to:** feature-builder-fullstack | **Estymata:** S | **Wymagania:** R8 | **Zależności:** IU3 | **Commits:** `ba2fc38` + log `b648777`

**Implementacja:**
- [x] `(auth)/_layout.tsx` — auth gate `signed_in` → Redirect `/` (z IU3 1:1)
- [x] `(app)/_layout.tsx` — auth gate `signed_out` → Redirect `/sign-in` (z IU10 kopia 1:1)
- [x] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (sync 1:1 z sleeper-app: queryClient z lib/query-client, setupFocusManager, configureNotificationHandler no-op na web)
- [x] Usun placeholder `src/app/index.tsx` ("Coming soon") — (app)/index.tsx staje sie root route

**Testy:**
- [ ] Test: [Manual-mobile] niezalogowany user otwiera `/` → redirect /sign-in, manual test pending
- [ ] Test: [Manual-mobile] zalogowany user otwiera `/sign-in` → redirect `/`, manual test pending
- [ ] Test: [Manual-mobile] `/sign-up` URL działa standalone, manual test pending

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS — review faza 3)
- [ ] Weryfikacja: [Mobile-manual] auth gate działa — manual test (BLOKADA: P1.1 bundle parse error)

---

### IU10: Routes (app) — main screens ✅

**Delegate to:** feature-builder-fullstack | **Estymata:** XL | **Wymagania:** R3, R4, R5, R10 | **Zależności:** IU5-IU9 | **Commits:** `e952e19` + log `43aea50`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/src/app/(app)/_layout.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/index.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/history.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/profile.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/settings.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/stats.tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` (kopia — `expo-keep-awake` USUNIETY, Wake Lock API deferred do IU11+)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/child/[id]/edit.tsx` (kopia 1:1 — istnieje tylko edit.tsx w sleeper-app)
- [x] Stwórz `packages/sleeper-web/src/app/(app)/session/[id].tsx` (kopia 1:1)
- [x] Stwórz `packages/sleeper-web/src/features/sessions/components/` (BackdatedSessionModal, SessionEditForm) — kopia 1:1
- [x] Stwórz `packages/sleeper-web/src/features/children/components/` (AddChildForm, EditChildForm) — kopia 1:1
- [x] Stwórz `packages/sleeper-web/src/features/family/components/` (FamilyMembersList, InviteMemberForm, NoFamilyFallback, PendingInvitationsList) — kopia 1:1

**Testy:**
- [ ] Test: [Manual-mobile] Main dashboard `/` — ostatnia aktywność, smart-start, BigActionButton START, manual test pending
- [ ] Test: [Manual-mobile] Start sesji → optimistic UI → cross-device sync via Realtime, manual test pending
- [ ] Test: [Manual-mobile] History `/history` — grupowanie per dzień w app tz, manual test pending
- [ ] Test: [Manual-mobile] Edit session `/session/[id]` — TimePicker + cross-day night sleep, manual test pending
- [ ] Test: [Manual-mobile] Stats `/stats` — wykresy 7 dni, manual test pending
- [ ] Test: [Manual-mobile] Settings `/settings` — theme toggle + sign-out, manual test pending
- [ ] Test: [Manual-mobile] Profile `/profile` — edycja, manual test pending
- [ ] Test: [Manual-mobile] Child detail `/child/[id]/edit` — zmiana algorytmu → recommendation refresh, manual test pending
- [ ] Test: [Manual-mobile] Backdated insert — prefill `todayDateInAppTz`, walidacja endAt>startAt, manual test pending

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS — review faza 3)
- [x] Weryfikacja: `pnpm --filter sleeper-web lint` exit code 0 (PASS — review faza 3)
- [ ] Weryfikacja: [Mobile-manual] wszystkie screens renderują się — manual test (BLOKADA: P1.1 bundle parse error)
- [ ] Weryfikacja: [Mobile-manual] cross-day night sleep zapisuje poprawnie — manual test
- [ ] Weryfikacja: [Mobile-manual] cross-device sync z sleeper-app — manual test

**Operator checklist:**
- [ ] User: pełny flow (start → end → edit → stats), każdy krok widoczny na drugim urządzeniu
- [ ] User: cross-day night sleep test (22:00 → 06:00) z weryfikacją bazy

---

## Do poprawy po review fazy 3

✅ **Status P1:** NAPRAWIONY (cykl 1 autopilot 2026-06-06) — bundle parse error fixed (custom resolveRequest dla zustand CJS).
✅ **Status P2:** wszystkie 4 naprawione (cykl 1 autopilot 2026-06-06).
🟡 **Status P3:** 5 sugestii — bez blokady, deferred do IU11/known-issues.

**Pełny raport:** [review-faza-3.md](./review-faza-3.md)

### 🔴 P1-blocking (PRE-Faza 4)

- [x] 🔴 [blocking] **packages/sleeper-web/metro.config.js** — bundle web `dist/_expo/static/js/web/entry-*.js` zawiera `import.meta.env.MODE` z `zustand@5.0.14/esm/middleware.mjs` (linie 64, 126). Metro resolwuje `"import"` condition z `zustand/package.json#exports` → wybiera ESM zamiast CJS. Bundle ładowany jako classic `<script defer>` (nie `type="module"`) → `Uncaught SyntaxError: Cannot use 'import.meta' outside a module` → cały tree fail, `#root` pusty (white screen E2E confirmed). **Fix:** custom `resolver.resolveRequest` z mapą `zustand` + subpathów (`middleware`, `vanilla`, `react`, `shallow`, `traditional`) → CJS `.js`. `resolver.alias` ze stringiem był zawodny (Metro nie rozwiazywal `zustand/middleware` na ESM gdy pkg.exports go preferowal). Rebuild + browser smoke: `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` → **0**. Bundle parsuje sie jako classic script (V8 `new Function` PASS). (E2E P1.1)

### 🟠 P2-important (przed Fazą 4 deploy)

- [x] 🟠 [important] **packages/sleeper-web/src/app/(app)/session/[id].tsx + packages/sleeper-web/src/features/family/components/PendingInvitationsList.tsx** — `Alert.alert` jest no-op w react-native-web → destruktywne akcje silently nie uruchamiaja callbacku. **Fix:** nowy `packages/sleeper-web/src/lib/confirm.ts` z `confirmAction(): Promise<boolean>` (Platform.OS guard: `window.confirm` na web, `Alert.alert` z Promise wrapper na native). Oba callsite przepisane na `async/await` z early return na cancel. (KOD P2.1)
- [x] 🟠 [important] **packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts** — `useFocusEffect` web tylko `visibilitychange`. **Fix preventywny:** `useEffect` z `setInterval(checkDayKey, 5 * 60 * 1000)` invalidate `['sessions', child.id]` gdy `dayKeyInAppTz(new Date()) !== dayKey`. Cleanup w return — `clearInterval`. (KOD P2.2)
- [x] 🟠 [important] **packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx** — `expo-keep-awake` usuniety bez Wake Lock API fallback. **Fix:** ~40 LOC `navigator.wakeLock?.request('screen')` w `useEffect` (Platform.OS guard + graceful try/catch + re-acquire na `visibilitychange` gdy Safari zwalnia sentinel po zwroceniu focusu). Typowanie lokalne (`WakeLockSentinelLike` + `NavigatorWithWakeLock`) bez dotykania `tsconfig.lib`. (KOD P2.3)
- [x] 🟠 [important] **packages/sleeper-web/src/features/sessions/components/__tests__/ + packages/sleeper-web/src/features/family/components/__tests__/ + packages/sleeper-web/src/lib/__tests__/confirm.test.ts** — **Fix:** 4 nowe test suites (37 cases), wzorzec "static invariants + pure-function pipeline" z `pickers.test.ts`:
  - `SessionEditForm.test.ts` (10) — TZ-safe merge, brak setHours/setDate, brak Alert, parytet Chip/Picker.
  - `BackdatedSessionModal.test.ts` (12) — `addDaysInAppTz` (NIE +86400000), regex HH:MM/YYYY-MM-DD, pipeline `22:00 → 06:30` (cross-day night sleep).
  - `PendingInvitationsList.test.ts` (6) — wymusza `confirmAction` (P2.1 invariant), brak `Alert`.
  - `confirm.test.ts` (9) — kontrakt Platform.OS guard, Promise<boolean>, native sciezka rozwiazana w `onPress`/`onDismiss`.
  Razem: 82 → **119** testow, wszystkie PASS. (TEST P2.4)

### 🟡 P3-nit (sugestie)

- [ ] 🟡 [nit] **packages/sleeper-web/src/components/TimePickerField.tsx:68-93 + DatePickerField.tsx:71-97** — inline `style={{...}}` zamiast Tailwind `className`. NativeWind v4 obsługuje raw `<input>` na web. Mniej kodu, spójność. (KOD P3.1)
- [ ] 🟡 [nit] **packages/sleeper-web/src/features/sessions/hooks.ts:293** — `console.warn` w prod bundle. Deferred do IU11 (`babel-plugin-transform-remove-console`). (KOD P3.2)
- [ ] 🟡 [nit] **packages/sleeper-web/src/components/BigActionButton.tsx:49-53** — Pressable scale via inline style (`{ transform: [{ scale: 0.97 }] }`) zamiast reanimated `useAnimatedStyle`. Mobile smooth, web "twardy snap". Visual polish. (KOD P3.3)
- [ ] 🟡 [nit] **packages/sleeper-web/src/components/TimePickerField.tsx:74 + DatePickerField.tsx:78** — `aria-label` przesłania visual label. Lepiej `aria-labelledby` + `nativeID` na `<Text>`. (KOD P3.4)
- [ ] 🟡 [nit] **packages/sleeper-web/src/components/BigActionButton.tsx:2** — `lucide-react-native` (zachowany dla parytetu, alias w metro.config.js działa). Udokumentować w `learned-patterns.md` "Web aliasing zachowuje source-level parity". (KOD P3.5)

---

## Faza 4: PWA & Deploy

### IU11: PWA shell (manifest + service worker + iOS meta + ikony) ✅

**Delegate to:** feature-builder-fullstack | **Estymata:** M | **Wymagania:** R7 | **Zależności:** IU10 | **Commits:** `690569d` + log `39cdfee`

**Implementacja:**
- [x] Stwórz `packages/sleeper-web/public/manifest.json` (PWA standard — Sleeper, standalone, theme #208AEF, icons 192/512 maskable)
- [x] Stwórz `packages/sleeper-web/public/sw.js` (~75 LOC, cache-first shell + skip Supabase API + offline SPA fallback)
- [x] Stwórz `packages/sleeper-web/public/icons/icon-192.png` (sips z sleeper-app/assets/images/icon.png)
- [x] Stwórz `packages/sleeper-web/public/icons/icon-512.png`
- [x] Stwórz `packages/sleeper-web/public/icons/apple-touch-icon.png` (180×180)
- [x] Stwórz `packages/sleeper-web/public/favicon.png`
- [x] Stwórz `packages/sleeper-web/public/index.html` (custom Expo template — iOS meta + manifest link + theme-color, ZAMIAST `+html.tsx` bo `web.output: "single"`)
- [x] Stwórz `packages/sleeper-web/src/features/pwa/registerSW.ts` (idempotentny, window.load defer, error path)
- [x] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (call `registerSW()` w useEffect)
- [x] Zaadresowano deferred P2/P3 z Faz 1+2 (security/perf hardening przed deploy) — patrz "Do poprawy po review fazy 1/2"

**Testy:**
- [x] Test: `/manifest.json` zwraca poprawny JSON (unit test parsuje + sprawdza pola)
- [x] Test: `/sw.js` zwraca poprawny JS (unit test invariants: cache strategy, Supabase skip, navigate fallback)
- [x] Test: `translate-auth-error` (10 cases — Faza 1 P2.7)
- [x] Test: registerSW invariants (window/navigator guards, scope, error path) + sw.js invariants + manifest.json contract + index.html template invariants (29 cases razem)
- [ ] Test: [Manual-mobile] Safari iOS → Share → Add to Home Screen → ikona z apple-touch-icon, nazwa "Sleeper" (czeka na IU12 deploy)
- [ ] Test: [Manual-mobile] tap ikony home screen → standalone PWA (bez Safari chrome) (czeka na IU12 deploy)
- [ ] Test: [Manual-mobile] safe-area-inset OK (status bar nie nakłada na header)
- [ ] Test: [Manual-mobile] Lighthouse PWA audit (Chrome desktop mobile emulation) — installable ✓, SW ✓, manifest valid ✓
- [ ] Test: [Manual-mobile] DevTools → Application → Service Worker — status activated
- [ ] Test: [Manual-mobile] offline: airplane mode → reload → app shell widoczny, API failuje gracefully

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-web lint` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-web test` 158/158 PASS
- [x] Weryfikacja: `pnpm --filter sleeper-web build` produkuje `dist/manifest.json` + `dist/sw.js` + `dist/icons/` + `dist/index.html` z PWA meta tagami
- [x] Weryfikacja: `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` → 0 (zustand CJS fix zachowany)
- [ ] Weryfikacja: [Mobile-manual] Lighthouse PWA audit pass — manual test (patrz manual-test-faza-4.md)
- [ ] Weryfikacja: [Mobile-manual] Add to Home Screen + standalone — manual test (patrz manual-test-faza-4.md)
- [ ] Weryfikacja: [Mobile-manual] safe-area-inset działa — manual test (patrz manual-test-faza-4.md)

**Operator checklist:**
- [ ] User instaluje PWA z Safari iOS (po deploy IU12), potwierdza ikona + nazwa
- [ ] User otwiera PWA z home screen, potwierdza standalone mode

---

### IU12: Build pipeline + deploy na Vercel ✅

**Delegate to:** feature-builder-data | **Estymata:** M | **Wymagania:** R1, R7 | **Zależności:** IU11 | **Commits:** `d5471a3` + log `c02b638`

**Implementacja:**
- [x] Modyfikuj `packages/sleeper-web/package.json` (`build:check`, `check:invariants` scripts)
- [x] Stwórz `packages/sleeper-web/vercel.json` (SPA rewrites + Cache-Control per asset type + Service-Worker-Allowed)
- [x] Modyfikuj root `package.json` (`web:build:check`, `web:test` proxies)
- [x] Modyfikuj `packages/sleeper-web/.gitignore` — JUZ MA `dist/` i `.expo/` (no-op)
- [x] Stwórz `docs/runbook/sleeper-web-deploy.md` (10 sekcji: setup, deploy, rollback, SW invalidation, iPhone debug, monitoring, troubleshooting)
- [x] Modyfikuj `CLAUDE.md` (root) — sekcja "Layout repozytorium" + "Walidacja" + "Runtime" (split Mobile + Web)

**Testy:**
- [x] Test: `dist/` zawiera index.html, manifest.json, sw.js, _expo/static/js/*.js, _expo/static/css/*.css, icons/*, favicon.png
- [x] Test: dist/manifest.json poprawnie sparsuje się jako JSON (unit test)
- [ ] Test: [Manual-mobile] Vercel prod URL otwiera się w Safari iOS (czeka na user deploy)
- [ ] Test: [Manual-mobile] prod URL: sign-in działa, sesja persist
- [ ] Test: [Manual-mobile] prod URL: Add to Home Screen → standalone PWA
- [ ] Test: [Manual-mobile] cross-device: prod PWA + sleeper-app — start sesji na PWA widoczne w mobile via Realtime
- [ ] Test: [Manual] Vercel env vars setup poprawnie (build log)

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-web build` exit code 0
- [x] Weryfikacja: `pnpm web:build:check` (full pipeline: tsc + lint + test + invariants + build) exit code 0
- [x] Weryfikacja: `ls packages/sleeper-web/dist/{manifest.json,sw.js,index.html,icons/apple-touch-icon.png,icons/icon-192.png,icons/icon-512.png,favicon.png}` — wszystkie istnieją
- [ ] Weryfikacja: [Mobile-manual] Vercel prod URL otwiera się i logowanie działa — manual test (patrz manual-test-faza-4.md)
- [ ] Weryfikacja: [Mobile-manual] PWA installable z prod URL — manual test

**Operator checklist (USER ACTION):**
- [ ] User konfiguruje Vercel project (root: `packages/sleeper-web`, build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter sleeper-web build`, output: `dist`, Node 22)
- [ ] User ustawia env vars w Vercel: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview + Development)
- [ ] User dodaje prod URL do Supabase Auth → URL Configuration (Site URL + Redirect URLs whitelist — PKCE wymaga)
- [ ] User pierwszy deploy (git push lub Vercel UI redeploy), potwierdza prod URL otwiera PWA
- [ ] User instaluje PWA z prod URL na swój iPhone + iPhone partnera, potwierdza ten sam stan po zalogowaniu
- [ ] User uruchamia Lighthouse PWA audit z Chrome DevTools — installable ✓, SW ✓, manifest valid ✓

---

## Do poprawy po review fazy 4

⚠️ **Status:** KONTYNUUJ Z ZASTRZEŻENIAMI — 0 P1, 3 P2, 5 P3. PWA deploy-ready. P2 do naprawy w follow-up commit przed pierwszym Vercel deployem (nie blokuje kodowo).

**Pełny raport:** [review-faza-4.md](./review-faza-4.md)

### 🟠 P2-important (do naprawy przed deployem prod)

- [x] 🟠 [important] **packages/sleeper-web/babel.config.js + src/features/sessions/hooks.ts:293** — `babel-plugin-transform-remove-console` NIE strippuje `console.warn` z app kodu. **DONE (cykl 1 fixów fazy 4):** zastosowano OBA fixy — `api.cache.using(() => process.env.NODE_ENV)` w babel.config.js + `NODE_ENV` guard w hooks.ts:293, AuthProvider.tsx:35, supabase.ts:21. Weryfikacja empiryczna: `[notifications]` i `[auth] getSession` STR NIEOBECNE w bundle prod; `console.warn` count 71→41 (pozostałe to vendor RN — Metro nie babiluje node_modules, OK).
- [x] 🟠 [important] **packages/sleeper-web/public/icons/README.md** — plik deployowany do prod. **DONE:** `git mv packages/sleeper-web/public/icons/README.md packages/sleeper-web/docs/icons.md`. Weryfikacja: `dist/icons/` zawiera tylko PNG (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`).
- [x] 🟠 [important] **packages/sleeper-web/public/sw.js:8-9 + docs/runbook/sleeper-web-deploy.md** — cache-first dla `/` ryzykuje 404 white screen po deploy. **DONE:** opcja A — **network-first dla nawigacji** (`request.mode === 'navigate'`) z cache fallback offline. Cache-first zachowany dla immutable static assets. Bump `CACHE_NAME = 'sleeper-shell-v2'`. Runbook zaktualizowany (sekcja 4 + troubleshooting). Test invariant `network-first` dodany.

### 🟡 P3-nit (sugestie post-MVP polish)

- [x] 🟡 [nit] **packages/sleeper-web/vercel.json:5** — rewrite regex `manifest.json` nieescape'owany `.`. **DONE:** escape zastosowany dla `manifest.json`, `sw.js`, `favicon.png`, `robots.txt`.
- [ ] 🟡 [nit] **packages/sleeper-web/public/manifest.json:19,25** — ikony `purpose: "any maskable"` bez prawdziwych maskable assets. **DEFERRED (known-issues):** wymaga dedicated graphic asset, post-MVP polish.
- [x] 🟡 [nit] **packages/sleeper-web/src/lib/supabase.ts:40** — brak invariant testu na `flowType: 'pkce'`. **DONE:** dodano `describe('supabase.ts invariants (security)')` z 2 testami (flowType pkce + detectSessionInUrl) w registerSW.test.ts.
- [ ] 🟡 [nit] **packages/sleeper-web/public/sw.js:8** — `CACHE_NAME` manualny bump. **DEFERRED:** P2.3 fix (network-first) drastycznie obniza pilnosc — manualny bump nadal OK dla zmian sw.js/manifest.json.
- [x] 🟡 [nit] **packages/sleeper-web/vercel.json** — brakujące security headers. **DONE:** dodano `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` w global headers (`source: /(.*)`).

---

## Postęp ogólny

- [x] **Faza 1: Bootstrap & Foundation** (IU1-IU4) ✅ 2026-06-05
- [x] **Faza 2: Data Layer** (IU5-IU7) ✅ 2026-06-05
- [x] **Faza 3: UI & Routes** (IU8-IU10) ✅ 2026-06-05
- [x] **Faza 4: PWA & Deploy** (IU11-IU12) ✅ 2026-06-06 (kodowo; deploy + mobile-manual = user action)

## Końcowe kryteria akceptacji

- [ ] Wszystkie 12 IUs ukończone
- [ ] Zero modyfikacji w `packages/sleeper-app/`
- [ ] `pnpm --filter sleeper-web` typecheck + lint + test + build wszystko pass
- [ ] Mobile smoke test sleeper-app — bez regresji
- [ ] PWA installable z prod URL na iPhone Safari
- [ ] Cross-device sync potwierdzony (PWA ↔ sleeper-app)
- [ ] Lighthouse PWA audit pass

## Źródła

- Requirements doc: `docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md`
- Plan techniczny: `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`
