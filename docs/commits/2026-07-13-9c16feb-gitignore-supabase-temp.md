# 9c16feb: chore: ignoruj supabase/.temp (cache supabase CLI)

**Data:** 2026-07-13
**Branch:** main
**Faza zadania:** n/a

## Co zostalo zrobione
- Dodanie wzorca `**/supabase/.temp/` do root `.gitignore`.

## Zmienione pliki
- `.gitignore` — nowy wpis `**/supabase/.temp/`

## Powod / kontekst
W roocie pojawil sie untracked `supabase/.temp/linked-project.json` — cache
`supabase link` uruchomionego z roota (sam ref projektu, regenerowalny).
Nie jest to kod ani schema (source-of-truth zyje w
`packages/sleeper-web/supabase/`), wiec ignorujemy zamiast commitowac.
Wzorzec globalny `**/` pokrywa tez przyszly `.temp` w per-package supabase.

## Walidacja
- typecheck: n/a
- test: n/a
- runtime: `git status --porcelain` — katalog supabase/ zniknal z untracked
