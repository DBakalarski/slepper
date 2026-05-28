---
name: new-module
description: Scaffold a new pure-function module in src/ together with its paired test file in tests/, following Sleeper Machine conventions (pure functions, branded units, explicit now, no mutation).
disable-model-invocation: true
---

# new-module

Tworzy parę plików dla nowego modułu algorytmu:

- `src/<name>.ts` — pure function z brandowanymi jednostkami i jawnym `now`.
- `tests/<name>.test.ts` — paired test z deterministycznym `now`.

## Argumenty

- `<name>` (wymagane) — nazwa modułu w camelCase, np. `wakeWindow`, `alignment`, `napPlanner`.
- Opcjonalnie podkatalog: `math/foo` → `src/math/foo.ts` + `tests/math/foo.test.ts`.

## Procedura

1. Sparsuj nazwę z argumentu. Jeśli zawiera `/`, traktuj prefiks jako podkatalog.
2. Sprawdź, czy `src/<name>.ts` lub `tests/<name>.test.ts` już istnieją — jeśli tak, przerwij z komunikatem.
3. Skopiuj `templates/module.ts.tmpl` → `src/<name>.ts`, podstawiając:
   - `__MODULE_NAME__` → camelCase nazwa modułu.
   - `__PASCAL_NAME__` → PascalCase wariant na typ.
4. Skopiuj `templates/module.test.ts.tmpl` → `tests/<name>.test.ts`, z tymi samymi podstawieniami i poprawnym `import` (uwzględnij głębokość podkatalogu, np. `../../src/math/foo.ts`).
5. Wypisz user'owi:
   - utworzone ścieżki,
   - przypomnienie, że hook `purity-guard` blokuje `Date.now()` / `new Date()` / `class` / `interface` w `src/`,
   - propozycję uruchomienia paired vitesta od razu (`pnpm exec vitest run tests/<name>.test.ts`).

## Pamiętaj

- **Nie** uruchamiaj `pnpm test` ani innych komend bez prośby usera.
- **Nie** edytuj istniejących plików w ramach tej skilli — to scaffolder, nie refactor.
- Jeśli nazwa wygląda na duplikat istniejącego konceptu (np. `nap` przy istniejącym `napPlanner`), zwróć uwagę użytkownikowi przed utworzeniem.
