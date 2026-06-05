---
title: "expo start uruchomiony z roota monorepo generuje fałszywy tsconfig + bundler error"
date: 2026-05-29
category: build-errors
severity: high
stack:
  - Expo SDK 54
  - expo-router
  - pnpm workspaces
  - TypeScript
tags:
  - monorepo
  - metro-bundler
  - tsconfig
  - path-aliases
  - expo-router
  - stop-hook
status: verified
last_verified: 2026-05-29
---

# expo start z roota monorepo — fałszywy tsconfig i bundler error

## Symptomy

Po przypadkowym uruchomieniu `expo start` (lub jakiejkolwiek komendy Expo CLI) z **roota monorepo** zamiast z `packages/sleeper-app/`:

1. **Metro bundler error:**
   ```
   iOS Bundling failed 234ms node_modules/expo/AppEntry.js (1 module)
   Unable to resolve "../../App" from "node_modules/expo/AppEntry.js"
   > 3 | import App from '../../App';
       |                  ^
   ```

2. **162 fałszywe błędy TypeScript** w stop hooku (`stop-build-check-enhanced.sh`):
   ```
   packages/sleeper-app/src/app/(app)/_layout.tsx(6,25): error TS2307: Cannot find module '@/features/auth/AuthProvider'
   packages/sleeper-app/src/app/(app)/_layout.tsx(10,24): error TS2307: Cannot find module '@/lib/colors'
   ... (×162)
   ```

3. **Nowe untracked artefakty w roocie projektu:**
   - `/sleeper/.expo/` (devices.json, README.md)
   - `/sleeper/tsconfig.json` z `{"compilerOptions": {}, "extends": "expo/tsconfig.base"}`

## Root Cause

Dwie powiązane przyczyny generujące osobne symptomy z tej samej akcji:

**(a) Bundler error.** Expo CLI uruchomione z katalogu BEZ `package.json` z polem `"main": "expo-router/entry"` (root monorepo ma `package.json` z `"name": "sleeper-monorepo"` bez `main`) — Metro fall-backuje na default entry `node_modules/expo/AppEntry.js`, który robi `import App from '../../App'`. W monorepo `node_modules/` jest w roocie, więc `../../App` szuka pliku poza katalogiem projektu → unresolved.

**(b) 162 false-positive TS errors.** Expo CLI auto-generuje `tsconfig.json` w roocie z `extends: "expo/tsconfig.base"` ale BEZ path aliasów `@/*`. Stop hook (`.claude/hooks/stop-build-check-enhanced.sh`) sprawdza istnienie `$PROJECT_DIR/tsconfig.json` i uruchamia `npx tsc --noEmit` z roota. Tsc widzi pliki `packages/sleeper-app/src/**/*.tsx` z importami `@/features/...` i nie znajduje aliasów (są zdefiniowane tylko w `packages/sleeper-app/tsconfig.json:6-11`).

## Rozwiązanie

### 1. Usuń auto-wygenerowane artefakty z roota

```bash
rm tsconfig.json
rm -rf .expo/
```

Sprawdź że żadne nie były w git (`git status` przed usunięciem) — powinny być untracked (`??`).

### 2. Uruchamiaj Expo **wyłącznie** przez pnpm filter z roota

```bash
# Z roota monorepo:
pnpm app:dev        # alias dla: pnpm --filter sleeper-app start
pnpm app:ios        # alias dla: pnpm --filter sleeper-app ios
pnpm app:android    # alias dla: pnpm --filter sleeper-app android

# Albo wejdź do package:
cd packages/sleeper-app && pnpm start
```

**NIGDY:** `expo start` z roota, `npx expo start` z roota.

### 3. Zweryfikuj fix

```bash
pnpm --filter sleeper-app exec tsc --noEmit   # → 0 błędów
ls tsconfig.json .expo                          # → No such file or directory
```

Stop hook teraz robi `exit 0` (line 25-27 hooka: `if [ ! -f "$PROJECT_DIR/tsconfig.json" ]; then exit 0; fi`).

## Komendy diagnostyczne

```bash
# Czy w roocie pojawił się fałszywy tsconfig?
ls -la tsconfig.json .expo 2>&1

# Co jest w wygenerowanym tsconfig (jeśli istnieje):
cat tsconfig.json  # spodziewane: {"compilerOptions":{},"extends":"expo/tsconfig.base"} = fałszywy

# Properly resolved entry point:
cat packages/sleeper-app/package.json | grep '"main"'  # "main": "expo-router/entry"

# Where path aliases live:
cat packages/sleeper-app/tsconfig.json | grep -A 6 paths

# Stop hook logic (wykrywanie root tsconfig):
head -30 .claude/hooks/stop-build-check-enhanced.sh
```

## Zapobieganie

1. **Mental model:** w monorepo `packages/*` Expo CLI ZAWSZE uruchamiana per-package, nigdy z roota. Root `package.json` jest tylko orkiestratorem dla pnpm workspaces.

2. **Skrypty proxy w root `package.json`** już istnieją (`app:dev`, `app:ios`, `app:android`) — używaj ich zamiast bezpośredniego `expo` / `npx expo`.

3. **Jeśli ponownie pojawi się root `.expo/` lub root `tsconfig.json` jako untracked** — sygnał że ktoś (Ty albo skill) uruchomił Expo CLI z roota. Usuń artefakty od razu, nie commituj.

4. **Stop hook design implication:** hook robi `exit 0` jeśli brak `tsconfig.json` w roocie. To celowe — w monorepo z packages/* tsc działa per-package. Jeśli chcesz całościowy typecheck przez stop hook, użyj `pnpm --filter sleeper-app exec tsc --noEmit` zamiast `npx tsc --noEmit` w hooku (wymagałoby modyfikacji `.claude/hooks/stop-build-check-enhanced.sh:42`).

5. **Pattern dla innych workspace'ów** (jeśli powstaną): nigdy nie uruchamiaj CLI frameworka z roota monorepo gdy framework nie wie nic o workspaces — Vite, Next, Expo wszystkie tworzą artefakty w cwd.

## Powiązane

- `CLAUDE.md` → sekcja "Layout repozytorium" i "Walidacja" — dokumentuje że komendy uruchamia się przez `pnpm --filter`
- `.claude/hooks/stop-build-check-enhanced.sh:23-27` — logika skip jeśli brak root `tsconfig.json`
- `packages/sleeper-app/tsconfig.json:5-11` — gdzie żyją path aliasy `@/*`
- `packages/sleeper-app/package.json:3` — `"main": "expo-router/entry"`

## Kontekst

- **Środowisko:** monorepo pnpm workspaces, Expo SDK 54, expo-router ~6.0, TypeScript ~5.9
- **Trigger:** `expo start` uruchomiony z `/Users/dawidbakalarski/Documents/projekty/sleeper/` (root) zamiast z `packages/sleeper-app/`. Może być wynikiem przyzwyczajenia z single-package projektu albo przypadkowej akcji w terminalu.
- **Czas debugowania (pierwsza diagnoza):** ~10 min — bug wyglądał na 162 osobne problemy TS (red herring od stop hooka), ale wszystko to manifestacja jednej akcji.
- **Dlaczego 162 błędy są mylące:** tradycyjny instynkt to "Cannot find module" → naprawiaj importy / instaluj deps. Tu wszystkie 162 są fałszywe — moduły istnieją, tylko tsc z roota nie zna ścieżek do nich. Anty-pattern do uniknięcia: uruchamianie auto-error-resolver bez zrozumienia root cause.
