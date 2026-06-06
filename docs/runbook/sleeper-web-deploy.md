---
title: Sleeper Web (PWA) — Deploy & Operations Runbook
last_updated: 2026-06-06
owner: dawid.bakalarski@gmail.com
---

# Sleeper Web (PWA) — Deploy & Operations Runbook

Runbook operacyjny dla `packages/sleeper-web` — deploy na Vercel, env vars, rollback, debug Service Worker, monitoring.

## TL;DR

| Akcja | Komenda / Klik |
|---|---|
| Local dev | `pnpm web:dev` → http://localhost:8081 (Safari/Chrome) |
| Full check przed PR | `pnpm web:build:check` (tsc + lint + test + invariants + build) |
| Build dla deploy | `pnpm web:build` (output: `packages/sleeper-web/dist/`) |
| Deploy prod | `git push origin main` → Vercel auto-deploy (~90s) |
| Rollback | Vercel Dashboard → Deployments → "Promote to Production" na poprzedni |
| Manual deploy | `cd packages/sleeper-web && pnpm dlx vercel --prod` (CLI) |

## 1. Pierwsze polaczenie z Vercel (one-time setup)

### Krok 1: Utworz Vercel project

1. Wejdz na https://vercel.com (login GitHub `dawid.bakalarski`).
2. **Add New → Project** → import gh repo `sleeper`.
3. **Configure Project:**
   - **Framework Preset:** "Other"
   - **Root Directory:** `packages/sleeper-web`
   - **Build Command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter sleeper-web build`
   - **Output Directory:** `dist`
   - **Install Command:** *(leave empty — included in build command)*
   - **Node.js Version:** `22.x` (CRITICAL — `@supabase/realtime-js` failuje na Node 20 bez `ws` polyfill; package.json ma `engines.node: ">=22"`).

### Krok 2: Environment Variables

W **Settings → Environment Variables** dodaj dla **Production + Preview + Development**:

| Klucz | Wartosc | Skad wziac |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon public key) | Supabase Dashboard → Settings → API → `anon public` |

UWAGA: te same env vars co `packages/sleeper-app/.env` — wspoldzielona baza Supabase.

### Krok 3: Supabase Auth — dodaj prod URL do Redirect URLs whitelist

PKCE flow wymaga whitelisty. W **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://<vercel-prod-url>.vercel.app` (lub custom domain jesli skonfigurowana)
- **Redirect URLs (allowlist):** dodaj:
  - `https://<vercel-prod-url>.vercel.app/**`
  - `http://localhost:8081/**` (dev)
  - `http://localhost:19006/**` (dev — Expo Web alternative port)

Bez tego sign-in z magic linkem nie zwroci usera do PWA.

### Krok 4: Pierwszy deploy

- Push na `main` triggeruje auto-deploy.
- Albo: **Deployments → Redeploy** ostatni commit.
- Build log: szukac `EXPO_PUBLIC_SUPABASE_URL=https://...` w sekcji Build Environment — potwierdzenie ze env vars sa dostepne.

## 2. Codzienny deploy flow

Pipeline domyslny:

```
git push origin main
  ↓
Vercel build trigger (~10s)
  ↓
pnpm install --frozen-lockfile (~30s, cache hit ~5s)
  ↓
pnpm --filter sleeper-web build (~30s, expo export)
  ↓
Vercel uploads dist/ → CDN (~10s)
  ↓
Production URL aktualny (~90s total)
```

### Pre-push checklist (local)

```bash
pnpm web:build:check
# tsc --noEmit + expo lint + vitest run + check-no-native-imports.sh + expo export
```

Jesli **wszystkie 5 krokow PASS** — bezpieczny push. Build:check uzywa tych samych invariantów co Vercel build, wiec failuje lokalnie zanim CI lapie.

### Preview deployments

