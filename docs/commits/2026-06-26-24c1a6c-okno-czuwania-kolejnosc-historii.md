# 24c1a6c: feat(web): okno czuwania w g/min + kolejnosc historii jak na home (0.7.0)

**Data:** 2026-06-26
**Branch:** main
**Faza zadania:** n/a (drobne fixy UX zgloszone przez usera)

## Co zostalo zrobione
- Okno czuwania w `RecommendationCard` pokazywane w godzinach i minutach (format `formatDuration`, np. "2g 15m") zamiast samych minut.
- Kolejnosc sesji w Historii odwrocona na malejaca (sen nocny u gory, pierwsza drzemka dnia na dole) — spojnie ze strona glowna ("Sesje dzisiaj"). Strona glowna juz byla malejaco, nie ruszana.
- Bump wersji 0.6.0 -> 0.7.0 (user-facing zmiany) + wpis changelog v7.

## Zmienione pliki
- `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` — import `formatDuration`, stala `MINUTE_MS`, linia okna czuwania.
- `packages/sleeper-web/src/app/(app)/history.tsx` — sort malejaco wewnatrz dnia + `gapPosition="below"` w `SessionListItem`.
- `packages/sleeper-web/public/changelog.json` — nowy wpis `v: 7` / 0.7.0.
- `packages/sleeper-web/package.json` — version 0.7.0.
- `packages/sleeper-web/app.json` — version 0.7.0.

## Powod / kontekst
Zgloszenie usera: (1) okno czuwania w samych minutach jest malo czytelne, (2) Historia miala odwrotna kolejnosc niz ekran glowny (rosnaco vs malejaco) — niespojnosc. Reuse istniejacego `formatDuration` (uzywanego juz w `ActiveWindowCard`). Gapy "aktywnosci" pozostaja poprawne, bo `computeGapsBetweenSessions` sortuje wejscie wewnetrznie.

## Walidacja
- typecheck: PASS (`pnpm web:build:check`)
- lint: PASS
- test: PASS (w tym invariant zgodnosci wersji app.json == package.json == top changelog = 0.7.0)
- build: PASS (`Exported: dist`)
- runtime: niezweryfikowane lokalnie — do potwierdzenia na Vercel preview / po deployu
