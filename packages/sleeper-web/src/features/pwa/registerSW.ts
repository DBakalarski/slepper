// Service Worker registration dla Sleeper PWA.
// Idempotentny — bezpieczne wywolanie wielokrotne (browser deduplikuje
// rejestracje per scope). No-op na native (RN) — kontrolowane przez Platform.OS
// + typeof check (Hermes/JavaScriptCore nie maja `navigator`).
//
// Rejestracja w `_layout.tsx` w `useEffect` (post-mount, po React hydration).

export function registerSW(): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[pwa] Service Worker not supported in this browser');
    }
    return;
  }

  // Czekamy na window.load zeby nie konkurowac z initial bundle parse/exec.
  // Dla starszych Safari ktore odpalily `load` przed naszym handlerem (rare race),
  // sprawdzamy `document.readyState`.
  const register = (): void => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[pwa] Service Worker registered, scope:', registration.scope);
        }
      })
      .catch((err: unknown) => {
        // SW registration error — log do error stream (NIE warn, bo to operacyjny problem)
        console.error('[pwa] Service Worker registration failed:', err);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
