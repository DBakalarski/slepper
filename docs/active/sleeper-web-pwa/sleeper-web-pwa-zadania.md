---
title: Sleeper Web — PWA — checklista zadań
branch: feature/sleeper-web-pwa
ostatnia_aktualizacja: 2026-06-05 (Faza 2 ukończona)
---

# Sleeper Web — PWA — checklista zadań

**Branch:** `feature/sleeper-web-pwa`
**Ostatnia aktualizacja:** 2026-06-05 (Faza 2 ukończona)

Pełne szczegóły IU w `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`.

## Status faz

- ✅ **Faza 1: Bootstrap & Foundation** (IU1-IU4) — ukończono 2026-06-05
- ✅ **Faza 2: Data Layer** (IU5-IU7) — ukończono 2026-06-05
- ⬜ Faza 3: UI & Routes (IU8-IU10)
- ⬜ Faza 4: PWA & Deploy (IU11-IU12)

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

- [ ] 🟠 [important] **packages/sleeper-web/src/lib/supabase.ts:18-28** — dodaj `flowType: 'pkce'` w `auth` config. Domyślny `implicit` flow leakuje `access_token` w URL fragment → history API, Referer headers, browser extensions. PKCE jest best practice dla web PWA. Wymaga konfiguracji redirect URL whitelisty w Supabase Dashboard. (Security P2.1)
- [ ] 🟠 [important] **packages/sleeper-web/src/app/(auth)/sign-in.tsx:42** — wyrównaj walidację z sign-up: użyj `isValidEmail` i `MIN_PASSWORD` (early return), dodaj `maxLength={254}` na email i `maxLength={128}` na password TextInputach. Asymetria + brak max length = niepotrzebne zapytania do Supabase + potencjalny DoS payload. (Security P2.2 + Spec-flow)
- [ ] 🟠 [important] **packages/sleeper-web/src/app/_layout.tsx:11** — zmień `const queryClient = new QueryClient()` na `const [queryClient] = useState(() => new QueryClient())` wewnątrz `RootLayout`. Bezpieczne dla fast-refresh i potencjalnego SSR/RSC. (Performance P2.3)
- [ ] 🟠 [important] **packages/sleeper-web/src/features/settings/useThemeStore.ts:23** — custom storage adapter: `Platform.OS === 'web' ? localStorage : AsyncStorage`. AsyncStorage na web async-wrapuje localStorage → pierwszy render z default `'system'` → re-render z prawdziwym mode = FOWT risk. Sync hydration eliminuje flash. (Performance P2.4)
- [ ] 🟠 [important] **packages/sleeper-web/src/app/_layout.tsx:19** — usuń `<Stack.Screen name="(app)" />` lub dodaj stub `src/app/(app)/_layout.tsx`. Premature referencja do segmentu utworzonego w IU10 — expo-router może warningować. (Architecture P2.5)
- [ ] 🟠 [important] **packages/sleeper-web/src/app/index.tsx** — dodaj komentarz `// FAZA 5+: index.tsx dostanie redirect logic na podstawie useAuth().status`. Bez tego przyszły dev nie wie czy placeholder to bug czy świadoma decyzja. (Architecture P2.6)
- [ ] 🟠 [important] **packages/sleeper-web/src/features/auth/translate-auth-error.test.ts** — dodaj unit test (czysta funkcja, 6 cases: invalid login, email not confirmed, already registered, password, network, fallback). ~30 LOC, wysoki ROI. (Spec-flow P2.7)

### 🟡 P3-nit (sugestie)

- [ ] 🟡 [nit] **packages/sleeper-web/src/features/auth/translate-auth-error.ts:21** — fallback `return message` może wyciekać raw Supabase error (PostgREST hint, infra). Zmień na generic `"Nie udalo sie. Sprobuj ponownie."`. (Security P3)
- [ ] 🟡 [nit] **packages/sleeper-web/src/lib/supabase.ts:11-16** — decyzja produktowa: missing env vars → `console.warn` (cichy fail z mylącym "błąd sieci" downstream) vs `throw` (fail-loud build-time). Vercel prod build = realne ryzyko incydentu. (Spec-flow P3)
- [ ] 🟡 [nit] Rozważ `scripts/check-no-native-imports.sh` automated test (grep invariant że `notifications.ts` i `schedule-nap-side-effects.ts` w sleeper-web nie importują expo-notifications). W IU5 ten sam check się powtórzy. (Spec-flow P3)

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
- [ ] Test: [Manual-mobile] (po IU10) start sesji w PWA → druga osoba w sleeper-app widzi via Realtime

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
- [ ] Test: [Manual-mobile] (po IU10) RecommendationCard widoczna z poprawnym czasem next sleep window

