# b2a64a9: chore(mvp-sleep-tracker): regen database.types po push migracji + cleanup

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 1 — Auth + model rodziny (cd.)

## Co zostalo zrobione

- Migracje 0001/0003/0004 zaaplikowane na cloud (user wykonal
  `supabase login` + `link --project-ref qcyklmrotbkehgpjdebl` + `db push`)
- Regen `database.types.ts` przez `npx supabase gen types typescript
  --linked` — 267 linii prawdziwych typow zamiast 119 placeholderow
- `family/api.ts`: dodany `parseRole()` helper. Supabase gen types
  zwraca `role: string` (CHECK constraint nie tworzy enuma w schemacie
  introspection), wiec mapujemy na unie `'owner' | 'member'` zgodna
  z migracja
- `app/(app)/index.tsx`: usuniety probe _health z Fazy 0 (juz nie
  potrzebny, blokowal typecheck po strict-typed clientcie). Tymczasowy
  placeholder pokazuje email + nazwe rodziny + liczbe czlonkow do
  weryfikacji manualnej

## Zmienione pliki

- `sleeper-app/src/lib/database.types.ts` — pelne typy z cloud DB
- `sleeper-app/src/features/family/api.ts` — parseRole helper
- `sleeper-app/src/app/(app)/index.tsx` — usuniety probe, dodany
  family status

## Powod / kontekst

Continuation Fazy 1 po user handoff. Cloud migration push uruchomil
trigger `on_auth_user_created`, RLS aktywne, helper `is_family_member`
zarejestrowany. Aplikacja gotowa do manual testow sign-up + invite
flow w Expo Go.

## Walidacja

- typecheck: PASS
- lint: PASS (0/0)
- runtime: pending — manual test sign-up + invite w Expo Go (Agent 5
  pomijany w autonomicznym autopilocie — mobile manual)
