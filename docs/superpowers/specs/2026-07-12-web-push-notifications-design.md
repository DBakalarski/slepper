# Web Push Notifications — design

**Data:** 2026-07-12
**Status:** zatwierdzony przez usera (sekcje 1–3 zaakceptowane w sesji brainstormingu)
**Branch:** `feature/web-push-notifications`

## Cel

Push "drzemka / sen nocny za ~X min" na iPhone'y (zainstalowane PWA, iOS 16.4+),
działający przy zamkniętej aplikacji. Odpowiednik notyfikacji z usuniętej apki
mobilnej, ale przez Web Push (VAPID) zamiast lokalnego planowania.

Decyzje usera:
- Prawdziwy push (przy zamkniętej apce) — wymaga backendu wysyłającego.
- Per urządzenie: toggle w Profilu, push idzie do wszystkich urządzeń z włączonym toggle'em.
- Wyprzedzenie konfigurowalne per urządzenie (5/10/15/20/30 min, default 15).
- Dotyczy drzemek ORAZ snu nocnego (algorytm zwraca jeden `nextSleepAt`, bez rozróżniania).
- Architektura A: klient liczy harmonogram, serwer tylko wysyła.

## Architektura (podejście A: klient liczy, serwer wysyła)

Urządzenie wykonujące mutację sesji (start/end/update/delete) ma świeże dane
i kod algorytmu — po mutacji liczy `recommendation.nextSleepAt` i upsertuje go
do tabeli `nap_schedule`. Edge Function odpalana przez pg_cron co 5 min wysyła
Web Push do subskrypcji, dla których nadszedł moment `next_sleep_at - lead_minutes`.

Algorytm zostaje wyłącznie w kliencie (pakiety `sleeper-machine` /
`sleeper-machine-kotki`) — zero duplikacji na serwerze. Istniejące no-op hooki
`schedule-nap-side-effects.ts` są już wywoływane we wszystkich właściwych
miejscach `hooks.ts` — implementacja = wypełnienie no-opów, zero zmian w hooks.ts.

## Model danych (migracja `0015_push_notifications.sql`)

### `push_subscriptions` — jedna per urządzenie/przeglądarka

| kolumna | typ | uwagi |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid NOT NULL → auth.users | on delete cascade |
| `endpoint` | text NOT NULL UNIQUE | URL push service |
| `p256dh` | text NOT NULL | klucz publiczny klienta |
| `auth` | text NOT NULL | auth secret klienta |
| `enabled` | boolean NOT NULL default true | toggle w Profilu |
| `lead_minutes` | int NOT NULL default 15 | check 5..60 |
| `created_at` | timestamptz NOT NULL default now() | |

RLS: user widzi/wstawia/edytuje/usuwa tylko wiersze `user_id = auth.uid()`.

### `nap_schedule` — jedna per dziecko (harmonogram globalny, nie per urządzenie)

| kolumna | typ | uwagi |
|---|---|---|
| `child_id` | uuid PK → children | on delete cascade |
| `next_sleep_at` | timestamptz NULL | null = nic nie planuj (np. sesja w toku) |
| `updated_at` | timestamptz NOT NULL default now() | |

RLS: przez `public.is_family_member` (jak children/sessions).

### `push_deliveries` — dedup wysyłek

| kolumna | typ | uwagi |
|---|---|---|
| `subscription_id` | uuid → push_subscriptions | on delete cascade |
| `child_id` | uuid → children | on delete cascade |
| `next_sleep_at` | timestamptz NOT NULL | |
| `sent_at` | timestamptz NOT NULL default now() | |

Unique `(subscription_id, child_id, next_sleep_at)`. Wyprzedzenie jest per
urządzenie, więc dedup też musi być per subskrypcja. Insert-on-conflict-skip =
idempotentny cron. Wpis powstaje też dla wysyłek pominiętych (okno minęło) —
zapobiega ponawianiu. RLS: brak dostępu dla `authenticated` (tabela robocza
edge function przez service role).

## Edge Function `send-nap-push`

Pierwsza edge function w projekcie: `packages/sleeper-web/supabase/functions/send-nap-push/`.

- Wyzwalanie: **pg_cron + pg_net co 5 min** (POST na URL funkcji; sekret
  wyzwalania z Vault, funkcja odrzuca requesty bez sekretu).
- Logika:
  1. Pobierz `nap_schedule` gdzie `next_sleep_at IS NOT NULL`.
  2. Dla każdego dziecka: subskrypcje `enabled = true` userów z rodziny dziecka.
  3. Dla każdej pary (subskrypcja, dziecko): due jeśli
     `now >= next_sleep_at - lead_minutes` AND `now < next_sleep_at`
     AND brak wpisu w `push_deliveries`.
  4. `next_sleep_at` w przeszłości → wpis delivery bez wysyłki (skip, nie ponawiaj).
  5. Wyślij Web Push (VAPID; biblioteka web-push dla Deno), zapisz delivery.
  6. HTTP 404/410 z push service (martwa subskrypcja) → usuń wiersz `push_subscriptions`.
- Payload: JSON `{ title, body }` — np. "Kotek 😴" / "Rekomendowana drzemka
  ok. 13:45 (za ~15 min)". Czasy formatowane w Europe/Warsaw.
