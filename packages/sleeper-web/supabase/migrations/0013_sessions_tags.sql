-- Migracja 0013: tagi kontekstu snu per sesja (Faza 2 roadmapu).
--
-- Rodzic moze otagowac sesje kontekstem (zabkowanie, choroba, skok rozwojowy,
-- nowa lokalizacja, zmiana opiekuna). Dashboard liczy korelacje: czy sen jest
-- krotszy w dni z danym tagiem.
--
-- `text[]` (nie jsonb) — czysty filtering i typowanie w supabase-js. Dozwolone
-- slugi walidowane po stronie aplikacji (stala lista w kodzie), zeby zmiana
-- listy nie wymagala migracji. Default '{}' + not null -> odczyt zawsze tablica.
-- Wstecznie kompatybilna: istniejace selecty nie referuja `tags`.

alter table public.sessions
  add column tags text[] not null default '{}';

alter table public.sessions
  add constraint sessions_tags_max_len
  check (array_length(tags, 1) is null or array_length(tags, 1) <= 10);
