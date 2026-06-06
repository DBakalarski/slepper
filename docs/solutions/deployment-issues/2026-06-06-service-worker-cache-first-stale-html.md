---
title: "Service Worker cache-first dla nawigacji powoduje stale HTML i 404 JS po deploy"
date: 2026-06-06
category: deployment-issues
severity: critical
stack:
  - PWA
  - Service Worker
  - Expo Web
tags:
  - service-worker
  - cache-strategy
  - pwa
  - network-first
  - deploy
  - stale-cache
status: verified
last_verified: 2026-06-06
---

# Service Worker cache-first dla nawigacji powoduje stale HTML → 404 JS po deploy

## Symptomy

- Po deployu nowej wersji userzy z zainstalowanym PWA widzą blank screen.
- DevTools Network: `index.html` zwraca 200 (z `(ServiceWorker)`), ale JS chunki dają 404.
- Hard reload nie pomaga — SW serwuje stary HTML z cache.
- Symptom znika po unrejestrowaniu Service Workera (`chrome://serviceworker-internals`).
- Userzy bez PWA (świeża zakładka, incognito) widzą poprawną wersję.

## Root Cause

Stary `index.html` w cache referuje pliki JS po hashu zawartości (np. `app-AB12CD.js`). Nowy deploy zmienia hashe — stare pliki znikają z serwera. SW serwuje cached HTML cache-first → przeglądarka prosi o nieistniejące JS hashe → 404. Cache-first jest poprawne dla immutable assetów z hash w nazwie, ale **toksyczne dla HTML**, który jest entry-pointem rozwiązującym te hashe.

## Rozwiązanie

Network-first dla nawigacji (request o `mode === 'navigate'`), cache-first zachowany dla static assets:

```js
// public/sw.js (lub equivalent)
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Navigation requests: network-first z cache fallback (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/offline.html')
          )
        )
    );
    return;
  }

  // Immutable static assets (hashed): cache-first
  if (/\.(js|css|woff2?|png|svg|ico)$/.test(new URL(request.url).pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
      )
    );
    return;
  }
});
```

Dodatkowo: bump `CACHE_VERSION` per deploy + `self.skipWaiting()` w `install` i `clients.claim()` w `activate` żeby nowy SW przejął kontrolę natychmiast.

## Komendy diagnostyczne

```bash
# 1. Sprawdź jakie URLe SW trzyma w cache:
# DevTools → Application → Cache Storage → static-v1

# 2. Force update SW lokalnie:
# DevTools → Application → Service Workers → "Update on reload" + "Unregister"

# 3. Verify że HTML idzie network-first:
# DevTools → Network → filter "Doc" → reload → response headers powinny mieć fresh date
```

## Zapobieganie

- **Reguła kciuka**: HTML zawsze network-first (entry-point), wszystko z hashem w nazwie cache-first (immutable).
- Nigdy nie cache-firstuj nawigacji bez offline fallback strategy.
- Bumpuj `CACHE_VERSION` per deploy żeby `activate` listener mógł wyczyścić stare cache.
- Test post-deploy z zainstalowanego PWA (nie tylko fresh tab) — to inny code path.
- Service Worker MUSI mieć logikę cleanup starych cache versions w `activate`:
  ```js
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      ).then(() => self.clients.claim())
    );
  });
  ```

## Powiązane

- `packages/sleeper-web/public/sw.js` — implementacja
- MDN: [Service Worker Cookbook — network-first](https://web.dev/offline-cookbook/#network-falling-back-to-cache)
- Workbox patterns: [StaleWhileRevalidate](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)

## Kontekst

- Środowisko: Expo Web (PWA) build, hostowany jako static site.
- Problem objawił się dopiero po drugim deployu — pierwszy SW cache'ował HTML, drugi deploy zmienił hashe JS.
- Pierwsze install (świeży user) zawsze działa — bug pojawia się przy update zainstalowanego PWA.
