---
title: Sleeper Web — PWA — podsumowanie ukończenia
branch: feature/sleeper-web-pwa
data_ukonczenia: 2026-06-06 (kod gotowy; deploy Vercel + manual-on-device = user action)
---

# Sleeper Web — PWA — podsumowanie ukończenia

**Branch:** `feature/sleeper-web-pwa`
**Data ukończenia (kodowo):** 2026-06-06
**Zakres:** 4 fazy / 12 IUs / 2 cykle review per faza

## Co zostało dostarczone

Nowy package `packages/sleeper-web/` — **Expo SDK 54 web-only PWA** z pełnym feature-parity wobec `sleeper-app` (start/stop sesji, edycja historii, cross-day night sleeps, algorytmy Galland/Kotki + smart-start, family management, theme tri-state).

- **Faza 1 (IU1-IU4) — Bootstrap & Foundation:** package skeleton (config, deps, scripts), lib/ kopia 1:1 (time, supabase, query-client, etc.), `notifications.ts` no-op mock, AuthProvider + sign-in/sign-up, ThemeProvider + tri-state Zustand persist.
- **Faza 2 (IU5-IU7) — Data Layer:** 9 sessions hooks + Realtime + timer, children/family hooks + `useActiveChild` Zustand, recommendation adapter + `useSleepRecommendation` + `RecommendationCard`. `schedule-nap-side-effects.ts` standalone no-op (eliminuje fikcyjny notification graph z bundla).
- **Faza 3 (IU8-IU10) — UI & Routes:** 28 plików parytet 1:1 z sleeper-app + 2 NEW web pickery (HTML5 `<input type="time/date">` z natywnym iOS wheel pickerem), 9 routes (`(auth)` + `(app)/{index,history,profile,settings,stats,sleep-fullscreen,child/[id],session/[id]}`), auth gate dwustronny.
- **Faza 4 (IU11-IU12) — PWA & Deploy:** manifest.json + sw.js (network-first dla nawigacji, cache-first dla immutable assets), iOS meta tagi, ikony 192/512/180/48 (generowane `sips`), `registerSW.ts`, `vercel.json` (SPA rewrites + Cache-Control + security headers), runbook deploy/rollback (`docs/runbook/sleeper-web-deploy.md`).

**Stan walidacji końcowej:** typecheck PASS, lint PASS, **160/160 testów PASS**, `pnpm web:build:check` PASS, sleeper-app regression PASS (zero modyfikacji w mobile).

## Podjęte kluczowe decyzje

- **Osobny package, zero shared lib** — kopiowanie kodu 1:1 zamiast wyciągania shared layer (YAGNI). Trade-off: ryzyko feature drift mobile↔web kontrolowane przez świadome re-sync co 2-4 tyg.
- **Zero modyfikacji w `packages/sleeper-app/`** — twarda granica izolacji, potwierdzona po każdej fazie regression checkiem.
- **Expo SDK 54 web-only z `web.output: "static"`** — bez Next.js, bez SSR, hosting jako statyczne assets na Vercel.
- **No-op mock notifications** zamiast adapter pattern — `lib/notifications.ts` (5 eksportów) i `features/sessions/schedule-nap-side-effects.ts` (3 funkcje). Sygnatury 1:1 z sleeper-app pozwoliły skopiować `sessions/hooks.ts` bez modyfikacji importów.
- **HTML5 native pickers zamiast portu mobile TimePickerField** — iOS Safari renderuje natywny wheel picker minut OOTB, rozwiązuje crop bug znany z mobile fix (`fixy-edycja-aktywnosc-smart-start`). Font-size 16px zapobiega auto-zoom.
- **PKCE flow + `detectSessionInUrl: true`** — różnica vs sleeper-app (`false`) dla web auth callback w URL fragment.
- **Web localStorage adapter dla theme** — `useThemeStore` z `Platform.OS` guard zamiast AsyncStorage (sync hydration eliminuje FOWT risk).
- **Workspace deps `sleeper-machine` + `sleeper-machine-kotki`** — pre-build `dist/` przed `tsc` w sleeper-web. Pattern udokumentowany.
- **Tri-state theme + `useEffectiveTheme()` single-source-of-truth** — zachowany learned-pattern (raw `useColorScheme()` tylko w `ThemeProvider.tsx`).
- **SW network-first dla nawigacji** zamiast cache-first — eliminuje ryzyko stale HTML→404 JS po deploy. Cache-first zachowany dla immutable static assets z manual `CACHE_NAME` bump (`sleeper-shell-v{N}`).
- **`babel-plugin-transform-remove-console` + `api.cache.using(NODE_ENV)`** — produkcyjny bundle bez `console.warn/log` (vendor RN excluded — Metro nie babiluje `node_modules`, akceptowalne).
- **`zustand` ESM → CJS resolution w `metro.config.js`** — custom `resolveRequest` rozwiązuje `import.meta` SyntaxError w classic `<script defer>` bundle.
- **Wake Lock API w `sleep-fullscreen.tsx`** — `navigator.wakeLock.request('screen')` + visibilitychange re-acquire. Zastępuje `expo-keep-awake` native-only.
- **`Alert.alert` web no-op → `lib/confirm.ts`** — cross-platform wrapper (`window.confirm` na web, `Alert.alert` na native). 2 callsites destruktywnych akcji przepisane.
- **Preventywny `setInterval(5min)` cross-midnight refresh** w `useSleepRecommendation` — `useFocusEffect` na web nie ma deterministic focus event, fallback przez interval.

