# c72c497: fix(changelog): ogłoś deploye 0.4.0 (Historia zmian) i 0.5.0 (eksport CSV)

**Data:** 2026-06-25
**Branch:** main
**Faza zadania:** Bugfix — banner „co nowego" + brak wpisu w Historii zmian

## Objaw (zgłoszenie usera)
- Banner „nowa wersja" nie pokazuje się (brak popupu).
- W „Historia zmian" (Ustawienia) brak wpisu o eksporcie CSV — ostatnia wersja 0.3.0.

## Root cause (systematic-debugging)
Dwa user-facing deploye zostały wypchnięte BEZ dopisania wpisu do `changelog.json`
(`v` max zostało 3):
- `914724e` — wersjonowanie + ekran „Historia zmian”.
- `2aac230` — eksport CSV.

Konsekwencje:
1. **Banner**: `selectUnseen(entries, lastSeen)` bierze tylko wpisy `v > lastSeen`.
   User widział v3 (`lastSeen=3`), a `max(v)=3` → brak niewidzianych → banner nigdy
   nie wskakuje. Kod bannera działa; nie dostał czym się odpalić. (To „dyscyplina
   Utrzymania" z roadmapy, której nie wykonano przy deployach.)
2. **Historia zmian**: ekran renderuje `changelog.json` — bez wpisów v4/v5 nie ma tam
   eksportu CSV.

Wykryto też **drugą pułapkę**: `version` z `app.json` jest wpiekane do bundla web
(`APP_MANIFEST`), a Metro cache'uje to w `$TMPDIR/metro-cache` (poza `.expo` i
`node_modules/.cache`). Sam bump `app.json` + `expo export` → bundle ze STARĄ wersją
(lokalnie utknęło na 0.1.0). Rozwiązanie: build z `--clear`. Vercel buduje na zimnym
cache → produkcja nie była dotknięta (display wersji był OK), ale lokalna walidacja
i powtórne buildy tak.

## Co zostało zrobione
- `changelog.json`: +v4 (`0.4.0`, „Historia zmian i numer wersji w Ustawieniach”) +v5
  (`0.5.0`, „Eksport danych snu do CSV”).
- `app.json` + `package.json`: `0.3.0` → `0.5.0`.
- Weryfikacja: `expo export --clear` → bundle zawiera `"version":"0.5.0"`, `changelog.json` max `v:5`.
- Roadmap „Utrzymanie": dopisana nota o obu pułapkach (brak wpisu = brak bannera; Metro cache → `--clear`).

## Zmienione pliki
- `packages/sleeper-web/public/changelog.json` — wpisy v4, v5
- `packages/sleeper-web/app.json` — version 0.5.0
- `packages/sleeper-web/package.json` — version 0.5.0
- `docs/ideation/2026-06-24-roadmap.md` — nota o pułapkach cache/changelog

## Walidacja
- typecheck/lint/test: PASS (`pnpm web:build:check` zielony)
- build: PASS; finalny bundle ma `version 0.5.0`, `changelog.json` max `v:5`
- runtime: wymaga DEPLOYU (`git push origin main` → Vercel). Po deployu na istniejącym
  PWA usera (ma kod bannera, `lastSeen=3`): banner wykryje v4+v5 → restart → świeży
  bundle; eksport CSV pojawi się w „Historia zmian". Świeży user: silent catch-up
  (banner się nie pokaże — by design).
