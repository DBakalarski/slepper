-- Faza 2: rdzen MVP — children + sessions.
--
-- Decyzje:
-- 1. `children.family_id` zamiast `parent_id` — dziecko nalezy do rodziny,
--    nie do jednego usera. Wymiana usera (np. babcia dolacza) nie psuje
--    referencji.
-- 2. `sessions.type` jako check constraint zamiast enum — latwiej dodac
--    nowy typ bez migracji DDL.
-- 3. `end_at = null` = sesja w toku. Partial unique index na (child_id)
--    where end_at is null gwarantuje max 1 aktywna sesja per dziecko.
--    Drugi rownolegly INSERT padnie z 23505 -> UI pokaze toast.
-- 4. Brak `duration_seconds` jako kolumny — derived z (end_at - start_at).
--    Jedno zrodlo prawdy.

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 50),
  birth_date date not null,
  avatar_color text not null default '#7C6BAD'
    check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create index children_family_id_idx on public.children(family_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null check (type in ('nap', 'night_sleep')),
  start_at timestamptz not null,
  end_at timestamptz,
  notes text check (notes is null or length(notes) <= 500),
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Spojnosc: jesli end_at jest, musi byc >= start_at (zero-length OK).
  constraint sessions_end_after_start check (end_at is null or end_at >= start_at)
);

-- Krytyczny constraint: tylko jedna aktywna sesja per dziecko.
create unique index sessions_one_active_per_child
  on public.sessions(child_id)
  where end_at is null;

-- Index dla queries historii (najczestszy: sesje dziecka w ostatnich dniach).
create index sessions_child_id_start_at_idx
  on public.sessions(child_id, start_at desc);

-- RLS: czlonek rodziny ma pelny dostep do dzieci tej rodziny.
alter table public.children enable row level security;

create policy "children: family members can read"
  on public.children
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "children: family members can create"
  on public.children
  for insert
  to authenticated
  with check (public.is_family_member(family_id));

create policy "children: family members can update"
  on public.children
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "children: family members can delete"
  on public.children
  for delete
  to authenticated
  using (public.is_family_member(family_id));

-- RLS: czlonek rodziny ma pelny dostep do sesji dzieci tej rodziny.
-- Sprawdzenie przez join do children — pojedyncze zapytanie, planner ogarnie.
alter table public.sessions enable row level security;

create policy "sessions: family members can read"
  on public.sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "sessions: family members can create"
  on public.sessions
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "sessions: family members can update"
  on public.sessions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "sessions: family members can delete"
  on public.sessions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );
