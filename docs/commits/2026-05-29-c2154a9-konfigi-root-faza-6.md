# c2154a9: chore(fixy-i-kotki-dwa-algorytm): konfigi root + dokumentacja — Faza 6

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 6 — Konfigi root + dokumentacja

## Co zostalo zrobione

- Zaktualizowano `CLAUDE.md` (root): sekcja "Layout repozytorium" wymienia teraz oba package'y algorytmów (`sleeper-machine` i `sleeper-machine-kotki`) z krótkim opisem każdego. Sekcja "Wazne" rozszerzona o opis `sleeper-machine-kotki` i wzmiankę o wyborze algorytmu per dziecko (`children.algorithm`). Sekcja "Stack" podzielona na dwa wiersze algorytmów. Sekcja "Aktualny stan" zaktualizowana do bieżącego brancha i daty.
- Dodano proxy scripty do `package.json` (root): `machine-kotki:test` i `machine-kotki:build` delegujące do filtra pnpm.
- `pnpm-workspace.yaml` — bez zmian (istniejący glob `packages/*` już obejmuje nowy katalog `packages/sleeper-machine-kotki/`).

## Zmienione pliki

- `CLAUDE.md` — aktualizacja sekcji Layout, Stack, Aktualny stan, Wazne
- `package.json` — dodane dwa proxy scripty dla sleeper-machine-kotki
- `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-kontekst.md` — wpis Fazy 6
- `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-zadania.md` — checkboxy Fazy 6 oznaczone jako ukończone

## Powod / kontekst

Faza 6 to finalizacja zadania fixy-i-kotki-dwa-algorytm: po dodaniu nowego package `sleeper-machine-kotki` (Faza 4) i integracji z app (Faza 5), monorepo wymaga aktualizacji dokumentacji dla przyszłego Claude i dewelopera. Proxy scripty redukują konieczność pamiętania pełnej składni `--filter`.

## Walidacja

- typecheck: n/a (bez zmian w kodzie TS)
- test: PASS — `pnpm --filter sleeper-machine-kotki test` (43/43), `pnpm machine-kotki:test` (43/43)
- runtime: n/a (zmiany wyłącznie w plikach konfiguracyjnych i dokumentacji)
- git status: `data-book/` nie pojawia się w output (poprawnie gitignorowany)
