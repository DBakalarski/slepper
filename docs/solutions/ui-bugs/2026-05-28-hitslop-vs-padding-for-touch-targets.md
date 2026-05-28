---
title: "Touch target <44pt — użyj `hitSlop` zamiast zwiększać padding/size"
date: 2026-05-28
category: ui-bugs
severity: medium
stack:
  - React Native
  - Expo SDK 54
tags:
  - accessibility
  - touch-target
  - hitSlop
  - ios-hig
  - a11y
status: verified
last_verified: 2026-05-28
---

# Touch target <44pt — użyj `hitSlop` zamiast zwiększać padding/size

## Symptomy

- Code review / a11y audit flaguje touch target <44pt × 44pt (iOS HIG / WCAG 2.5.5 Target Size)
- Małe ikony (np. `IconButton size='sm'` 32×32pt) są trudne do trafienia palcem
- Próby naprawy przez zwiększenie padding lub `size` psują visual layout (ikona/button wygląda na zbyt duży, łamie grid)

## Root Cause

`width` / `height` / `padding` zmieniają WIZUALNY rozmiar elementu (zajmuje więcej miejsca w layoucie). Touch area w RN jest domyślnie równa visual bounds.

`hitSlop` (prop dostępny dla wszystkich Touchable/Pressable w RN) rozszerza touch area **bez zmiany visual layoutu** — element nadal renderuje się 32×32pt, ale akceptuje tapy w obszarze 44×44pt.

## Rozwiązanie

```typescript
// Zła praktyka — psuje visual layout
<Pressable className="w-12 h-12 items-center justify-center">
  <Icon size={20} />
</Pressable>

// Dobra praktyka — visual 32pt, tap area 44pt
<Pressable
  className="w-8 h-8 items-center justify-center"
  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
>
  <Icon size={20} />
</Pressable>
```

Reguła: `hitSlop = (44 - visualSize) / 2` per krawędź. Dla 32pt elementu → 6pt na każdej stronie → effective 44pt.

W `IconButton size='sm'`:

```typescript
export function IconButton({ size = 'md', ...props }: IconButtonProps) {
  const dim = size === 'sm' ? 32 : 44;
  const hitSlop = size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined;
  return (
    <Pressable
      hitSlop={hitSlop}
      style={{ width: dim, height: dim }}
      {...props}
    />
  );
}
```

`hitSlop` można też podać jako number (uniform): `hitSlop={6}`.

## Komendy diagnostyczne

```bash
# Znajdź małe Pressable/Touchable bez hitSlop
grep -rn "w-8\|h-8\|width: 32\|height: 32" sleeper-app/src/components/ | grep -v hitSlop
```

Manual test: VoiceOver/TalkBack focus highlight powinien być widoczny na visual element; tapnięcie ~5pt obok ikony nadal aktywuje action.

## Zapobieganie

- Każdy `Pressable`/`TouchableOpacity` z dim <44pt MUSI mieć `hitSlop`
- Code review checklist: szukaj `w-{1..10}` / `h-{1..10}` na interaktywnych elementach
- Dla `IconButton size='sm'` (i podobnych) hitSlop wbudowany w komponent → developerzy używający komponentu nie muszą o nim pamiętać
- Reguła kciuka: nigdy nie zwiększaj visual size dla a11y; rozszerzaj hitSlop

## Powiązane

- iOS HIG: [Layout — Minimum tappable area 44×44pt](https://developer.apple.com/design/human-interface-guidelines/layout)
- WCAG 2.5.5 Target Size (AAA): 44×44 CSS pixels minimum
- `docs/completed/ui-redesign/ui-redesign-podsumowanie.md` (Faza 6 polish) — pattern zastosowany w `IconButton size='sm'`, settings back button, "Pokaż wszystkie"

## Kontekst

Pattern stosowany w `feature/ui-redesign` (Faza 6 polish + a11y). Dotyczy 3 callsiteów w MVP. Specyficzne dla React Native — w web (HTML/CSS) `hitSlop` nie istnieje, używa się `padding` z `box-sizing: content-box` albo pseudo-elementu `::before` z `inset: -6px`.
