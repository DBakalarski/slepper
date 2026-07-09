-- Kotki Dwa staje sie jedynym wybieralnym algorytmem: przelacznik w UI zostal
-- usuniety. Zmieniamy default kolumny i migrujemy istniejace wiersze 'galland'
-- (inaczej utknelyby na Galland bez mozliwosci zmiany). Kod Galland pozostaje
-- w repo, ale jest nieosiagalny z aplikacji.
alter table public.children
  alter column algorithm set default 'kotki_dwa';

update public.children
  set algorithm = 'kotki_dwa'
  where algorithm = 'galland';
