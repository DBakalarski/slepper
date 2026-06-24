alter table public.children
  add column algorithm text not null default 'galland'
  check (algorithm in ('galland', 'kotki_dwa'));
