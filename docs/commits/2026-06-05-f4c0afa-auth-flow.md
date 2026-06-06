# f4c0afa: feat(sleeper-web-pwa): copy auth flow (AuthProvider + sign-in/sign-up) + wire into _layout

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** sleeper-web-pwa — Implementation Unit 3 (Auth flow)

## Co zostalo zrobione
- Skopiowano AuthProvider 1:1 z sleeper-app — Supabase auth state machine ('loading' → 'signed_in' | 'signed_out') z `onAuthStateChange` listener i `queryClient.clear()` przy SIGNED_OUT.
- Skopiowano translate-auth-error.ts 1:1 (slownik PL bledow Supabase Auth).
- Skopiowano `(auth)/_layout.tsx` — guard kierujacy `signed_in` na `/`, w przeciwnym razie renderuje Stack sign-in/sign-up.
- Skopiowano `(auth)/sign-in.tsx` i `(auth)/sign-up.tsx` 1:1 z sleeper-app (formularze email+haslo z `useMutation` TanStack Query).
- Zmodyfikowano `_layout.tsx` PWA — dodano AuthProvider miedzy QueryClientProvider a Stack, oraz SafeAreaProvider jako outermost wrapper dla parytetu z sleeper-app. NIE dodano ThemeProvider (zarezerwowane na IU4). NIE wywolano `configureNotificationHandler()` (wykluczone z PWA — notifications no-op).

## Zmienione pliki
- `packages/sleeper-web/src/features/auth/AuthProvider.tsx` — kopia 1:1
- `packages/sleeper-web/src/features/auth/translate-auth-error.ts` — kopia 1:1
- `packages/sleeper-web/src/app/(auth)/_layout.tsx` — kopia 1:1
- `packages/sleeper-web/src/app/(auth)/sign-in.tsx` — kopia 1:1
- `packages/sleeper-web/src/app/(auth)/sign-up.tsx` — kopia 1:1
- `packages/sleeper-web/src/app/_layout.tsx` — dodany AuthProvider + SafeAreaProvider wrapper, zachowano `import '@/global.css'` i minimal Stack

## Powod / kontekst
IU3 z planu `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`. Wymaganie R8 (Auth zgodny z sleeper-app — email + password Supabase). PWA jako port 1:1 sleeper-app — auth flow musi pozwolic logowanie tym samym kontem Supabase Auth co w aplikacji mobilnej. `detectSessionInUrl: true` ustawione w IU2 w `supabase.ts` PWA — auth session jest detect'owana w URL (PKCE callback). SafeAreaProvider dodany dla parytetu z sleeper-app (na web jest no-op, ale unika divergence struktury providerow).

## Walidacja
- typecheck (sleeper-web): PASS dla plikow IU3. Pozostaje 2 transient errors z IU2 (`lib/session-gaps.ts` i `lib/sleep-stats.ts` import z `@/features/sessions/hooks` — resolve w IU5). Zero nowych errors z IU3.
- lint (sleeper-web): 1 error pre-existing z IU2 (`sleep-stats.ts` no-unresolved). Zero nowych z IU3.
- typecheck (sleeper-app, regression): PASS — 0 bledow.
- grep `configureNotificationHandler` w PWA `_layout.tsx`: brak (zgodnie z IU3 brief).
- grep `AuthProvider` w PWA `_layout.tsx`: present (wrapper aktywny).
- runtime: NIE wykonano `expo start --web` — operator responsibility (manual on-device po wszystkich IU lub w IU9).
