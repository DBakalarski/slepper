# ba87dfe: feat(changelog): banner 'co nowego' po deployu z wymuszonym restartem

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** Poza fazami roadmapu — feature „co nowego po deployu" (spec: `docs/superpowers/specs/2026-06-24-changelog-update-banner-design.md`)

## Co zostalo zrobione
- Po nowym deployu PWA pokazuje banner z krotka lista zmian + przycisk
  „Zrestartuj teraz" (reload → swiezy bundle, bo SW robi skipWaiting) oraz
  „Pozniej" (chowa bez oznaczania jako przeczytane).
- Wejscie po 2+ niewidzianych deployach → scalony komunikat (punkty newest-first,
  cap 6 + „i N innych").
- Wykrywanie: przy otwarciu + powrocie karty do focusu (`visibilitychange`),
  fetch `/changelog.json` z `cache: 'no-store'`. Porownanie max(v) z pliku vs
  `lastSeen` w localStorage — bez pieczenia wersji buildu w JS.
- Tresc changelogu kurowana recznie w `public/changelog.json` (per deploy).

## Zmienione pliki
- `packages/sleeper-web/public/changelog.json` — kurowany changelog (wpis startowy v1: quick-undo).
- `packages/sleeper-web/src/features/changelog/changelog.ts` — czysta logika: `parseChangelog` (walidacja + sort desc), `selectUnseen` (scalanie + cap 6 + extraCount).
- `packages/sleeper-web/src/features/changelog/__tests__/changelog.test.ts` — 7 testow unit.
- `packages/sleeper-web/src/features/changelog/useChangelogUpdate.ts` — hook: fetch no-store na mount + visibilitychange (cleanup), silent catch-up przy pierwszym runie, restart (zapis lastSeen + reload), dismiss (lokalny). localStorage osloniety try/catch.
- `packages/sleeper-web/src/features/changelog/__tests__/useChangelogUpdate.test.ts` — static-invariants (no-store, listener+cleanup, reload, guard localStorage).
- `packages/sleeper-web/src/components/ChangelogBanner.tsx` — prezentacyjny banner (NativeWind, safe-area, 2 przyciski, a11y).
- `packages/sleeper-web/src/components/__tests__/ChangelogBanner.test.ts` — static-invariants.
- `packages/sleeper-web/src/app/(app)/_layout.tsx` — montaz `useChangelogUpdate` + `<ChangelogBanner>` jako overlay (tylko zalogowany shell).
- `packages/sleeper-web/vercel.json` — `changelog.json` wykluczony z SPA rewrite (inaczej zwracal index.html) + header `Cache-Control: no-cache` + content-type JSON.
- `docs/ideation/2026-06-24-roadmap.md` — wpis „poza fazami".

## Powod / kontekst
User chcial po kazdym pushu krotki komunikat co sie zmienilo z przyciskiem
wymuszajacym restart; po wejsciu po 2+ pushach — scalony komunikat.

Kluczowe decyzje (z brainstormingu, spec): porownanie max(v) vs lastSeen zamiast
pieczenia wersji buildu (prostsze, obsluguje scalanie); fetch no-store + wyjatek
w vercel rewrite (krytyczne — bez tego `/changelog.json` → index.html); pierwszy
run = silent catch-up (nowy user nie dostaje sciany historii). `sw.js` bez zmian
(changelog i tak network-only).

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- lint: PASS (`expo lint`)
- test: PASS (`vitest run` — 7 unit + static-invariants hooka i bannera)
- invariants: PASS (`check-no-native-imports.sh` + web-mock)
- build: PASS (`expo export` → dist; zweryfikowano `dist/changelog.json`)
- runtime: do manualnej weryfikacji po deployu — bump `v`, sprawdz banner +
  restart na zainstalowanym PWA.
