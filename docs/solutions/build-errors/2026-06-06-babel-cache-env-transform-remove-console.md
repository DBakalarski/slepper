---
title: "babel-plugin-transform-remove-console nie strippuje console.* w prod — babel cache ignoruje NODE_ENV"
date: 2026-06-06
category: build-errors
severity: high
stack:
  - Babel
  - Expo SDK 54
  - Metro
tags:
  - babel-config
  - api-cache
  - node-env
  - console-stripping
  - prod-build
status: verified
last_verified: 2026-06-06
---

# babel-plugin-transform-remove-console nie strippuje console.* w prod build

## Symptomy

- Plugin `babel-plugin-transform-remove-console` skonfigurowany w `babel.config.js` w bloku `env.production`.
- Bundle prod zawiera `console.log`/`console.warn` mimo `NODE_ENV=production`.
- Lokalnie `NODE_ENV=production pnpm build` pokazuje że plugin czasem działa, czasem nie — zależne od stanu `.babel-cache/`.
- Czyszczenie `.babel-cache/` powoduje że plugin "magicznie" zaczyna działać do następnego cache hit.

## Root Cause

`babel.config.js` używa `api.cache(true)` (lub po prostu `module.exports = function(api) { ... }` bez explicit cache config). Babel cachuje WYNIK konfiguracji niezależnie od zmiany `process.env.NODE_ENV` — pierwszy raz funkcja config zostaje wywołana z `NODE_ENV=development` (np. przez `expo start` z którego cache pochodzi), wynik jest cached, kolejne wywołania (`expo export --platform web` w prod) dostają stale config bez `env.production` pluginów.

## Rozwiązanie

Uzależnij cache od `NODE_ENV` przez `api.cache.using()`:

```js
// babel.config.js
module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  const isProd = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProd
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      'react-native-worklets/plugin', // ZAWSZE ostatni
    ],
  };
};
```

**Belt-and-suspenders**: dodatkowo guarduj callsite w aplikacji:

```ts
// src/lib/log.ts
const isDev = process.env.NODE_ENV !== 'production';

export const log = {
  info: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: console.warn,   // zachowane w prod
  error: console.error, // zachowane w prod
};
```

Używaj `log.info()` zamiast `console.log()` w nowym kodzie — działa nawet jeśli plugin zostanie kiedyś zdjęty.

## Komendy diagnostyczne

```bash
# 1. Wyczyść cache babel + metro:
rm -rf .babel-cache node_modules/.cache packages/sleeper-web/.expo

# 2. Build prod i sprawdź czy console.log został w bundle:
NODE_ENV=production pnpm --filter sleeper-web exec npx expo export --platform web
grep -rE "console\.log" dist/_expo/static/js/web/ | wc -l   # oczekiwane: 0

# 3. Sprawdź czy api.cache jest poprawnie skonfigurowane:
node -e "const cfg = require('./babel.config.js'); console.log(cfg.toString())"
```

## Zapobieganie

- W KAŻDYM `babel.config.js` używaj `api.cache.using(() => process.env.NODE_ENV)` lub `api.cache.invalidate(() => process.env.NODE_ENV)` jeśli config zależy od env.
- Nie polegaj wyłącznie na pluginach build-time — guardy `NODE_ENV` w runtime kodzie (`if (isDev) ...`) są ostatnią linią obrony i przeżyją odejście pluginu.
- Po zmianie `babel.config.js` ZAWSZE wyczyść cache: `rm -rf .babel-cache node_modules/.cache .expo`.
- W CI build pipeline'ie sprawdzaj `grep -c "console.log" dist/` po build → fail jeśli > 0.

## Powiązane

- `packages/sleeper-web/babel.config.js` — implementacja
- Babel docs: [Config Function API — api.cache](https://babeljs.io/docs/config-files#apicache)
- `babel-plugin-transform-remove-console` — pakiet

## Kontekst

- Środowisko: Expo SDK 54, babel-preset-expo, Metro bundler, target web.
- Problem objawił się dopiero gdy ktoś zauważył `console.log('debug:', user.email)` w produkcyjnym bundle — leak PII.
- Workaround "wyczyść cache przed prod build" w pre-build skrypcie jest fragile — `api.cache.using` to właściwa naprawa.
