# Sleeper — projekt

Aplikacja do trackowania snu i okien aktywnosci dziecka. Solo dev, Expo + Supabase, sync miedzy urzadzeniami od dnia 1.

## Scope — WEB ONLY

**Wspieramy WYLACZNIE wersje web (PWA, `packages/sleeper-web/`).** Aplikacja mobilna (`packages/sleeper-app/`) zostala **usunieta** z repo (deprecated 2026-06-24) — nie ma juz kodu mobile do utrzymania.

Praktyczne implikacje:
- Nowe ficzery i bugfixy => `packages/sleeper-web/`.
- Pre-merge walidacja => `pnpm web:build:check` jest blocking.
- Native-only API (Notifications, SecureStore, Haptics) na web sa no-op/crashuja — zawsze przez `Platform.OS` guard + `lib/` wrapper (patrz `learned-patterns.md`).

## Expo SDK 54 — LOCK

Project jest zablokowany na **Expo SDK 54** (downgrade z 56 dla Expo Go App Store compatibility — patrz `docs/commits/2026-05-26-12bffeb-sdk54-downgrade.md`). NIE podnosic bez explicit user approval.

Przed pisaniem kodu Expo: przeczytaj wersjowane docs https://docs.expo.dev/versions/v54.0.0/.

## Layout repozytorium

Monorepo **pnpm workspaces** (`pnpm-workspace.yaml` → `packages/*`).

```
sleeper/                                  # ← root (TEN katalog)
├── CLAUDE.md                             # ← ten plik
├── PLAN.md                               # wysokopoziomowy plan techniczny (read-only reference)
├── package.json                          # root: scripts proxy do filtrow pnpm
├── pnpm-workspace.yaml                   # packages/*
├── docs/
│   ├── active/                           # kontekst + plan + zadania aktualnych zadan (moze byc >1 rownolegle)
│   ├── completed/mvp-sleep-tracker/      # archiwum ukonczonego MVP
│   ├── completed/ui-redesign/            # archiwum ukonczonego redesignu UI
│   ├── completed/fixy-i-kotki-dwa-algorytm/ # archiwum: cross-day edit + progress bar + kotki dwa
│   ├── completed/sleeper-web-pwa/        # archiwum: PWA web (Expo SDK 54 web-only) + Vercel deploy
│   ├── commits/                          # log commitow (jeden plik per commit, OBOWIAZKOWE)
│   ├── solutions/                        # baza wiedzy (zarzadzana przez /dev-compound)
│   ├── plans/                            # output skilla /dev-plan (Implementation Units)
│   ├── dev-brainstorms/                  # output skilla /dev-brainstorm (requirements docs)
│   └── runbook/                          # runbooki operacyjne (np. sleeper-web-deploy.md)
├── .claude/
│   ├── rules/                            # coding-rules.md, learned-patterns.md
│   ├── docs/dev-pipeline.md              # opis pipeline'u skilli dev-*
│   ├── agents/                           # custom subagenty
│   ├── hooks/                            # error-handling, stop-build-check
│   └── skills/                           # dev-brainstorm, dev-plan, dev-docs, code-review itd.
└── packages/
    ├── sleeper-web/                      # ← PWA web (Expo SDK 54 web-only) — JEDYNA aplikacja
    │   ├── src/app/                      # routes (expo-router, file-based)
    │   ├── src/components/, src/features/, src/lib/
    │   ├── public/                       # manifest.json, sw.js, icons, index.html
    │   ├── supabase/{config.toml,migrations/}  # schema source-of-truth (shared DB)
    │   ├── scripts/check-no-native-imports.sh
    │   └── vercel.json                   # SPA rewrites + cache headers
    ├── sleeper-machine/                  # ← algorytm Galland (TS, vitest) — naukowy, EWMA
    │   └── src/, dist/, scripts/smoke-test.ts
    └── sleeper-machine-kotki/            # ← algorytm Kotki Dwa (TS, vitest) — lookup table per wiek
        └── src/, dist/, tests/
```

**Wazne:**
- Kod aplikacji zyje w `packages/sleeper-web/` — Expo SDK 54 web-only, deploy na Vercel. Komendy: `pnpm web:dev|build|build:check|typecheck|lint|test`. Deploy runbook: `docs/runbook/sleeper-web-deploy.md`.
- **Migracje Supabase** zyja w `packages/sleeper-web/supabase/migrations/` (`config.toml` + SQL) — schema source-of-truth dla wspoldzielonej bazy Supabase.
- Algorytm Galland w `packages/sleeper-machine/` — importowany jako `sleeper-machine`. Komendy: `pnpm --filter sleeper-machine test|build|smoke`.
- Algorytm Kotki Dwa w `packages/sleeper-machine-kotki/` — importowany jako `sleeper-machine-kotki`. Komendy: `pnpm --filter sleeper-machine-kotki test|build`. Proxy: `pnpm machine-kotki:test|build`.
- Wybor algorytmu per dziecko — pole `children.algorithm` ('galland' | 'kotki_dwa', default 'galland').
- `docs/` i `.claude/` zostaja w roocie i sa wspolne.

