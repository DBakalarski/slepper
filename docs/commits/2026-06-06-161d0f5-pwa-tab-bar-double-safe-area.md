# 161d0f5: fix(sleeper-web): usun podwojny safe-area inset pod tab barem na PWA

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (bugfix — /bugfix)

## Co zostalo zrobione
- Usuniety CSS hack `div[role="tablist"] { box-sizing: content-box !important; padding-bottom: env(safe-area-inset-bottom) !important }` z `public/index.html`.
- Zaktualizowany nieaktualny komentarz w `tabBarStyle` w `(app)/_layout.tsx`.
- Bump `CACHE_NAME` sw.js v5 -> v6 (zeby zainstalowane PWA pobraly poprawiony HTML).
- Dodany regression guard (static-invariant) w `features/pwa/__tests__/registerSW.test.ts`.

## Zmienione pliki
- `packages/sleeper-web/public/index.html` — usuniety hack na div[role="tablist"], komentarz wyjasnia czemu nie wracac.
- `packages/sleeper-web/public/sw.js` — CACHE_NAME v5 -> v6.
- `packages/sleeper-web/src/app/(app)/_layout.tsx` — komentarz tabBarStyle (bg zostaje, jest potrzebny).
- `packages/sleeper-web/src/features/pwa/__tests__/registerSW.test.ts` — guard: index.html nie zawiera role="tablist" ani padding-bottom: env(safe-area-inset-bottom).

## Powod / kontekst
3. podejscie do tego samego buga (po 19cf5e0, fcace8a). Root cause zweryfikowany w zrodlach: react-navigation/bottom-tabs@7.16.2 JUZ obsluguje iOS PWA home-indicator safe-area na web (`getTabBarHeight` = TABBAR_HEIGHT + insets.bottom; outer container paddingBottom: insets.bottom), a safe-area-context@5.6.2 realnie mierzy `env(safe-area-inset-bottom)` na web (NativeSafeAreaProvider.web.js). CSS hack celowal w `div[role="tablist"]` = wewnetrzny rzad przyciskow (nie outer pasek), dodajac DRUGI inset + content-box psujacy box-model -> pusty kremowy pas pod ikonami. Poprzedni wniosek "insets=0 na web" byl prawdopodobnie artefaktem stale SW cache.

## Walidacja
- typecheck: PASS (tsc --noEmit w web:build:check)
- lint: PASS (expo lint)
- test: PASS (161 testow; guard failowal przed fixem, przeszedl po)
- build: PASS (expo export -> dist)
- runtime: WYMAGA weryfikacji na realnym iPhone (env(safe-area) nie emuluje sie w Chromium) — odinstalowac + reinstall PWA dla swiezego SW.
