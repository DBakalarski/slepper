# Runbook: Web Push (powiadomienia "sen za ~X min")

Feature: `feature/web-push-notifications` — spec `docs/superpowers/specs/2026-07-12-web-push-notifications-design.md`.

Architektura: klient po każdej mutacji sesji liczy `nap_schedule.next_sleep_at`;
Edge Function `send-nap-push` (pg_cron co 5 min) wysyła Web Push (VAPID) do
subskrypcji z `push_subscriptions`; dedup w `push_deliveries`.

## Setup jednorazowy (user action)

### 1. Klucze VAPID

```bash
npx web-push generate-vapid-keys
```

Zapisz oba klucze (public = base64url, trafia też do klienta).

### 2. Sekrety edge function

```bash
cd packages/sleeper-web
supabase secrets set \
  VAPID_PUBLIC_KEY='<public z kroku 1>' \
  VAPID_PRIVATE_KEY='<private z kroku 1>' \
  VAPID_SUBJECT='mailto:dawid.bakalarski@gmail.com' \
  CRON_SECRET="$(openssl rand -hex 32)"
```

Zanotuj `CRON_SECRET` — potrzebny w kroku 5.

### 3. Env klienta

- **Vercel:** Project Settings → Environment Variables → `EXPO_PUBLIC_VAPID_PUBLIC_KEY` = public key (Production + Preview).
- **Lokalnie:** dopisz do `packages/sleeper-web/.env`:
  `EXPO_PUBLIC_VAPID_PUBLIC_KEY=<public key>`

Bez tej zmiennej toggle w Profilu rzuci błąd przy włączaniu (feature "niedostępny", apka działa normalnie).

### 4. Migracja + deploy funkcji

```bash
cd packages/sleeper-web
supabase db push                          # migracja 0015 (tabele + RLS)
supabase functions deploy send-nap-push   # verify_jwt=false z config.toml
```

### 5. Cron (SQL Editor w dashboardzie, jednorazowo)

Wymaga włączonych rozszerzeń `pg_cron` i `pg_net` (Dashboard → Database → Extensions).

```sql
select cron.schedule(
  'send-nap-push-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-nap-push',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET z kroku 2>')
  );
  $$
);
```

Podmień `<PROJECT-REF>` i `<CRON_SECRET>`. Uwaga: secret ląduje w definicji
crona w bazie — akceptowalne (dostęp tylko dla ownera projektu), nie commituj go.

### 6. Deploy frontendu

`git push origin main` → Vercel auto-deploy (standardowy runbook
`docs/runbook/sleeper-web-deploy.md`). Po deployu zainstalowane PWA zaciągnie
nowy `sw.js` (CACHE_NAME v9) przy najbliższym otwarciu.

## Manual smoke (iPhone, zainstalowane PWA)

1. Otwórz PWA → Profil → Przypomnienia → włącz toggle → zaakceptuj zgodę systemową.
2. Sprawdź w bazie: `select * from push_subscriptions;` — wiersz z `enabled=true`.
3. Zakończ drzemkę (albo dodaj/edytuj sesję) → `select * from nap_schedule;` — `next_sleep_at` ustawione.
4. Poczekaj aż `now` wejdzie w okno `[next_sleep_at - lead_minutes, next_sleep_at)` → push powinien przyjść w ≤5 min (cron), **przy zamkniętej aplikacji**.
5. Tap w powiadomienie → apka się otwiera.
6. Wyłącz toggle → `enabled=false` w bazie, brak kolejnych pushy.

## Debug

- **Cron się odpala?** `select * from cron.job_run_details order by start_time desc limit 10;`
- **Funkcja działa?** Dashboard → Edge Functions → send-nap-push → Logs. `401 unauthorized` = zły/brak `x-cron-secret`; `missing env` = brak sekretów z kroku 2.
- **Push wysłany?** `select * from push_deliveries order by sent_at desc;` — wpis istnieje = funkcja obsłużyła parę (subskrypcja, dziecko, next_sleep_at). Wpis jest też dla `skip-expired` (przegapione okno — celowo bez wysyłki i bez ponawiania).
- **Push nie dochodzi mimo delivery:** sprawdź logi funkcji (status z push service). 404/410 = martwa subskrypcja (funkcja sama ją usuwa; user musi ponownie włączyć toggle). iOS: powiadomienia działają TYLKO dla PWA z ekranu głównego, sprawdź też Ustawienia → Powiadomienia → Sleeper.
- **`next_sleep_at` się nie ustawia:** konsola przeglądarki po mutacji sesji — `[nap-schedule] recompute failed` (RLS? sieć?). Wiersz w `nap_schedule` powstaje przy pierwszej mutacji sesji po deployu.

## Rollback

- Wyłączenie wysyłki: `select cron.unschedule('send-nap-push-every-5min');` — reszta (tabele, UI) jest nieszkodliwa.
- Pełny rollback frontendu: standardowo przez Vercel (poprzedni deployment → Promote).
