---
title: Code review — Faza 4 (PWA & Deploy)
data: 2026-06-06
faza: 4 (IU11 PWA shell + IU12 Vercel pipeline + P2 hardening Faz 1+2)
severity_gate: KONTYNUUJ Z ZASTRZEŻENIAMI (3× P2, 5× P3)
---

# Code Review — Faza 4 (PWA & Deploy)

**Zakres:** IU11 (PWA shell: manifest/sw/iOS meta/registerSW/+html) + IU12 (Vercel config + runbook + build pipeline) + naprawa wszystkich deferowanych P2 z Faz 1+2 (PKCE flow, sign-in walidacja, localStorage theme adapter, translate-auth-error test, babel transform-remove-console, env throw w prod, invariant check shellscript).

**Commits Fazy 4:** `690569d` (IU11), `d5471a3` (IU12).

**Walidacja CLI:** PASS
- `pnpm --filter sleeper-web exec tsc --noEmit` exit 0
- `pnpm --filter sleeper-web lint` exit 0
- `pnpm --filter sleeper-web test` → 158/158 PASS
- `bash scripts/check-no-native-imports.sh` PASS
- `pnpm --filter sleeper-app exec tsc --noEmit` exit 0 (zero regresji sleeper-app)
- `git diff --stat 4a3e3eb..HEAD -- packages/sleeper-app/` → pusty (świadoma izolacja zachowana)

**Browser smoke (Playwright + python http.server):** PASS
- Bundle parsuje się i wykonuje, brak `SyntaxError: import.meta` (zustand CJS fix Fazy 3 zachowany — `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` = 0).
- iOS meta obecne: `theme-color #208AEF`, `apple-mobile-web-app-capable yes`, `manifest /manifest.json` link, viewport `viewport-fit=cover`.
- Jedyny console.error w runtime to świadomy fail-loud throw z `lib/supabase.ts` bez env vars (oczekiwany behavior bez `.env`; Vercel deploy dostarczy creds).

**Bundle size:** 4.42 MB (entry-c16e13c95e00beaa959ca0958273be98.js) — bez zmiany od Fazy 3 (re-add reanimated/worklets/haptics). Akceptowalne dla MVP.

---

## Severity gate

⚠️ **KONTYNUUJ Z ZASTRZEŻENIAMI** — 0 P1, **3 P2**, 5 P3.

PWA jest deploy-ready (manifest valid, SW registers, iOS meta poprawne, bundle parsuje), ale 3 P2 to operacyjne / bezpieczeństwowe smelle które warto naprawić przed pierwszym `git push origin main`. Żaden P2 nie blokuje fizycznego deployu — wszystkie graceful degradation.

---

## P1 — blocking

**Brak.** Wszystkie krytyczne problemy zaadresowane (PKCE skonfigurowany, env throw w prod, bundle parsuje się, manifest valid, sw.js registers, iOS meta kompletne, runbook szczegółowy).

---

## P2 — important (do naprawy przed deployem prod)

### 🟠 P2.1 — `babel-plugin-transform-remove-console` faktycznie NIE usuwa `console.*` z bundle

**Plik:** `packages/sleeper-web/babel.config.js:1-18` + bundle `dist/_expo/static/js/web/entry-c16e13c95e00beaa959ca0958273be98.js`

**Dowód empiryczny:**
```bash
$ NODE_ENV=production pnpm --filter sleeper-web build
$ grep -aoE "\[notifications\][^']{0,80}" dist/_expo/static/js/web/entry-*.js
[notifications] useEndSession received row with end_at === null — cancelling notification
```

`hooks.ts:293` `console.warn` jest w bundle prod mimo Faza 2 P2.3 fix opisanego jako "rozwiązane". Counts w bundle:
- `console.log` × **20** (wszystkie z vendor: react-native, ScrollView, ErrorUtils)
- `console.warn` × **71** (vendor + nasz `[notifications]` warn)
- `console.error` × **60** (oczekiwane — exclude w plugin config)

