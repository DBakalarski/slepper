# Manual Test — Faza 4 (Realtime sync)

**Branch:** `feature/mvp-sleep-tracker`
**Data:** 2026-05-27
**Srodowisko:** Expo Go na DWOCH fizycznych urzadzeniach (iOS/Android), oba zalogowane na konta tej samej rodziny, z tym samym aktywnym dzieckiem.

## Wymaganie wstepne (one-time setup)

- [ ] **Wlaczyc replikacje na `public.sessions`**. Dwie opcje, wystarczy jedna:
  - **A. Migracja SQL (preferowane, idempotentne):** zaaplikuj `sleeper-app/supabase/migrations/0009_realtime_publication.sql` (jezeli projekt uzywa Supabase CLI / db push).
  - **B. Manualnie w Supabase Studio:** Database -> Replication -> publikacja `supabase_realtime` -> dodaj tabele `sessions` (toggle ON).
- [ ] Sanity check w Studio: `select schemaname, tablename from pg_publication_tables where pubname='supabase_realtime';` zwraca `public.sessions`.

## Setup testu

1. Zaloguj sie jako **user A** na telefonie 1.
2. Zaloguj sie jako **user B** na telefonie 2 (oba konta nalezace do tej samej rodziny, z tym samym dzieckiem ustawionym jako active).
3. Na obu telefonach otworz zakladke „Dzisiaj".

## Scenariusze

### 1. INSERT — telefon A startuje sen, telefon B widzi w <2s

- [ ] Telefon A: tap „Rozpocznij sen" -> karta zmienia sie w „Sen w toku" + pojawia sie timer.
- [ ] Telefon B (bez zadnej akcji, bez pull-to-refresh): w ciagu <2s karta `ActiveWindowCard` znika i pojawia sie `SleepInProgressCard` z timerem.
- [ ] Timer na telefonie B liczy sie poprawnie (zaczyna od ~2s, nie od 0).

### 2. UPDATE — telefon A konczy sen, telefon B widzi natychmiast

- [ ] Telefon A: tap „Zakoncz sen" -> wraca `ActiveWindowCard`.
- [ ] Telefon B: w ciagu <2s karta przelacza sie z powrotem na `ActiveWindowCard`, agregat „dzis" rosnie o nowa sesje, sesja pojawia sie w sekcji „Sesje dzisiaj".

### 3. UPDATE pola — edycja sesji na A propaguje na B

- [ ] Telefon A: otworz sesje z listy, zmien `notes` na "test realtime" + zapisz.
- [ ] Telefon B: lista „Sesje dzisiaj" odswieza sie w <2s; po wejsciu w te sama sesje pole notes ma "test realtime" bez recznego refetch.

### 4. DELETE — usuniecie sesji na A znika na B

- [ ] Telefon A: w ekranie edycji sesji tap „Usun sesje" -> confirm.
- [ ] Telefon B: sesja znika z listy „Sesje dzisiaj" w <2s, agregaty „dzis" malejq odpowiednio.

### 5. Offline -> online — telefon A wykonuje akcje, telefon B dostaje update po wlaczeniu wifi

- [ ] Telefon B: wylacz wifi (i dane mobilne).
- [ ] Telefon A: startuje sesje.
- [ ] Telefon B: w trybie offline NIE widzi zmiany (oczekiwane).
- [ ] Telefon B: wlacz wifi -> w ciagu <5s widoczna jest aktywna sesja (Supabase Realtime reconnect + invalidate refetch).

### 6. Bilateralnosc — telefon B startuje, telefon A widzi

- [ ] Zamien role: telefon B startuje sen, telefon A widzi w <2s (sanity check, ze subskrypcja dziala w obu kierunkach).

### 7. Cleanup subskrypcji (sanity)

- [ ] Telefon A: wyloguj sie -> zaloguj ponownie. Brak duplikatow eventow (sesja zmieniana na B widoczna raz, nie kilka razy z rzedu — wskazaloby to wyciek kanalu).
- [ ] Telefon A: zabij apke (swipe up), otworz ponownie -> stan jest aktualny + dalsze zmiany na B leca normalnie.

### 8. Przelaczenie dziecka (jezeli multi-child)

- [ ] (Opcjonalne, MVP single-child) Jezeli rodzina ma 2 dzieci: przelacz aktywne dziecko na A, zmien sesje innego dziecka na B -> na A NIE pojawia sie update (filtr `child_id=eq.X` dziala).

## Co zrobic gdy test failuje

- **Brak update'ow w ogole:** zweryfikuj wymaganie wstepne (publication). Sprawdz w app logach `[supabase]` warning o brakujacych env vars. Sprawdz w Supabase Studio -> Realtime -> Inspector czy event leci.
- **Update'y z opoznieniem >5s:** sprawdz polaczenie WS w devtools (Expo Go ma ograniczenia debug); na Wi-Fi z restrykcyjnym firewallem WS moga byc blokowane.
- **Duplikaty (kazda zmiana pokazana 2x):** wyciek kanalu po remount — sprawdz cleanup w `useRealtimeSessions.useEffect` return.