**Weryfikacja:**
- [x] Weryfikacja: `pnpm --filter sleeper-machine build` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-machine-kotki build` exit code 0
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0

---

## Faza 3: UI & Routes

### IU8: UI components (base + feature + web pickers)

**Delegate to:** feature-builder-ui | **Estymata:** L | **Wymagania:** R3, R4, R10 | **Zależności:** IU1, IU4

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/src/components/ui/Avatar.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/Badge.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/Card.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/IconButton.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/ProgressBar.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/ProgressBarStacked.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/ProgressRing.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/SegmentedControl.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ui/Switch.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/ActiveWindowCard.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/BigActionButton.tsx` (kopia, scale fallback gotów)
- [ ] Stwórz `packages/sleeper-web/src/components/Chip.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/HomeHeader.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/QuickActions.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/SessionListItem.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/SleepInProgressCard.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/TodayStatsCard.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/components/TimePickerField.tsx` (**NEW — HTML5 input type=time wrapper**)
- [ ] Stwórz `packages/sleeper-web/src/components/DatePickerField.tsx` (**NEW — HTML5 input type=date wrapper**)

**Testy:**
- [ ] Test: [Manual-mobile] wszystkie komponenty renderują się w Safari iOS bez console errors
- [ ] Test: [Manual-mobile] TimePickerField tap → iOS native wheel picker minutes scroll OK
- [ ] Test: [Manual-mobile] DatePickerField tap → iOS native date picker
- [ ] Test: [Manual-mobile] BigActionButton press → scale animation (Reanimated lub CSS fallback)
- [ ] Test: [Manual-mobile] ProgressRing renderuje SVG poprawnie

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [ ] Weryfikacja: [Mobile-manual] TimePicker pokazuje natywny iOS wheel — manual test
- [ ] Weryfikacja: [Mobile-manual] brak white screen / console errors — manual test
- [ ] Weryfikacja: [Mobile-manual] BigActionButton animation działa — manual test

**Operator checklist:**
- [ ] User testuje TimePickerField w Safari iOS, potwierdza parytet z mobile fix (minute scroll)

---

### IU9: Routes (auth) — auth gate

**Delegate to:** feature-builder-fullstack | **Estymata:** S | **Wymagania:** R8 | **Zależności:** IU3

**Implementacja:**
- [ ] Modyfikuj `packages/sleeper-web/src/app/(auth)/_layout.tsx` (doprecyzowanie routing)
- [ ] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (auth gate: signed_out + path nie `(auth)` → redirect /sign-in)

**Testy:**
- [ ] Test: [Manual-mobile] niezalogowany user otwiera `/` → redirect /sign-in
- [ ] Test: [Manual-mobile] zalogowany user otwiera `/sign-in` → redirect `/`
- [ ] Test: [Manual-mobile] `/sign-up` URL działa standalone

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [ ] Weryfikacja: [Mobile-manual] auth gate działa — manual test

---

### IU10: Routes (app) — main screens

