# aa7a2ee: chore(web): dodaj Vercel Web Analytics

**Data:** 2026-07-13
**Branch:** main
**Faza zadania:** n/a

## Co zostalo zrobione
- Instalacja `@vercel/analytics@2.0.1` w `packages/sleeper-web` (pnpm --filter).
- Podpiecie komponentu `<Analytics />` z `@vercel/analytics/react` (wariant dla generycznego Reacta, NIE `/next`) w root layoucie — sledzi page views przy zmianach tras SPA automatycznie.

## Zmienione pliki
- `packages/sleeper-web/package.json` — nowa zaleznosc `@vercel/analytics ^2.0.1`
- `packages/sleeper-web/src/app/_layout.tsx` — import + render `<Analytics />` w `RootLayout`
- `pnpm-lock.yaml` — lockfile update

## Powod / kontekst
User chce miec statystyki odwiedzin PWA. Vercel Web Analytics to zero-config
rozwiazanie dla projektu deployowanego na Vercelu. Typ `chore` (nie `feat`),
bo zmiana jest niewidoczna dla usera — brak wpisu w changelog.json zgodnie
z regula z CLAUDE.md.

Kroki po stronie usera:
1. Vercel dashboard -> projekt -> Analytics -> Enable (bez tego skrypt
   `/_vercel/insights/script.js` zwraca 404).
2. Deploy na Vercela — analytics nie dziala na localhost.

## Walidacja
- typecheck: PASS (w ramach web:build:check)
- test: PASS (w ramach web:build:check)
- runtime: `pnpm web:build:check` w calosci PASS (tsc + lint + test + invariants + expo export); weryfikacja zbierania danych mozliwa dopiero po enable + deploy
