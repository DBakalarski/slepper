-- Migracja 0012: preferowana godzina pobudki per dziecko.
--
-- Przewodnik Kotki Dwa: "Wybierz stała godzine budzenia. Dowolna godzine
-- miedzy 6, a 7 rano." Gdy ustawione, recommender kotwiczy harmonogram dnia
-- na tej godzinie (profile.targetWakeTime) zamiast domyslnej 07:00.
--
-- Nullable bez defaultu — istniejace dzieci zachowuja domyslne zachowanie
-- (null -> Kotki Dwa uzywa 07:00, Galland wnioskuje z historii).

alter table public.children
  add column preferred_wake_time time;