**Delegate to:** feature-builder-fullstack | **Estymata:** XL | **Wymagania:** R3, R4, R5, R10 | **Zależności:** IU5-IU9

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/_layout.tsx` (kopia)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/index.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/history.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/profile.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/settings.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/stats.tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` (kopia — expo-keep-awake → no-op)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/child/[id].tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/app/(app)/session/[id].tsx` (kopia 1:1)
- [ ] Stwórz `packages/sleeper-web/src/features/sessions/components/` (BackdatedSessionModal, EditSessionForm, itp.)
- [ ] Stwórz `packages/sleeper-web/src/features/children/components/`
- [ ] Stwórz `packages/sleeper-web/src/features/family/components/`

**Testy:**
- [ ] Test: [Manual-mobile] Main dashboard `/` — ostatnia aktywność, smart-start, BigActionButton START
- [ ] Test: [Manual-mobile] Start sesji → optimistic UI → cross-device sync via Realtime
- [ ] Test: [Manual-mobile] History `/history` — grupowanie per dzień w app tz
- [ ] Test: [Manual-mobile] Edit session `/session/[id]` — TimePicker + cross-day night sleep
- [ ] Test: [Manual-mobile] Stats `/stats` — wykresy 7 dni
- [ ] Test: [Manual-mobile] Settings `/settings` — theme toggle + sign-out
- [ ] Test: [Manual-mobile] Profile `/profile` — edycja
- [ ] Test: [Manual-mobile] Child detail `/child/[id]` — zmiana algorytmu → recommendation refresh
- [ ] Test: [Manual-mobile] Backdated insert — prefill `todayDateInAppTz`, walidacja endAt>startAt

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [ ] Weryfikacja: `pnpm --filter sleeper-web lint` exit code 0
- [ ] Weryfikacja: [Mobile-manual] wszystkie screens renderują się — manual test
- [ ] Weryfikacja: [Mobile-manual] cross-day night sleep zapisuje poprawnie — manual test
- [ ] Weryfikacja: [Mobile-manual] cross-device sync z sleeper-app — manual test

**Operator checklist:**
- [ ] User: pełny flow (start → end → edit → stats), każdy krok widoczny na drugim urządzeniu
- [ ] User: cross-day night sleep test (22:00 → 06:00) z weryfikacją bazy

---

## Faza 4: PWA & Deploy

### IU11: PWA shell (manifest + service worker + iOS meta + ikony)

**Delegate to:** feature-builder-fullstack | **Estymata:** M | **Wymagania:** R7 | **Zależności:** IU10

**Implementacja:**
- [ ] Stwórz `packages/sleeper-web/public/manifest.json` (PWA standard)
- [ ] Stwórz `packages/sleeper-web/public/sw.js` (~50 LOC, cache-first shell, network-first API)
- [ ] Stwórz `packages/sleeper-web/public/icons/icon-192.png`
- [ ] Stwórz `packages/sleeper-web/public/icons/icon-512.png`
- [ ] Stwórz `packages/sleeper-web/public/icons/apple-touch-icon.png` (180×180)
- [ ] Stwórz `packages/sleeper-web/public/favicon.png`
- [ ] Stwórz `packages/sleeper-web/src/app/+html.tsx` (iOS meta + manifest link)
- [ ] Stwórz `packages/sleeper-web/src/features/pwa/registerSW.ts`
- [ ] Modyfikuj `packages/sleeper-web/src/app/_layout.tsx` (call `registerSW()` w useEffect)

**Testy:**
- [ ] Test: `/manifest.json` zwraca poprawny JSON
- [ ] Test: `/sw.js` zwraca poprawny JS
- [ ] Test: [Manual-mobile] Safari iOS → Share → Add to Home Screen → ikona z apple-touch-icon, nazwa "Sleeper"
- [ ] Test: [Manual-mobile] tap ikony home screen → standalone PWA (bez Safari chrome)
- [ ] Test: [Manual-mobile] safe-area-inset OK (status bar nie nakłada na header)
- [ ] Test: [Manual-mobile] Lighthouse PWA audit (Chrome desktop mobile emulation) — installable ✓, SW ✓, manifest valid ✓
- [ ] Test: [Manual-mobile] DevTools → Application → Service Worker — status activated
- [ ] Test: [Manual-mobile] offline: airplane mode → reload → app shell widoczny, API failuje gracefully

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0
- [ ] Weryfikacja: `pnpm --filter sleeper-web build` produkuje `dist/manifest.json` + `dist/sw.js`
- [ ] Weryfikacja: [Mobile-manual] Lighthouse PWA audit pass — manual test
- [ ] Weryfikacja: [Mobile-manual] Add to Home Screen + standalone — manual test
- [ ] Weryfikacja: [Mobile-manual] safe-area-inset działa — manual test

**Operator checklist:**
- [ ] User instaluje PWA z Safari iOS, potwierdza ikona + nazwa
- [ ] User otwiera PWA z home screen, potwierdza standalone mode

---

### IU12: Build pipeline + deploy na Vercel

**Delegate to:** feature-builder-data | **Estymata:** M | **Wymagania:** R1, R7 | **Zależności:** IU11

**Implementacja:**
- [ ] Modyfikuj `packages/sleeper-web/package.json` (build script, build:check)
- [ ] Stwórz `packages/sleeper-web/vercel.json` (jeśli wymaga custom SPA rewrites)
- [ ] Modyfikuj root `package.json` (web:deploy script opcjonalny)
- [ ] Modyfikuj `packages/sleeper-web/.gitignore` (dist/, .expo/)
- [ ] Stwórz `docs/runbook/sleeper-web-deploy.md` (deploy/rollback/env vars)
- [ ] Modyfikuj `CLAUDE.md` (root) — sekcja "Layout repozytorium" + "Walidacja"

**Testy:**
- [ ] Test: `dist/` zawiera index.html, manifest.json, sw.js, _expo/static/js/*.js, _expo/static/css/*.css
- [ ] Test: dist/manifest.json poprawnie sparsuje się jako JSON
- [ ] Test: [Manual-mobile] Vercel prod URL otwiera się w Safari iOS
- [ ] Test: [Manual-mobile] prod URL: sign-in działa, sesja persist
- [ ] Test: [Manual-mobile] prod URL: Add to Home Screen → standalone PWA
- [ ] Test: [Manual-mobile] cross-device: prod PWA + sleeper-app — start sesji na PWA widoczne w mobile via Realtime
- [ ] Test: [Manual] Vercel env vars setup poprawnie (build log)

**Weryfikacja:**
- [ ] Weryfikacja: `pnpm --filter sleeper-web build` exit code 0
- [ ] Weryfikacja: `ls packages/sleeper-web/dist/manifest.json dist/sw.js dist/index.html` — wszystkie istnieją
- [ ] Weryfikacja: [Mobile-manual] Vercel prod URL otwiera się i logowanie działa — manual test
- [ ] Weryfikacja: [Mobile-manual] PWA installable z prod URL — manual test

**Operator checklist:**
- [ ] User konfiguruje Vercel (root: packages/sleeper-web, build/output, env vars)
- [ ] User pierwszy deploy, potwierdza prod URL
- [ ] User instaluje PWA z prod URL na swój iPhone + iPhone partnera, potwierdza ten sam stan po zalogowaniu

---

## Postęp ogólny

- [x] **Faza 1: Bootstrap & Foundation** (IU1-IU4) ✅ 2026-06-05
- [x] **Faza 2: Data Layer** (IU5-IU7) ✅ 2026-06-05
- [ ] **Faza 3: UI & Routes** (IU8-IU10)
- [ ] **Faza 4: PWA & Deploy** (IU11-IU12)

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
