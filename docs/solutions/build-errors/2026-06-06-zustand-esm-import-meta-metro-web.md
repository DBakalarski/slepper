---
title: "zustand@5 ESM `import.meta.env.MODE` wybucha w Metro bundle dla web"
date: 2026-06-06
category: build-errors
severity: high
stack:
  - Metro
  - Expo SDK 54
  - Zustand
  - PWA
tags:
  - metro-config
  - esm-cjs-interop
  - resolveRequest
  - package-exports
  - web-bundle
status: verified
last_verified: 2026-06-06
---

# zustand@5 ESM `import.meta.env.MODE` w Metro bundle dla web

## Symptomy

- Bundle webowy (Metro w trybie `--platform web`) parsuje się jako classic script — przeglądarka rzuca SyntaxError na `import.meta`.
- Komunikat w konsoli: `SyntaxError: Cannot use 'import.meta' outside a module` (lub odpowiednik per-browser).
- Aplikacja nie startuje, blank screen po hard reload PWA.
- Mobile (iOS/Android) działa bez problemu — błąd wyłącznie na web.
- Próba `resolver.alias` w `metro.config.js` (`{ 'zustand/middleware': 'zustand/middleware.js' }`) NIE pomaga — Metro i tak rozwiązuje ESM przez `package.json#exports`.

## Root Cause

`zustand@5` używa `package.json#exports` z polami `import` (ESM, zawiera `import.meta.env.MODE`) i `require` (CJS). Metro domyślnie preferuje pole `import` w trybie web i zwraca pliki ESM, ale produkuje bundle wykonywany jako classic script — `import.meta` jest tam nielegalne. Prosty `resolver.alias` z subpathami (`zustand/middleware`) jest ignorowany na rzecz mapy `exports`.

## Rozwiązanie

Custom `resolveRequest` w `metro.config.js` forsujący CJS subpaths zustanda — niezależnie od `exports`:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const ZUSTAND_CJS_MAP = {
  'zustand': 'zustand/index.js',
  'zustand/middleware': 'zustand/middleware.js',
  'zustand/shallow': 'zustand/shallow.js',
  'zustand/vanilla': 'zustand/vanilla.js',
  'zustand/vanilla/shallow': 'zustand/vanilla/shallow.js',
};

const defaultResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ZUSTAND_CJS_MAP[moduleName]) {
    const target = ZUSTAND_CJS_MAP[moduleName];
    return context.resolveRequest(context, target, platform);
  }
  return defaultResolver
    ? defaultResolver(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

Klucz: **mapuj wszystkie subpaths z których app korzysta** (`middleware`, `shallow`, `vanilla`). Pominięcie jednego subpathu = ten sam błąd pojawia się przy lazy importcie.

## Komendy diagnostyczne

```bash
# 1. Sprawdź jak Metro rozwiązuje zustand:
pnpm --filter sleeper-web exec npx expo export --platform web 2>&1 | grep -i zustand

# 2. Grep import.meta w bundle (po wyeksportowaniu):
grep -r "import.meta" dist/_expo/static/js/web/ | head

# 3. Sprawdź exports zustand:
node -e "console.log(JSON.stringify(require('zustand/package.json').exports, null, 2))"
```

## Zapobieganie

- W projekcie web (Metro `--platform web`) ZAWSZE weryfikuj że bundle nie zawiera `import.meta` — dodaj smoke check do CI: `grep -rE "import\.meta" dist/_expo/static/js/web && exit 1 || exit 0`.
- Dla pakietów z dual ESM/CJS (`package.json#exports`) NIE polegaj na `resolver.alias` w Metro — używaj `resolveRequest` z explicit mapą subpaths.
- Przy upgrade zależności która eksportuje ESM (top-level await, `import.meta`) sprawdź `package.json#exports` PRZED bumpowi: czy ma pole `require` jako fallback.
- Trzymaj mapę CJS subpaths w jednym miejscu (`metro.config.js`), nie rozrzucaj per-package.

## Powiązane

- `packages/sleeper-web/metro.config.js` — implementacja
- Metro docs: [resolveRequest](https://facebook.github.io/metro/docs/configuration#resolverequest)
- Node.js: [Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)

## Kontekst

- Środowisko: Expo SDK 54, Metro 0.81, zustand 5.0.x, target `--platform web` (PWA).
- Problem wystąpił po wymuszeniu parity z `sleeper-app` (mobile) — kod współdzielił `zustand/middleware` (persist, devtools).
- Mobile bundle (Hermes) toleruje pole `import` bo używa zupełnie innego loadera modułów; web bundle Metro emituje classic script.
