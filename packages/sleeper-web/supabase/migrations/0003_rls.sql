-- Faza 1: RLS policies dla families / family_members / family_invitations.
-- Strategia: czlonek rodziny widzi rodzine, owner ma rozszerzone uprawnienia.

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;

-- families: SELECT dla czlonkow, UPDATE dla ownera. INSERT przez trigger (SECURITY DEFINER), nie przez policy.
create policy "families: members can read own family"
  on public.families
  for select
  to authenticated
  using (public.is_family_member(id));

create policy "families: owner can update own family"
  on public.families
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = families.id
        and fm.user_id = auth.uid()
        and fm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.family_members fm
      where fm.family_id = families.id
        and fm.user_id = auth.uid()
        and fm.role = 'owner'
    )
  );

-- family_members: czlonkowie widza siebie i innych w tej samej rodzinie.
-- INSERT/DELETE: zarezerwowane dla triggera (SECURITY DEFINER). Brak policies = brak dostepu przez API.
create policy "family_members: read members of own family"
  on public.family_members
  for select
  to authenticated
  using (public.is_family_member(family_id));

-- DELETE: user moze opuscic rodzine (siebie) lub owner moze usunac czlonka.
create policy "family_members: leave or owner kick"
  on public.family_members
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.family_members fm
      where fm.family_id = family_members.family_id
        and fm.user_id = auth.uid()
        and fm.role = 'owner'
    )
  );

-- family_invitations: czlonkowie widza zaproszenia swojej rodziny i moga je tworzyc.
create policy "family_invitations: members can read"
  on public.family_invitations
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "family_invitations: members can create"
  on public.family_invitations
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and invited_by = auth.uid()
  );

create policy "family_invitations: members can revoke pending"
  on public.family_invitations
  for delete
  to authenticated
  using (
    public.is_family_member(family_id)
    and accepted_at is null
  );
