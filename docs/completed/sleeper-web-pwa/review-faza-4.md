---
title: Code review — Faza 4 (PWA & Deploy) — re-review po cyklu 1 fixów
data: 2026-06-06
faza: 4 (IU11 PWA shell + IU12 Vercel pipeline + cykl 1 post-review fix)
severity_gate: GOTOWE DO KONTYNUACJI (0× P1, 0× P2, 2× P3 deferred do known-issues)
re_review: tak (cykl 2 po commit `24f7ddb`)
---

# Code Review — Faza 4 (PWA & Deploy) — RE-REVIEW po cyklu 1 fixów

**Zakres re-review:** weryfikacja napraw zaadresowanych w commit `24f7ddb` po pierwszym review fazy 4 (3× P2 + 3× P3 fixed, 2× P3 świadomie deferred do known-issues).

**Commits w scope:**
- `690569d` IU11 PWA shell + Faza 1/2 P2 hardening (pierwotny)
- `d5471a3` IU12 build pipeline + Vercel config + runbook (pierwotny)
- `24f7ddb` **fix: poprawki po review fazy 4 (cykl 1)** — re-review target

**Walidacja CLI:** PASS (re-uruchomione)
- `pnpm --filter sleeper-web exec tsc --noEmit` exit 0
- `pnpm --filter sleeper-web lint` exit 0 (expo lint clean)
- `pnpm --filter sleeper-web test` → **160/160 PASS** (+2 vs cykl 1: invariant PKCE + flag detectSessionInUrl, +1 navigate network-first)
- `NODE_ENV=production pnpm --filter sleeper-web build` → exit 0, bundle 4.41 MB

**Empiryczna weryfikacja dist/ (re-built):**
- `grep -c "console.warn" dist/_expo/static/js/web/entry-*.js` → **1** (vs 71 w cyklu 1 — 70 mniej; pozostały 1 to vendor RN źle traktowany przez Metro, akceptowalne)
- `grep -c "console.log" dist/_expo/static/js/web/entry-*.js` → **0** (vs 20 w cyklu 1)
- `grep -aoE "\[notifications\][^']{0,80}" dist/...js` → **brak match** (był: `[notifications] useEndSession received row...`)
- `grep -aoE "\[auth\] getSession" dist/...js` → **brak match**
- `ls dist/icons/` → tylko PNG: `apple-touch-icon.png icon-192.png icon-512.png` (brak README.md)
- `grep "CACHE_NAME" dist/sw.js` → `sleeper-shell-v2` (bump z `v1`)
- `grep "request.mode === 'navigate'" dist/sw.js` → match (network-first dla nawigacji w wydeploymencie)

**Bundle size:** 4.41 MB (entry-9039c677f1263f9ddfda7e6e77917199.js) — bez zmiany od cyklu 1 (-0.01 MB różnica = noise z console stripping).

---

## Severity gate

✅ **GOTOWE DO KONTYNUACJI** — 0 P1, **0 P2**, 2 P3 (świadomie deferred do `known-issues.md` z uzasadnieniem).

**Cykl 1 → cykl 2 progresja:**

| Severity | Cykl 1 | Cykl 2 | Δ |
|---|---|---|---|
| P1 blocking | 0 | 0 | — |
| P2 important | 3 | **0** | **-3** ✅ |
| P3 nit | 5 | 2 (deferred) | **-3** ✅ |

PWA jest **deploy-ready** bez zastrzeżeń. Pozostałe 2 P3 deferred do known-issues z jasnym uzasadnieniem (maskable icons wymagają graphic asset; auto-bump SHA stracił pilność po P2.3 fix).

---

## Weryfikacja napraw z cyklu 1

### ✅ P2.1 (krytyczny, naruszenie zaufania do Fazy 2) — ROZWIĄZANE

**Pierwotny problem:** `api.cache(true)` permamentnie cachował pierwszy odczyt configu bez relookupa NODE_ENV — `babel-plugin-transform-remove-console` nie strippował `console.warn` z `hooks.ts:293`.

