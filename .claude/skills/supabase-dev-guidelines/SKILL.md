---
name: supabase-dev-guidelines
description: Auth (Google/Facebook OAuth, email), Database (PostgreSQL, RLS policies, SECURITY DEFINER), Edge Functions, Realtime subscriptions. Uzywaj przy pracy z autentykacja, baza danych, migracjami, bezpieczenstwem.
---

# Supabase Development Guidelines

## Cel

Kompleksowy przewodnik dla pracy z Supabase w aplikacji **Expo SDK 54 / React Native** - autentykacja, baza danych, RLS policies, Edge Functions, Realtime na mobile i bezpieczeństwo.

## Kiedy Używać Tego Skilla

- Praca z autentykacją (login, rejestracja, OAuth z `expo-web-browser` + deep links)
- Tworzenie lub modyfikacja tabel bazy danych
- Pisanie RLS policies
- Tworzenie Edge Functions
- Migracje bazy danych
- Realtime + RN gotchas (AppState, background → foreground)
- Bezpieczeństwo i audit logging

---

## Quick Start

### Checklist Nowej Tabeli

- [ ] Utwórz tabelę w migracji SQL
- [ ] Włącz RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY`
- [ ] Zdefiniuj RLS policies dla SELECT, INSERT, UPDATE, DELETE
- [ ] Używaj `(SELECT auth.uid())` w policies (nie email) — subquery dla wydajności
- [ ] Dodaj indeksy dla często używanych kolumn
- [ ] Wygeneruj typy: `supabase gen types typescript --local > src/types/database.ts`
- [ ] Utwórz funkcje API w `lib/supabase.ts`

### Checklist Edge Function

- [ ] Utwórz katalog `supabase/functions/function-name/`
- [ ] Użyj `Deno.serve()` (nie importuj serve)
- [ ] Importy: `jsr:@supabase/supabase-js@2`, `npm:stripe@17`
- [ ] CORS headers w `_shared/cors.ts`
- [ ] Zweryfikuj JWT jeśli wymagana autentykacja
- [ ] Loguj błędy (bez wrażliwych danych)
- [ ] Przetestuj lokalnie: `supabase functions serve`
- [ ] Deploy: `supabase functions deploy function-name`

### Checklist Bezpieczeństwa

- [ ] RLS włączony na każdej tabeli
- [ ] UUID (`auth.uid()`) w policies, nie email
- [ ] Audit log bez INSERT policy dla authenticated (tylko triggers/SECURITY DEFINER)
- [ ] `SET search_path = public` w każdej funkcji SECURITY DEFINER
- [ ] Email enumeration protection włączone w Dashboard

---

## Klient Supabase

### Typed Client (Expo SDK 54)
```typescript
// sleeper-app/src/lib/supabase.ts
import 'react-native-url-polyfill/auto'; // ZAWSZE pierwsza linia
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // RN nie ma URL session detection
        },
    }
);

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];
```

**Krytyczne dla RN:**
- `import 'react-native-url-polyfill/auto'` MUSI być pierwsza linia (Supabase SDK używa `URL` API)
- `storage: AsyncStorage` — token persistence; bez tego user wylogowuje się przy reload
- `detectSessionInUrl: false` — to feature web SPA z PKCE callback URL; w RN OAuth flow przez `expo-web-browser` + `Linking.parse(url)` manual

**AppState listener (token refresh w tle):**
```typescript
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
```

### Generowanie Typów
```bash
# Z lokalnej bazy
supabase gen types typescript --local > src/types/database.ts

# Z produkcji
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Podstawowe Operacje
```typescript
// SELECT
const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

// INSERT
const { data, error } = await supabase
    .from('posts')
    .insert({ title, content, user_id: userId });

// UPDATE
const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: newName })
    .eq('id', userId);

// DELETE
const { data, error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

// RPC (wywołanie funkcji PostgreSQL)
const { data, error } = await supabase.rpc('ensure_user_profile');
```

---

## Topic Guides

### Autentykacja

**Dostępne metody:**
- OAuth (Google, Facebook, Apple) — przez `expo-web-browser` + `expo-linking` deep links
- Email/hasło — direct `supabase.auth.signInWithPassword`
- Magic link — `supabase.auth.signInWithOtp` + email z deep linkiem

