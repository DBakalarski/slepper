# d7fc9c5: feat(sleeper-web): nowa ikona PWA (polksiezyc + iskra) w brandingu Sleeper

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (zgloszenie usera — rebranding ikony PWA)

## Co zostalo zrobione
- Stara ikona PWA (icon-512/192/apple-touch/favicon) byla generycznym
  niebieskim placeholderem (chevron/"A" na #208AEF) — poza paleta Sleeper.
- Nowa ikona: kremowy polksiezyc + pomaranczowa iskra na navy tle (#1E1B4B),
  motyw snu dziecka. Maskable-safe (motyw w centralnym 80% safe zone, tlo
  full-bleed navy). Wybor usera z 3 zaproponowanych wariantow (A/B/C).
- Wszystkie rozmiary (512 / 192 / apple-touch 180 / favicon 48) wyrenderowane
  z jednego zrodla `public/icons/icon.svg` przez `rsvg-convert` — zrodlo
  zacommitowane do repo dla przyszlej regeneracji.
- `theme_color` w manifest oraz `theme-color` (light) w index.html: #208AEF
  -> #1E1B4B (navy z palety). Niebieski byl osierocony po starej ikonie.
  `apple-mobile-web-app-status-bar-style: default` NIETKNIETE — wczesniejszy
  fix wysokosci iOS standalone webview (commit 2203201) zostaje bez zmian.
- `sw.js` CACHE_NAME v7 -> v8: ikony sa serwowane cache-first, a ich nazwy nie
  zawieraja content-hasha, wiec bez bumpu zainstalowane PWA serwowalyby stare
  ikony z cache (pattern: SW HTML network-first / assets cache-first +
  bump per deploy).

## Zmienione pliki
- `packages/sleeper-web/public/icons/icon.svg` — NOWE: zrodlo SVG ikony.
- `packages/sleeper-web/public/icons/icon-512.png` — nowa ikona 512.
- `packages/sleeper-web/public/icons/icon-192.png` — nowa ikona 192.
- `packages/sleeper-web/public/icons/apple-touch-icon.png` — nowa ikona 180.
- `packages/sleeper-web/public/favicon.png` — nowa faviconka 48.
- `packages/sleeper-web/public/manifest.json` — theme_color -> #1E1B4B.
- `packages/sleeper-web/public/index.html` — theme-color (light) -> #1E1B4B.
- `packages/sleeper-web/public/sw.js` — CACHE_NAME sleeper-shell-v8.
- `packages/sleeper-web/src/features/pwa/__tests__/registerSW.test.ts` —
  invarianty theme_color (manifest) + theme-color (index.html) zaktualizowane
  do navy; poprawiony mylacy komentarz ("navy" przy niebieskiej wartosci).

## Powod / kontekst
Zgloszenie usera. Wariant ikony (A — polksiezyc + iskra) wybrany przez usera
sposrod 3 wyrenderowanych propozycji jako najczytelniejszy w kazdym rozmiarze.

## Walidacja
- typecheck: PASS
- test: PASS (`pnpm web:build:check` — 14 test files, 161 testow)
- lint: PASS
- build: PASS (expo export web -> dist/)
- runtime: do weryfikacji przez usera po deploy — "Add to Home Screen" na iOS
  + faviconka w tabie; po deploy odswiezyc zainstalowane PWA (SW v8 czysci
  stary cache).
