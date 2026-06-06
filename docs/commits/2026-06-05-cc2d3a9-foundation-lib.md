# cc2d3a9: feat(sleeper-web-pwa): copy foundation lib (time, supabase, query-client, errors) + notifications no-op mock

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** IU2 — Foundation lib (docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md)

## Co zostalo zrobione

- Skopiowano warstwe `src/lib/` z `packages/sleeper-app` do `packages/sleeper-web` (14 plikow + 1 test + vitest.config).
- Zmodyfikowano `supabase.ts`: `detectSessionInUrl: true` (web flow). Sleeper-app zostaje na `false`.
- Stworzono `notifications.ts` jako no-op web mock (5 eksportow, sygnatury 1:1 z sleeper-app, bez importu `expo-notifications`).

## Zmienione pliki

- `packages/sleeper-web/src/lib/time.ts` — kopia 1:1 (TZ-safe helpers, KRYTYCZNE per docs/solutions)
- `packages/sleeper-web/src/lib/supabase.ts` — kopia + `detectSessionInUrl: true` (web URL session detection)
- `packages/sleeper-web/src/lib/query-client.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/colors.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/child-age.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/email.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/postgres-errors.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/extract-error-message.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/session-gaps.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/sleep-norms.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/sleep-stats.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/database.types.ts` — kopia 1:1 (generated z Supabase)
- `packages/sleeper-web/src/lib/useNow.ts` — kopia 1:1
- `packages/sleeper-web/src/lib/useNotificationDot.ts` — kopia 1:1 (mock zwraca true)
- `packages/sleeper-web/src/lib/notifications.ts` — NOWY no-op mock (configureNotificationHandler, requestPermissions, cancelNapNotification, scheduleNapNotification, PermissionStatus)
- `packages/sleeper-web/src/lib/__tests__/time.test.ts` — kopia 1:1
- `packages/sleeper-web/vitest.config.mjs` — kopia 1:1

## Powod / kontekst

IU2 z planu PWA. Cel: udostepnic identyczna warstwe domain helpers (time, supabase client, query-client, error utils, sleep stats) w sleeper-web zeby IU3-IU10 mogly kopiowac feature code z sleeper-app bez modyfikacji importow.

**Decyzje swiadome:**
- `detectSessionInUrl: true` na web — wymagane dla magic link / OAuth callback / password reset (parsowanie `#access_token=...`).
- `notifications.ts` no-op zamiast kopii — scope PWA wyklucza local/push notifications (decyzja z planowania). Sygnatury zachowane 1:1 zeby skopiowane w IU5+ hooks resolve'owaly bez modyfikacji.

## Walidacja

- typecheck (sleeper-web): 2 transient TS2307 w `session-gaps.ts` i `sleep-stats.ts` na `@/features/sessions/hooks` — znany cross-IU coupling, resolve w IU5 (sessions hooks tworzone w IU5 per plan). Brak innych bledow.
- typecheck (sleeper-app): PASS (zero regression, zero zmian w sleeper-app)
- test (sleeper-web vitest): PASS 14/14 (time.test.ts)
- grep `detectSessionInUrl: true` -> match
- grep `-L expo-notifications` -> match (notifications.ts NIE importuje expo-notifications)
- runtime: nie testowane na tym etapie (lib nie ma side effectow przy imporcie poza supabase client init ktory tylko console.warn'uje na brak env)

## Notatki

Wszystkie pliki sleeper-app/src/lib/* uzywaja alias `@/*` w importach — sleeper-web ma identyczny mapping w tsconfig.json, wiec importy resolve'uja sie bez zmian. Cross-IU dependency (session-gaps/sleep-stats -> features/sessions/hooks) jest typowanym importem (`import type { SleepSession }`) i zostanie zaspokojony w IU5.
