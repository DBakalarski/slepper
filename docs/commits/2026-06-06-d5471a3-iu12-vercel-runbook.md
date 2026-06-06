# d5471a3: feat(sleeper-web-pwa): IU12 build pipeline + Vercel config + runbook

**Data:** 2026-06-06
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 4 / IU12 build pipeline + deploy

## Co zostalo zrobione

### Build pipeline
- `packages/sleeper-web/package.json`: dodano `build:check` (tsc + lint + test + invariants + build) i `check:invariants` scripts.
- Root `package.json`: dodano `web:build:check` i `web:test` proxies.

### Vercel config
- `packages/sleeper-web/vercel.json`:
  - SPA rewrites — wszystkie navigations -> `/index.html` (z whitelista dla `_expo|icons|assets|manifest.json|sw.js|favicon.png|robots.txt`).
  - Cache-Control headers:
    - `/sw.js`: `max-age=0, must-revalidate` (zawsze fresh — krytyczne dla SW update flow).
    - `/manifest.json`: `max-age=3600, Content-Type: application/manifest+json`.
    - `/_expo/static/*`: `max-age=31536000, immutable` (Expo hashuje nazwy plikow).
    - `/icons/*`: `max-age=86400`.
  - `Service-Worker-Allowed: /` (pozwala SW na pelen scope).

### Runbook
- `docs/runbook/sleeper-web-deploy.md` (10 sekcji, ~280 LOC):
  1. TL;DR table z kluczowymi komendami.
  2. Pierwsze polaczenie z Vercel (Project + env vars + Supabase Auth URL whitelist + Node 22 lock).
  3. Codzienny deploy flow + preview deployments.
  4. Rollback — 3 opcje (Vercel promote, git revert, CLI).
  5. Service Worker cache invalidation strategy (kiedy bump CACHE_NAME).
  6. Debug PWA na iPhone Safari (remote Web Inspector setup).
  7. Monitoring (manual, brak Sentry per scope).
  8. Custom domain (opcjonalne).
  9. Troubleshooting cheatsheet (8 typowych issue).
  10. Sekrety i bezpieczenstwo (env vars handling).

### CLAUDE.md updates
- "Layout repozytorium" — dodany `packages/sleeper-web/` z `public/`, `scripts/`, `vercel.json`.
- "Wazne" — instrukcja `pnpm web:*` + link do runbook.
- "Walidacja" — dodane sleeper-web typecheck/lint/test/build + `pnpm web:build:check`.
- "Runtime" — split na Mobile (Expo Go) + Web PWA (lokalny dev + Vercel auto-deploy).

## Zmienione pliki
- `packages/sleeper-web/package.json` — scripts: build:check, check:invariants
- `packages/sleeper-web/vercel.json` — NEW
- `docs/runbook/sleeper-web-deploy.md` — NEW
- `package.json` (root) — web:build:check + web:test proxies
- `CLAUDE.md` — layout + walidacja + runtime sections

## Powod / kontekst
Ostatni IU calej fazy 4. Cel: pelne "deployable" Vercel-ready config + dokumentacja operacyjna + uzupelnienie CLAUDE.md zeby web PWA byla traktowana jako pierwszej klasy obywatel monorepo (rownorzedny z sleeper-app).

NIE wykonano (user action items wymagajace zewnetrznych krokow):
- Faktyczny deploy na Vercel (user action: GitHub → Vercel integration + project setup).
- Konfiguracja env vars `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` w Vercel Dashboard.
- Whitelist redirect URLs w Supabase Auth dla PKCE flow.
- Manual testy mobilne (Lighthouse PWA audit, Add to Home Screen, cross-device sync) — wymagaja zdeplyowanego URL.

### Odchylenia od planu
- Brak `tsc --noEmit && eslint . && expo export` w build script — uzyto `expo lint` zamiast `eslint .` (parytet z istniejacym `lint` script + `expo lint` opakowuje native lint). Plan opisowo, implementacja funkcjonalnie rownowazna.

## Walidacja
- `pnpm web:build:check` — PASS (cala pipeline):
  - tsc --noEmit: 0 errors
  - expo lint: 0 errors/warnings
  - vitest: 158/158 tests (14 files)
  - `bash scripts/check-no-native-imports.sh`: PASS
  - expo export: PASS (dist/{manifest.json, sw.js, index.html z PWA meta tagami, icons/, _expo/static/})
- `pnpm --filter sleeper-app exec tsc --noEmit` — PASS (regression check, sleeper-app niezmieniony)
- runtime: pending — uruchomienie Vercel deploy oczekuje na user action; lokalnie `dist/` poprawnie generowany i kompletny.
