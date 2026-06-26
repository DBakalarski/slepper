# b8061d1: fix(web): loader trzyma sie do zaladowania danych dziecka (koniec migania pustego ekranu)

**Data:** 2026-06-26
**Branch:** main
**Faza zadania:** n/a (follow-up do 5a2b284 — zgloszenie usera: "miga loader, potem miga podstawowy dzien, dopiero potem wlasciwy ekran")

## Co zostalo zrobione
- Naprawiono trzeci etap "migania" przy starcie. Po splash + AppLoader (auth)
  ekran "Dzisiaj" renderowal sie z generycznym fallback headerem ("Dzisiaj /
  Zalogowany: email"), bo `activeChild` byl `null` zanim doszly dane
  `family -> children`. Dopiero potem doskakiwal wlasciwy header + tresc.
- Dodano gate `isBootstrapping` w `TodayScreen`: dopoki SPODZIEWAMY sie tresci,
  ale jej nie mamy (family loading / children loading / activeChild jeszcze
  niewybrany / aktywne dziecko bez podstawowych danych sesji), renderujemy ten
  sam `<AppLoader>` co przy starcie. Jeden ciagly loader -> gotowy ekran.
- Hooki `useActiveSession` / `useSessions` / `useLastEndedSession` wolane na
  poziomie `TodayScreen` z `activeChild?.id` wylacznie po to, by odczytac stan
  ladowania. Dziela queryKey (`dayKeyInAppTz`-stabilny) z `ActiveChildSection`,
  wiec TanStack dedupuje — zero podwojnego fetcha, dane sa juz w cache gdy sekcja
  sie montuje (renderuje sie od razu pelna, bez doskakiwania kart).
- Stany terminalne (brak rodziny -> NoFamilyBanner, brak dzieci -> AddChildForm)
  swiadomie NIE sa bootstrapem — renderuja swoje wlasciwe UI (bez ryzyka
  nieskonczonego loadera).

## Zmienione pliki
- `src/app/(app)/index.tsx` — import `AppLoader`; gate queries (now/dayStart/
  dayEnd + 3 hooki sesji z `gateChildId`); `isBootstrapping` + early return
  `<AppLoader/>`.

## Powod / kontekst
Commit 5a2b284 dodal loader na czas auth-bootstrapu, ale nie obejmowal fazy
ladowania danych (family/children/sessions), wiec po auth wciaz mignela pusta
skorupa. Ten fix rozszerza zakres loadera na caly pierwszy load do momentu, gdy
ekran moze sie wyrenderowac kompletny. Dopelnia obietnice changeloga 0.8.0
("zamiast pustej i skaczacej strony") — bez bumpa wersji.

## Walidacja
- typecheck: PASS (`tsc --noEmit`, 0 bledow)
- test: PASS (vitest, 32 pliki / 279 testow)
- runtime (signed-in flow): wymaga weryfikacji na urzadzeniu usera (`web:dev`) —
  headless browser bez sesji Supabase nie wchodzi w sciezke (app)/index.
