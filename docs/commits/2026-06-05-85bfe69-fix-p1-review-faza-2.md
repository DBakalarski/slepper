# 85bfe69: fix(sleeper-web-pwa): poprawki po review fazy 2 (cykl 1)

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 2 (sleeper-web-pwa) — post-review fixy P1

## Co zostalo zrobione

Zaadresowano 2 P1-blocking findings z multi-agent code review Fazy 2 (P1.1 bundle build fail). P2/P3 zostaja otwarte (parytet z sleeper-app, do naprawy w IU10/IU11).

- **P1.1a (Agent 5 E2E / KOD):** zmiana `web.output: "static"` -> `web.output: "single"` w `packages/sleeper-web/app.json`. Tryb static aktywowal SSR/SSG prerendering w Metro -> `expo export` import grafu wykonywal `lib/supabase.ts` w module-scope -> `createClient()` -> GoTrueClient `__loadSession` -> AsyncStorage.getItem -> localStorage -> `ReferenceError: window is not defined` (Node 22) lub Realtime WebSocket fail (Node 20). Single mode generuje SPA shell (bez SEO need dla prywatnej rodzinnej PWA), Lighthouse PWA audit nadal pass.
- **P1.1b (Agent 5 E2E / KOD):** dodano `"engines": { "node": ">=22" }` w `packages/sleeper-web/package.json`. Vercel CI default = Node 20, gdzie `@supabase/realtime-js` failuje przez brak natywnego WebSocket polyfill. Engines constraint blokuje deploy na Node 20 fail-loud.

## Zmienione pliki

- `packages/sleeper-web/app.json` — `web.output` static -> single (1 linia)
- `packages/sleeper-web/package.json` — dodano `engines: { node: ">=22" }` (3 linie)
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md` — sekcja "Do poprawy po review fazy 2": status P1 ZAADRESOWANE, 2 checkboxy odznaczone
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-kontekst.md` — dodana sekcja "Code review Fazy 2 (2026-06-05)" z kluczowymi wnioskami
- `docs/active/sleeper-web-pwa/review-faza-2.md` — nowy plik (pelny raport multi-perspective code review)

## Powod / kontekst

Multi-perspective code review Fazy 2 (5 perspektyw: security, performance, architecture, test coverage, E2E browser-bundle smoke) wykryl P1 bundle build failure. Technicznie problem byl pre-existing z Fazy 1 (`supabase.ts` od IU2), ale `expo export` byl pierwszy raz uruchamiany dopiero teraz przez Agent 5. Bez tego `vercel build` w Fazie 4 (IU12) by failowal — wiec PRE-IU11 fix.

Reszta findings (3 P2 + 5 P3) jest parytetem z sleeper-app i bedzie zaadresowana w IU10 (useFocusEffect cross-midnight test) lub IU11 (babel-plugin-transform-remove-console dla console.warn leak, testy hookow).

## Walidacja

- typecheck (`pnpm --filter sleeper-web exec tsc --noEmit`): PASS exit 0
- test (`pnpm --filter sleeper-web test`): PASS (5 files, 46 tests, 0 fail)
- lint (`pnpm --filter sleeper-web lint`): PASS exit 0
- build (`pnpm --filter sleeper-web build`): **PASS exit 0** (kluczowe — P1.1 fix zweryfikowany; `dist/index.html`, `dist/_expo/static/js/web/entry-*.js` 1.45 MB, css 10.4 kB wygenerowane)
- runtime: nie weryfikowano (poza scope; Mobile-manual po IU10/IU11)