**Kluczowe Koncepcje (Expo):**
- OAuth flow:
  1. `Linking.createURL('/auth/callback')` — generuje deep link
  2. `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: deepLink, skipBrowserRedirect: true } })`
  3. `WebBrowser.openAuthSessionAsync(data.url, deepLink)` — otwiera w in-app browser
  4. Po callback: `supabase.auth.exchangeCodeForSession(params.code)` (PKCE)
- Scheme w `app.json`: `"scheme": "sleeper"` → callback URL `sleeper://auth/callback`
- Hook `useAuth()` w `sleeper-app/src/hooks/useAuth.ts` (subskrybuje `supabase.auth.onAuthStateChange`)
- Trigger `handle_new_user()` tworzy rekord w `public.profiles` (RLS-friendly, server-side)
- **`getSession()` dla UI** (cache), **`getUser()` dla krytycznych operacji** (zawsze fresh validate)

**[Pełny Przewodnik: resources/auth-patterns.md](resources/auth-patterns.md)**

---

### Baza Danych i RLS

**Wzorcowe Tabele:**
- `profiles` - dane użytkowników (1:1 z auth.users)
- `posts` - treści z własnością użytkownika
- `comments` - relacje do postów i użytkowników
- `bookmarks` - relacja many-to-many
- `audit_log` - logowanie krytycznych operacji (write-only)

**RLS Patterns:**
- Public read: `USING (true)`
- Own data: `USING ((SELECT auth.uid()) = user_id)`
- Conditional: `USING (published = true OR (SELECT auth.uid()) = user_id)`
- Service only: brak policies (tylko service_role)

**[Pełny Przewodnik: resources/database-patterns.md](resources/database-patterns.md)**

---

### Edge Functions

**Typowe Zastosowania:**
- Stripe Checkout / Webhooks
- Integracje z zewnętrznymi API
- Operacje wymagające service_role

**Wzorce 2026:**
- `Deno.serve()` (wbudowane, bez importu)
- `jsr:@supabase/supabase-js@2` (nie esm.sh)
- `npm:stripe@17` (nie esm.sh)
- `constructEventAsync` dla Stripe webhooks
- Runtime: **Deno 2.x** (upgrade z 1.45.2)
- `deno.json` preferowany nad import maps

**[Pełny Przewodnik: resources/edge-functions.md](resources/edge-functions.md)**

---

### Bezpieczeństwo

**Kluczowe Wzorce:**
- RLS dla izolacji danych
- UUID w policies (nie email - email jest mutowalny)
- SECURITY DEFINER dla uprawnionych operacji
- Audit log izolowany (bez INSERT dla authenticated)
- Logowanie przez triggers lub SECURITY DEFINER functions

**[Pełny Przewodnik: resources/security.md](resources/security.md)**

---

### Realtime (sleeper: KLUCZOWE — sync dwóch telefonów)

**Użycie w sleeper:**
- Subscriptions dla tabel `sessions`, `children` — Realtime event → `queryClient.invalidateQueries(...)`
- Presence rzadko (nie potrzebujemy "kto online" w MVP)
- Broadcast nie używamy

**RN gotchas:**
- **Background → foreground**: WebSocket może się rozłączyć podczas background; `AppState` listener + `supabase.removeAllChannels()` + re-subscribe przy `'active'`
- **Reconnection**: Supabase SDK reconnect'uje automatycznie, ale subscription może być stale (nie złapie eventów z czasu offline) — preferuj re-fetch przy reconnect zamiast polegania na sub
- **Cleanup**: ZAWSZE w `useEffect` return: `channel.unsubscribe()` (memory leak inaczej)
- **Network change**: na mobile często zmienia się WiFi/4G — Supabase Realtime SDK to handle'uje, ale obserwuj

**Wzorzec dla sleeper:**
```typescript
useEffect(() => {
    const channel = supabase.channel('sessions-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
}, []);
```

**[Pełny Przewodnik: resources/realtime.md](resources/realtime.md)**

---

## Navigation Guide

| Potrzebujesz... | Przeczytaj |
|-----------------|------------|
| Autentykację OAuth/email | [auth-patterns.md](resources/auth-patterns.md) |
| Bazę danych i RLS | [database-patterns.md](resources/database-patterns.md) |
| Edge Functions | [edge-functions.md](resources/edge-functions.md) |
| Bezpieczeństwo | [security.md](resources/security.md) |
| Realtime subscriptions | [realtime.md](resources/realtime.md) |
| Supabase CLI | [cli-guide.md](resources/cli-guide.md) |

---

## Główne Zasady

