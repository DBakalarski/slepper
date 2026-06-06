# fcace8a: fix(sleeper-web): safe-area tab baru przez CSS env() zamiast useSafeAreaInsets

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (4th followup — JS useSafeAreaInsets nie dzialal na web PWA)

## Co zostalo zrobione

Po 19cf5e0 (useSafeAreaInsets -> tabBarStyle) user nadal widzial wolna przestrzen pod tab barem na iOS PWA. Font fix zadzialal, tylko tab bar.

Root cause znaleziony przez analize zrodel:
- `@react-navigation/bottom-tabs/src/views/BottomTabBar.tsx:378` JUZ aplikuje `paddingBottom: insets.bottom` do tab baru (`div[role="tablist"]`, linia 392) automatycznie.
- `insets` pochodzi z `SafeAreaInsetsContext` (BottomTabView.tsx:206).
- `react-native-safe-area-context/src/NativeSafeAreaProvider.web.tsx` mierzy `env(safe-area-inset-*)` tworzac ukryty element `position:fixed; width:0; height:0; visibility:hidden; overflow:hidden` (linie 110-117) i czytajac `getComputedStyle().paddingBottom`.
- **Safari w iOS PWA standalone zwraca `0px` dla env() na takim zero-size hidden elemencie** -> `useSafeAreaInsets().bottom = 0` -> react-navigation nie rozszerza tab baru -> gap.

Fix: aplikujemy `env(safe-area-inset-bottom)` bezposrednio na realnie renderowanym elemencie tab baru CSS-em. Safari liczy env() poprawnie na widocznym, renderowanym elemencie (inaczej niz na hidden zero-size measuring elemencie).

## Zmienione pliki

- `packages/sleeper-web/src/app/(app)/_layout.tsx` — revert `useSafeAreaInsets` import + hook + height/paddingBottom; zostaje tylko explicit `tabBarStyle` bg light (`#F5F0E8`) / dark (`#0F0D26`)
- `packages/sleeper-web/public/index.html` — `div[role="tablist"] { box-sizing: content-box !important; padding-bottom: env(safe-area-inset-bottom) !important }`. content-box bo RN-Web default to border-box (padding nie zwiekszalby wysokosci); !important bije inline `padding-bottom: 0` od react-navigation
- `packages/sleeper-web/public/sw.js` — bump `CACHE_NAME` v4 -> v5

## Powod / kontekst

Trzy poprzednie proby (env padding bez box-sizing, box-sizing+light bg, useSafeAreaInsets) nie zadzialaly. Decydujace bylo przeczytanie zrodla `react-native-safe-area-context` web impl — JS measurement env() na hidden elemencie jest zawodny w iOS PWA. CSS env() na realnym elemencie to jedyna pewna droga na web.

Zaleta: CSS jest inline w `index.html` ktory SW serwuje network-first (sw.js fetch handler, request.mode === 'navigate') — aplikuje sie nawet bez update samego SW, gdy tylko swiezy HTML zostanie pobrany. To wazne bo iOS PWA bardzo opornie aktualizuje service workery.

## Walidacja

- typecheck: PASS
- test: PASS 160/160
- build: PASS, `dist/index.html` zawiera `div[role="tablist"] { box-sizing: content-box !important; padding-bottom: env(safe-area-inset-bottom) !important }`
- runtime: do weryfikacji po push -> Vercel auto-deploy -> user testuje on-device na iOS PWA (wymaga full close PWA z app switchera + reopen, albo delete+reinstall przy uporczywym cache)
