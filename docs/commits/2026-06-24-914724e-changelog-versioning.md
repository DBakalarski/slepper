# 914724e: feat(changelog): wersjonowanie semver + ekran Historia zmian w Ustawieniach

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** Poza fazami — rozszerzenie „Co nowego" (changelog) o wersjonowanie + widok historii

## Co zostalo zrobione
- Wprowadzono wersjonowanie aplikacji wg semver (pre-1.0, major `0`). `app.json` +
  `package.json` bump `0.1.0` → `0.3.0`. Źródłem prawdy wyświetlanej wersji jest
  `app.json` (`Constants.expoConfig?.version`).
- `changelog.json` — każdy wpis dostał pole `version` (semver) obok wewnętrznego
  licznika `v` (który nadal steruje logiką „niewidziane" w bannerze). Retrofit
  istniejących wpisów wg wagi zmiany: v1→`0.1.0`, v2→`0.2.0`, v3→`0.3.0`.
- Nowy ekran „Historia zmian" (`app/(app)/changelog.tsx`) — pełnoekranowa lista
  wszystkich wersji (karta per wpis: „Wersja X.Y.Z · data" + punkty), stany
  loading/error/empty. Zarejestrowany jako route `href: null` (jak `settings`).
- Nowy wiersz w Ustawieniach → push do `/changelog`, z bieżącą wersją po prawej.
- Nowy hook `useChangelogHistory` — pełna historia (pojedynczy fetch no-store +
  AbortController), świadomie osobny od bannerowego `useChangelogUpdate`.
- Banner „co nowego" nietknięty.

## Zmienione pliki
- `packages/sleeper-web/app.json` — `version` 0.1.0 → 0.3.0
- `packages/sleeper-web/package.json` — `version` 0.1.0 → 0.3.0
- `packages/sleeper-web/public/changelog.json` — dodane pole `version` per wpis
- `packages/sleeper-web/src/features/changelog/changelog.ts` — `version` w typie + type guard
- `packages/sleeper-web/src/features/changelog/useChangelogHistory.ts` — nowy hook
- `packages/sleeper-web/src/app/(app)/changelog.tsx` — nowy ekran
- `packages/sleeper-web/src/app/(app)/settings.tsx` — wiersz „Historia zmian" + wersja
- `packages/sleeper-web/src/app/(app)/_layout.tsx` — rejestracja route `changelog` (href:null)
- `packages/sleeper-web/src/features/changelog/__tests__/changelog.test.ts` — fixtures + `version` wymagany
- `packages/sleeper-web/src/features/changelog/__tests__/useChangelogHistory.test.ts` — static-invariants (nowy)
- `packages/sleeper-web/src/features/changelog/__tests__/changelog-screen.test.ts` — static-invariants ekran + wpięcie (nowy)
- `docs/ideation/2026-06-24-roadmap.md` — dyscyplina utrzymania (bump wersji per deploy)
- `docs/superpowers/specs/2026-06-24-changelog-history-versioning-design.md` — spec (nowy)

## Powod / kontekst
User chciał zakładki/sekcji ze zmianami w Ustawieniach i rozpoczęcia wersjonowania
aplikacji. Reużyto istniejącej infrastruktury `changelog.json` (kurowanej per deploy
na potrzeby bannera „co nowego") — dodano warstwę semver i widok pełnej historii bez
ruszania logiki bannera. Decyzje (semver z labelem w changelogu, osobny ekran, semver
wg wagi zmiany) zapadły w brainstormingu; udokumentowane w spec.

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- lint: PASS (`expo lint`)
- test: PASS (vitest — 229 testów, w tym nowe unit + static-invariants)
- build: PASS (`expo export --platform web`)
- `pnpm web:build:check`: PASS (całość)
- runtime: do manualnej weryfikacji (gear → Ustawienia → Historia zmian → lista wersji).
  Uwaga: typed routes (`.expo/types/router.d.ts`, gitignored) wymagały regeneracji
  przez boot dev-servera — `pnpm web:dev` robi to automatycznie.