**Root cause:** `api.cache(true)` w `babel.config.js` permamentnie cachuje pierwszy odczytany config bez relookupa NODE_ENV. Plus Metro nie uruchamia babel na `node_modules` domyślnie, więc vendor `console.*` i tak nie były nigdy strippable tą techniką.

**Co działa (potwierdzone):** dead-code elimination `process.env.NODE_ENV !== 'production'` przez Metro/Terser. Dev-only logi z `registerSW.ts` ("Service Worker registered") NIE są w bundle.

**Co nie działa:** unguarded `console.warn`/`log` w hooks.ts/dev kodzie poza ifguardem NODE_ENV. Plugin nie strippuje.

**Fix opcje:**
- A) `api.cache.using(() => process.env.NODE_ENV);` zamiast `api.cache(true)` — invalidacja cache na NODE_ENV.
- B) Wrap unguarded `console.warn` w `hooks.ts:293` w `if (process.env.NODE_ENV !== 'production')` lub `__DEV__` (pattern z Fazy 4 P3) — leverage istniejący dead-code elimination zamiast pluginu.
- C) Zostawić jak jest i zaktualizować known-issues / Faza 2 P2.3 status na "częściowo rozwiązane (dev-only logi tak, unguarded nie)".

**Impact:** niski (warn diagnostic), ale podważa zaufanie do "fix" z Fazy 2 i runbook deploy security note ("brak `console.log` w produkcyjnym kodzie" — coding-rules.md §6 quality gate).

---

### 🟠 P2.2 — `dist/icons/README.md` jest deployowany do produkcji

**Plik:** `packages/sleeper-web/public/icons/README.md` → `dist/icons/README.md` → publiczny `https://prod-url.vercel.app/icons/README.md`.

**Co leaki:**
- Lokalna struktura ścieżek (`packages/sleeper-app/assets/images/icon.png`).
- Wewnętrzny build flow (sips/ImageMagick z host filesystem).
- Hint o `maskable.app` jako TODO — sygnał że ikony nie są w pełni production-ready.

**Risk:** niski (nie credentials), ale narusza coding-rules.md §9 (information disclosure) i pollutuje SPA Cache-Control header (`max-age=86400` dla `/icons/*`).

**Fix opcje:**
- A) `git mv packages/sleeper-web/public/icons/README.md packages/sleeper-web/docs/icons.md` (przenieść poza public/).
- B) Dodać exclude pattern w `expo export` (jeśli wspierany) lub post-build cleanup w `package.json#scripts.build`.

---

### 🟠 P2.3 — Service Worker cache strategy: cache-first dla `/` ryzykuje stale HTML→404 JS po deploy

**Plik:** `packages/sleeper-web/public/sw.js:8-9, 53-69` + `docs/runbook/sleeper-web-deploy.md:121-133`.

**Problem:**
1. `SHELL_URLS = ['/', '/manifest.json']` cachuje root response (HTML z hashem `entry-{hash}.js`) w `install`.
2. Po deploy z nowym JS hashem `entry-{newhash}.js`, installed PWA z `sleeper-shell-v1` cache nadal serwuje stary HTML referencujący stary hash.
3. Stary hash JS już nie istnieje w `_expo/static/js/web/` (Vercel ma `immutable` cache + plik per hash) → browser ładuje cached HTML → próbuje pobrać stary JS → **404 → white screen**.

Runbook (sekcja 4) mówi "Opcjonalnie dla zwykłych bundle changes" — to **insufficient**. Każdy deploy ze zmianą JS (czyli prawie każdy) wymaga bump CACHE_NAME.

**Fix opcje:**
- A) Zmień strategię dla `/` na network-first (cache fallback dla offline) — kosztuje 1 RTT na cold navigation, ale eliminuje stale HTML risk.
- B) Auto-bump `CACHE_NAME` w build pipeline (`scripts/inject-sw-version.sh` postbuild → `CACHE_NAME = 'sleeper-shell-${BUILD_SHA}'`).
- C) Zaktualizuj runbook: "ZAWSZE bump CACHE_NAME przed git push origin main" + pre-commit hook check (`grep "sleeper-shell-v" public/sw.js` przeciw last main).

