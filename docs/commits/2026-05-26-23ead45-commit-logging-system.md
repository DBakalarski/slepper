# 23ead45: infra: add per-commit logging system + retroactive Faza 0 logs

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 0 — Setup projektu (infrastruktura, nie z planu)

## Co zostalo zrobione
- Utworzono `docs/commits/` z `README.md` opisujacym konwencje
- Retroaktywne logi dla 3 commitow Fazy 0:
  - `2026-05-26-9de7387-scaffold.md` (scaffold Expo)
  - `2026-05-26-9eea447-health-probe.md` (Supabase health probe w UI)
  - `2026-05-26-12bffeb-sdk54-downgrade.md` (downgrade SDK 56 -> 54)
- `sleeper-app/AGENTS.md` — reference SDK 56 -> 54 + lock note (nie upgradowac bez approval)
- `sleeper-app/CLAUDE.md` — dodano sekcje "Commit logging — OBOWIAZKOWE" z procedura + szablonem
- `.gitignore` w root sleeper/ — dodano `summary.md` (niepowiazany plik) + `.DS_Store`

## Zmienione pliki
- `.gitignore` — utworzony
- `sleeper-app/AGENTS.md` — SDK reference + lock
- `sleeper-app/CLAUDE.md` — procedura commit logging
- `docs/commits/README.md` — opis konwencji
- `docs/commits/2026-05-26-{9de7387,9eea447,12bffeb}-*.md` — retroaktywne logi

## Powod / kontekst
User explicite poprosil 2026-05-26 o:
1. Aktualizacje CLAUDE.md (originalnie literowka "cloud.md")
2. Tworzenie per-commit pliku .md z opisem dla kazdego przyszlego commitu
3. Zapamietanie tej zasady (zapisane do auto memory: `feedback_commit_logging.md` + `project_sleeper_mvp.md`)
4. Dodanie `summary.md` do `.gitignore`

Cel: dokladny audit-trail historii projektu — debugowanie regresji, retrospekcja, onboarding.

## Walidacja
- typecheck: n/a (zmiany tylko docs + config)
- test: n/a
- runtime: n/a (zadnego kodu produkcyjnego nie ruszylo)
