---
name: sentry-integration
description: Sentry error tracking i performance monitoring dla Expo SDK 54 (React Native) + Supabase Edge Functions. Aktywuje się przy pracy z błędami, monitoringiem, captureException, error boundary, śledzeniem błędów, diagnostyką, loggerem, Edge Functions, crash, awaria, native crash reporting, wydajność, raportowanie błędów, exception, wyjątek.
---

# Sentry Integration Guidelines

Kompleksowy przewodnik integracji Sentry error tracking i performance monitoring dla projektu **Expo SDK 54 / React Native + Supabase Edge Functions**.

> **📅 Ostatnia aktualizacja: Maj 2026** (Expo SDK 54)
>
> - **`@sentry/react-native`** v6+ (z `@sentry/expo` lub `@sentry/react-native/expo` config plugin) ✅
> - **Native crash reporting:** iOS (NSException), Android (Java/Kotlin exception) — wymaga EAS Build (NIE działa w Expo Go!)
> - **Sourcemap upload:** automatyczne przez EAS Build hooks
> - **Edge Functions:** Ograniczone wsparcie ⚠️ (wymaga `withScope` + `flush`)

## Table of Contents

- [Critical Rules](#critical-rules)
- [Known Limitations](#known-limitations)
- [Error Levels](#error-levels)
- [Quick Reference](#quick-reference)
- [Context Enrichment](#context-enrichment)
- [GDPR Compliance](#gdpr-compliance)
- [Checklist dla Nowego Kodu](#checklist-dla-nowego-kodu)
- [Common Mistakes](#common-mistakes)
- [Resources](#resources)

---

## Critical Rules

**NIGDY NIE ŁAMIESZ TYCH ZASAD:**

1. **ALL ERRORS MUST BE CAPTURED TO SENTRY** - w produkcji każdy błąd musi trafić do Sentry
2. **NIGDY `console.error` bez Sentry** - w Edge Functions każdy `console.error` musi mieć `captureError()`
3. **MASKUJ DANE OSOBOWE** - email musi być maskowany: `user@example.com` → `us***@example.com`
4. **NIE WYSYŁAJ WRAŻLIWYCH DANYCH** - hasła, tokeny, klucze API NIGDY nie trafiają do Sentry
5. **UŻYWAJ ODPOWIEDNICH POZIOMÓW** - `fatal` tylko dla krytycznych, `error` dla operacji

---

## Known Limitations

### Edge Functions (Supabase)

⚠️ **Sentry Deno SDK ma ograniczenia:**

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Brak izolacji scope między requestami | SDK nie wspiera `Deno.serve` instrumentation | Zawsze używaj `Sentry.withScope()` |
| Wymagana wersja Deno 2.0+ | Supabase używa Deno 1.45.2 | Używaj `defaultIntegrations: false` |
| Kontekst współdzielony | Runtime reużywany między requestami | Nie ustawiaj globalnych tagów per-request |

**Zawsze używaj tego wzorca:**
```typescript
// ŹLE - kontekst wycieknie do innych requestów
Sentry.setTag('user_id', userId);
Sentry.captureException(error);

// DOBRZE - izolowany scope
Sentry.withScope((scope) => {
  scope.setTag('user_id', userId);
  Sentry.captureException(error);
});
```

Szczegóły: [edge-functions-sentry.md](resources/edge-functions-sentry.md)

---

## Error Levels

| Level | Kiedy używać | Przykład |
|-------|--------------|----------|
| `fatal` | System nie działa, wymaga natychmiastowej interwencji | Brak połączenia z bazą |
| `error` | Operacja nie powiodła się, użytkownik dotknięty | Płatność Stripe nie przeszła |
| `warning` | Problem odwracalny, nie wymaga natychmiastowej akcji | Retry po timeout |
| `info` | Informacje operacyjne | Użytkownik zalogowany |

---

## Quick Reference

### Frontend (Expo / React Native)

**Setup (jednorazowy):**
```bash
# w sleeper-app/
npx @sentry/wizard@latest -i reactNative
```

Wizard doda:
- `@sentry/react-native` do `package.json`
- `@sentry/react-native/expo` config plugin do `app.json` lub `app.config.ts`
- `sentry.properties` (sourcemap upload config)
- Patch w `metro.config.js`

**Konfiguracja w `app.config.ts`:**
```ts
export default {
  expo: {
    plugins: [
      ['@sentry/react-native/expo', {
        organization: 'sleeper',
        project: 'sleeper-mobile',
      }],
    ],
  },
};
```

**Inicjalizacja w root `_layout.tsx`:**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN!,
  enableNative: true,         // native crash reporting (iOS/Android)
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,      // performance monitoring
  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = event.user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    }
    return event;
  },
});

function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <Stack />
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout); // wrap włącza profiling + native error tracking
```

**Native crash reporting wymaga EAS Build** — `enableNative: true` w Expo Go nie zadziała (Expo Go nie ma natywnego Sentry SDK). Test crashy: dev client (`eas build --profile development`).

**Użycie loggera (preferowane):**
```typescript
import { logger } from '@/lib/logger';

try {
  await riskyOperation();
} catch (error) {
  logger.error('Operacja nie powiodła się', error);
  // toast/Alert dla użytkownika
}
```

**Bezpośrednie Sentry (gdy potrzeba więcej kontekstu):**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.withScope((scope) => {
  scope.setTag('operation', 'session-start');
  scope.setContext('session', { childId, startAt });
  Sentry.captureException(error);
});
```

**Sourcemaps (release builds):**
EAS Build automatycznie uploaduje sourcemaps z Sentry plugin (skonfigurowane przez wizard). Sprawdź `eas.json` `production` profile:
```json
{
  "production": {
    "env": {
      "SENTRY_AUTH_TOKEN": "..."
    }
  }
}
```

### Edge Functions (Deno)

**Każda funkcja MUSI mieć Sentry z `withScope`:**
```typescript
import { initSentry, captureError } from '../_shared/sentry.ts';

const Sentry = initSentry('function-name');

// WAŻNE: Deno.serve zamiast serve z deno.land/std
Deno.serve(async (req) => {
  try {
    // logika
  } catch (error) {
    // ZAWSZE używaj captureError (używa withScope wewnętrznie)
    captureError(error, {
      operation: 'checkout',
      user_id: userId  // NIE user_email (GDPR)
    });
    return new Response(JSON.stringify({ error: 'Error' }), { status: 500 });
  }
});
```

---

## Context Enrichment

**ZAWSZE dodawaj kontekst do błędów:**

```typescript
// DOBRZE - bogaty kontekst
Sentry.withScope((scope) => {
  scope.setUser({ id: userId, email: maskedEmail });
  scope.setTag('service', 'payments');
  scope.setTag('endpoint', '/checkout');
  scope.setContext('operation', {
    type: 'stripe_checkout',
    sessionId: session.id,
    amount: amount
  });
  scope.addBreadcrumb({
    category: 'payment',
    message: 'Starting checkout',
    level: 'info'
  });
  Sentry.captureException(error);
});

// ŹLE - brak kontekstu
Sentry.captureException(error); // Skąd? Co? Dla kogo?
```

---

## GDPR Compliance

**Maskowanie emaili - OBOWIĄZKOWE:**

```typescript
// W beforeSend
beforeSend(event) {
  if (event.user?.email) {
    event.user.email = event.user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  }
  return event;
}

// W setSentryUser
export function setSentryUser(user: { id: string; email: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
    });
  } else {
    Sentry.setUser(null);
  }
}
```

---

## Checklist dla Nowego Kodu

Przed każdym PR sprawdź:

- [ ] Zaimportowano Sentry lub odpowiedni helper
- [ ] Wszystkie bloki try/catch wysyłają do Sentry
- [ ] Dodano znaczący kontekst (tagi, breadcrumbs)
- [ ] Użyto odpowiedniego poziomu błędu
- [ ] Brak wrażliwych danych w event (hasła, tokeny)
- [ ] Email użytkownika jest maskowany
- [ ] Przetestowano ścieżki błędów

---

## Common Mistakes

**NIE RÓB:**
```typescript
// Połykanie błędów
try {
  await operation();
} catch (error) {
  // nic - użytkownik nie wie, my nie wiemy
}

// console.error bez Sentry
} catch (error) {
  console.error('Error:', error); // W produkcji nikt nie widzi!
}

// Wrażliwe dane
Sentry.setContext('auth', { token: userToken }); // NIE!
```

**RÓB:**
```typescript
// Zawsze capture + informacja dla użytkownika
try {
  await operation();
} catch (error) {
  logger.error('Operacja nie powiodła się', error);
  toast.error('Wystąpił błąd. Spróbuj ponownie.');
}

// Bezpieczny kontekst
Sentry.setContext('auth', {
  userId: user.id,
  provider: 'google' // OK - nie wrażliwe
});
```

---

## Resources

Szczegółowe wzorce znajdują się w:

- **[react-sentry-patterns.md](resources/react-sentry-patterns.md)** - Konfiguracja React (treść pod web — adaptuj na `@sentry/react-native`); ErrorBoundary, performance, mobile session replay (premium feature)
- **[edge-functions-sentry.md](resources/edge-functions-sentry.md)** - Wzorce dla Supabase Edge Functions (Deno), shared helpers — bez zmian (server-side, stack-agnostic)

## RN-specific Sentry features

| Feature | Wsparcie | Wymaga |
|---------|----------|--------|
| JS error capture | ✅ Expo Go + EAS | nic |
| Native crash (iOS NSException) | ⚠️ TYLKO EAS Build | `enableNative: true`, EAS dev client |
| Native crash (Android Java) | ⚠️ TYLKO EAS Build | jak wyżej |
| Sourcemaps (release) | ✅ | EAS Build + Sentry wizard config |
| Profiling | ✅ | `@sentry/react-native/profiling-flag` |
| Performance / Tracing | ✅ | `tracesSampleRate > 0` |
| Session Replay mobile | 💰 (premium) | Beta — sprawdź pricing |
| Release Health | ✅ | auto-tracking sessions |

---

**Skill Status**: COMPLETE
**Line Count**: < 200 (following 500-line rule)
**Progressive Disclosure**: Reference files for detailed patterns
