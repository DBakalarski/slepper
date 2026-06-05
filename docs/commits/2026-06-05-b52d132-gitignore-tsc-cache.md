# b52d132: chore: ignore .claude/tsc-cache/ (local typecheck cache)

**Data:** 2026-06-05
**Branch:** feature/fixy-edycja-aktywnosc-smart-start
**Faza zadania:** n/a (cleanup przed merge do main)

## Co zostalo zrobione
- Dodano `.claude/tsc-cache/` do `.gitignore` zeby lokalny cache TS nie wisial jako untracked.

## Zmienione pliki
- `.gitignore` — dodano wpis `.claude/tsc-cache/` w sekcji "Local Claude config".

## Powod / kontekst
Przed mergem branchy `feature/fixy-edycja-aktywnosc-smart-start` do `main` w `git status` wisial untracked katalog `.claude/tsc-cache/` (lokalny cache hooka tsc). To czysto lokalna rzecz — gitignore.

## Walidacja
- typecheck: n/a (zmiana w gitignore)
- test: n/a
- runtime: n/a
