# 5117f73: feat(fixy-i-kotki-dwa-algorytm): integracja sleeper-machine-kotki z sleeper-app — adapter + toggle UI

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 5 — Integracja z sleeper-app — adapter + toggle UI

## Co zostało zrobione

- Dodano `sleeper-machine-kotki: workspace:*` do dependencies `sleeper-app/package.json`; `pnpm install` zarejestrował workspace link.
- `features/children/hooks.ts`: `Child` i `UpdateChildInput` rozszerzone o `algorithm: 'galland' | 'kotki_dwa'`; `CHILD_SELECT` + `ChildRow` + `rowToChild` (narrowing string→union) + `useUpdateChild` patch obsługują nowe pole.
- `features/children/components/EditChildForm.tsx`: nowa sekcja "Algorytm rekomendacji" z 2 chipami (Naukowy Galland / Kotki Dwa), opisem i persist przez `updateChild.mutate`.
- `features/recommendation/useSleepRecommendation.ts`: import `recommendKotkiDwa` z `sleeper-machine-kotki`; `ChildForRecommendation` rozszerzony o `algorithm`; dynamiczny wybór funkcji na podstawie `child.algorithm`.
- `app/(app)/index.tsx`: `ActiveChildSectionProps.child` rozszerzony o `algorithm`.

## Zmienione pliki

- `packages/sleeper-app/package.json` — dodano workspace dep sleeper-machine-kotki
- `packages/sleeper-app/src/features/children/hooks.ts` — rozszerzenie Child + UpdateChildInput + rowToChild + CHILD_SELECT + patch
- `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` — nowa sekcja toggle algorytmu
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — import kotki + wybór fn
- `packages/sleeper-app/src/app/(app)/index.tsx` — rozszerzenie ActiveChildSectionProps
- `pnpm-lock.yaml` — aktualizacja po pnpm install

## Powód / kontekst

Faza 5 zadania fixy-i-kotki-dwa-algorytm. Fazy 1-4 ukończone wcześniej. Ta faza łączy nowy package sleeper-machine-kotki (Faza 4) z UI aplikacji — user może teraz wybrać algorytm per dziecko w EditChildForm, a hook useSleepRecommendation automatycznie wybiera odpowiednią funkcję rekomendacyjną.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów)
- lint: PASS (`pnpm --filter sleeper-app lint` — PASS)
- test: n/a (Faza 5 nie ma checkboxów Test:)
- runtime: manual w Expo Go (checklist weryfikacji ręcznej)
