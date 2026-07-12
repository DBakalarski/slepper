# 7ed5d3c: feat(push): edge function send-nap-push (VAPID + dedup + cron secret)

**Data:** 2026-07-12
**Branch:** feature/web-push-notifications
**Faza zadania:** web-push-notifications Task 3

## Co zostalo zrobione
- `due.ts`: czysta logika `classifyDue` (already-delivered > skip-expired > send > not-yet; okno `[next - lead, next)`) i `formatPushBody` (czas w Europe/Warsaw, "za ~X min"). Zero Deno API — testowana vitestem z paczki web (6 casow).
- `index.ts` (Deno): weryfikacja `x-cron-secret`, pobranie `nap_schedule` (join children) -> `family_members` -> `push_subscriptions` enabled -> `push_deliveries`; dedup przez INSERT do `push_deliveries` PRZED wysylka (konflikt 23505 = inny run wygral — idempotencja przy rownoleglych cronach); `skip-expired` dostaje wpis delivery bez wysylki (nie ponawiamy po przegapionym oknie); wysylka `@block65/webcrypto-web-push@1` (base64url VAPID keys, zgodne z `npx web-push generate-vapid-keys`); 404/410 = delete martwej subskrypcji.
- `tsconfig.json` web: `exclude: ["node_modules", "supabase/functions"]` — kod Deno (importy `npm:`, global `Deno`) poza zasiegiem tsc aplikacji; `due.ts` nadal typechecked transitively przez import w tescie.

## Zmienione pliki
- `packages/sleeper-web/supabase/functions/send-nap-push/due.ts` — nowa czysta logika
- `packages/sleeper-web/supabase/functions/send-nap-push/index.ts` — nowa edge function
- `packages/sleeper-web/src/features/notifications/__tests__/push-due.test.ts` — testy due
- `packages/sleeper-web/tsconfig.json` — exclude supabase/functions

## Powod / kontekst
Serwerowa polowa podejscia A: cron co 5 min, funkcja wysyla pushe wg harmonogramu liczonego przez klienta. Wyprzedzenie jest per subskrypcja, wiec dedup per (subskrypcja, dziecko, next_sleep_at).

## Walidacja
- typecheck: PASS (tsc web; index.ts poza zasiegiem — walidacja Deno przy deploy)
- test: PASS (6/6 push-due)
- runtime: n/a — wymaga deployu funkcji + sekretow (akcja usera, runbook w Task 6)
