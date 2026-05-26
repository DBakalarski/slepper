-- Faza 1: trigger auto-tworzenia rodziny po sign-up.
-- Jesli istnieje pending family_invitation matching email -> dolacz do tej rodziny jako 'member'.
-- W przeciwnym razie -> nowa rodzina + ten user jako 'owner'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
  v_invitation_family_id uuid;
  v_new_family_id uuid;
begin
  -- Szukaj otwartego zaproszenia dla tego emaila (case-insensitive).
  -- Najstarsze najpierw — kolejka FIFO.
  select id, family_id
    into v_invitation_id, v_invitation_family_id
  from public.family_invitations
  where lower(email) = lower(new.email)
    and accepted_at is null
  order by created_at asc
  limit 1;

  if v_invitation_id is not null then
    insert into public.family_members (family_id, user_id, role)
    values (v_invitation_family_id, new.id, 'member');

    update public.family_invitations
    set accepted_at = now()
    where id = v_invitation_id;
  else
    insert into public.families (name)
    values ('Rodzina')
    returning id into v_new_family_id;

    insert into public.family_members (family_id, user_id, role)
    values (v_new_family_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
