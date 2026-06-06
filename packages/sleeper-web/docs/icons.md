# PWA Icons

Wygenerowane automatycznie z `packages/sleeper-app/assets/images/icon.png` (1024×1024) przez `sips` (macOS) w trakcie IU11 (PWA shell).

## Pliki

- `icon-192.png` (192×192) — PWA manifest, Android home screen.
- `icon-512.png` (512×512) — PWA manifest, splash screen, Android adaptive icon.
- `apple-touch-icon.png` (180×180) — iOS Safari "Add to Home Screen", linkowany w `+html.tsx`.

## Jak wygenerowac od nowa (macOS)

```bash
SRC=packages/sleeper-app/assets/images/icon.png
sips -z 192 192 $SRC --out packages/sleeper-web/public/icons/icon-192.png
sips -z 512 512 $SRC --out packages/sleeper-web/public/icons/icon-512.png
sips -z 180 180 $SRC --out packages/sleeper-web/public/icons/apple-touch-icon.png
```

## Linux / cross-platform

```bash
# Wymaga ImageMagick: brew install imagemagick / apt install imagemagick
convert $SRC -resize 192x192 packages/sleeper-web/public/icons/icon-192.png
convert $SRC -resize 512x512 packages/sleeper-web/public/icons/icon-512.png
convert $SRC -resize 180x180 packages/sleeper-web/public/icons/apple-touch-icon.png
```

## Custom icon

Jesli chcesz uzyc innego obrazka (np. dedicated PWA brand asset):

1. Zastap source: 1024×1024 PNG, RGBA, square.
2. Re-run komendy z sekcji "Jak wygenerowac od nowa".
3. Sprawdz `purpose: "any maskable"` w `manifest.json` — Android wymaga ~10% safe-area paddingu w srodku ikony (logo powinno miescic sie w wewnetrznym kole 80% szerokosci) zeby maskable display nie obcial waznych elementow.

## Maskable icons — czy potrzeba dedicated assets?

Aktualnie uzywamy tej samej ikony jako `purpose: "any maskable"` — Android moze obcinac
rogi w trybie adaptive. Jesli zauwazysz obciecie na Androidach (Pixel/Samsung), wygeneruj
dedicated maskable z paddingiem przez https://maskable.app/.
