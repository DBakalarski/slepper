-- Faza 4: Realtime sync.
--
-- Wlacz replikacje na public.sessions w publikacji `supabase_realtime`.
-- Supabase Realtime nasluchuje na tej publikacji i forwarduje INSERT/UPDATE/DELETE
-- do klientow uzywajacych `supabase.channel(...).on('postgres_changes', ...)`.
--
-- Alternatywa: Supabase Studio -> Database -> Replication -> publication
-- `supabase_realtime` -> dodac tabele `sessions`. Migracja robi to samo deklaratywnie
-- i jest reproducible (np. dla local supabase dev / nowego projektu).
--
-- Idempotentnosc: `if not exists` w postgresie 14+ nie dziala dla
-- `alter publication add table`, wiec uzywamy `do $$` z catch'em na duplicate_object.

do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception
  when duplicate_object then
    -- Tabela juz w publikacji — no-op. Idempotentne wzgledem powtornego apply.
    null;
end $$;

-- Sanity check: REPLICA IDENTITY DEFAULT (primary key) wystarcza dla event'ow
-- typu UPDATE/DELETE — klient dostaje `old.id` i `new.*`. Pelny `REPLICA IDENTITY FULL`
-- nie jest potrzebny dla MVP (nie subskrybujemy zmian po wartosci nie-PK).