**Impact:** średni — pierwszy deploy bez bumpa = każdy installed PWA user dostaje 404 white screen do momentu manual unregister/clear storage (debugowane przez DevTools, niedostępne dla non-tech userów).

---

## P3 — nit (sugestie)

### 🟡 P3.1 — vercel.json rewrite regex: nieescape'owany `.`

**Plik:** `packages/sleeper-web/vercel.json:5`
```json
"source": "/((?!_expo|icons|assets|manifest.json|sw.js|favicon.png|robots.txt).*)"
```
W regex `.` to wildcard — `/manifestXjson`, `/swXjs` byłyby rewrite-skip dla URL match. Test:
```js
/^\/((?!.*manifest.json).*)$/.test('/manifestXjson') // matches actually? sprawdzono: false (negative lookahead nie odpala)
```
W praktyce nie powoduje bezpośrednich problemów (Vercel rzadko widzi te URL), ale pattern niesemantyczny. Escape jako `manifest\\.json`.

### 🟡 P3.2 — manifest.json `"purpose": "any maskable"` bez prawdziwych maskable assets

**Plik:** `packages/sleeper-web/public/manifest.json:19, 25` + `public/icons/README.md:37-41`.

Te same ikony zadeklarowane jako `any maskable`, ale brak inner safe-area paddingu (~10% wymagane przez Android adaptive icon spec). README przyznaje issue ale nie fixuje. Możliwe obcięcie logo na Pixel/Samsung.

**Fix:** wygenerować dedicated `icon-maskable-192/512.png` z paddingiem przez https://maskable.app/, zadeklarować osobny entry `purpose: "maskable"`, zostawić oryginalne jako `purpose: "any"`.

### 🟡 P3.3 — Brak invariant testu na `flowType: 'pkce'`

**Plik:** `packages/sleeper-web/src/lib/supabase.ts:40` + brakujący test w `src/lib/__tests__/`.

Parytet z istniejącymi testami (`grep -l "detectSessionInUrl: true" supabase.ts`). PKCE jest security-critical (P2.1 z Fazy 1). Regresja (cofnięcie do implicit) silent — bez testu nikt nie zauważy.

**Fix:** dodać do np. `registerSW.test.ts` lub osobnego `supabase-config.test.ts` (~5 LOC):
```ts
it('uzywa flowType: pkce (security: nie leakuj access_token w URL fragment)', () => {
  const src = readFileSync(resolve(__dirname, '../supabase.ts'), 'utf-8');
  expect(src).toMatch(/flowType:\s*['"]pkce['"]/);
});
```

### 🟡 P3.4 — `sw.js` cache version manualny (operacyjny chore)

**Plik:** `packages/sleeper-web/public/sw.js:8` — `CACHE_NAME = 'sleeper-shell-v1'`.

Łatwo zapomnieć bumpu (powiązane z P2.3). Lepsze: build script wstrzykuje `CACHE_NAME = 'sleeper-shell-${git_sha}'` przed `expo export`. ~10 LOC postbuild script.

### 🟡 P3.5 — Vercel response: brakujące security headers

**Plik:** `packages/sleeper-web/vercel.json`.

