# 5d6d71d: feat(children): edycja danych dziecka + preferencje algorytmu

**Data:** 2026-05-28
**Branch:** main
**Faza zadania:** n/a (ad-hoc feature po active-window-machine)

## Co zostalo zrobione

- Dodano ekran edycji danych dziecka (tap na ActiveChildCard w `/profile` → push do `/child/[id]/edit`).
- Pola edytowalne: imie, data urodzenia, kolor avatara + dwa nowe pola preferencyjne.
- `preferred_naps_per_day` (0-5, nullable) — twardy override liczby drzemek; gdy ustawione, algorytm pomija baseline Galland + adaptacje EWMA.
- `preferred_bedtime` (`HH:MM`, nullable) — twardy override godziny rozpoczecia snu nocnego; gdy ustawione i wszystkie drzemki dnia zrobione, `nextSleepAt = dzis o tej godzinie`.
- Migracja `0010_child_preferences.sql` zaaplikowana na remote Supabase via `supabase db push --linked`.
- Naprawiono drift migration tracking (`supabase migration repair --status applied 0007 0008 0009`) — schemat istnial w bazie ale metadata go nie znalo.
- `database.types.ts` zregenerowany z linked project (bonus: zsynchronizowal sessions table layout).

## Zmienione pliki

- `packages/sleeper-machine/src/types.ts` — `ChildProfile` rozszerzony o `preferredNapsCount?` + `preferredBedtime?`.
- `packages/sleeper-machine/src/recommender.ts` — walidacja w `validateInput`, override `napsToday` po `decideNapsToday`, override ostatniego NIGHT entry w plan, override `nextSleepAt` gdy wszystkie drzemki done, warnings dla rozjazdu nap count i niezdrowej dlugosci nocy.
- `packages/sleeper-machine/tests/recommender.test.ts` — 8 nowych testow w bloku `user preferences override` (override, edge cases, regression gdy oba pola undefined, invalid inputs throw).
- `packages/sleeper-app/supabase/migrations/0010_child_preferences.sql` — NEW. Dwie nullable kolumny + check constraint na zakres 0-5.
- `packages/sleeper-app/src/lib/database.types.ts` — regen z linked (bonus: `sessions.created_by` poprawnie typowane).
- `packages/sleeper-app/src/features/children/hooks.ts` — `Child` interface rozszerzony, `useUpdateChild()` mutation, `CHILD_SELECT` stala dla DRY.
- `packages/sleeper-app/src/features/recommendation/adapter.ts` — `toLibProfile` przyjmuje `preferredNapsCount` + `preferredBedtime`, lokalny `parseTimeString` helper dla Postgres `HH:MM:SS`.
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — nowa sygnatura: zamiast `(childId, birthDateIso, now, ...)` przyjmuje obiekt `ChildForRecommendation` (zawiera id + birth_date + 2 nowe pola).
- `packages/sleeper-app/src/app/(app)/index.tsx` — `ActiveChildSection` typ propsa rozszerzony, callsite `useSleepRecommendation(child, now)`.
- `packages/sleeper-app/src/app/(app)/profile.tsx` — `ActiveChildCard` owiniete w `Pressable` z `router.push('/child/${id}/edit')`.
- `packages/sleeper-app/src/app/(app)/_layout.tsx` — dodany `Tabs.Screen name="child/[id]/edit" href: null` (ukrycie z tab bara).
- `packages/sleeper-app/src/app/(app)/child/[id]/edit.tsx` — NEW. Route czyta `id` z `useLocalSearchParams`, znajduje dziecko w cache `useChildren`, renderuje `EditChildForm`.
- `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` — NEW. Reuse pattern z `AddChildForm`: manual validation, color picker. Nowe: segmented `Auto/0/1/2/3/4/5` dla naps, TextInput `HH:MM` dla bedtime, helper textami "pozostaw puste = algorytm decyduje".

## Powod / kontekst

User chcial:
1. Mozliwosc edycji danych dziecka (do tej pory tylko create przy onboardingu).
2. Dodatkowo: preferowana ilosc drzemek + preferowana godzina snu nocnego, uwzgledniona w algorytmie sleeper-machine.

Semantyka override (decyzja user via AskUserQuestion): **twardy override**, nie cap ani hint. User wpisuje liczbe -> algorytm uzywa dokladnie tej liczby, bez wzgledu na baseline wieku.

Migracja drift fix: w trakcie `db push` okazalo sie ze 0007/0008/0009 nie sa w `supabase_migrations.schema_migrations` mimo ze schemat z nich istnieje w bazie (cos zaaplikowane manualnie wczesniej). `repair --status applied` zsynchronizowal tracking bez ruszania realnego schematu.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 bledow)
- lint: PASS (`pnpm --filter sleeper-app lint` — 0 warnings/errors)
- test: PASS (`pnpm --filter sleeper-machine test` — 204/204, w tym 8 nowych w bloku `user preferences override`)
- build: PASS (`pnpm --filter sleeper-machine build` — dist/ czyste)
- migracja: zaaplikowana na remote (`supabase db push --linked` -> "Applying migration 0010_child_preferences.sql... Finished")
- runtime: NIE zweryfikowano w Expo Go — user testuje manualnie zgodnie z planem sekcja 7 (regression + override scenarios).
