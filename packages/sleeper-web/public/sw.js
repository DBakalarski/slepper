// Sleeper PWA Service Worker
// Strategia:
//   - cache-first dla shell assets (/, /sign-in, /manifest.json, /_expo/static/*)
//   - network-only dla Supabase API (/rest/v1/*, /auth/v1/*, /realtime/v1/*) — skip cache
//   - network-first fallback dla pozostalych routes (SPA fallback do /index.html)
// Wersjonowanie: bump CACHE_NAME przy kazdym deploy zeby aktywowac fresh assets.

const CACHE_NAME = 'sleeper-shell-v1';
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

  // Cache-first dla shell + static assets (Expo bundled JS/CSS, ikony).
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
          // Offline fallback: SPA shell dla nawigacji.
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
    }),
  );
});
