-- Faza 2 fix cykl 1:
--  1. P1: sprzeczny constraint `created_by NOT NULL ... ON DELETE SET NULL` na
--     public.sessions — kazde fizyczne delete usera (GDPR/admin) lamie kaskade
--     i transakcja delete padnie z `null value in column "created_by"`.
--     Fix: usun NOT NULL, zachowaj SET NULL (audyt traci atrybucje, sesje
--     przezywaja delete usera). Walidacja `created_by = auth.uid()` przy INSERT
--     zostaje w policy.
--  2. P2: RLS UPDATE policy na sessions nie chroni `created_by`, `child_id`,
--     `created_at`. User moze zmienic created_by innego usera na siebie
--     (zatarcie sladow) lub modyfikowac audyt. Fix: column-level GRANT na
--     dozwolone kolumny (type, start_at, end_at, notes), wzor z 0006 families.

-- 1. Usun NOT NULL z sessions.created_by.
alter table public.sessions
  alter column created_by drop not null;

-- 2. Column-level restriction na UPDATE sessions.
-- Czlonek rodziny moze edytowac tylko biznesowe pola sesji, nie metadata.
revoke update on public.sessions from authenticated;
grant update (type, start_at, end_at, notes) on public.sessions to authenticated;
