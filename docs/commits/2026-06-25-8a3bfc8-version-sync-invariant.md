# 8a3bfc8: test(changelog): invariant zgodnosci wersji w build:check

**Data:** 2026-06-25
**Branch:** main
**Faza zadania:** n/a (enforcement procesu release'u)

## Co zostało zrobione
Dodano deterministyczny test (`vitest`, uruchamiany w `web:build:check` przez `vitest run`) wymuszający jedno źródło prawdy o wersji release'u:
- `app.json` (`expo.version`) == `package.json` (`version`) == najnowszy wpis `public/changelog.json` (`[0].version`).
- Najnowszy wpis ma najwyższe `v` (changelog posortowany malejąco).
- Każde `v` unikalne; wszystkie wersje to poprawny semver.

## Zmienione pliki
- `packages/sleeper-web/src/features/changelog/__tests__/version-sync.test.ts` — nowy test (5 asercji)

## Powód / kontekst
Krok „ogłoś deploy" (wpis do changelogu + bump wersji w app.json/package.json) był dotąd tylko konwencją w roadmapie — nic go nie wymuszało, więc bywał pomijany (baner „Co nowego" nie pokazywał deployu, Ustawienia pokazywały starą wersję). Test przenosi to z „Claude/dev pamięta" na blokujący gate: rozjazd trzech wersji = czerwony `web:build:check`, niemożliwy do zmergowania.

User wybrał ten lżejszy wariant zamiast pre-push guarda. **Świadome ograniczenie:** test NIE wykryje „zapomniano całego wpisu", gdy wszystkie trzy wersje zostaną spójnie na starej (np. 0.5.0) — łapie rozjazd, nie brak bumpa. Pełne wymuszenie „user-facing zmiana ⇒ wpis" wymagałoby pre-push guarda (odrzucone na rzecz braku zmian w gicie).

## Walidacja
- test: PASS — 5/5 (`vitest run` na nowym pliku); stan 0.6.0 spójny we wszystkich trzech plikach
- typecheck/lint/build: n/a osobno (test wchodzi do `web:build:check`; reszta bez zmian)
- runtime: n/a
