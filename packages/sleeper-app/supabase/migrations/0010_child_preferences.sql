-- Migracja 0010: preferencje algorytmu per dziecko.
--
-- Dodaje dwa opcjonalne pola w tabeli children, ktore staja sie twardym
-- override norm wiekowych w sleeper-machine recommender:
--   * preferred_naps_per_day — gdy ustawione, algorytm uzywa dokladnie tej
--     liczby drzemek zamiast wnioskowania z wieku + adaptacji historii.
--     Zakres 0-5 (0 = sam noc, dla starszych dzieci).
--   * preferred_bedtime — gdy ustawione, nextSleepAt = dzis o tej godzinie
--     (po zrobieniu wszystkich zaplanowanych drzemek).
--
-- Oba pola nullable bez defaultu — istniejace dzieci zachowuja domyslne
-- zachowanie algorytmu (null w obu kolumnach).

alter table public.children
  add column preferred_naps_per_day integer
    check (
      preferred_naps_per_day is null
      or (preferred_naps_per_day >= 0 and preferred_naps_per_day <= 5)
    ),
  add column preferred_bedtime time;