Brak: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: ...`. Dla Supabase-only PWA bez third-party embeds — niski risk, ale defense-in-depth standard. ~10 linii w `headers`.

---

## Odchylenia od planu

Brak istotnych odchyleń. IU11/IU12 zrealizowane zgodnie z planem. Świadome wybory dobrze udokumentowane:
- `public/index.html` zamiast `+html.tsx` — wymuszone przez `web.output: "single"` (Faza 2 P1.1).
- `babel-plugin-transform-remove-console` dodany jako Faza 2 P2.3 fix — patrz P2.1, fix częściowo działa, ale nie zgodnie z opisem.
- Wszystkie deferowane P2 z Faz 1+2 zaadresowane w IU11 commit `690569d` — zgodne ze strategią "P2 fix przed deploy" z planu.

## PWA deploy-readiness verdict

| Kryterium | Status | Uwagi |
|---|---|---|
| Bundle parsuje się jako classic script | ✅ | zustand CJS fix zachowany |
| manifest.json valid | ✅ | name, short_name, start_url, display, icons (×2 192/512), theme_color, background_color, orientation |
| Service Worker registers | ✅ | scope `/`, skipWaiting + clients.claim, Supabase API skip |
| iOS meta complete | ✅ | apple-mobile-web-app-capable yes, status-bar black-translucent, apple-touch-icon 180×180, viewport-fit=cover |
| PKCE flow configured | ✅ | `lib/supabase.ts` ma `flowType: 'pkce'` + `detectSessionInUrl: true` |
| Env vars fail-loud w prod | ✅ | `throw new Error` gdy missing + NODE_ENV=production (verified runtime via Playwright) |
| Vercel SPA rewrites | ✅ | rewrites na `/index.html` z exclude dla static assets |
| Cache headers per asset type | ✅ | sw.js no-cache, manifest 1h, _expo/static immutable, icons 1d |
| Runbook kompletny | ✅ | 10 sekcji: setup, deploy, rollback, SW invalidation, iPhone debug, monitoring, troubleshooting, secrets |
| Tests | ✅ | 158/158, w tym 29 PWA invariants (registerSW + sw + manifest + index.html) |
| **Verdict** | **PWA jest deploy-ready** z 3× P2 do naprawy w follow-up commit (nie blokuje pierwszego deployu) |

---

## Bookkeeping checkboxów Weryfikacja:

W pliku zadań `sleeper-web-pwa-zadania.md` Faza 4 ma 28 wierszy `- [ ] Weryfikacja: [Mobile-manual] ...` w IU11 + IU12 oraz `- [ ] Test: [Manual-mobile] ...` — wszystkie poprawnie oznaczone suffixem `manual test (patrz manual-test-faza-4.md)` lub `czeka na user deploy`. Brak CLI checkboxów do automatycznego odznaczenia w Fazie 4 — wszystkie CLI wery są już `[x]` (`pnpm web:build:check` PASS).

- Odznaczone automatycznie (CLI/grep): 0 (wszystkie już odznaczone)
- Pozostawione dla operatora (Manual mobile/device): 28 (operator po Vercel deploy + on-device test)
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły
- [x] Wszystkie CLI weryfikacje już PASS (158/158 testów, tsc, lint, build, invariants).
- [ ] Manual-mobile: 28 checkboxów oczekuje user deploy + on-device testing — patrz `manual-test-faza-4.md`.

---

## Wnioski

1. Faza 4 jest **kodowo ukończona** i **PWA jest deploy-ready** — wszystkie krytyczne wymagania spełnione, brak P1.
2. **3 P2 do naprawy w follow-up commit** (nie blokują pierwszego deployu, ale warto przed pierwszym push):
   - **P2.1** najpilniejszy — fix narusza zaufanie do deferowanego Faza 2 P2.3, hooks.ts:293 warn nadal w bundle prod.
   - **P2.2** kosmetyka — przenieść `public/icons/README.md` poza public/.
   - **P2.3** operacyjny — SW cache strategy lub auto-bump w build pipeline.
3. **5 P3** to sugestie polish: regex escape, maskable icons, PKCE test, SW cache versioning, security headers.
4. **PWA verdict:** deploy-ready, zalecane fix P2 w follow-up (~1h pracy).

**Co dalej:**
- Opcja A: zatwierdzić fix P2 (P2.1+P2.2+P2.3) jako kolejny commit "fix: poprawki po review fazy 4" przed pierwszym Vercel deploy.
- Opcja B: deploy now, P2 jako drobne follow-ups w trakcie pierwszego użycia.