## Utworzone / zmodyfikowane pliki (główne)

**Nowy package — `packages/sleeper-web/`:**
- Config: `package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `tsconfig.json`, `eslint.config.js`, `vitest.config.mjs`, `vercel.json`, `.env.example`, `.gitignore`, `nativewind-env.d.ts`, `expo-env.d.ts`
- `src/lib/` — 17 plików (15 kopia 1:1 z sleeper-app + `notifications.ts` no-op mock + `confirm.ts` cross-platform wrapper)
- `src/features/` — auth (2), sessions (5 + standalone schedule-nap mock), children (2), family (3), recommendation (3), settings (3), pwa (1 `registerSW.ts`)
- `src/components/` — 17 base/feature UI (kopia 1:1) + `TimePickerField.tsx` + `DatePickerField.tsx` (NEW HTML5)
- `src/app/` — `_layout.tsx` (sync 1:1) + `(auth)/{_layout,sign-in,sign-up}.tsx` + `(app)/{_layout,index,history,profile,settings,stats,sleep-fullscreen,child/[id]/edit,session/[id]}.tsx`
- `src/global.css`
- `public/{manifest.json, sw.js, index.html, favicon.png, icons/{icon-192,icon-512,apple-touch-icon}.png}`
- `docs/icons.md` (przeniesione z `public/icons/README.md` żeby nie leakować do prod)

**Zmiany poza package:**
- Root `package.json` — skrypty `web:dev`, `web:build`, `web:build:check`, `web:typecheck`, `web:lint`, `web:test`
- Root `CLAUDE.md` — sekcje "Layout repozytorium", "Stack", "Walidacja", "Runtime" o sleeper-web (już zaaplikowane w IU11/IU12)
- Nowy `docs/runbook/sleeper-web-deploy.md` (10 sekcji: setup Vercel, env vars, Supabase Auth URL config, deploy, rollback, troubleshooting, Lighthouse audit, mobile install, cross-device sync test)

**ZERO modyfikacji w `packages/sleeper-app/`** — granica izolacji utrzymana (potwierdzone `git log --oneline packages/sleeper-app/`).

## Wyciągnięte wnioski

### Pattern: web-specific API gaps przy parytecie 1:1
Kopia 1:1 mobile→web nie chroni przed silent web gaps:
- `Alert.alert` → no-op w `react-native-web` (destruktywne akcje cicho nie odpalają callbacka). Fix: cross-platform wrapper `lib/confirm.ts` z `window.confirm`.
- `expo-keep-awake` → native-only. Fix: Wake Lock API + visibilitychange re-acquire.
- `useFocusEffect` → na web brak deterministic focus event, polega na `visibilitychange`. Fix: preventywny `setInterval` cross-midnight.

**Lesson:** parytet 1:1 ujawnia web gaps dopiero w runtime, nie w `tsc`/`lint`/`build`. Quality gate dla web wymaga **browser smoke test** (Playwright + dist server) PRZED deploy.

### Pattern: `pnpm build` exit 0 ≠ runtime works
Faza 2 review: bundle build wykrył pre-existing latentny problem (eager-init `supabase.ts` AsyncStorage `window` undefined w Node static export). Faza 3 review: bundle parse error (`import.meta` z `zustand/esm` w classic `<script>`) — `pnpm build` exit 0 zamaskował problem. **Lesson:** add browser smoke (`build:smoke` z Playwright + headless console-error check) jako quality gate w każdym IU touching bundla.

### Pattern: `babel-plugin-transform-remove-console` wymaga `api.cache.using`
Domyślnie `api.cache(true)` permamentnie cachuje plugin choice → `NODE_ENV` z czasu pierwszego build leakuje do kolejnych. Fix: `api.cache.using(() => process.env.NODE_ENV)`. Dodatkowo: Metro NIE babiluje `node_modules` → vendor `console.warn` przetrwa (akceptowalne, nie blokuje deploy). Dev-only logi (z `if NODE_ENV !== production` guard) eliminowane przez dead-code elimination DZIAŁA.

### Pattern: SW network-first dla nawigacji + cache-first dla assets
Cache-first dla `/` w SW = każdy deploy z nowym JS hash wymaga manual `CACHE_NAME` bump (operator zapomni → stale HTML → 404 JS → white screen). Network-first dla `request.mode === 'navigate'` z cache fallback offline drastycznie obniża pilność manual bump. Cache-first zachowany dla immutable static assets (`/_expo/static/`) — best of both.

### Pattern: zustand ESM `import.meta` w classic bundle
`metro` resolwuje `"import"` condition z `zustand/package.json#exports` → wybiera ESM. Expo Web ładuje bundle jako classic `<script defer>` (nie `type="module"`) → `Uncaught SyntaxError: Cannot use 'import.meta' outside a module` → cały tree fail, `#root` pusty. Fix: custom `resolveRequest` w `metro.config.js` forsuje CJS dla `zustand`. Bundle `import.meta` count: 0 po fixie.

