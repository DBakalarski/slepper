# 24f7ddb: fix(sleeper-web-pwa): poprawki po review fazy 4 (cykl 1)

**Data:** 2026-06-06
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 4 — PWA & Deploy (cykl 1 fixów post-review)

## Co zostalo zrobione

Adresuje 3 P2 + 3 P3 znalezione w review-faza-4.md.

### P2.1 (critical) — babel-plugin-transform-remove-console nie strippowal app console.warn

- `babel.config.js`: `api.cache(true)` → `api.cache.using(() => process.env.NODE_ENV)` — invalidacja cache per NODE_ENV
- Defense-in-depth: explicit `NODE_ENV !== 'production'` guards w:
  - `src/features/sessions/hooks.ts:293` (notifications warn)
  - `src/features/auth/AuthProvider.tsx:35` (getSession failure warn)
  - `src/lib/supabase.ts:21` (dev env vars warn — wrap w explicit else)
- Empiryczna weryfikacja po `NODE_ENV=production pnpm build`:
  - `grep -aoE "\[notifications\]" dist/_expo/static/js/web/entry-*.js` → BRAK matchy
  - `grep -aoE "\[auth\] getSession" dist/_expo/static/js/web/entry-*.js` → BRAK matchy
  - `console.warn` count: 71 → 41 (pozostale = vendor RN, Metro nie babiluje node_modules — OK)
  - `console.log` count: 20 → 7

### P2.2 — public/icons/README.md leakowal monorepo paths do prod

- `git mv packages/sleeper-web/public/icons/README.md packages/sleeper-web/docs/icons.md`
- Weryfikacja: `dist/icons/` zawiera tylko PNG (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`)

### P2.3 (critical operationally) — SW cache-first dla `/` ryzykowal 404 white screen po deploy

- `public/sw.js`: nowa strategia
  - **Network-first dla nawigacji** (`request.mode === 'navigate'`, np. `/`, deep linki) z cache fallback offline → eliminuje stale-HTML→404-JS scenario
  - **Cache-first** zachowany dla immutable static assets (`/_expo/static/*`, `/icons/*`, `/manifest.json`, `/favicon.png`)
- Bump `CACHE_NAME = 'sleeper-shell-v2'`
- `docs/runbook/sleeper-web-deploy.md` sekcja 4 zaktualizowana — opisana nowa strategia, kiedy bump CACHE_NAME (zawsze przy zmianie sw.js/index.html/manifest, opcjonalnie dla bundle changes bo network-first to obroni)
- Tabela troubleshooting (sekcja 8) zaktualizowana — odpowiedz dla "Stary bundle po deploy"

### P3.1 — vercel.json regex escape

`/((?!_expo|icons|assets|manifest.json|sw.js|favicon.png|robots.txt).*)`
→ `/((?!_expo|icons|assets|manifest\\.json|sw\\.js|favicon\\.png|robots\\.txt).*)`

### P3.3 — invariant test flowType: 'pkce'

- Dodano `describe('supabase.ts invariants (security)')` w `registerSW.test.ts` z 2 testami (flowType pkce + detectSessionInUrl) — parytet z istniejacymi PWA invariants

### P3.5 — security headers w vercel.json

Dodano global `headers` (source `/(.*)`):
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`

### Deferred do known-issues.md (sekcja "Cykl 1 fixów post-review fazy 4")

- **P3.2 maskable icons** — wymaga dedicated graphic asset z safe-area paddingiem (maskable.app/). Post-MVP polish.
- **P3.4 auto-inject git SHA do CACHE_NAME** — P2.3 fix (network-first) drastycznie obniza pilnosc. ~10 LOC postbuild jesli operator zapomni bump 2+ razy.

## Zmienione pliki

- `packages/sleeper-web/babel.config.js` — cache.using(NODE_ENV) zamiast cache(true)
- `packages/sleeper-web/src/features/sessions/hooks.ts` — NODE_ENV guard wokol console.warn
- `packages/sleeper-web/src/features/auth/AuthProvider.tsx` — NODE_ENV guard wokol console.warn
- `packages/sleeper-web/src/lib/supabase.ts` — explicit else dla dev console.warn
- `packages/sleeper-web/public/sw.js` — network-first dla nawigacji + bump CACHE_NAME v2
- `packages/sleeper-web/vercel.json` — escape regex + global security headers
- `packages/sleeper-web/src/features/pwa/__tests__/registerSW.test.ts` — +2 PKCE invariants, +1 SW network-first
- `packages/sleeper-web/public/icons/README.md` → `packages/sleeper-web/docs/icons.md` (move)
- `docs/runbook/sleeper-web-deploy.md` — runbook update sekcja 4 + tabela troubleshooting
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md` — checkboxes 3 P2 + 3 P3 zaznaczone, 2 P3 deferred opisane
- `docs/active/sleeper-web-pwa/known-issues.md` — sekcja "Cykl 1 fixów post-review fazy 4" z deferred items
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-kontekst.md` — code review entry (z dev-docs-review)
- `docs/active/sleeper-web-pwa/review-faza-4.md` — raport review (z dev-docs-review)

## Powod / kontekst

Cykl 1 dev-autopilot fixów po review fazy 4. Wszystkie 3 P2 + low-effort P3 zaadresowane w jednym commicie zeby PWA byla gotowa do `git push origin main` bez deploy-time smelle. Network-first dla nawigacji to znaczacy operational fix — eliminuje 404 white screen risk po kazdym deploy z nowym JS hashem.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit`)
- test: PASS (160/160 — +2 PKCE invariants, +1 SW network-first vs 158 przed)
- lint: PASS (`pnpm --filter sleeper-web lint`)
- build prod: PASS (`NODE_ENV=production pnpm --filter sleeper-web build` → 4.42 MB, bez zmian)
- invariants: PASS (`bash scripts/check-no-native-imports.sh`)
- regresja sleeper-app: brak (zero modyfikacji)
- empiryczna weryfikacja P2.1: `[notifications]` + `[auth] getSession` NIEOBECNE w bundle prod
- empiryczna weryfikacja P2.2: `dist/icons/` zawiera tylko PNG
- runtime: nie testowano (wymaga Vercel deploy)