- Logika "kto jest due" wyciągnięta do czystej funkcji (osobny plik) — testowalna
  vitestem bez Deno.

Konsekwencja cronu co 5 min: push "za ~15 min" realnie przychodzi 15–19 min
przed — mieści się w "~".

### Klucze VAPID

- Prywatny + publiczny: Supabase secrets (`supabase secrets set`).
- Publiczny dodatkowo w env klienta: `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (Vercel + `.env` lokalnie).
- Nigdy w repo.

## Klient

### Harmonogram — wypełnienie no-opów `schedule-nap-side-effects.ts`

Wszystkie trzy eksporty (`rescheduleNapNotification`, `cancelNapNotificationSafe`,
`rescheduleFromLastEnded`) delegują do jednej wspólnej funkcji
"przelicz i upsertuj `nap_schedule`":

1. Pobierz z Supabase ostatnie 14 dni sesji dziecka + wiersz `children`
   (profil + algorytm) — świeże dane z bazy, nie cache react-query.
2. Sesja w toku (`end_at IS NULL`) → `next_sleep_at = null` (dziecko śpi;
   po pobudce mutacja end wywoła przeliczenie).
3. W przeciwnym razie `recommend()` / `recommendKotkiDwa()` przez ten sam
   adapter co `useSleepRecommendation` (logika adaptacji współdzielona,
   bez duplikacji) → zapisz `recommendation.nextSleepAt` (może być null).
4. Fire-and-forget: błąd logowany, nigdy nie propaguje do mutacji sesji
   (callsite'y wołają przez `void`).

Sygnatury funkcji bez zmian — `hooks.ts` nietknięty.

### Subskrypcja — nowy wrapper `lib/push.ts`

- Feature detect: `'serviceWorker' in navigator && 'PushManager' in window`;
  na iOS dodatkowo wymóg display-mode standalone (zainstalowane PWA) —
  inaczej komunikat "Zainstaluj aplikację na ekranie głównym".
- Włączenie toggle'a (gest usera) → `Notification.requestPermission()` →
  `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
  → upsert do `push_subscriptions`.
- Wyłączenie → `enabled = false` (subskrypcja zostaje; ponowne włączenie bez
  nowej zgody systemowej).
- Cały dostęp do `Notification` / `pushManager` wyłącznie w `lib/push.ts`
  (wzorzec Platform-guard wrapper z learned-patterns).

### UI — Profil, sekcja "Powiadomienia"

- Toggle "Przypomnienie o śnie" + (gdy włączony) wybór wyprzedzenia
  5/10/15/20/30 min.
- Stan czytany z `push_subscriptions` po bieżącym `endpoint`.
- Permission denied → toggle wraca na off + instrukcja odblokowania w iOS.

### `sw.js`

- Handler `push`: `event.waitUntil(self.registration.showNotification(title, { body, icon }))`.
- Handler `notificationclick`: focus istniejącego okna lub `clients.openWindow('/')`.
- Bump `CACHE_VERSION`.

## Edge cases

- **`next_sleep_at` w przeszłości** — delivery "skipped", bez wysyłki, bez ponawiania.
- **Edycja sesji po wysłanym pushu** przesuwa rekomendację → nowy `next_sleep_at`
  = nowy klucz dedup → możliwy drugi push. Akceptowalne (rzadkie, informacyjnie poprawne).
- **Równoczesne mutacje obojga rodziców** — ostatni upsert wygrywa; obie strony
  liczą ze świeżej bazy, wynik zbieżny.
- **`nextSleepAt = null`** z algorytmu → `next_sleep_at = null`, nic nie planujemy.
- **Permission denied** — obsłużone w UI (patrz wyżej).
- **PWA niezainstalowane na iOS** — pushManager niedostępny → komunikat instalacyjny.

## Testy

- Unit (vitest, mock klienta Supabase): wspólna funkcja przeliczania —
  happy path (koniec drzemki → `nextSleepAt` zapisany), sesja w toku → null,
  throw z algorytmu → null + log.
- Unit (vitest): czysta funkcja "kto jest due" z edge function — due/not-yet/
  za późno/dedup.
- Static invariants: zakaz `Notification.`/`pushManager` poza `lib/push.ts`;
  `sw.js` zawiera handlery `push` i `notificationclick`.
- Manual smoke na iPhone (zainstalowane PWA): toggle → zgoda → zakończ
  drzemkę → push przy zamkniętej apce.

## Deploy / ops (kroki usera — dopisywane do runbooka)

1. `npx web-push generate-vapid-keys` (jednorazowo).
2. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...`.
3. `EXPO_PUBLIC_VAPID_PUBLIC_KEY` w Vercel env + lokalny `.env`.
4. `supabase db push` (migracja 0015) + `supabase functions deploy send-nap-push`.
5. pg_cron job (w migracji; wymaga wpisania URL projektu + sekretu do Vault).

Changelog + bump wersji w tym samym commicie co feat (hook pilnuje).

## Poza scope

- Powiadomienia o końcu sesji w toku, akcjach partnera, przypomnienia o trackingu
  (odrzucone w brainstormingu — tylko "zbliżający się sen").
- Konfiguracja treści powiadomień, quiet hours, per-dziecko opt-out.