## Aktualny stan (2026-06-24)

- **Branch:** `main` (poprzednie feature branche zmergowane).
- **Mobile usuniete (2026-06-24):** `packages/sleeper-app/` skasowane — projekt jest web-only. `supabase/` przeniesione do `packages/sleeper-web/supabase/`.
- **Aktywne zadania** (`docs/active/`): oba dotyczyly tylko skasowanego `packages/sleeper-app/`, wiec sa nieaktualne:
  - `docs/active/fixy-edycja-aktywnosc-smart-start/` — 3 fixy UX (mobile-only, nieaktualne).
  - `docs/active/active-window-machine/` — hook lifting + footer badge (mobile-only, nieaktualne).
- **Ukonczone:**
  - MVP sleep tracker → `docs/completed/mvp-sleep-tracker/`
  - UI redesign → `docs/completed/ui-redesign/`
  - fixy-i-kotki-dwa-algorytm → `docs/completed/fixy-i-kotki-dwa-algorytm/` (merged to main 2026-06-05)
  - sleeper-web-pwa → `docs/completed/sleeper-web-pwa/` (kod gotowy 2026-06-06; deploy Vercel + manual-on-device = user action)

## Stack (zainstalowany — sprawdzone w `packages/sleeper-web/package.json`)

| Warstwa | Wybor | Wersja |
|---|---|---|
| Framework | Expo (RN 0.81 + React 19 + TS 5.9) | SDK **54** (lock) |
| Routing | expo-router | ~6.0 |
| Stylowanie | NativeWind v4 + Tailwind v3.4 | v3.4 bo `nativewind@4.2` peer dep oczekuje Tailwind >3.3, NIE v4 |
| State (server) | TanStack Query | ^5.100 |
| State (UI) | Zustand | ^5.0 |
| Backend | @supabase/supabase-js | ^2.106 (AsyncStorage persistence, URL polyfill) |
| Daty | date-fns + date-fns-tz | UTC w bazie, `Europe/Warsaw` w UI |
| Animacje | react-native-reanimated + worklets | ~4.1 / 0.5 |
| Ikony | lucide-react-native (alias → lucide-react na web) | ^1.17 / ^0.469 |
| Notyfikacje / wake | web wrappery w `lib/` (Wake Lock API, notyfikacje no-op) | — |
| Algorytm (Galland) | `sleeper-machine` (workspace) | 0.1.0 (vitest, EWMA — naukowy) |
| Algorytm (Kotki Dwa) | `sleeper-machine-kotki` (workspace) | 0.1.0 (vitest, lookup table per wiek) |
| TS | strict ON | path alias `@/*` -> `./src/*` |

**Uwaga ws. struktury routingu:** plan w `PLAN.md` zaklada `app/` w roocie, ale template SDK trzyma routes w `packages/sleeper-web/src/app/`. Funkcjonalnie identyczne, alias `@/*` to obsluguje.

## Konwencje specyficzne dla domeny

- **Timer = derived state**: czytaj `start_at` z `sessions where end_at is null`, renderuj przez `setInterval`. NIE zapisuj running counter w bazie.
- **`end_at = null`** = sesja w toku. Max jedna na dziecko (partial unique index w migracji).
- **Realtime**: event z Supabase -> `queryClient.invalidateQueries(['sessions'])`. NIE patchuj cache recznie.
- **Strefa czasowa**: zawsze UTC (`timestamptz`) w bazie, zawsze `Europe/Warsaw` przy formatowaniu.
- **Optimistic updates** tylko dla START/STOP sesji (najczestsza akcja). Edycja historii — bez optimistic.
- **Tabs**: `Tabs` z `expo-router` (nie `NativeTabs` — wymaga PNG ikon per tab, polish ikon = Faza 6).

## Walidacja (PRZED deklaracja "gotowe")

Z roota (przez pnpm filter):

```bash
pnpm --filter sleeper-web exec tsc --noEmit   # typecheck web PWA — 0 bledow
pnpm --filter sleeper-web lint                # expo lint web
pnpm --filter sleeper-web test                # vitest web (lib + features)
pnpm --filter sleeper-web build               # expo export web -> dist/
pnpm web:build:check                          # WSZYSTKO razem (tsc + lint + test + invariants + build)
pnpm --filter sleeper-machine test            # vitest (algorytm Galland)
pnpm --filter sleeper-machine build           # tsc -> dist/ (gdy app importuje typy)
pnpm --filter sleeper-machine-kotki test      # vitest (algorytm Kotki Dwa)
pnpm --filter sleeper-machine-kotki build     # tsc -> dist/
```

