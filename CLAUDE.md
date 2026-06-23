# Sleeper — projekt

Aplikacja do trackowania snu i okien aktywnosci dziecka. Solo dev, Expo + Supabase, sync miedzy urzadzeniami od dnia 1.

## Scope — WEB ONLY

**Aktualnie wspieramy WYLACZNIE wersje web (PWA, `packages/sleeper-web/`).** Aplikacja mobilna (`packages/sleeper-app/`) NIE jest priorytetem — zmiany w sleeper-app sa OK gdy wynikaja z refaktoru wspoldzielonego kodu, ale nowych ficzerow mobile nie robimy, manual on-device testow nie wymagamy, regresji mobilnych nie scigamy.

Praktyczne implikacje:
- Nowe ficzery i bugfixy => `packages/sleeper-web/` najpierw, mobile potem (lub wcale).
- Pre-merge walidacja => `pnpm web:build:check` jest blocking; `pnpm --filter sleeper-app exec tsc --noEmit` jest nice-to-have, nie blocker.
- Jesli ficzer wymaga native-only API (Notifications, SecureStore, Haptics) — najpierw potwierdz z userem czy w ogole robimy.

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
    ├── sleeper-app/                      # ← KOD aplikacji Expo (RN + expo-router)
    │   ├── src/app/                      # routes (expo-router, file-based)
    │   ├── src/components/, src/features/, src/lib/
    │   └── supabase/{config.toml,migrations/}
    ├── sleeper-web/                      # ← PWA web (Expo SDK 54 web-only)
    │   ├── src/app/                      # routes — kopia 1:1 sleeper-app
    │   ├── src/components/, src/features/, src/lib/
    │   ├── public/                       # manifest.json, sw.js, icons, index.html
    │   ├── scripts/check-no-native-imports.sh
    │   └── vercel.json                   # SPA rewrites + cache headers
    ├── sleeper-machine/                  # ← algorytm Galland (TS, vitest) — naukowy, EWMA
    │   └── src/, dist/, scripts/smoke-test.ts
    └── sleeper-machine-kotki/            # ← algorytm Kotki Dwa (TS, vitest) — lookup table per wiek
        └── src/, dist/, tests/
```

**Wazne:**
- Kod aplikacji zyje w `packages/sleeper-app/`. Komendy `expo/tsc/lint` uruchamiaj z tego katalogu **lub** przez `pnpm --filter sleeper-app <skrypt>` z roota.
- **PWA web w `packages/sleeper-web/`** — Expo SDK 54 web-only, deploy na Vercel. Komendy: `pnpm web:dev|build|build:check|typecheck|lint|test`. Deploy runbook: `docs/runbook/sleeper-web-deploy.md`. Wspoldzieli baze Supabase z sleeper-app (cross-device sync via Realtime).
- Algorytm Galland w `packages/sleeper-machine/` — importowany jako `sleeper-machine`. Komendy: `pnpm --filter sleeper-machine test|build|smoke`.
- Algorytm Kotki Dwa w `packages/sleeper-machine-kotki/` — importowany jako `sleeper-machine-kotki`. Komendy: `pnpm --filter sleeper-machine-kotki test|build`. Proxy: `pnpm machine-kotki:test|build`.
- Wybor algorytmu per dziecko — pole `children.algorithm` ('galland' | 'kotki_dwa', default 'galland').
- `docs/` i `.claude/` zostaja w roocie i sa wspolne.

## Aktualny stan (2026-06-06)

- **Branch:** `main` (poprzednie feature branche zmergowane).
- **Aktywne zadania** (równolegle w `docs/active/`):
  - `docs/active/fixy-edycja-aktywnosc-smart-start/` — 3 fixy UX (TimePicker iOS minuty, gap aktywności na home, smart typ sesji z rekomendacji). Jeszcze nie w `completed/`. Status: na hold-zie do uzgodnienia czy port do web ma sens.
  - `docs/active/active-window-machine/` — hook lifting `useSleepRecommendation` do `ActiveChildSection`, footer badge "Drzemka za" / "Przekroczono okno o" na `ActiveWindowCard`. Status: na hold-zie (dotyka tylko `packages/sleeper-app/`, vs. obecny scope WEB ONLY).
- **Ukonczone:**
  - MVP sleep tracker → `docs/completed/mvp-sleep-tracker/`
  - UI redesign → `docs/completed/ui-redesign/`
  - fixy-i-kotki-dwa-algorytm → `docs/completed/fixy-i-kotki-dwa-algorytm/` (merged to main 2026-06-05)
  - sleeper-web-pwa → `docs/completed/sleeper-web-pwa/` (kod gotowy 2026-06-06; deploy Vercel + manual-on-device = user action)

## Stack (zainstalowany — sprawdzone w `packages/sleeper-app/package.json`)

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
| Ikony | lucide-react-native | ^1.17 |
| Notyfikacje / wake | expo-notifications, expo-keep-awake | ~0.32 / ~15.0 |
| Algorytm (Galland) | `sleeper-machine` (workspace) | 0.1.0 (vitest, EWMA — naukowy) |
| Algorytm (Kotki Dwa) | `sleeper-machine-kotki` (workspace) | 0.1.0 (vitest, lookup table per wiek) |
| TS | strict ON | path alias `@/*` -> `./src/*` |

**Uwaga ws. struktury routingu:** plan w `PLAN.md` zaklada `app/` w roocie, ale template SDK trzyma routes w `packages/sleeper-app/src/app/`. Funkcjonalnie identyczne, alias `@/*` to obsluguje.

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
pnpm --filter sleeper-app exec tsc --noEmit   # typecheck app — 0 bledow
pnpm --filter sleeper-app lint                # expo lint
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

Alternatywnie wejdz do `packages/sleeper-app/` i uzyj `npx tsc --noEmit` / `pnpm lint` lokalnie.

Runtime:
- Mobile: `pnpm app:dev` (alias `pnpm --filter sleeper-app start`) -> QR -> Expo Go na fizycznym urzadzeniu. Symulator iOS wymaga Maca z Xcode.
- Web PWA: `pnpm web:dev` -> http://localhost:8081 w Safari/Chrome. Deploy prod: `git push origin main` -> Vercel auto-deploy (runbook: `docs/runbook/sleeper-web-deploy.md`).

## Commit logging — OBOWIAZKOWE

Kazdy commit kodu = osobny follow-up commit z opisem w `docs/commits/` (root projektu, NIE w `sleeper-app/`).

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
- runtime: jak zweryfikowano (np. "user testowal w Expo Go")
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
- Nie dodawac mobile-only ficzerow do `packages/sleeper-app/` bez explicit approval — scope projektu to web (patrz §Scope — WEB ONLY).
- Nie mieszac package managerow — projekt uzywa **`pnpm`** (workspaces). NIE wolno `npm install` / `yarn add` w packages.
- Nie instalowac zaleznosci na poziomie root bez powodu — instaluj per package: `pnpm --filter <name> add <dep>`.
- Nie instalowac nowych zaleznosci bez poinformowania usera (regula z `coding-rules.md` §8).
- Nie tworzyc abstrakcji "na przyszlosc" — abstrakcja od 2+ uzyc.
- Nie modyfikowac `PLAN.md` (read-only reference).
- Nie commitowac `summary.md` (gitignored, lokalny scratchpad).
