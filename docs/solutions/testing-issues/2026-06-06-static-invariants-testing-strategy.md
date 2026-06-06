---
title: "Strategia testów `static-invariants` zamiast jsdom + RNTL dla web parity"
date: 2026-06-06
category: testing-issues
severity: medium
stack:
  - Vitest
  - React Native Web
  - Expo SDK 54
tags:
  - testing-strategy
  - static-analysis
  - regression-tests
  - jsdom
  - rntl
status: verified
last_verified: 2026-06-06
---

# Strategia testów `static-invariants` zamiast jsdom + RNTL

## Symptomy

- Konfiguracja `jsdom` + `@testing-library/react-native` + mock `react-native-web` zżera kilka dni na setup (transformery TSX, ESM/CJS interop, asetMock, gesture handler mock).
- Setup giga-wrażliwy na bump Expo SDK / RNW — każdy upgrade łamie testy nie kodu.
- Coverage rośnie ale testy łapią głównie regresje styling/render, nie regresje architektury (memory leaks, wrong queryKey, missing cleanup).
- Bariera do napisania nowego testu wysoka → developerzy omijają testowanie nowych komponentów.

## Root Cause

Pełna pipeline'a render testów dla React Native Web jest enterprise-grade i niewspółmierna do solo dev / małego zespołu. Większość regresji architektury (queryKey instability, brak cleanup w `useEffect`, dependency array, `Platform.OS` guard, error boundary) jest **wykrywalna statycznie** z samego pliku źródłowego.

## Rozwiązanie

**Strategia `static-invariants`**: czytaj plik przez `readFileSync` i grep pod kątem invariants. Niska bariera, szybkie, łapie regresje architektury.

```ts
// tests/static-invariants/home-screen.test.ts
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import path from 'node:path';

const FILE = path.join(__dirname, '../../src/app/(app)/home.tsx');
const source = readFileSync(FILE, 'utf-8');

describe('home.tsx static invariants', () => {
  it('queryKey is stable (no inline new Date() / Date.now())', () => {
    // Match queryKey: [...] z inline new Date() lub Date.now()
    const inlineDate = /queryKey:\s*\[[^\]]*\b(new Date\(\)|Date\.now\(\))/;
    expect(source).not.toMatch(inlineDate);
  });

  it('useEffect with setInterval has cleanup', () => {
    if (!/setInterval\(/.test(source)) return; // skip jeśli brak
    expect(source).toMatch(/clearInterval\(/);
  });

  it('useEffect dependency array is present (no missing array)', () => {
    // Match useEffect(() => {...}) BEZ drugiego argumentu — heurystyka
    const missingDeps = /useEffect\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*\)(?!\s*,)/s;
    expect(source).not.toMatch(missingDeps);
  });

  it('no raw Alert.alert (must go through lib/confirm.ts)', () => {
    expect(source).not.toMatch(/Alert\.alert\(/);
  });

  it('no raw useColorScheme from react-native (must use useEffectiveTheme)', () => {
    expect(source).not.toMatch(/from\s+['"]react-native['"][^;]*useColorScheme/);
  });

  it('error path is handled (try/catch lub .catch())', () => {
    const hasAsync = /async\s+(function|\()/.test(source);
    if (!hasAsync) return;
    expect(source).toMatch(/try\s*\{|\.catch\(/);
  });
});
```

**Kiedy używać static-invariants vs RNTL:**

| Test target | Strategia |
|---|---|
| queryKey stability, cleanup, deps array | **static-invariants** (grep) |
| Platform.OS guards na native-only API | **static-invariants** (grep) |
| Architektura komponentu (props, hooks order) | **static-invariants** (AST jeśli regex za słabe) |
| Logika biznesowa (utils, reducers, algorytm) | **vitest unit** (pure functions) |
| User flow (click → state change → render) | **RNTL** (tylko critical paths) |
| Visual regression | **manual + screenshot** (Maestro / Playwright) |

## Komendy diagnostyczne

```bash
# 1. Uruchom tylko static invariants:
pnpm --filter sleeper-web exec vitest run tests/static-invariants

# 2. Watch mode podczas dev:
pnpm --filter sleeper-web exec vitest watch tests/static-invariants

# 3. Sprawdź coverage invariantów na nowym pliku:
grep -rE "(queryKey|setInterval|useEffect|Alert\.alert)" src/app/<new-screen>.tsx
```

## Zapobieganie

- Dla każdego krytycznego pliku (`app/(app)/*.tsx`, `features/*/hooks.ts`) dodaj 1 plik `tests/static-invariants/<name>.test.ts` z 3-6 grepami pod regresje architektury.
- NIE używaj static-invariants dla logiki biznesowej — to source-of-truth dla wzorców, nie dla correctness. Logika = vitest unit + algorytm tests (`sleeper-machine/`).
- Gdy regex robi się skomplikowany (>3 alternacje, lookahead) — przepisz na AST przez `@typescript-eslint/parser` lub custom ESLint rule. Static-invariants ma być prosty.
- Konwencja nazewnicza: `tests/static-invariants/<source-file-slug>.test.ts` → łatwo znaleźć który plik testowany.
- Dodaj static-invariants do CI gate — szybkie (1-2s na 100 invariantów), niski koszt utrzymania.

## Powiązane

- `packages/sleeper-web/tests/static-invariants/` — implementacje
- Powiązany pattern: `learned-patterns.md` → "TanStack Query stabilny queryKey przez useMemo"
- ESLint custom rules jako alternatywa: [Writing custom rules](https://eslint.org/docs/latest/extend/custom-rules)

## Kontekst

- Środowisko: Expo SDK 54 (RN + RNW), vitest 2.x.
- Strategia wypracowana po nieudanej próbie pełnego setup'u jsdom+RNTL+react-native-web mock — koszt 2 dni, brak ROI dla solo dev.
- Filozofia: testy mają łapać regresje, nie potwierdzać że render się skończył.
- Granica: NIE używaj static-invariants do testowania logiki biznesowej — to lint na sterydach, nie unit test.
