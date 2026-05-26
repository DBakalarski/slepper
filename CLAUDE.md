# Sleeper — projekt

Aplikacja mobilna (iOS + Android) do trackowania snu i okien aktywnosci dziecka. Solo dev, Expo + Supabase, sync miedzy dwoma telefonami od dnia 1.

## Expo SDK 54 — LOCK

Project jest zablokowany na **Expo SDK 54** (downgrade z 56 dla Expo Go App Store compatibility — patrz `docs/commits/2026-05-26-12bffeb-sdk54-downgrade.md`). NIE podnosic bez explicit user approval.

Przed pisaniem kodu Expo: przeczytaj wersjowane docs https://docs.expo.dev/versions/v54.0.0/.

## Layout repozytorium

```
sleeper/                          # ← root (TEN katalog)
├── CLAUDE.md                     # ← ten plik
├── PLAN.md                       # wysokopoziomowy plan techniczny (read-only reference)
├── docs/
│   ├── active/mvp-sleep-tracker/ # kontekst + plan + zadania aktualnego MVP
│   └── commits/                  # log commitow (jeden plik per commit, OBOWIAZKOWE)
├── .claude/
│   ├── rules/                    # coding-rules.md, learned-patterns.md
│   ├── docs/dev-pipeline.md      # opis pipeline'u skilli dev-*
│   ├── agents/                   # custom subagenty
│   ├── hooks/                    # error-handling, stop-build-check
│   └── skills/                   # dev-brainstorm, dev-plan, dev-docs, code-review itd.
└── sleeper-app/                  # ← KOD aplikacji Expo
    ├── src/app/                  # routes (expo-router, file-based)
    ├── src/lib/                  # supabase.ts, query-client.ts
    └── ...
```

**Wazne:** kod aplikacji zyje w `sleeper-app/`. Komendy `npm/expo/tsc` uruchamiaj z `sleeper-app/`. `docs/` i `.claude/` zostaja w roocie i sa wspolne.

## Aktualny stan (2026-05-26)

- **Branch:** `feature/mvp-sleep-tracker`
- **Faza:** Faza 0 zamknieta (scaffold + SDK54 downgrade + health probe), trwa przygotowanie Fazy 1 (Auth + rodzina)
- Aktualne zadania: `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-zadania.md`

## Stack (zainstalowany — sprawdzone w `sleeper-app/package.json`)

| Warstwa | Wybor | Wersja |
|---|---|---|
| Framework | Expo (RN + TS) | SDK **54** (lock) |
| Routing | expo-router | ~6.0 |
| Stylowanie | NativeWind v4 + Tailwind v3.4 | v3.4 bo `nativewind@4.2` peer dep oczekuje Tailwind >3.3, NIE v4 |
| State (server) | TanStack Query | ^5.100 |
| State (UI) | Zustand | ^5.0 |
| Backend | @supabase/supabase-js | ^2.106 (AsyncStorage persistence, URL polyfill) |
| Daty | date-fns + date-fns-tz | UTC w bazie, `Europe/Warsaw` w UI |
| TS | strict ON | path alias `@/*` -> `./src/*` |

**Jeszcze NIE zainstalowane** (dochodzi w kolejnych fazach): `expo-notifications`, `expo-keep-awake`, features/ z hookami sesji, Supabase migracje (`supabase/` katalog).

**Uwaga ws. struktury routingu:** plan w `PLAN.md` zaklada `app/` w roocie, ale template SDK trzyma routes w `src/app/`. Funkcjonalnie identyczne, alias `@/*` to obsluguje.

## Konwencje specyficzne dla domeny

- **Timer = derived state**: czytaj `start_at` z `sessions where end_at is null`, renderuj przez `setInterval`. NIE zapisuj running counter w bazie.
- **`end_at = null`** = sesja w toku. Max jedna na dziecko (partial unique index w migracji).
- **Realtime**: event z Supabase -> `queryClient.invalidateQueries(['sessions'])`. NIE patchuj cache recznie.
- **Strefa czasowa**: zawsze UTC (`timestamptz`) w bazie, zawsze `Europe/Warsaw` przy formatowaniu.
- **Optimistic updates** tylko dla START/STOP sesji (najczestsza akcja). Edycja historii — bez optimistic.
- **Tabs**: `Tabs` z `expo-router` (nie `NativeTabs` — wymaga PNG ikon per tab, polish ikon = Faza 6).

## Walidacja (uruchom w `sleeper-app/` PRZED deklaracja "gotowe")

```bash
npx tsc --noEmit     # typecheck — musi byc 0 bledow
npm run lint         # expo lint
# testy: brak setupu (Vitest/Jest dojdzie kiedy bedzie potrzebny)
```

Runtime: `npx expo start` -> QR -> Expo Go na fizycznym urzadzeniu. Symulator iOS wymaga Maca z Xcode.

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
- Nie mieszac package managerow (uzywamy `npm`).
- Nie instalowac nowych zaleznosci bez poinformowania usera (regula z `coding-rules.md` §8).
- Nie tworzyc abstrakcji "na przyszlosc" — abstrakcja od 2+ uzyc.
- Nie modyfikowac `PLAN.md` (read-only reference).
- Nie commitowac `summary.md` (gitignored, lokalny scratchpad).
