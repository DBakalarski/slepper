-- Faza 1 fix cykl 1: explicit consent flow dla zaproszen.
-- Naprawia P1.1 (pre-claim invitation exploit), P1.2 (partner-already-exists), P1.3 (brak fallbacku).
--
-- Zmiany:
--  1. Trigger handle_new_user nie acceptuje auto-magicznie — zawsze tworzy nowa rodzine.
--  2. Nowy RPC get_my_pending_invitations() — zwraca pending invitations dla auth.email().
--  3. Nowy RPC accept_invitation(_id) — explicit consent, usuwa stara rodzine jesli solo.
--  4. Nowy RPC ensure_family() — idempotent fallback gdy trigger zfailowal.

-- 1. Trigger: tylko tworzy nowa rodzine, NIE acceptuje invitations.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_family_id uuid;
begin
  insert into public.families (name)
  values ('Rodzina')
  returning id into v_new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (v_new_family_id, new.id, 'owner');

  return new;
end;
$$;

-- 2. Zwraca pending invitations matching auth.email() z nazwa rodziny.
-- SECURITY DEFINER bo musimy czytac z rodzin do ktorych user nie nalezy (jeszcze).
create or replace function public.get_my_pending_invitations()
returns table (
  id uuid,
  family_id uuid,
  family_name text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  v_user_email := (auth.jwt() ->> 'email')::text;
  if v_user_email is null then
    return;
  end if;

  return query
  select fi.id, fi.family_id, f.name as family_name, fi.email, fi.created_at
  from public.family_invitations fi
  join public.families f on f.id = fi.family_id
  where lower(fi.email) = lower(v_user_email)
    and fi.accepted_at is null
  order by fi.created_at asc;
end;
$$;

revoke all on function public.get_my_pending_invitations() from public;
grant execute on function public.get_my_pending_invitations() to authenticated;

-- 3. Explicit consent acceptance.
-- Sprawdza ze invitation pasuje do auth.email() i jest pending.
-- Przepiena usera z jego solo-rodziny do nowej. Usuwa osierocona rodzine.
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_user_email := (auth.jwt() ->> 'email')::text;
  if v_user_email is null then
    raise exception 'No email claim in session';
  end if;

  select id, family_id, email, accepted_at
    into v_invitation
  from public.family_invitations
  where id = _invitation_id;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'Invitation already accepted';
  end if;

  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'Invitation email does not match current user';
  end if;

  -- Sprawdz aktualna rodzine.
  select family_id into v_existing_family_id
  from public.family_members
  where user_id = v_user_id;

  -- Edge: juz w docelowej rodzinie — tylko zaznacz invitation.
  if v_existing_family_id = v_invitation.family_id then
    update public.family_invitations
    set accepted_at = now()
    where id = _invitation_id;
    return v_invitation.family_id;
  end if;

  -- Wyrzuc usera ze starej rodziny.
  if v_existing_family_id is not null then
    delete from public.family_members
    where user_id = v_user_id;

    -- Jesli stara rodzina osierocona (0 czlonkow) — usun.
    if not exists (
      select 1 from public.family_members where family_id = v_existing_family_id
    ) then
      delete from public.families where id = v_existing_family_id;
    end if;
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

revoke all on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- 4. Idempotent ensure_family — fallback gdy trigger zfailowal.
create or replace function public.ensure_family()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_family_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select family_id into v_family_id
  from public.family_members
  where user_id = v_user_id
  limit 1;

  if v_family_id is not null then
    return v_family_id;
  end if;

  insert into public.families (name)
  values ('Rodzina')
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_user_id, 'owner');

  return v_family_id;
end;
$$;

revoke all on function public.ensure_family() from public;
grant execute on function public.ensure_family() to authenticated;
