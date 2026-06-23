// Sleeper PWA Service Worker
// Strategia (po P2.3 fix review fazy 4):
//   - NETWORK-FIRST dla nawigacji (request.mode === 'navigate', np. `/`, deep linki)
//     z cache fallback dla offline. Eliminuje stale-HTML-with-stale-JS-hash 404 problem:
//     stary HTML w cache referowal stary hash entry-{hash}.js ktory po deploy juz nie istnieje
//     (Vercel ma immutable headers per-hash). Network-first kosztuje 1 RTT na cold navigation,
//     ale gwarantuje swieze hashe.
//   - CACHE-FIRST dla immutable static assets (/_expo/static/*, /icons/*, /favicon.png,
//     /manifest.json) — bezpieczne, bo nazwy plikow zawieraja content hash.
//   - NETWORK-ONLY (skip) dla Supabase API (/rest/v1/*, /auth/v1/*, /realtime/v1/*).
// Wersjonowanie: bump CACHE_NAME nadal zalecany przy zmianie strategii (sw.js samo),
// ale dla zwyklych bundle changes network-first dla `/` to obroni.

const CACHE_NAME = 'sleeper-shell-v8';
const SHELL_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // SKIP: Supabase API (auth, rest, realtime, storage) — always network, never cache.
  // Auth callbacks (PKCE code exchange) z `#access_token=` lub `?code=` MUSZA isc do
  // network bezposrednio (cache mialby stale session).
  if (
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/') ||
    url.pathname.startsWith('/realtime/v1/') ||
    url.pathname.startsWith('/storage/v1/') ||
    url.hostname.endsWith('.supabase.co')
  ) {
    return; // pass-through to network (default browser behavior)
  }

  // NETWORK-FIRST dla nawigacji (HTML) — gwarantuje swiezy hash entry-{hash}.js po deploy.
  // P2.3 (review fazy 4): cache-first dla `/` powodowal 404 white screen po deploy bo
  // stary HTML referowal hashy ktorych juz nie ma. Network-first eliminuje ten risk.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Aktualizuj cache w tle — uzytkownik offline dostanie ostatni dzialajacy HTML.
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback — cached shell.
          return caches.match('/').then((cached) => {
            return cached ?? new Response('', { status: 503, statusText: 'Service Unavailable' });
          });
        }),
    );
    return;
  }

  // CACHE-FIRST dla immutable static assets (hash w nazwie = no stale risk).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache only successful GET responses for same-origin static assets.
          if (
            response.ok &&
            response.type === 'basic' &&
            (url.pathname.startsWith('/_expo/') ||
              url.pathname.startsWith('/icons/') ||
              url.pathname === '/favicon.png' ||
              url.pathname === '/manifest.json')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
    }),
  );
});
