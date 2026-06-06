# 6b25944: fix(sleeper-web): prebuild workspace deps przed expo export

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** post-merge fix (sleeper-web-pwa deploy)

## Co zostalo zrobione
- `build` i `build:check` skrypty w `packages/sleeper-web/package.json` pre-buduja `sleeper-machine` i `sleeper-machine-kotki` przed `expo export`.

## Zmienione pliki
- `packages/sleeper-web/package.json` — `build` i `build:check` scripts: dodano `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build &&` przed `expo export`

## Powod / kontekst
Vercel build failowal `Error: While trying to resolve module 'sleeper-machine' ... main module field could not be resolved (dist/index.js). Indeed, none of these files exist`.

Workspace deps w monorepo nie sa publishowane — sa linkowane symlinkiem. `package.json#main` w `sleeper-machine` wskazuje na `dist/index.js`, ktory powstaje dopiero po `tsc`. Lokalnie problem ukryty bo `dist/` byl zbudowany z developmentu. Na Vercel — swiezy clone, `dist/` gitignored, build failuje.

Fix trwaly w package.json (nie w Vercel config) — dziala lokalnie tak samo jak na CI, reproducible.

## Walidacja
- typecheck: n/a (zmiana w scripts)
- test: n/a
- runtime: `cd packages/sleeper-web && pnpm build` PASS lokalnie (4.41 MB bundle, dist/ wygenerowany)
