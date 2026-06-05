# d166574: chore(fixy-i-kotki-dwa-algorytm): archiwizacja zadania + nowe wpisy w bazie wiedzy

**Data:** 2026-06-05
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** zamknięcie (post Faza 6)

## Co zostało zrobione
- Przeniesiono `docs/active/fixy-i-kotki-dwa-algorytm/` → `docs/completed/fixy-i-kotki-dwa-algorytm/` (plan, kontekst, zadania, podsumowanie, manual-test-fazy 1/2/5, review-fazy 1–6).
- Zaktualizowano `CLAUDE.md` (aktualny stan: brak aktywnego zadania, kotki-dwa w `completed/`).
- Dopisano regułę cross-day editing night sleep do `.claude/rules/learned-patterns.md`.
- Dodano dwa wpisy do `docs/solutions/`:
  - `build-errors/2026-05-29-expo-start-from-monorepo-root.md`
  - `runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md`
- `packages/sleeper-app/app.json`: dodano `ios.bundleIdentifier = com.dawidbakalarski.sleeper`, usunięto wpis `expo-notifications` z `plugins` (porządki konfiguracyjne).

## Zmienione pliki
- `.claude/rules/learned-patterns.md` — nowa reguła cross-day edit night sleep
- `CLAUDE.md` — aktualizacja sekcji "Aktualny stan"
- `docs/active/fixy-i-kotki-dwa-algorytm/*` → `docs/completed/fixy-i-kotki-dwa-algorytm/*` (rename)
- `docs/completed/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-podsumowanie.md` — nowy
- `docs/completed/fixy-i-kotki-dwa-algorytm/manual-test-faza-*.md` — nowe (1, 2, 5)
- `docs/completed/fixy-i-kotki-dwa-algorytm/review-faza-*.md` — nowe (1–6)
- `docs/solutions/build-errors/2026-05-29-expo-start-from-monorepo-root.md` — nowy
- `docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md` — nowy
- `packages/sleeper-app/app.json` — bundleIdentifier + usunięcie expo-notifications

## Powód / kontekst
Domknięcie zadania `fixy-i-kotki-dwa-algorytm` przed startem kolejnego (`fixy-edycja-aktywnosc-smart-start`). Przeniesienie do `completed/` zwalnia katalog `active/` i utrwala lessons learned w `docs/solutions/` + `learned-patterns.md`.

## Walidacja
- typecheck: n/a (zmiany wyłącznie dokumentacyjne + konfig app.json)
- test: n/a
- runtime: n/a — komity dokumentacji
