# Performance Polish

> ⚠️ **Stack projektu:** Expo SDK 54 + Hermes engine + react-native-reanimated v4. Mapowania:
> - `transition: all` (anty-pattern) → w RN nie istnieje; ekwiwalent: nie animuj wielu wartości przez Reanimated bez potrzeby (każda animowana wartość = UI thread cost).
> - `will-change` GPU hint → NIE istnieje w RN. Reanimated worklets domyślnie operują na transform/opacity (GPU-friendly).
> - **GPU-friendly** — `transform: [{translateX}, {scale}]` i `opacity`. Unikaj `width`/`height` (re-layout drogie w RN flexboxie).
> - **FlatList tuning** — `keyExtractor`, memo `renderItem`, `getItemLayout` (gdy fixed height), `removeClippedSubviews` (Android), `windowSize`, `maxToRenderPerBatch`.
> - **Bridge** — minimalizuj prop changes; preferuj Reanimated worklets (operują bez bridge call).
> - **Image** — `expo-image` (cache, blurhash, native decoding); NIE `react-native`'s `Image` (memory leaks na liście).
> - **Profiling** — React DevTools Profiler + Hermes Inspector + Reanimated FPS monitor (`Animated.useFPSMonitor`).

Wydajność animacji RN — Hermes, Reanimated worklets, FlatList tuning, image cache.

---

## Transition Only What Changes

Nigdy nie używaj `transition: all` ani Tailwindowego shorthand `transition` (który mapuje na `transition-property: all`). Zawsze specyfikuj konkretne properties, które się zmieniają.

### Dlaczego

- `transition: all` zmusza przeglądarkę do śledzenia każdej property pod kątem zmian
- Powoduje nieoczekiwane przejścia na properties, których nie zamierzałeś animować (kolory, padding, shadows)
- Blokuje optymalizacje przeglądarki

### CSS

```css
/* Good — only transition what changes */
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

/* Bad — transition everything */
.button {
  transition: all 150ms ease-out;
}
```

### Tailwind

```tsx
// Good — explicit properties
<button className="transition-[scale,background-color] duration-150 ease-out">

// Bad — transition all
<button className="transition duration-150 ease-out">
```

### Tailwind `transition-transform` — uwaga

`transition-transform` w Tailwind mapuje na `transition-property: transform, translate, scale, rotate` — pokrywa wszystkie properties związane z transform, nie tylko `transform`. Używaj tego, gdy animujesz tylko transformy. Dla wielu non-transform properties użyj składni z nawiasami: `transition-[scale,opacity,filter]`.

---

## Use `will-change` Sparingly

`will-change` podpowiada przeglądarce, żeby pre-promować element do własnej warstwy kompozycji GPU. Bez niego przeglądarka promuje element dopiero gdy animacja się zaczyna — ta jednorazowa promocja warstwy może powodować micro-stutter na pierwszej klatce.

To pomaga szczególnie gdy element zmienia `scale`, `rotation` lub porusza się z `transform`. Dla innych properties nie pomaga zbytnio — przeglądarka i tak nie może ich kompozycjonować na GPU.

### Reguły

```css
/* Good — specific property that benefits from GPU compositing */
.animated-card {
  will-change: transform;
}

/* Good — multiple compositor-friendly properties */
.animated-card {
  will-change: transform, opacity;
}

/* Bad — never use will-change: all */
.animated-card {
  will-change: all;
}

/* Bad — properties that can't be GPU-composited anyway */
.animated-card {
  will-change: background-color, padding;
}
```

### Useful Properties

| Property | GPU-compositable | Warto użyć `will-change` |
| --- | --- | --- |
| `transform` | Tak | Tak |
| `opacity` | Tak | Tak |
| `filter` (blur, brightness) | Tak | Tak |
| `clip-path` | Tak | Tak |
| `top`, `left`, `width`, `height` | Nie | Nie |
| `background`, `border`, `color` | Nie | Nie |

### Kiedy pomijać

Nowoczesne przeglądarki same dobrze optymalizują. Dodawaj `will-change` tylko gdy zauważysz first-frame stutter — szczególnie Safari na tym korzysta. Nie dodawaj prewencyjnie do każdego animowanego elementu; każda dodatkowa warstwa kompozycji kosztuje pamięć.

---

## Zobacz Także

- [animations.md](animations.md) — Motion patterns, View Transitions
- [animation-polish.md](animation-polish.md) — interruptible, subtle exits, scale on press
- [polish-checklist.md](polish-checklist.md) — pełna checklista polish
