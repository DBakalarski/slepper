# 3f017d8: feat(web): changelog 0.9.0 (retro za 408cd80) + hook commit-msg wymuszajacy wpisy

**Data:** 2026-07-09
**Branch:** main
**Faza zadania:** n/a (bugfix — zgloszenie usera: brak komunikatu "co nowego" po deployu)

## Co zostalo zrobione
- Retroaktywny wpis 0.9.0 w `public/changelog.json` za commit 408cd80 (usuniety wybor algorytmu + korekta za drzemke) + bump wersji w `app.json` i `package.json`.
- Nowy git hook `.githooks/commit-msg`: blokuje commit `feat|fix|perf(web)` bez zestage'owanego `changelog.json`; escape hatch `[no-changelog]` w tresci commita.
- Samoinstalacja hooka: root `package.json` -> `"prepare": "git config core.hooksPath .githooks"` (odpala sie przy `pnpm install`).
- `version-sync.test.ts`: nowy test na istnienie + wykonywalnosc hooka; zaktualizowany komentarz (pre-push guard juz nie jest "swiadomie odrzucony" — istnieje jako commit-msg hook).
- CLAUDE.md: nowa sekcja "Changelog dla usera — OBOWIAZKOWE (wymuszane git hookiem)".
- Baza wiedzy: `docs/solutions/deployment-issues/2026-07-09-changelog-entry-enforcement-commit-msg-hook.md` + nowa regula w `learned-patterns.md` (rule-count 12).

## Zmienione pliki
- `packages/sleeper-web/public/changelog.json` — wpis v:9 / 0.9.0.
- `packages/sleeper-web/app.json`, `packages/sleeper-web/package.json` — bump 0.8.0 -> 0.9.0.
- `.githooks/commit-msg` — nowy hook (guard wpisu changelogu).
- `package.json` (root) — `prepare` script instalujacy `core.hooksPath`.
- `packages/sleeper-web/src/features/changelog/__tests__/version-sync.test.ts` — test hooka + komentarz.
- `CLAUDE.md` — sekcja o obowiazkowym changelogu.
- `.claude/rules/learned-patterns.md` — nowa regula (wymuszanie procesu hookiem).
- `docs/solutions/deployment-issues/2026-07-09-changelog-entry-enforcement-commit-msg-hook.md` — dokumentacja rozwiazania.

## Powod / kontekst
User: "po ostatnich zmianach nie pojawil sie komunikat w aplikacji (...) problem wystepuje notorycznie, zalatw to raz a porzadnie". Root cause: `version-sync.test.ts` pilnuje tylko SPOJNOSCI trzech wersji, nie wykrywa braku calego wpisu (wszystko stare = spojne = gate przechodzi). Regula procesowa istniala w CLAUDE.md/memory, ale nic jej nie wymuszalo. Fix domyka luke deterministycznie: hook pilnuje obecnosci wpisu w commicie, vitest-invariant spojnosci wersji.

## Walidacja
- typecheck: PASS (`pnpm web:build:check`)
- lint: PASS
- test: PASS (vitest, w tym version-sync 6/6)
- build: PASS (expo export web -> dist)
- hook: przetestowany na 4 scenariuszach (feat(web) bez changelogu = blokada; z changelogiem / docs / [no-changelog] = OK); commit 3f017d8 przeszedl przez hook na zywo
- runtime: baner 0.9.0 pojawi sie na urzadzeniach po deployu na Vercel (user zweryfikuje)
