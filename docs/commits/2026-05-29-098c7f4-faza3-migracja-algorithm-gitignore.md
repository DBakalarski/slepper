# 098c7f4: feat(fixy-i-kotki-dwa-algorytm): migracja algorithm + gitignore data-book

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 3 — Algorytm Kotki Dwa — migracja + gitignore

## Co zostalo zrobione

- Dodana migracja `0011_children_algorithm.sql` — kolumna `algorithm text not null default 'galland'` z check constraint `('galland', 'kotki_dwa')` w tabeli `public.children`
- Zaktualizowany `database.types.ts` — pole `algorithm: string` dodane do `Row`, `Insert` (optional), `Update` (optional) w tabeli `children`
- Dodana sekcja `data-book/` do root `.gitignore` z komentarzem o prawach autorskich Marta Stam / Kotki Dwa

## Zmienione pliki

- `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` — NOWY: ALTER TABLE children ADD COLUMN algorithm
- `packages/sleeper-app/src/lib/database.types.ts` — ręczne dodanie pola algorithm do Row/Insert/Update
- `.gitignore` (root) — sekcja `data-book/` z komentarzem copyright

## Powod / kontekst

Przygotowanie schematu bazy pod wybor algorytmu per dziecko (Faza 3 z 6). Kolumna `algorithm` bedzie uzywana w Fazie 5 (toggle UI + adapter). PDF `data-book/przewodnik_sen.pdf` jest materialem referencyjnym chronionym prawem autorskim — nalezy trzymac lokalnie poza repo. Gitignore dodany teraz zeby przypadkowy `git add .` nie dodalby tego pliku.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 bledow)
- lint: PASS (`pnpm --filter sleeper-app lint`)
- test: n/a (faza 3 nie zawiera checkboxow Test:)
- runtime: n/a (migracja SQL bez zmian w UI)
- git status: `data-book/` nie pojawia sie w output — poprawnie ignorowany
