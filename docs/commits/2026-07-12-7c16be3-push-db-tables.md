# 7c16be3: feat(db): tabele web push — push_subscriptions, nap_schedule, push_deliveries

**Data:** 2026-07-12
**Branch:** feature/web-push-notifications
**Faza zadania:** web-push-notifications Task 1

## Co zostalo zrobione
- Migracja `0015_push_notifications.sql`: `push_subscriptions` (per urzadzenie, `lead_minutes` 5–60 default 15), `nap_schedule` (per dziecko, `next_sleep_at` nullable), `push_deliveries` (dedup wysylek per subskrypcja+dziecko+next_sleep_at).
- RLS: owner-only dla `push_subscriptions`, `is_family_member` dla `nap_schedule`, deny-all (brak policies) dla `push_deliveries` — tabela robocza edge function przez service role.
- Typy 3 tabel dopisane do `database.types.ts` (styl generatora, alfabetycznie).
- `config.toml`: `[functions.send-nap-push] verify_jwt = false` (cron uwierzytelnia sie custom naglowkiem, nie JWT).

## Zmienione pliki
- `packages/sleeper-web/supabase/migrations/0015_push_notifications.sql` — nowa migracja
- `packages/sleeper-web/src/lib/database.types.ts` — typy nowych tabel
- `packages/sleeper-web/supabase/config.toml` — sekcja funkcji

## Powod / kontekst
Fundament danych dla web push (spec `docs/superpowers/specs/2026-07-12-web-push-notifications-design.md`, podejscie A: klient liczy harmonogram, serwer wysyla). Cron SQL celowo poza migracja (zawiera project URL + CRON_SECRET) — trafi do runbooka.

## Walidacja
- typecheck: PASS
- test: n/a (sam schemat; testy logiki w Task 2/3)
- runtime: n/a (migracja zostanie zaaplikowana `supabase db push` w kroku deploy — akcja usera)
