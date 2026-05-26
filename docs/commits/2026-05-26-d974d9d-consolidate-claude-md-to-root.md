# d974d9d: docs: consolidate project guidelines to repo root

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** n/a (docs/infrastructure)

## Co zostalo zrobione

Konsolidacja project guidelines z `sleeper-app/` do roota repo:
- **CLAUDE.md** w root — comprehensive single source of truth: stack, layout repo, konwencje domeny (timer derived state, UTC w bazie, optimistic START/STOP), commit logging procedure, reguly jakosci, pipeline dev-*
- **sleeper-app/CLAUDE.md** usuniety (byl krotki delegator do AGENTS.md)
- **sleeper-app/AGENTS.md** usuniety (byl krotka nota o SDK 54 lock; tresc juz w root CLAUDE.md sekcja "Expo SDK 54 — LOCK")

## Zmienione pliki

- `CLAUDE.md` — nowy (134 linie), w root projektu
- `sleeper-app/CLAUDE.md` — deleted (40 linii)
- `sleeper-app/AGENTS.md` — deleted (5 linii)

## Powod / kontekst

`docs/` i `.claude/` są już w root projektu — naturalne miejsce dla CLAUDE.md jako entry point dla Claude Code. Wcześniejsza struktura (CLAUDE.md w `sleeper-app/`) była mylaca dla pipeline dev-* (skille wczytują CLAUDE.md przy uruchomieniu — Claude Code szuka go w cwd lub root repo).

Konsolidacja eliminuje:
- duplikację (AGENTS.md + CLAUDE.md w sleeper-app/ vs root)
- ambiguity (który CLAUDE.md jest źródłem prawdy)
- konieczność `cd sleeper-app/` przed wywołaniem skilla

## Walidacja

- typecheck: n/a (zmiany docs, nie kodu)
- test: n/a
- runtime: n/a (Claude Code wczyta nowy CLAUDE.md w następnej sesji)
- spójność: PASS — nowy root CLAUDE.md zawiera wszystkie informacje z usuniętych plików (SDK 54 lock, layout repo, commit logging, reguły, pipeline dev-*)
