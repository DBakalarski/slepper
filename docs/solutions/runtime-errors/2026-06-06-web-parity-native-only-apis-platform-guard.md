---
title: "Web parity z mobile: native-only APIs (expo-keep-awake, Alert, expo-notifications) cicho no-op na web"
date: 2026-06-06
category: runtime-errors
severity: high
stack:
  - React Native Web
  - Expo SDK 54
  - PWA
tags:
  - platform-guard
  - cross-platform
  - expo-web
  - lib-wrappers
  - wake-lock-api
status: verified
last_verified: 2026-06-06
---

# Web parity z mobile: native-only APIs cicho no-op na web

## Symptomy

- Copy-paste plików z `sleeper-app` (mobile) do `sleeper-web` przechodzi TypeScript bez błędu.
- Runtime: brak crashu, ale funkcjonalność cicho nie działa:
  - `useKeepAwake()` z `expo-keep-awake` → no-op na web, ekran gaśnie podczas sesji snu.
  - `Alert.alert(...)` z `react-native` → no-op na web (lub fallback do `window.alert` bez przycisków OK/Cancel).
  - `Notifications.scheduleNotificationAsync(...)` z `expo-notifications` → rzuca lub no-op zależnie od wersji RNW.
- User testuje na web, nie dostaje confirma przed destrukcyjną akcją (np. delete session) — kliknięcie usuwa od razu.

## Root Cause

`react-native-web` mapuje większość RN API na DOM equivalents, ale wybrane native-only API są stub (no-op) lub brak ich w bundle web. TypeScript widzi sygnatury z `.d.ts`, więc kompilacja przechodzi — różnica ujawnia się tylko w runtime na konkretnej platformie.

## Rozwiązanie

**Wzorzec: `Platform.OS` guard + lib wrapper z web alternatywą.**

### Confirm dialog (Alert.alert → window.confirm)

```ts
// src/lib/confirm.ts
import { Platform, Alert } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = opts.message
      ? `${opts.title}\n\n${opts.message}`
      : opts.title;
    return Promise.resolve(window.confirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel ?? 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
      {
        text: opts.confirmLabel ?? 'OK',
        style: opts.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
```

### Keep awake (expo-keep-awake → Wake Lock API)

```ts
// src/lib/keep-awake.ts
import { Platform } from 'react-native';
import { useEffect } from 'react';

export function useKeepAwake(active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    if (Platform.OS === 'web') {
      let wakeLock: WakeLockSentinel | null = null;
      let cancelled = false;

      const acquire = async () => {
        try {
          if (!('wakeLock' in navigator)) return;
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          // user agent może odmówić (np. battery saver) — log, nie throw
          console.warn('[keep-awake] wake lock denied', err);
        }
      };

      acquire();

      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && !cancelled) acquire();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', handleVisibility);
        wakeLock?.release().catch(() => {});
      };
    }

    // native: dynamiczny import żeby web bundle nie zawierał expo-keep-awake
    let cleanup: (() => void) | undefined;
    import('expo-keep-awake').then(({ activateKeepAwakeAsync, deactivateKeepAwake }) => {
      const tag = `keep-awake-${Date.now()}`;
      activateKeepAwakeAsync(tag);
      cleanup = () => deactivateKeepAwake(tag);
    });
    return () => cleanup?.();
  }, [active]);
}
```

### Notyfikacje

Na web — zamiast `expo-notifications` użyj `Notification` API (request permission + `new Notification(...)`) za platform guardem; w MVP można też po prostu skipnąć notyfikacje na web i dodać banner "instaluj na telefonie po notyfikacje".

## Komendy diagnostyczne

```bash
# 1. Grep callsite'ów native-only API w kodzie współdzielonym:
grep -rE "(Alert\.alert|useKeepAwake|expo-notifications|expo-keep-awake)" packages/sleeper-web/src

# 2. Smoke test runtime na web:
# DevTools console → wywołaj akcję która używa Alert.alert → sprawdź czy pojawia się modal lub window.confirm

# 3. Wake Lock API support check:
# DevTools console → console.log('wakeLock' in navigator) → true na Chrome/Edge desktop+Android
```

## Zapobieganie

- **Reguła architektury**: NIGDY nie importuj `Alert`, `expo-keep-awake`, `expo-notifications` bezpośrednio w plikach współdzielonych. ZAWSZE przez `lib/` wrapper z `Platform.OS` guard.
- Code review na PR z `sleeper-web`: grep `Alert\.alert\|useKeepAwake\|expo-notifications` w `git diff` → flag jako TODO.
- Smoke test manual checklist per release: 1 destrukcyjna akcja (delete) + 1 keep-awake action (start sesji) na web → weryfikacja w prawdziwym browserze, nie tylko Storybook/RNTL.
- Dla każdego native-only API znajdź web equivalent PRZED copy-paste:
  - `Alert.alert` → `window.confirm` / `window.alert`
  - `useKeepAwake` → Screen Wake Lock API (`navigator.wakeLock`)
  - `expo-notifications` → `Notification` API
  - `expo-haptics` → `navigator.vibrate` (mniej granularne)
  - `expo-secure-store` → `localStorage` z encryption layer LUB IndexedDB
- Dynamiczny import native-only modułów w blokach `Platform.OS !== 'web'` żeby web bundle ich nie zawierał — oszczędność bundle size + zero szansy na runtime load error.

## Powiązane

- `packages/sleeper-web/src/lib/confirm.ts`, `packages/sleeper-web/src/lib/keep-awake.ts`
- React Native Web compatibility: [necolas/react-native-web](https://necolas.github.io/react-native-web/docs/?path=/docs/overview-getting-started--page)
- MDN: [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- MDN: [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## Kontekst

- Środowisko: Expo SDK 54, React Native Web w trybie PWA, target Chrome/Safari mobile.
- Problem ujawnił się przy testach parity z mobile — destrukcyjna akcja na web nie pokazywała confirma.
- TypeScript nie wykrywa różnicy bo `.d.ts` dla `react-native` deklaruje API identycznie na wszystkich platformach; `Platform.OS` to runtime check.