1. **RLS Zawsze Włączony**: Każda tabela musi mieć RLS
2. **UUID w Policies**: `auth.uid() = user_id`, nigdy email
3. **Generated Types**: `supabase gen types` po każdej migracji
4. **SECURITY DEFINER Ostrożnie**: Zawsze `SET search_path = public`
5. **Service Role Tylko w Edge Functions**: Nigdy nie eksponuj na froncie
6. **Audit Log Izolowany**: Wpisy tylko przez triggers/SECURITY DEFINER
7. **Logger dla Błędów**: `logger.error()` zamiast `console.error()`

---

## Zmienne Środowiskowe

### Mobile app (sleeper-app/.env)
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Uwaga:** `EXPO_PUBLIC_*` jest **publiczne** (bundle'owane do app) — TYLKO anon key i URL. Service role NIGDY w app code.

Alternatywa przez `app.config.ts` + `Constants.expoConfig?.extra`:
```ts
// app.config.ts
export default {
    expo: {
        extra: {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        }
    }
};
```

### Edge Functions (Supabase Dashboard secrets, NIE .env w repo)
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # NIGDY nie commituj!
SENTRY_DSN=...                  # backend Sentry
```

Set: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`

---

## Częste Błędy

### Unikaj (Expo + Supabase)
```typescript
// ❌ Service role w app (EXPO_PUBLIC_* jest publiczne!)
const supabase = createClient(url, EXPO_PUBLIC_SERVICE_ROLE_KEY);

// ❌ Brak URL polyfill — Supabase SDK będzie crashował
// (zapomniany `import 'react-native-url-polyfill/auto'`)

// ❌ Brak AsyncStorage w client config — user wylogowuje się przy każdym restart app
createClient(url, key); // bez { auth: { storage: AsyncStorage } }

// ❌ Email w RLS policy
USING (user_email = auth.email())  // Email może się zmienić!

// ❌ Brak typów
const { data } = await supabase.from('sessions').select('*');  // data: any

// ❌ console.error w produkcji
console.error('DB error:', error);  // Wycieka info o strukturze DB; Sentry capture zamiast tego

// ❌ Stary import w Edge Functions
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ❌ getSession() do autoryzacji server-side (Edge Function)
const { data: { session } } = await supabase.auth.getSession();
if (session) { /* autoryzacja */ }  // Token nie jest zweryfikowany!

// ❌ Realtime channel bez cleanup w useEffect — memory leak
useEffect(() => {
    supabase.channel('x').subscribe();
}, []); // brak return cleanup!

// ❌ detectSessionInUrl: true w RN — to feature SPA, w RN nie działa
```

### Preferuj
```typescript
// ✅ Anon key + AsyncStorage persistence
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
const supabase = createClient(url, ANON_KEY, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

// ✅ UUID w RLS policy
USING ((SELECT auth.uid()) = user_id)  // subquery dla wydajności RLS

// ✅ Typed queries
const { data } = await supabase.from('sessions').select('*');  // data: Tables[]

// ✅ Production-safe — Sentry capture w catch + structured logger
import * as Sentry from '@sentry/react-native';
catch (error) { Sentry.captureException(error); }

// ✅ Nowy standard Edge Functions
Deno.serve(async (req) => { ... });

// ✅ getUser() w Edge Functions (server-side validation)
const { data: { user } } = await supabase.auth.getUser(token);
if (user) { /* autoryzacja */ }

// ✅ Realtime z cleanup
useEffect(() => {
    const channel = supabase.channel('x').subscribe();
    return () => { supabase.removeChannel(channel); };
}, []);
```

## Sleeper: AsyncStorage vs SecureStore

| Dane | Storage | Powód |
|------|---------|-------|
| Supabase session token (JWT) | AsyncStorage | Standard; iOS/Android Keychain hardware-backed dla Supabase JS SDK |
| Settings UI (theme, layout) | AsyncStorage + zustand persist | Nieczułe |
| Active child ID (Zustand) | AsyncStorage | UI state |
| Biometric secret / PIN | `expo-secure-store` | Najwyższa wrażliwość — Keychain (iOS) / Keystore (Android) |
| Encryption keys | `expo-secure-store` | Zawsze osobne hardware-backed storage |

Sleeper MVP: **wszystko w AsyncStorage** (token, UI state). SecureStore tylko gdy dodamy biometric/PIN (post-MVP).

---

**Status Skilla**: Modułowa struktura z progressive loading dla optymalnego zarządzania kontekstem. Zaktualizowany do standardów Marzec 2026.
