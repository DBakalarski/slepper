-- Faza 1 fix cykl 2:
--  1. P1: race condition w accept_invitation — atomic delete osieroconej rodziny
--  2. P2: last-owner guard w accept_invitation (nie pozwol jedynemu ownerowi
--     opuscic rodziny w ktorej sa inni czlonkowie)
--  3. P2: column-level restriction na UPDATE families (REVOKE update na PK
--     i created_at)

-- 1+2. Przepisany accept_invitation:
--   - select for update na invitation (lock przed waliacja)
--   - atomic delete starej rodziny: single statement z NOT EXISTS
--   - last-owner guard: jesli user jest jedynym ownerem rodziny z innymi
--     czlonkami, raise exception
create or replace function public.accept_invitation(_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
  v_existing_family_id uuid;
  v_existing_role text;
  v_other_members_count int;
  v_other_owners_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_user_email := (auth.jwt() ->> 'email')::text;
  if v_user_email is null then
    raise exception 'No email claim in session';
  end if;

  -- Lock invitation row PRZED walidacja (zapobiega TOCTOU race).
  select id, family_id, email, accepted_at
    into v_invitation
  from public.family_invitations
  where id = _invitation_id
  for update;

  if not found then
    raise exception 'Invitation not available' using errcode = 'P0001';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'Invitation not available' using errcode = 'P0001';
  end if;

  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'Invitation not available' using errcode = 'P0001';
  end if;

  -- Sprawdz aktualna rodzine usera + role.
  select family_id, role
    into v_existing_family_id, v_existing_role
  from public.family_members
  where user_id = v_user_id;

  -- Edge: juz w docelowej rodzinie — tylko zaznacz invitation.
  if v_existing_family_id = v_invitation.family_id then
    update public.family_invitations
    set accepted_at = now()
    where id = _invitation_id;
    return v_invitation.family_id;
  end if;

  -- Last-owner guard: jesli user jest ownerem rodziny z innymi czlonkami,
  -- nie pozwol odejsc dopoki ktos inny nie zostanie ownerem.
  if v_existing_family_id is not null and v_existing_role = 'owner' then
    select count(*) into v_other_members_count
    from public.family_members
    where family_id = v_existing_family_id
      and user_id <> v_user_id;

    if v_other_members_count > 0 then
      select count(*) into v_other_owners_count
      from public.family_members
      where family_id = v_existing_family_id
        and user_id <> v_user_id
        and role = 'owner';

      if v_other_owners_count = 0 then
        raise exception 'Cannot leave family as sole owner with other members';
      end if;
    end if;
  end if;

  -- Wyrzuc usera ze starej rodziny.
  if v_existing_family_id is not null then
    delete from public.family_members
    where user_id = v_user_id;

    -- ATOMIC: usun rodzine TYLKO jesli zostala osierocona. NOT EXISTS jako
    -- czesc DELETE statement = jeden atomic check w jednej transakcji.
    -- Eliminuje race condition gdzie ktos inny dolacza do tej rodziny
    -- miedzy SELECT a DELETE.
    delete from public.families f
    where f.id = v_existing_family_id
      and not exists (
        select 1 from public.family_members fm
        where fm.family_id = f.id
      );
  end if;

  -- Dodaj do nowej rodziny jako member.
  insert into public.family_members (family_id, user_id, role)
  values (v_invitation.family_id, v_user_id, 'member');

  -- Mark invitation accepted.
  update public.family_invitations
  set accepted_at = now()
  where id = _invitation_id;

  return v_invitation.family_id;
end;
$$;

-- Funkcja juz miala revoke + grant w 0005, ale CREATE OR REPLACE moze zresetowac.
revoke all on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- 3. Column-level restriction na UPDATE families.
-- Owner moze zmieniac tylko `name`, nie `id` ani `created_at` (audyt trail).
revoke update on public.families from authenticated;
grant update (name) on public.families to authenticated;
