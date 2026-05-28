-- Faza 1: model rodziny wspoldzielonej przez wielu userow
-- Jeden user nalezy do jednej rodziny (MVP). Schema dopuszcza wielu czlonkow.

create extension if not exists "pgcrypto";

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Rodzina',
  created_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index family_members_family_id_idx on public.family_members(family_id);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index family_invitations_open_per_family_email_idx
  on public.family_invitations(family_id, lower(email))
  where accepted_at is null;

create index family_invitations_email_pending_idx
  on public.family_invitations(lower(email))
  where accepted_at is null;

-- Helper SECURITY DEFINER: czy biezacy user nalezy do family_id?
-- Uzywany w RLS zeby uniknac rekursji policy -> family_members -> policy.
create or replace function public.is_family_member(_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = _family_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;