**Co zrobiono (`24f7ddb`):**
1. `babel.config.js:5` — `api.cache.using(() => process.env.NODE_ENV)` — invalidacja cache per env (opcja A z review).
2. **Defense-in-depth (belt-and-suspenders):**
   - `hooks.ts:296` — `if (process.env.NODE_ENV !== 'production') console.warn(...)`
   - `AuthProvider.tsx:37` — `if (process.env.NODE_ENV !== 'production') console.warn(...)`
   - `supabase.ts:22` — explicit `else` branch z dev-only warn (Metro/Terser DCE)

**Empiryczna weryfikacja (re-built prod bundle, NODE_ENV=production):**
- `grep -c "console.warn" entry-*.js`: 71 → 1 (-70). Pozostały 1 to vendor RN warn, którego Metro nie babiluje (CALLED OUT poprawnie w komentarzu commitu).
- `grep -c "console.log" entry-*.js`: 20 → **0**.
- `grep "[notifications]"`: match → BRAK match.
- `grep "[auth] getSession"`: match → BRAK match.

**Verdict:** Fix nadgorliwy w pozytywnym sensie — i babel cache fix, i NODE_ENV guards działają w synergii. Nawet jeśli ktoś w przyszłości złamie babel config, NODE_ENV guards utrzymają strippping przez DCE. **Akceptowalne, znakomicie zaadresowane.**

---

### ✅ P2.2 (information disclosure) — ROZWIĄZANE

**Pierwotny problem:** `public/icons/README.md` deployowany do prod (`/icons/README.md` publiczny URL, leak monorepo paths + build flow).

**Co zrobiono (`24f7ddb`):** `git mv packages/sleeper-web/public/icons/README.md packages/sleeper-web/docs/icons.md` (opcja A z review).

**Weryfikacja:**
- `ls packages/sleeper-web/public/icons/` → 3 PNG, brak `.md`.
- `test -f packages/sleeper-web/docs/icons.md` → exists.
- `ls dist/icons/` (post-build) → 3 PNG, brak `.md`.

**Verdict:** Czysty fix. Plik zachowany jako dokumentacja dewelopersta poza public/. **Akceptowalne.**

---

### ✅ P2.3 (operacyjny critical — 404 white screen risk) — ROZWIĄZANE

**Pierwotny problem:** `SHELL_URLS = ['/', '/manifest.json']` cachowane cache-first w SW. Po deploy nowego hashu JS, installed PWA z `sleeper-shell-v1` cachem serwował stary HTML → próba pobrania starego hash JS → 404 → white screen. Runbook mówił "opcjonalnie bump CACHE_NAME" — insufficient.

**Co zrobiono (`24f7ddb`):**
1. `public/sw.js` przepisany:
   - **Network-first dla `request.mode === 'navigate'`** (opcja A z review, najbardziej robust).
   - Cache fallback dla offline (`caches.match('/')`).
   - Cache-first **tylko** dla immutable static assets (`/_expo/`, `/icons/`, `/favicon.png`, `/manifest.json`).
   - Network-only skip dla Supabase (`/rest/v1/`, `/auth/v1/`, `/realtime/v1/`, `/storage/v1/`, `*.supabase.co`).
2. Bump `CACHE_NAME = 'sleeper-shell-v2'`.
3. `docs/runbook/sleeper-web-deploy.md` sekcja 4 + tabela troubleshooting przepisana — strategia explicite udokumentowana, bump opisany jako "zawsze przy zmianie sw.js/manifest.json, opcjonalnie dla bundle".
4. Nowy test invariant: `expect(swSrc).toMatch(/request\.mode === 'navigate'/)` + `expect(swSrc).toMatch(/network-first/i)`.

**Weryfikacja:**
- `registerSW.test.ts:85-91` — invariant test pass.
- Cykl install→activate→fetch ścieżki logicznie poprawne (skipWaiting + clients.claim zachowane).
- Network-first dla navigate KOSZTUJE 1 RTT cold start. Akceptowalne dla MVP single-region (Frankfurt → Polska użytkownik ~30ms RTT).
- Catch handler zwraca offline shell (cache fallback) → graceful offline degradation zachowane.

**Verdict:** Wzorcowy fix. **Akceptowalne, znakomicie zaadresowane.**

---

### ✅ P3.1 (regex correctness) — ROZWIĄZANE

**Co zrobiono:** `vercel.json:5` — escape `.` w 4 patternach: `manifest\\.json`, `sw\\.js`, `favicon\\.png`, `robots\\.txt`.

**Verdict:** Czysta zmiana, semantycznie poprawna. Negative lookahead pattern teraz dokładnie matchuje URL bez wildcardów.

---

### ✅ P3.3 (test coverage) — ROZWIĄZANE

**Co zrobiono:** `registerSW.test.ts:176-184` — nowy `describe('supabase.ts invariants (security)')` z 2 testami:
- `flowType: 'pkce'` invariant.
- `detectSessionInUrl: true` invariant.

Source loading: `readFileSync(resolve(PKG_ROOT, 'src/lib/supabase.ts'))`.

**Verdict:** Parytet z istniejącymi PWA invariants. Zabezpiecza przed silent regression cofnięcia do implicit flow. **Akceptowalne.**

---

### ✅ P3.5 (security headers) — ROZWIĄZANE

**Co zrobiono:** `vercel.json:9-26` — global headers dla `source: /(.*)`:
- `X-Content-Type-Options: nosniff` (MIME sniffing protection)
- `Referrer-Policy: strict-origin-when-cross-origin` (info leak mitigation)
- `X-Frame-Options: DENY` (clickjacking protection)

**Verdict:** Defense-in-depth zgodne ze standardem OWASP Secure Headers. Brak CSP (świadomy choice — Expo Web inline scripts wymagałyby `unsafe-inline` co osłabiłoby CSP do bezużytecznego). **Akceptowalne dla MVP.**

---

## Świadomie deferred do known-issues (uzasadnione)

### 🟡 P3.2 — Maskable icons bez prawdziwych safe-area assetów

**Stan:** `manifest.json:19,25` deklaruje `purpose: "any maskable"` ale ikony nie mają ~10% safe-area paddingu.

**Uzasadnienie deferral:** Wymaga regeneracji ikon graficznie (maskable.app/ lub dedicated designer). Czysto manualny chore + graphic asset task. Risk: niski (możliwe obcięcie logo Sleeper na Pixel/Samsung adaptive icons — kosmetyka, nie funkcjonalność).

**Akcja:** Wpis w `known-issues.md` (`Faza 4 — open follow-ups → swiadomie deferred`). Post-MVP polish.

**Verdict deferral:** **Akceptowalne** — graphic asset task ≠ engineering task.

---

### 🟡 P3.4 — Auto-inject git SHA do CACHE_NAME (postbuild)

**Stan:** `sw.js:14` ma manualny `CACHE_NAME = 'sleeper-shell-v2'`. Łatwo zapomnieć bump.

**Uzasadnienie deferral:** P2.3 fix (network-first dla `/`) **drastycznie obniżył pilność** — nawet bez bump CACHE_NAME, navigate request idzie network-first, więc stale HTML risk zniknął. Bump nadal potrzebny tylko gdy zmienia się sw.js/manifest.json (immutable assety mają hash w nazwie). ~10 LOC skript = niskie ROI gdy main risk już mitigated.

**Akcja:** Wpis w `known-issues.md` z trigger: "Jeśli operator zapomni bump 2+ razy w trakcie pierwszych deployów — zaimplementować".

**Verdict deferral:** **Akceptowalne** — fix P2.3 rebalansuje cost/benefit.

---

## PWA deploy-readiness verdict (cykl 2)