### Pattern: HTML5 native pickery > React Native time/date pickery na web
iOS Safari renderuje natywny wheel picker minut OOTB dla `<input type="time">` — ZERO custom code dla zachowania mobile-quality UX (rozwiązuje crop bug z `fixy-edycja-aktywnosc-smart-start`). Wymagania: `font-size ≥ 16px` (zapobiega auto-zoom), `min-height: 44pt` (HIG/WCAG), konwersja tz przez `parseAppTzDateTime` + `combineDateAndTimeInAppTz` (learned-pattern TZ-safe).

### Pattern: monorepo workspace deps wymagają pre-build dist/
`sleeper-web` importuje typy z `sleeper-machine` + `sleeper-machine-kotki`. Resolve idzie przez `dist/` workspace deps — pierwszy `tsc --noEmit` w sleeper-web wymaga `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build` jako pre-step. Udokumentowane w plan technicznym sekcja "Build order".

### Pattern: parytet 1:1 jako kapitał na przyszłość
28 plików kopia 1:1 z sleeper-app + diff weryfikacja po każdym IU. Bug-fix w mobile będzie automatycznie odziedziczony po następnej kopii (lub odwrotnie). Świadomy trade-off: re-sync mobile↔web co 2-4 tyg lub przy znaczącej zmianie domeny. Lista plików w sekcji "Faza 3 — decyzje implementacyjne" kontekstu.

## Open follow-ups (deferred do post-MVP polish)

Świadomie deferred — nie blokują deploy, lista w `known-issues.md`:
- **P3.2 (Faza 4):** manifest.json `purpose: "any maskable"` bez dedicated assets — wymaga regen przez maskable.app/ z safe-area padding.
- **P3.4 (Faza 4):** auto-inject git SHA w CACHE_NAME postbuild — manualny bump wystarcza po fix P2.3 (network-first nawigacja).
- **Kosmetyka Fazy 3 P3.1/P3.3/P3.4/P3.5:** inline style w pickerach, CSS scale w BigActionButton zamiast reanimated, `aria-label` vs `aria-labelledby`, `lucide-react-native` mimo aliasu w `metro.config.js`.

## User action items (poza scope kodowym)

- Konfiguracja projektu Vercel (root, build command, output, Node 22) wg runbooka sekcja 1.
- Env vars w Vercel: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview + Development).
- Supabase Auth URL Configuration: dodaj prod URL do Site URL + Redirect URLs (PKCE wymaga).
- Lighthouse PWA audit po pierwszym deploy.
- Add to Home Screen + standalone test na iPhone Safari (operator + partner).
- Cross-device sync test (PWA vs sleeper-app Expo Go).

## Źródła i archiwum

- Plan techniczny: [sleeper-web-pwa-plan.md](./sleeper-web-pwa-plan.md)
- Kontekst implementacyjny (decyzje + reviewy): [sleeper-web-pwa-kontekst.md](./sleeper-web-pwa-kontekst.md)
- Checklista zadań: [sleeper-web-pwa-zadania.md](./sleeper-web-pwa-zadania.md)
- Known issues: [known-issues.md](./known-issues.md)
- Review raporty: [review-faza-1.md](./review-faza-1.md), [review-faza-2.md](./review-faza-2.md), [review-faza-3.md](./review-faza-3.md), [review-faza-4.md](./review-faza-4.md)
- Manual test checklists: [manual-test-faza-1.md](./manual-test-faza-1.md), [manual-test-faza-3.md](./manual-test-faza-3.md), [manual-test-faza-4.md](./manual-test-faza-4.md)
- Runbook deploy: `docs/runbook/sleeper-web-deploy.md`
- Requirements doc: `docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md`