Kazdy push na branch != main triggeruje preview deploy z wlasnym URL (https://sleeper-web-<branch>.vercel.app). Idealne do testowania PWA install flow przed merge.

## 3. Rollback (Vercel)

### Opcja A: Promote Production (zalecane)

1. Vercel Dashboard → Deployments.
2. Znajdz ostatni dzialajacy deploy (zielony "Ready").
3. Klik `...` → **Promote to Production**.
4. Production URL przelacza sie w ~5s (DNS swap, brak rebuild).

### Opcja B: Revert commit

```bash
git revert <bad-commit-sha>
git push origin main
```

Czeka pelen build (~90s). Uzyj gdy chcesz zachowac historie zmian (audit).

### Opcja C: Force rollback przez Vercel CLI

```bash
cd packages/sleeper-web
pnpm dlx vercel rollback <deployment-url> --token <vercel-token>
```

## 4. Service Worker — invalidation strategy

PWA cachuje shell (CACHE_NAME `sleeper-shell-v2`). Strategia (po P2.3 fix review fazy 4):

- **Network-first** dla nawigacji (`request.mode === 'navigate'`, czyli `/` i deep linki) — gwarantuje swiezy HTML z aktualnym hashem `entry-{hash}.js` po deploy. Cache jest tylko offline fallback.
- **Cache-first** dla static assets (`/_expo/static/*`, `/icons/*`, `/manifest.json`, `/favicon.png`) — bezpieczne, bo Vercel daje immutable headers + nazwy plikow zawieraja content hash.

Po deploy z nowym JS bundle:

1. User otwiera PWA → SW probuje `fetch /` (network-first) → dostaje swiezy HTML referencujacy nowy `entry-{hash}.js` hash.
2. Nowy JS hash jest pobierany i cachowany w `sleeper-shell-v2`.
3. Stary HTML w cache zostaje zaktualizowany w tle.

### Kiedy bump CACHE_NAME

- **Zawsze** gdy zmieniony `public/sw.js` (zmiana strategii lub fix bug w SW).
- **Zawsze** gdy zmienione `public/index.html` lub `manifest.json` (te NIE maja content hash w nazwie, wiec tylko cache_name bump je invaliduje).
- **Opcjonalnie** dla zwyklych bundle changes — network-first dla `/` rozwiazuje problem stale-HTML automatycznie, content hash w nazwach `/_expo/static/*` rozwiazuje collision risk.

Note: P2.3 review fazy 4 wymusil zmiane strategii na network-first dla `/` zeby wyeliminowac scenario gdzie installed PWA serwuje stary HTML referencujacy nieistniejacy juz hash JS → 404 white screen.

### Force update na zainstalowanej PWA

Jesli user ma stary cache i zmiany nie sa visible:
- iOS Safari (zainstalowana PWA z home screen): Settings → Safari → Advanced → Website Data → znajdz "sleeper" → Remove. Reinstall.
- Chrome Android: DevTools (chrome://inspect → app DevTools) → Application → Service Workers → Unregister + clear storage.
- Desktop Chrome (DevTools): Application → Service Workers → Update on reload + Unregister.

## 5. Debug PWA na iPhone (Safari)

### Remote Web Inspector (mac wymagany)

1. iPhone: Settings → Safari → Advanced → **Web Inspector: ON**.
2. Podlacz iPhone do Maca kablem.
3. Mac: Safari → Develop → `<iPhone name>` → wybierz tab z PWA (lub PWA "Sleeper").
4. DevTools jak desktop: Console, Network, Application (Service Workers + Storage).

### Sprawdz Service Worker status

Safari DevTools → **Storage → Service Workers**:
- Status: `activated` ← OK
- Status: `installing` / `redundant` ← problem, sprawdz Console error

### Sprawdz manifest

Safari DevTools → **Console** → wpisz:
```js
fetch('/manifest.json').then(r => r.json()).then(console.log)
```
Powinien wypisac caly manifest. Brak = misconfig SW caching lub Vercel 404.

## 6. Monitoring i alerty

**Brak Sentry** — out of scope MVP (per requirements brainstorm).

### Co monitorowac manualnie

| Metryka | Zrodlo | Frequency |
|---|---|---|
| Build status | Vercel Dashboard (push notification) | per deploy |
| Bandwidth quota | Vercel Dashboard → Usage | tygodniowo (limit Hobby 100GB/mc, my uzyjemy <1%) |
| Supabase API errors | Supabase Dashboard → Logs → API Logs | przy zgloszonych issue |
| SW errors w prod | Safari Web Inspector (manual debug) | przy zgloszonych issue |

### Long-term

- Dodac Sentry browser SDK gdy ból > prog (Vercel ma natywny Sentry integration).
- Dodac Plausible/Umami analytics dla retention metrics.

## 7. Custom domain (opcjonalne)

1. Vercel Dashboard → Settings → Domains.
2. Dodaj `sleeper.bakalarski.dev` (lub inna).
3. Skonfiguruj DNS u rejestratora: `CNAME sleeper → cname.vercel-dns.com`.
4. Vercel auto-issuje SSL (~2min).
5. **Update Supabase Auth URL Configuration** (Krok 3 wyzej) — dodaj nowy URL do Redirect URLs whitelist.

## 8. Troubleshooting cheatsheet

| Symptom | Prawdopodobna przyczyna | Fix |
|---|---|---|
| Vercel build fail "Cannot find module 'sleeper-machine/dist'" | sleeper-machine/dist nie zbudowany | Dodaj `pnpm --filter sleeper-machine build` do build command |
| White screen na prod | `import.meta` w bundle (zustand ESM) | Sprawdz `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` → musi byc 0. Fix: `metro.config.js` resolveRequest mapa zustand → CJS |
| Sign-in nie redirectuje po magic link | PKCE redirect URL nie whitelisted | Supabase Dashboard → Auth → URL Config → dodaj prod URL |
| Build error: "Missing EXPO_PUBLIC_SUPABASE_URL" | env vars nie ustawione w Vercel | Settings → Environment Variables (Production + Preview + Development) |
| Add to Home Screen pokazuje generic ikone | apple-touch-icon 404 | Sprawdz `dist/icons/apple-touch-icon.png` istnieje + Cache-Control header (vercel.json) |
| Stary bundle po deploy | SW cache stale (rzadkie po P2.3 fix — network-first dla `/`) | Bump CACHE_NAME w `public/sw.js` (sleeper-shell-vN → -vN+1) + redeploy. Jesli user wciaz widzi stary — DevTools → Application → Service Workers → Unregister + clear storage |
| Build timeout > 5min | Bundle size lub cold cache | Vercel Hobby ma 45min limit — nie problem. Cold cache: pnpm fetch step |

## 9. Sekrety i bezpieczenstwo

- **NIGDY** nie commituj `.env` (tylko `.env.example`). `.gitignore` w `packages/sleeper-web` to obsluguje.
- `EXPO_PUBLIC_*` env vars sa wbudowane do bundle PUBLICZNIE — to OK dla `SUPABASE_URL` i `SUPABASE_ANON_KEY` (anon ma RLS ograniczenia). NIGDY nie wstawiaj tam `SUPABASE_SERVICE_ROLE_KEY`.
- PKCE flow (configured in `lib/supabase.ts`) eliminuje token leak w URL fragment.
- W prod (`NODE_ENV=production`) brak env vars throw build-time error → fail-loud, nie deploy.

## 10. Zwiazane pliki

- `packages/sleeper-web/vercel.json` — SPA rewrites + caching headers
- `packages/sleeper-web/package.json` — scripts (build, build:check)
- `packages/sleeper-web/public/sw.js` — Service Worker (cache strategy)
- `packages/sleeper-web/public/manifest.json` — PWA manifest
- `packages/sleeper-web/.env.example` — wymagane env vars
- `packages/sleeper-web/metro.config.js` — bundler (zustand CJS resolver fix)
