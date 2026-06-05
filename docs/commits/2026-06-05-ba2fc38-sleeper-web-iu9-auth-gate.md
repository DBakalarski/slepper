# ba2fc38: feat(sleeper-web-pwa): IU9 auth gate — root layout sync z sleeper-app + usun placeholder

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 3 (UI & Routes) — IU9

## Co zostalo zrobione

- Root `_layout.tsx` zsynchronizowany 1:1 z sleeper-app: import `queryClient` + `setupFocusManager` z `lib/query-client`, `configureNotificationHandler()` wolany modulowo (no-op na web), `SafeAreaProvider` wewnatrz `RootLayoutContent`
- Usuniety placeholder `src/app/index.tsx` ("Coming soon") — `(app)/index.tsx` staje sie root route po usunieciu (expo-router non-group priority resolved)
- Auth gate dziala dwustronnie:
  - `(auth)/_layout.tsx` (IU3): `signed_in` → `<Redirect href="/" />`
  - `(app)/_layout.tsx` (IU10 copy): `signed_out` → `<Redirect href="/sign-in" />`

## Zmienione pliki

- `packages/sleeper-web/src/app/_layout.tsx` — sync 1:1 z sleeper-app (configureNotificationHandler, setupFocusManager, queryClient)
- `packages/sleeper-web/src/app/index.tsx` — DELETED (placeholder zastapiony przez `(app)/index.tsx` z IU10)

## Powod / kontekst

Faza 3 IU9 (S). Auth gate w expo-router idzie przez (group)/_layout.tsx redirect — sleeper-app ma to juz zaimplementowane, kopia 1:1 daje parytet. Root layout zsynchronizowany zeby uniknac dryftu (`configureNotificationHandler` no-op na web zachowany dla parytetu API).

Adresuje review fazy 1:
- P2.3: queryClient stability (teraz uzywa module-level export z query-client.ts, ktory ma `cacheTime` etc skonfigurowane jak w sleeper-app)
- P2.5: premature `<Stack.Screen name="(app)" />` stub — usuniety, faktyczna implementacja w IU10

## Walidacja

- typecheck: PASS (0 errors)
- lint: PASS (0 warnings)
- test: PASS (82/82)
- build: PASS
- sleeper-app regression: PASS (0 errors)
- runtime: brak (manual test pending)

## Manual test pending

- Niezalogowany user otwiera `/` → redirect `/sign-in`
- Zalogowany user otwiera `/sign-in` → redirect `/`
- `/sign-up` URL dziala standalone