Alternatywnie wejdz do `packages/sleeper-web/` i uzyj `npx tsc --noEmit` / `pnpm lint` lokalnie.

Runtime:
- Web PWA: `pnpm web:dev` -> http://localhost:8081 w Safari/Chrome. Deploy prod: `git push origin main` -> Vercel auto-deploy (runbook: `docs/runbook/sleeper-web-deploy.md`).

## Changelog dla usera — OBOWIAZKOWE (wymuszane git hookiem)

Kazda zmiana user-facing (typ `feat|fix|perf` ze scope `web`) MUSI w TYM SAMYM commicie zawierac:

1. Nowy wpis na gorze `packages/sleeper-web/public/changelog.json` — `v` +1, wersja semver, data, `items` po polsku z perspektywy usera (co zyskuje / co sie zmienia, nie szczegoly techniczne).
2. Bump `version` w `packages/sleeper-web/app.json` i `packages/sleeper-web/package.json` na te sama wersje (spojnosc pilnuje `version-sync.test.ts` w `web:build:check`).

Po deployu aplikacja sama pokaze userowi baner "co nowego" + prosbe o restart (`useChangelogUpdate`). Brak wpisu = user nie dowie sie o zmianie — dlatego hook `.githooks/commit-msg` BLOKUJE commit `feat|fix|perf(web)` bez zmiany `changelog.json`. Escape hatch dla zmian realnie niewidocznych dla usera: `[no-changelog]` w tresci commit message (ale najpierw rozwaz typ `refactor|chore|test`).

Hook instaluje sie przez root `prepare` script (`git config core.hooksPath .githooks`) — uruchamia sie przy `pnpm install`; po swiezym klonie wystarczy `pnpm install`.

## Commit logging — OBOWIAZKOWE

Kazdy commit kodu = osobny follow-up commit z opisem w `docs/commits/` (root projektu, NIE w `sleeper-web/`).

**Procedura:**

1. Wykonaj `git commit` standardowo.
2. Odczytaj short hash: `git rev-parse --short HEAD`.
3. Utworz `docs/commits/YYYY-MM-DD-<short-hash>-<slug>.md` z opisem (format ponizej).
4. Zacommituj sam ten plik osobno: `docs(commits): log <short-hash>`.

**Format pliku:**

```markdown
# <short-hash>: <commit subject>

**Data:** YYYY-MM-DD
**Branch:** <branch>
**Faza zadania:** <faza-name lub "n/a">

## Co zostalo zrobione
- Punkt 1

## Zmienione pliki
- `path/to/file` — krotki opis zmiany

## Powod / kontekst
Dlaczego ta zmiana, jakie odchylenia od planu.

## Walidacja
- typecheck: PASS/FAIL
- test: PASS/FAIL/n/a
- runtime: jak zweryfikowano (np. "user testowal w Safari/Chrome", "Vercel preview")
```

**Wyjatki:** brak. Zapomnisz — uzupelnij retroaktywnie przed nastepnym commitem.

## Reguly jakosci

- `.claude/rules/coding-rules.md` — twarde reguly (rozmiar plikow, testy, error handling, type safety, async)
- `.claude/rules/learned-patterns.md` — wzorce z `docs/solutions/`
- Filozofia: prostota > abstrakcja, duplication > complexity, NIE dodawaj rzeczy "na przyszlosc"
- Testy: nigdy nie oslabiaj asercji, nigdy nie modyfikuj testow zeby "naprawic" failing test
- Type safety: zero `any`, zero non-null `!`, strict mode ON

## Pipeline dev-* (skille)

`/dev-ideate → /dev-brainstorm → /dev-plan → /dev-docs → /dev-docs-execute ↔ /dev-docs-review → /dev-docs-complete → /dev-compound`

Pelny opis: `.claude/docs/dev-pipeline.md`. Skille bezargumentowe wyciagaja kontekst z sesji.

## Czego NIE robic

- Nie podnosic SDK z 54 bez explicit approval.
- Nie przywracac aplikacji mobilnej (`packages/sleeper-app/`) — zostala skasowana, projekt jest web-only (patrz §Scope — WEB ONLY).
- Nie mieszac package managerow — projekt uzywa **`pnpm`** (workspaces). NIE wolno `npm install` / `yarn add` w packages.
- Nie instalowac zaleznosci na poziomie root bez powodu — instaluj per package: `pnpm --filter <name> add <dep>`.
- Nie instalowac nowych zaleznosci bez poinformowania usera (regula z `coding-rules.md` §8).
- Nie tworzyc abstrakcji "na przyszlosc" — abstrakcja od 2+ uzyc.
- Nie modyfikowac `PLAN.md` (read-only reference).
- Nie commitowac `summary.md` (gitignored, lokalny scratchpad).
