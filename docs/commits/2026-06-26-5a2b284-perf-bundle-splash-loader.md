# 5a2b284: perf(web): -40% bundla (lucide tree-shake) + splash/loader przy starcie (0.8.0)

**Data:** 2026-06-26
**Branch:** main
**Faza zadania:** n/a (ad-hoc perf + UX startu, zgloszenie usera: "wolno laduje sie na telefonie, ekran skacze")

## Co zostalo zrobione

### Etap 1 — dieta bundla
- Zdiagnozowano (sourcemap + analiza kompozycji): bundle 4.45 MB raw, gdzie
  `lucide-react-native` = 1.3 MB (~20%) bo wciagal WSZYSTKIE ~1500 ikon
  (app uzywa 16). Przyczyna: `config.resolver.alias` (`lucide-react-native` ->
  `lucide-react`) byl cicho ignorowany przy `expo export`, bo przeslanial go
  custom `resolver.resolveRequest` (ten od zustand). To ten sam pattern co
  `learned-patterns.md`: `resolveRequest` > `resolver.alias`.
- Fix: `src/lib/icons.ts` — centralny barrel z deep-importami per-ikona
  (`lucide-react/dist/esm/icons/<kebab>`), tree-shake'owalny. 11 plikow
  przepiete z `'lucide-react-native'` na `'@/lib/icons'`. Martwy alias usuniety
  z `metro.config.js`. Ambient typy: `src/types/lucide-deep-imports.d.ts`
  (lucide-react typuje tylko glowny barrel).
- date-fns (523 KB) sprawdzony — deep-import dal 0 zysku (304 -> 304 moduly;
  waga pochodzi z faktycznie uzywanej `format`), wiec przywrocony do oryginalu.
  Redukcja wymagalaby przepisania na `Intl` (ryzyko regresji formatowania PL) —
  swiadomie odlozone.
- Wynik: **4.45 MB -> 2.67 MB raw (-40%), brotli 604 -> 480 KB (-21%)**.

### Etap 2 — loader + koniec "skakania"
- Inline splash w `public/index.html` (czysty HTML+CSS, wewnatrz `#root`):
  "oddychajacy ksiezyc" + napis Sleeper, widoczny od pierwszej klatki (T0),
  zanim 2.5 MB bundla sie sparsuje. Respektuje `prefers-color-scheme` i
  `prefers-reduced-motion`. React (createRoot) zastepuje go przy montazu.
- `src/components/AppLoader.tsx` (reanimated) — wizualnie bliznaczy, renderowany
  podczas `status === 'loading'` zamiast golego `null` w `(app)/_layout.tsx` i
  `(auth)/_layout.tsx`. Bezszwowe przejscie HTML splash -> React, zero blank-gap,
  zero skoku ekranu.
- `preconnect` + `dns-prefetch` do Supabase w `<head>` — handshake rownolegle z
  parsowaniem bundla, nie dopiero przy pierwszym auth-request.

### Wersja
- Bump 0.7.0 -> 0.8.0 (app.json + package.json + `public/changelog.json` wpis
  v:8), zgodne z invariantem version-sync.

## Zmienione pliki
- `src/lib/icons.ts` — NOWY, barrel deep-importow ikon
- `src/types/lucide-deep-imports.d.ts` — NOWY, ambient typy deep-importow
- `src/components/AppLoader.tsx` — NOWY, pelnoekranowy loader (oddychajacy ksiezyc)
- `metro.config.js` — usuniety martwy alias lucide
- `public/index.html` — inline splash (CSS + markup w #root) + preconnect Supabase
- `src/app/(app)/_layout.tsx`, `src/app/(auth)/_layout.tsx` — `<AppLoader/>` zamiast `null`
- 11 plikow (settings/profile/history/changelog/_layout, ThemeModeBottomSheet,
  BigActionButton/HomeHeader/QuickActions/SessionListItem/IconButton) —
  import ikon `'lucide-react-native'` -> `'@/lib/icons'`
- `app.json`, `package.json`, `public/changelog.json` — bump 0.8.0

## Powod / kontekst
Zgloszenie usera: wolny cold start na telefonie + pusty, "skaczacy" ekran przy
wejsciu. Pomiar wskazal dwa niezalezne problemy: (1) rozmiar bundla zdominowany
przez nietree-shake'owany lucide, (2) brak loadera + `null` podczas auth ->
blank screen i layout shift. Oba zaadresowane. Odchylenie od pierwotnego planu:
date-fns mial byc czescia diety, ale pomiar pokazal 0 zysku -> wycofany.

## Walidacja
- typecheck: PASS (`tsc --noEmit`, 0 bledow)
- lint: PASS (`expo lint`)
- test: PASS (`vitest run`, w tym invariant version-sync)
- build: PASS (`expo export` -> dist/, splash obecny w dist/index.html wewnatrz #root)
- runtime: Playwright na zbudowanym dist — sign-in renderuje poprawnie, 0 bledow
  konsoli (deep-importy lucide dzialaja w runtime). Pelny test odczuwalnej
  szybkosci z zainstalowanego PWA — po deployu (SW cache).
