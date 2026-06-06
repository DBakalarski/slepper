# 2203201: fix(sleeper-web): status-bar-style default — pelna wysokosc webview na iOS PWA

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (bugfix — /bugfix)

## Co zostalo zrobione
- Zmiana `apple-mobile-web-app-status-bar-style` z `black-translucent` na `default` w `public/index.html`.
- Bump `CACHE_NAME` sw.js v6 -> v7 (zeby zainstalowane PWA pobraly HTML z nowym meta po deployu).
- Guard test (static-invariant) zaktualizowany: asercja `status-bar-style content="default"` + brak `black-translucent`.
- Komentarz dark body bg w index.html uproszczony (bylo obejscie na pas — teraz tylko anti-FOWT).

## Zmienione pliki
- `packages/sleeper-web/public/index.html` — status-bar-style default; komentarz dark bg.
- `packages/sleeper-web/public/sw.js` — CACHE_NAME v6 -> v7.
- `packages/sleeper-web/src/features/pwa/__tests__/registerSW.test.ts` — guard: default zamiast black-translucent.

## Powod / kontekst
4. (i ostateczne) podejscie do buga "pusty kremowy pas pod tab barem na iOS PWA" (po
19cf5e0, fcace8a, 161d0f5). Poprzednie 3 proby celowaly w padding/safe-area tab baru —
blednie. Diagnoza on-device (tymczasowy overlay czytajacy realne liczby z iPhone 16 Pro):

- `bar css h=83px pb=34px`, `bar rect bot=812` — tab bar IDEALNY, flush do dolu viewportu.
- `env(safe-bottom)=34px` — inset poprawny.
- **`innerH=812  screenH=874`** — webview o 62px KROTSZY niz ekran. 62px = gorny inset
  Dynamic Island. Po reload: `innerH=874`, pas znikal.

Root cause: `black-translucent` + `viewport-fit=cover` powodowal ze iOS standalone PWA
startuje z natywna ramka webview = ekran minus gorny inset (812px), zakotwiczona u gory ->
brakujace 62px ladowaly jako pusty pas pod tab barem (kolor tla PWA = kremowy). Zadna
jednostka CSS (dvh/lvh/vh) nie domaluje tego, bo native frame jest fizycznie krotka przy
launch; dvh dochodzilo do 874 dopiero po reflow/reload. `default` kotwiczy webview POD
statusbarem -> pelna wysokosc (zakotwiczona poprawnie, siega dolu) od pierwszego malowania.
Gora bez regresji: kazdy ekran uzywa `SafeAreaView` (insets.top), ktory przy `default`
dostaje 0 i nie dubluje paddingu. User potwierdzil on-device ("tak jest dobrze").

User potwierdzil tez powtarzalnosc: KAZDY cold-launch startowal z 812 (stad "caly czas").

## Walidacja
- typecheck: PASS (web:build:check)
- lint: PASS
- test: PASS (guard zaktualizowany: black-translucent -> default; failowal przed zmiana meta)
- build: PASS (expo export -> dist)
- runtime: POTWIERDZONE on-device na iPhone (standalone PWA, cold-launch) — pas zniknal,
  tab bar dotyka dolu, gora OK.
