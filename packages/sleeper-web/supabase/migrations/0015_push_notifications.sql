-- Web Push notifications (spec: docs/superpowers/specs/2026-07-12-web-push-notifications-design.md).
-- 1. push_subscriptions — jedna per urzadzenie/przegladarka (Web Push endpoint).
-- 2. nap_schedule — harmonogram per dziecko: najblizszy rekomendowany sen,
--    liczony client-side po kazdej mutacji sesji (podejscie A ze specu).
-- 3. push_deliveries — dedup wysylek per (subskrypcja, dziecko, next_sleep_at);
--    lead_minutes jest per subskrypcja, wiec dedup tez musi byc.
-- Cron job pg_cron NIE jest w migracji (zawiera project URL + CRON_SECRET) —
-- SQL do jednorazowego uruchomienia: docs/runbook/sleeper-web-push.md.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  lead_minutes int not null default 15 check (lead_minutes between 5 and 60),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner can read"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can insert"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can update"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can delete"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.nap_schedule (
  child_id uuid primary key references public.children(id) on delete cascade,
  next_sleep_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.nap_schedule enable row level security;

create policy "nap_schedule: family members can read"
  on public.nap_schedule for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can insert"
  on public.nap_schedule for insert to authenticated
  with check (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can update"
  on public.nap_schedule for update to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ))
  with check (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can delete"
  on public.nap_schedule for delete to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

-- Tabela robocza edge function (service role omija RLS) — brak policies
-- dla authenticated = deny-all dla klienta.
create table public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  next_sleep_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, child_id, next_sleep_at)
);

alter table public.push_deliveries enable row level security;
