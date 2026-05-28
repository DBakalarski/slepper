# 3018f78: feat(ui-redesign): faza 0 — design system foundation

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** Faza 0 — Design system foundation (ui-redesign)

## Co zostalo zrobione

- Rozszerzono `tailwind.config.js` o tokeny redesignu:
  - Kolory: `purple-light` `#B8A8D9`, `purple-soft` `#E8DEF7`, `success` `#5A8B6F`, `success-soft` `#D7E5DC`, `orange-soft` `#FBE8DD`, `text-muted` `#6B6580`.
  - `borderRadius`: `card: 20px`, `pill: 999px`.
  - `boxShadow`: `card: 0 4px 12px rgba(30,27,75,0.04)`.
  - `fontFamily`: aliasy `display` i `mono` (system font; faktyczny `font-variant: tabular-nums` ustawia komponent timera w Fazie 6).
  - `darkMode: 'media'` → `'class'` (przygotowanie pod manual override z Fazy 1).
- Utworzono 9 primitives w `sleeper-app/src/components/ui/`:
  - `Avatar.tsx` — kolko z inicjalem (lub `image`), 3 rozmiary, opcjonalny `ringClassName`, accessibilityRole=image.
  - `Card.tsx` — wrapper `rounded-card p-5 shadow-card`, warianty `default` i `gradient` (solid `bg-purple-light`).
  - `Badge.tsx` — pill z wariantami `success | neutral | orange`.
  - `IconButton.tsx` — round button z lucide ikona, prop `accessibilityLabel`, opcjonalny `showDot`.
  - `ProgressBar.tsx` — value 0..1 z clampem, `tintClassName/trackClassName/heightClassName`.
  - `ProgressBarStacked.tsx` — `segments[]` z renormalizacja, flex layout.
  - `ProgressRing.tsx` — SVG (react-native-svg), `value/size/strokeWidth/label`, rotate -90deg (start u gory).
  - `SegmentedControl.tsx` — generyk `<T extends string>`, animacja Reanimated `withTiming` 200ms (bez `withSpring` — kontekst.md ostrzega o zacinaniu na Android).
  - `Switch.tsx` — wrapper na RN `<Switch>` z paleta (purple/purple-soft/cream).
- Utworzono helper `sleeper-app/src/lib/sleep-norms.ts`:
  - `getNormForChild(birthDate, now?)` → `{ minHours, maxHours, label, bucket }` z tabela WHO+AAP hybrid (0-3m 14-17h, 4-12m 12-16h, 1-2y 11-14h, 3-5y 10-13h, + fallback 6+ lat 9-12h dla domknietej funkcji).
  - Pure function, testowalna przez przekazanie `now`.
- Zainstalowano `lucide-react-native@1.17.0` (zatwierdzone przez usera 2026-05-28).
- `react-native-svg@15.15.5` dociagniety TRANZYTYWNIE via lucide — BEZ blokera, bez osobnej instalacji.
- `expo-linear-gradient` SKIPPED (decyzja Fazy 0).

## Zmienione pliki

- `sleeper-app/tailwind.config.js` — dodane kolory, radii, shadows, fontFamily, `darkMode: 'class'`.
- `sleeper-app/package.json` — dodana zaleznosc `lucide-react-native@^1.17.0`.
- `sleeper-app/package-lock.json` — auto-update po `npm i`.
- `sleeper-app/src/components/ui/Avatar.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/Badge.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/Card.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/IconButton.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/ProgressBar.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/ProgressBarStacked.tsx` — nowy primitive.
- `sleeper-app/src/components/ui/ProgressRing.tsx` — nowy primitive (uzywa react-native-svg).
- `sleeper-app/src/components/ui/SegmentedControl.tsx` — nowy primitive (Reanimated).
- `sleeper-app/src/components/ui/Switch.tsx` — nowy primitive.
- `sleeper-app/src/lib/sleep-norms.ts` — nowy helper.
- `docs/active/ui-redesign/ui-redesign-zadania.md` — odhaczone checkboxy Fazy 0.
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — dopisano sekcje "Postep" z notatka o Fazie 0.

## Powod / kontekst

Faza 0 ui-redesign — fundament design system pod Fazy 1-6. Wszystkie decyzje (5 blokerow + dependencies) zatwierdzone przez usera 2026-05-28 przed startem autopilota. Bez tej fazy kolejne fazy nie maja primitives do reuse (Avatar/Card/Badge/ProgressRing/SegmentedControl etc.) ani tokenow tailwind (purple-light, success, text-muted, radii, shadow).

Odchylenia od planu:
- **Brak**. ProgressRing zaimplementowany SVG-em (nie View+transform fragile alternatywa), bo `react-native-svg` byl dociagniety tranzytywnie via `lucide-react-native` — nie wymagal osobnej decyzji usera.
- Checkbox "Walidacja wartosci eye-dropperem na finalnym mockupie/screenie" oraz "Zweryfikowac renderowanie shadow-card na iOS + Android" pozostaja `[ ]` — sa to walidacje on-device/wizualne, naleza do faz 3-7.
- Checkbox "Smoke test: kazdy primitive uzyty raz na ekranie placeholder" pozostaje `[ ]` — primitives realnie konsumowane w Fazach 2-5, dodatkowy placeholder screen byloby YAGNI.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` w `sleeper-app/`, 0 bledow)
- lint: PASS (`npm run lint` w `sleeper-app/`, 0 bledow, 0 warningow)
- test: n/a (brak setupu testowego w projekcie, pure function `getNormForChild` testowalna w Fazie 4/5 gdzie zostanie skonsumowana)
- runtime: nie weryfikowano on-device (primitives bez realnego konsumenta jeszcze, on-device test w Fazach 3-5 + Faza 7 manual checklist)