| Kryterium | Cykl 1 | Cykl 2 |
|---|---|---|
| Bundle parsuje się jako classic script | ✅ | ✅ |
| manifest.json valid | ✅ | ✅ |
| Service Worker registers | ✅ | ✅ |
| iOS meta complete | ✅ | ✅ |
| PKCE flow configured | ✅ | ✅ (+ invariant test) |
| Env vars fail-loud w prod | ✅ | ✅ |
| Vercel SPA rewrites | ✅ | ✅ (regex escape) |
| Cache headers per asset type | ✅ | ✅ |
| **Security headers global** | ❌ (P3.5) | ✅ |
| **SW cache strategy resilient na deploy** | ⚠️ (P2.3) | ✅ (network-first) |
| **console.* stripping w prod** | ⚠️ (P2.1) | ✅ (empirycznie potwierdzone) |
| **public/ czyste z dev artifacts** | ⚠️ (P2.2) | ✅ |
| Runbook kompletny | ✅ | ✅ (zaktualizowany sekcja 4) |
| Tests | ✅ 158/158 | ✅ **160/160** |
| **Verdict** | deploy-ready z 3 P2 follow-up | **deploy-ready BEZ zastrzeżeń** |

---

## Odchylenia od planu

Brak nowych odchyleń. Cykl 1 fixów ściśle adresuje findings z review-faza-4.md, świadome deferral udokumentowany w `known-issues.md`. **Zgodne z planem.**

---

## Wnioski

1. **Cykl 1 fixów wzorcowy** — wszystkie 3 P2 + 3 P3 zaadresowane prawidłowo, empirycznie zweryfikowane.
2. **P2.1 (babel cache) zaadresowany defense-in-depth** — fix root cause (api.cache.using) + NODE_ENV guards jako belt-and-suspenders. Empirycznie: `console.log` count 20→0, `console.warn` 71→1.
3. **P2.3 (SW cache) zaadresowany opcją najbardziej robust** — network-first dla nawigacji eliminuje stale-HTML risk całkowicie. Runbook + invariant test dodane.
4. **2 świadome deferrals** (P3.2 maskable assets, P3.4 auto-SHA bump) — oba mają jasne uzasadnienie biznesowe / techniczne i są zarejestrowane w `known-issues.md`.
5. **PWA jest deploy-ready bez zastrzeżeń.** User może wykonywać `git push origin main` / Vercel deploy + mobile-manual checklist (manual-test-faza-4.md) bez code-level blockerów.

**Co dalej:**
- Faza 4 ukończona kodowo (✅).
- Pozostałe zadanie: USER ACTION ITEMS z `known-issues.md` (Vercel config + env vars + Supabase Auth whitelist + mobile-manual testing).
- Po pomyślnym deploy + manual test → `dev-docs-complete` archive `sleeper-web-pwa` do `docs/completed/`.

---

## Bookkeeping checkboxów Weryfikacja:

Wszystkie CLI/grep weryfikacje w Fazie 4 już odznaczone (`[x]`) w cyklu 1 review. Re-uruchomienie tsc/lint/test/build w cyklu 2 — nadal PASS, nie ma czego odznaczać dodatkowo. Mobile-manual checkboxy (28) pozostają `[ ]` zgodnie z polityką (operator on-device).

- Odznaczone automatycznie (CLI/grep) w tym cyklu: 0 (wszystkie były PASS już w cyklu 1)
- Pozostawione dla operatora (Manual mobile/device): 28 (USER ACTION — runbook + manual-test-faza-4.md)
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły
- [x] CLI: `tsc --noEmit` → PASS (re-run cykl 2)
- [x] CLI: `lint` → PASS (re-run cykl 2)
- [x] CLI: `test` → PASS 160/160 (re-run cykl 2, +2 tests vs cykl 1)
- [x] CLI: `NODE_ENV=production build` → PASS, dist/ kompletny, console stripping empirycznie potwierdzony.
- [ ] Manual-mobile: 28 checkboxów → operator (Vercel deploy + on-device PWA testing) — patrz `manual-test-faza-4.md`.
