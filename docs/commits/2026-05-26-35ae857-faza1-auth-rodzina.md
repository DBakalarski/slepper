# 35ae857: feat(mvp-sleep-tracker): Faza 1 — auth + model rodziny

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 1 — Auth + model rodziny

## Co zostalo zrobione

- Trzy migracje SQL w `sleeper-app/supabase/migrations/`:
  - `0001_families.sql` — schemat `families`, `family_members` (UNIQUE
    user_id = jeden user w jednej rodzinie), `family_invitations`
    (partial unique index na pending per family/email). Helper
    `public.is_family_member(uuid)` SECURITY DEFINER, stable.
  - `0003_rls.sql` — RLS na wszystkich trzech tabelach. SELECT przez
    `is_family_member()` zeby uniknac rekursji policy.
    family_invitations: members create, members revoke pending, members
    read.
  - `0004_triggers.sql` — trigger `on_auth_user_created` na
    `auth.users`. Jesli pending invitation matching email → INSERT
    do `family_members` jako 'member' + mark accepted_at. Inaczej →
    nowa rodzina + owner.
- `src/features/auth/AuthProvider.tsx` — context z status discriminated
  union ('loading' | 'signed_out' | 'signed_in'), cleanup subskrypcji,
  `useAuth()` hook z throw przy braku Providera.
- `src/app/(auth)/{_layout,sign-in,sign-up}.tsx` — redirect do `/`
  jesli zalogowany, formularze email/password z walidacja (regex +
  min 6 znakow dla sign-up), tlumaczenie typowych Supabase errors na
  PL.
- `src/app/(app)/_layout.tsx` — redirect do `/sign-in` jesli signed_out.
- `src/app/(app)/profile.tsx` — sekcja Rodzina: lista czlonkow z rola,
  formularz zaproszenia z walidacja, lista pending invitations z
  Alert.alert confirm na cofniecie, przycisk Wyloguj.
- `src/features/family/api.ts` — TanStack Query hooks:
  `useCurrentFamily`, `useFamilyInvitations(familyId)`,
  `useInviteMember`, `useRevokeInvitation`. Query keys zaleznie od
  userId / familyId. Invalidacja po mutacjach.
- `src/lib/supabase.ts` — `createClient<Database>` z generycznym typem.
- `src/lib/database.types.ts` — placeholder zgodny z migracjami (do
  nadpisania przez `supabase gen types`).

## Zmienione pliki

- `sleeper-app/package.json` — devDeps: `supabase@^2.101.0`,
  `eslint@^9.0.0`, `eslint-config-expo@~10.0.0` (eslint zainstalowany
  automatycznie przez `expo lint`)
- `sleeper-app/eslint.config.js` — auto-utworzony przez Expo CLI
- `sleeper-app/supabase/config.toml` — domyslny config po `supabase init`
- `sleeper-app/supabase/migrations/0001_families.sql` — schema
- `sleeper-app/supabase/migrations/0003_rls.sql` — RLS
- `sleeper-app/supabase/migrations/0004_triggers.sql` — auth trigger
- `sleeper-app/src/lib/supabase.ts` — typed client
- `sleeper-app/src/lib/database.types.ts` — placeholder DB types
- `sleeper-app/src/features/auth/AuthProvider.tsx` — context auth
- `sleeper-app/src/features/family/api.ts` — Query hooks
- `sleeper-app/src/app/_layout.tsx` — AuthProvider wrap + (auth) stack
- `sleeper-app/src/app/(app)/_layout.tsx` — auth guard
- `sleeper-app/src/app/(app)/profile.tsx` — sekcja rodzina + invite
- `sleeper-app/src/app/(auth)/_layout.tsx` — guard dla signed_in
- `sleeper-app/src/app/(auth)/sign-in.tsx` — login form
- `sleeper-app/src/app/(auth)/sign-up.tsx` — register form

## Powod / kontekst

Faza 1 zaplanowanego MVP. Model rodziny realizowany przez SECURITY
DEFINER trigger na `auth.users` — kazdy user dostaje rodzine od dnia 1,
zaproszenia rozwiazywane przy sign-up partnera (FIFO po pending
invitations matching email case-insensitive).

Decyzje projektowe:
- UNIQUE user_id na family_members — jeden user w jednej rodzinie (MVP
  ograniczenie zgodne z UX "Twoja rodzina"). Schema dopuszcza wielu
  czlonkow.
- Email z auth.users niedostepny przez RLS z klienta — w UI
  wyswietlamy email tylko dla zalogowanego usera, dla pozostalych
  skrocone UUID. Pelne dane partnera przyjda w kolejnych fazach (lub
  przez auth.users join wymagajacy SECURITY DEFINER view).
- Email confirmation OFF (decyzja usera) — sign-up od razu sesjonuje.
- Supabase CLI zainstalowane jako devDep (`supabase` package), bo brew
  install wymagal updateu Xcode CLT.

Odchylenia od planu: brak. Migracje numerowane 0001/0003/0004 zgodnie
z planem (0002 zarezerwowane dla children/sessions w Fazie 2).

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` — 0 bledow)
- lint: PASS (`npm run lint` — 0 bledow, 0 warningow)
- runtime: pending — czeka na user handoff
  (`supabase login` + `supabase link --project-ref qcyklmrotbkehgpjdebl`
  + `npx supabase db push`), potem regen `database.types.ts` i test
  sign-up/sign-in + invite flow w Expo Go.
