# eb01bce: feat(push): lib/push.ts wrapper + sw.js push handlers

**Data:** 2026-07-12
**Branch:** feature/web-push-notifications
**Faza zadania:** web-push-notifications Task 4

## Co zostalo zrobione
- Nowy `lib/push.ts` — jedyne miejsce z dostepem do `Notification`/`pushManager`: `getPushSupport()` ('ok' | 'needs-install' | 'unsupported'; iOS poza standalone => needs-install, bo Safari wystawia PushManager tylko w zainstalowanym PWA), `subscribeToPush()` (requestPermission -> subscribe z `EXPO_PUBLIC_VAPID_PUBLIC_KEY` -> klucze endpoint/p256dh/auth), `getCurrentEndpoint()`.
- `sw.js`: handler `push` (payload JSON {title, body} -> showNotification z ikona 192), handler `notificationclick` (focus istniejacego okna lub openWindow('/')), bump `CACHE_NAME` v8 -> v9.
- `push.invariants.test.ts`: push API tylko w lib/push.ts; sw.js ma oba handlery; brak expo-notifications.

## Zmienione pliki
- `packages/sleeper-web/src/lib/push.ts` — nowy wrapper
- `packages/sleeper-web/src/lib/__tests__/push.invariants.test.ts` — static invariants
- `packages/sleeper-web/public/sw.js` — handlery push + bump cache

## Powod / kontekst
Wzorzec lib-wrapper dla platform API (learned-patterns). `urlBase64ToUint8Array` z jawnym `ArrayBuffer` — TS 5.9 DOM lib wymaga `Uint8Array<ArrayBuffer>` dla `applicationServerKey`. `[no-changelog]` w commicie: bez UI (Task 5) zmiana niewidoczna dla usera; wpis changelog w commicie UI.

## Walidacja
- typecheck: PASS
- test: PASS (3/3 invariants)
- runtime: manual smoke po deployu (Task 6 runbook — wymaga VAPID keys)
