// Web Push subscription wrapper — CALY dostep do Notification / PushManager
// zyje w tym pliku (wzorzec lib-wrapper dla platform API, patrz
// learned-patterns "Native-only API na web"). Konsumenci: usePushSettings.

export type PushSupport = 'ok' | 'needs-install' | 'unsupported';

export interface PushSubscriptionKeys {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export function getVapidPublicKey(): string | null {
  return process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari legacy: navigator.standalone (poza typami DOM — platform narrowing).
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function getPushSupport(): PushSupport {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return 'unsupported';
  }
  if ('PushManager' in window && 'Notification' in window) return 'ok';
  // iOS Safari wystawia PushManager TYLKO w zainstalowanym PWA (standalone).
  // Poza standalone komunikat "zainstaluj"; w standalone bez PushManager —
  // realnie stary iOS (<16.4) = unsupported.
  return isStandalone() ? 'unsupported' : 'needs-install';
}

// applicationServerKey wymaga Uint8Array z base64url (klucz z
// `npx web-push generate-vapid-keys`).
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Jawny ArrayBuffer (nie ArrayBufferLike) — wymog typu BufferSource
  // w PushSubscriptionOptionsInit.applicationServerKey (TS 5.9 DOM lib).
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getCurrentEndpoint(): Promise<string | null> {
  if (getPushSupport() !== 'ok') return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export async function subscribeToPush(): Promise<PushSubscriptionKeys | 'permission-denied'> {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) throw new Error('[push] Brak EXPO_PUBLIC_VAPID_PUBLIC_KEY w env');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'permission-denied';

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error('[push] Subskrypcja bez kluczy p256dh/auth');
  return { endpoint: subscription.endpoint, p256dh, auth };
}
