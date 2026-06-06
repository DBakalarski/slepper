# 19cf5e0: fix(sleeper-web): tab bar respektuje iOS PWA safe-area przez useSafeAreaInsets

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (3rd followup do e926490 i e49ea86 — CSS-only fix nie dzialal)

## Co zostalo zrobione

Po e926490 i e49ea86 user zglosil ze wolna przestrzen pod tab barem nadal jest. Czcionka OK (font fix zadzialal), ale tab bar nie rozciaga sie do dolnej krawedzi viewport-u w iOS PWA standalone. W przegladarce (Safari tab) jest OK.

Diagnoza: poprzedni CSS-only fix (`div[role="tablist"] { box-sizing: content-box; padding-bottom: env(safe-area-inset-bottom) }`) nie zadzialal — react-navigation/bottom-tabs ma wlasne inline styles ktore override CSS classes (Reanimated/Bottom-Tabs ustawia `style="height: 49px; box-sizing: border-box"` inline).

Fix: zamiast walczyc CSS-em, czytamy insets z `useSafeAreaInsets` (na webie SafeAreaProvider w root layout odczytuje `env(safe-area-inset-*)` przez CSS i exposes do hooka) i ustawiamy `height + paddingBottom` w `tabBarStyle`.

## Zmienione pliki

- `packages/sleeper-web/src/app/(app)/_layout.tsx` — `useSafeAreaInsets` -> `tabBarStyle.height: 60 + insets.bottom`, `tabBarStyle.paddingBottom: insets.bottom`
- `packages/sleeper-web/public/index.html` — usuniety CSS hack `div[role="tablist"] { box-sizing: content-box ... }` (zostal tylko comment z dokumentacja fallbacku)
- `packages/sleeper-web/public/sw.js` — bump `CACHE_NAME` v3 -> v4

## Powod / kontekst

CSS-only podejscie wymaga ze RN-Web pozwala selektorom override inline stylesy — w praktyce react-navigation injectuje styles inline (View `style={[..., heightStyle]}`) ktore biją CSS class. Dlatego trzeba ustawic to przez React API.

Hardcoded `height: 60` (a nie 49 jak default) bo `tabBarItemStyle: { paddingVertical: 6 }` zwiekszal mocno tab bar item. 60 to bezpieczna baza ktora trzyma ikony w komfortowym miejscu, plus `insets.bottom` na home indicator.

## Walidacja

- typecheck: PASS
- test: PASS 160/160
- build: PASS
- runtime: do weryfikacji po push -> Vercel auto-deploy -> user testuje on-device na iOS PWA (po wymuszeniu update — patrz e49ea86 docs)
