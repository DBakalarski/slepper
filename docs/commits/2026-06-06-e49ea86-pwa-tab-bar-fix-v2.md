# e49ea86: fix(sleeper-web): wzmocniony fix wolnej przestrzeni pod tab barem + bump SW cache

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (followup do e926490 — pierwszy fix nie zadzialal w pelni)

## Co zostalo zrobione

Pierwszy fix (e926490) dodal `div[role="tablist"] { padding-bottom: env(safe-area-inset-bottom) }`, ale wolna przestrzen pod tab barem byla nadal widoczna. Trzy przyczyny:

1. **RN-Web uzywa `box-sizing: border-box`** — `padding-bottom` ZMNIEJSZA content area, nie ZWIEKSZA height. Tab bar siedzi na fixed 49px, pod nim w viewport widac body bg cream.
2. **Light mode `tabBarStyle: undefined`** — default w react-navigation web to biale tlo, kontrastuje z body cream `#F5F0E8` -> widoczna granica.
3. **Stary SW** mogl serwowac cached HTML pierwszej wersji (z `body bg #0F0F1A` zamiast `#0F0D26`).

Fixy:
- `_layout.tsx`: explicit light mode `tabBarStyle: { backgroundColor: '#F5F0E8', borderTopColor: '#E5DDD0' }`
- `index.html`: `box-sizing: content-box !important` + `padding-bottom !important` na `div[role="tablist"]` — wymusza ze padding zwieksza wysokosc, tab bar bg wypelnia safe-area
- `sw.js`: bump `CACHE_NAME` `sleeper-shell-v2` -> `v3` — browser wykrywa nowa wersje SW, install -> skipWaiting -> activate -> clients.claim, stary cached HTML jest usuwany

## Zmienione pliki

- `packages/sleeper-web/src/app/(app)/_layout.tsx` — light mode tabBarStyle explicit (zamiast undefined)
- `packages/sleeper-web/public/index.html` — `box-sizing: content-box !important` na tab barze
- `packages/sleeper-web/public/sw.js` — `CACHE_NAME` bump v2 -> v3

## Powod / kontekst

User zglosil ze po pierwszym fixie (e926490) wolna przestrzen pod tab barem caly czas jest. Diagnoza: padding-bottom z box-sizing: border-box nie zwieksza height tab baru. Bumpniecie CACHE_NAME gwarantuje ze stary SW (jesli byl wczesniej zainstalowany z innym strategiem cache) zostanie wymieniony i nowy HTML/CSS bedzie serwowany.

Plus user pyta jak wymusic update PWA na iOS — bump CACHE_NAME to glowny techniczny mechanizm; manualne kroki dla usera w odpowiedzi konwersacyjnej.

## Walidacja

- typecheck: PASS
- test: PASS 160/160 (invariant SW cache name uzywa regex `v\d+`, v3 pasuje)
- build: PASS
- runtime: do weryfikacji po push -> Vercel auto-deploy -> user testuje on-device na iOS PWA (po wymuszeniu update)
