---
name: ux-ui-guidelines
description: Wytyczne UX/UI dla Expo SDK 54 + React Native + NativeWind v4. Design system mobile, dostępność (VoiceOver/TalkBack), responsive (useWindowDimensions, Safe Area), animacje (react-native-reanimated, worklets), UI patterns (Stack/Tabs navigation, FlatList, search, onboarding), interface polish (concentric radius, optical alignment, tabular numbers, scale 0.96 on press, opacity feedback). Używaj przy projektowaniu UI mobilnego, dostępności, animacjach, micro-detalach.
---

# UX/UI Guidelines (Expo/RN)

## Cel

Przewodnik UI/UX dla **aplikacji mobilnej Expo SDK 54** — design system, dostępność RN, responsywność per-device, animacje przez Reanimated, wzorce mobile UX, polish micro-detali.

## Kiedy używać tego skilla

- Projektowanie ekranów i komponentów RN
- Implementacja dostępności (VoiceOver / TalkBack)
- Responsywność per-device (iPhone SE → tablet, orientacja)
- Animacje (`react-native-reanimated`, gesture-handler)
- Formy mobilne (keyboard handling, focus management)
- Wzorce: Stack/Tabs nawigacja, listy (FlatList), search, onboarding
- Polish: micro-interakcje, scale on press, tabular nums, concentric radius

---

## Quick Start

### Checklist nowego komponentu UI

- [ ] Komponenty RN: `<View>`, `<Text>`, `<Pressable>`, `<TextInput>`, `<ScrollView>`, `<FlatList>` — NIE web HTML
- [ ] `<SafeAreaView>` lub `useSafeAreaInsets()` wokół rootu ekranu (notch/dynamic island)
- [ ] Touch targets ≥ **44pt × 44pt** (iOS HIG) / 48dp (Android Material) — `accessibilityState`+padding
- [ ] `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` na każdym interaktywnym elemencie
- [ ] Dark mode: `useColorScheme()` + `dark:` className w NativeWind
- [ ] Touch feedback: `<Pressable>` z `active:opacity-70` (iOS-like) lub `android_ripple={{color: '...'}}` (Material)
- [ ] `tabular-nums` na liczbach dynamicznych: `<Text style={{fontVariant: ['tabular-nums']}}>` (timer, czas trwania)
- [ ] Reduced motion: `AccessibilityInfo.isReduceMotionEnabled()` (gate animacje)
- [ ] Platform-specific tweaks: `Platform.select({ ios: ..., android: ... })`
- [ ] Image: `expo-image` (cache, blurhash, transitions) zamiast `react-native`'s `Image`

### Checklist formy mobilnej

- [ ] `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` wokół form
- [ ] `<TextInput>` z `onChangeText` (NIE `onChange`)
- [ ] `autoCapitalize="none"`, `autoCorrect={false}`, `keyboardType="email-address"` itp.
- [ ] `returnKeyType` ("next" / "done") + `onSubmitEditing` dla nawigacji między polami
- [ ] `useRef<TextInput>` + `.focus()` dla focus management
- [ ] Inline błędy pod polem (czerwony tekst, `<Text className="text-destructive text-sm">`)
- [ ] Submit button DISABLED gdy `isSubmitting` lub `!isValid`
- [ ] Toast / `Alert.alert()` po sukcesie/błędzie
- [ ] `accessibilityState={{disabled: !isValid}}` na submit

---

## Design System (mobile)

### Paleta kolorów (NativeWind / Tailwind v3.4)

NativeWind NIE wspiera OKLCH ani CSS variables. Definiuj kolory w `tailwind.config.js`:

```js
// sleeper-app/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: { DEFAULT: '#FFFFFF', dark: '#0A0A0A' },
        foreground: { DEFAULT: '#0A0A0A', dark: '#FAFAFA' },
        primary: { DEFAULT: '#0EA5E9', dark: '#38BDF8' },
        muted: { DEFAULT: '#F4F4F5', dark: '#27272A' },
        'muted-foreground': { DEFAULT: '#71717A', dark: '#A1A1AA' },
        destructive: { DEFAULT: '#DC2626', dark: '#EF4444' },
        border: { DEFAULT: '#E4E4E7', dark: '#3F3F46' },
      },
    },
  },
};
```

Dark mode toggle przez NativeWind: `colorScheme.set('light' | 'dark' | 'system')`. Auto-follow systemu: `useColorScheme()` z `react-native`.

### Skala typografii (mobile-optimized)

| Rozmiar | Użycie | Klasa NativeWind |
|---------|--------|------------------|
| 11px | Caption, badge | `text-[11px]` |
| 13px | Metadata, secondary label | `text-[13px]` |
| 15px | Body text (iOS standard) | `text-[15px]` |
| 17px | Body emphasis, default button text | `text-[17px]` |
| 20px | Section header | `text-xl` |
| 24px+ | Screen title (large title) | `text-2xl` |
| 34px | Hero / onboarding header | `text-[34px] font-bold` |

iOS native body = 17px, Android Material body = 14sp. NativeWind klasy są w `px` (mapowane do `dp` przez Metro/Expo).

### Spacing (8pt grid)

```
4px  = p-1, gap-1     ← inline tight
8px  = p-2, gap-2     ← items spacing
12px = p-3, gap-3     ← card padding inner
16px = p-4, gap-4     ← standard screen padding
24px = p-6, gap-6     ← section gap
32px = p-8, gap-8     ← hero spacing
```

Większość ekranów w Expo: `<View className="flex-1 px-4 py-6 gap-4">`.

### Safe Area

KAŻDY ekran musi uwzględniać notch/dynamic island/home indicator:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">{/* content */}</View>
    </SafeAreaView>
  );
}
```

Alternatywa dla zaawansowanej kontroli: `useSafeAreaInsets()` → manual padding.

**[Pełny przewodnik: resources/design-system.md](resources/design-system.md)**

---

## Topic Guides

### Dostępność (RN — VoiceOver / TalkBack)

**Wymagania (parytet WCAG):**
- Kontrast tekst ≥ 4.5:1 (sprawdź `contrast-cli` lub axe DevTools w `react-native-web` preview)
- Touch target ≥ 44×44pt (iOS), 48×48dp (Android)
- Wszystkie interaktywne elementy mają `accessibilityLabel` (zamiast `aria-label`)
- Stany dostępne: `accessibilityState={{disabled, selected, checked, expanded, busy}}`

**Kluczowe propsy RN (zamiast ARIA):**
- `accessibilityLabel="Start timer"` — zamiast `aria-label`
- `accessibilityHint="Rozpoczyna nową sesję snu"` — pomocniczy opis
- `accessibilityRole="button" | "link" | "header" | "image" | "alert" | "menu"`
- `accessibilityLiveRegion="polite" | "assertive"` (Android) / `accessibilityAnnouncement` (iOS via `AccessibilityInfo.announceForAccessibility`)
- `importantForAccessibility="yes" | "no" | "no-hide-descendants"` (Android-only)
- Focus management: `findNodeHandle` + `AccessibilityInfo.setAccessibilityFocus`

**[Pełny przewodnik: resources/accessibility.md](resources/accessibility.md)**

### Responsywność (per-device, orientacja)

Brak container queries / media queries w RN. Alternatywy:

```tsx
import { useWindowDimensions } from 'react-native';

function Screen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > height;

  return (
    <View className={isTablet ? 'flex-row gap-6' : 'flex-col gap-4'}>
      {/* ... */}
    </View>
  );
}
```

Breakpointy mobile (per-screen, NIE container):
- **iPhone SE / mały**: 320-375pt
- **iPhone standard**: 390-414pt
- **iPhone Pro Max**: 430pt
- **Tablet**: ≥ 768pt
- **Landscape (telefon)**: height < 500

**[Pełny przewodnik: resources/responsive-design.md](resources/responsive-design.md)**

### Animacje (react-native-reanimated v4)

Worklety na UI thread → 60fps niezależnie od JS thread:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

function FadeIn({ children }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
```

**Kluczowe zasady:**
- Reduced motion: gate przez `AccessibilityInfo.isReduceMotionEnabled()` (nie ma CSS `prefers-reduced-motion` w RN)
- Krótkie animacje (150-300ms)
- Unikaj animacji `width`/`height` (layout w RN drogi); preferuj `transform`/`opacity`
- Stagger przez `withDelay()` lub `LayoutAnimation` (legacy, nie wymieszać z Reanimated)
- Gesture-driven: `react-native-gesture-handler` + Reanimated `useAnimatedGestureHandler`

**View Transitions API / `document.startViewTransition`** — NIE istnieje w RN. Shared element transitions: `react-native-screens` `enterStyle`/`exitStyle` lub `react-native-reanimated` shared transitions (eksperymentalne).

**[Pełny przewodnik: resources/animations.md](resources/animations.md)**

### Komponenty UX (mobile)

**Wzorce:**
- Modal / BottomSheet: `react-native-bottom-sheet` (Gorhom) — natywny gesture, snap points
- Toast: `react-native-toast-message` lub natywny `Alert.alert()`
- Pull-to-refresh: `<FlatList refreshControl={<RefreshControl />}>`
- Swipe-to-action: `react-native-gesture-handler` `Swipeable`
- Loading: `<ActivityIndicator size="large" color="#0EA5E9" />`
- Skeleton: `react-native-skeleton-placeholder` lub własny `<View className="animate-pulse bg-muted h-4 rounded">`

**Optimistic updates:** `useOptimistic` (React 19) lub TanStack Query `onMutate` — działa identycznie jak na web.

**[Pełny przewodnik: resources/component-ux.md](resources/component-ux.md)**

### UI Patterns (mobile-first)

**Nawigacja (expo-router):**
- **Stack** — przejścia push/pop z animacją (typowe iOS slide, Android fade)
- **Tabs** — bottom tab bar (sleeper: dom, historia, dziecko, ustawienia)
- **Modal** — `presentation: 'modal'` (slide-up) lub `'transparentModal'`
- **Drawer** — `expo-router/drawer` (rzadziej w sleeper)

**Listy:**
- `<FlatList>` z `keyExtractor`, `renderItem` (memo), `ItemSeparatorComponent`, `ListEmptyComponent`
- Sekcje: `<SectionList>` z `sections={[{title, data: []}]}`
- Pull-to-refresh: `refreshControl`
- Infinite scroll: `onEndReached` + `onEndReachedThreshold`

**Search:**
- `<TextInput>` z `clearButtonMode="while-editing"` (iOS)
- Debounced query (300ms) → TanStack Query
- Empty state z ikoną + CTA

**Onboarding:**
- Multi-step `<View>` ze stanem Zustand `currentStep`
- `react-native-pager-view` lub własna animowana przejście
- StepIndicator z dots
- Skip / Next / Done buttons

**[Pełny przewodnik: resources/patterns.md](resources/patterns.md)**

### Interface Polish (mobile micro-detale)

**Główne kategorie:**
- **Typography polish** — tabular-nums dla timerów (`style={{fontVariant: ['tabular-nums']}}`), `numberOfLines` z `ellipsizeMode="tail"`, font scaling honor (`maxFontSizeMultiplier`)
- **Surfaces** — concentric border radius (outer = inner + padding), opacity feedback na press (iOS), ripple na Android (`android_ripple`)
- **Animation polish** — interruptible spring animations (Reanimated `withSpring`), `scale(0.96)` on press przez `pressed && {transform: [{scale: 0.96}]}`
- **Performance** — `removeClippedSubviews` na FlatList Android, `getItemLayout` gdy znamy wysokość, `useMemo` na `renderItem` referencji

**Quick wins:**
- `tabular-nums` na timer/czas trwania → zero layout shift
- `<Pressable>` z `({pressed}) => [styles.btn, pressed && {opacity: 0.7, transform: [{scale: 0.96}]}]` → tactile feedback
- Concentric radius w kartach: outer card `rounded-2xl` + inner padding 12px → inner element `rounded-xl` (16-4=12... użyj `rounded-[12px]`)
- `expo-image` z `transition={300}` → smooth load
- Bottom safe area na ekranach z bottom button (`paddingBottom: insets.bottom + 16`)

**[Pełne pryncypia: resources/polish-checklist.md](resources/polish-checklist.md)**

---

## Przykład: Komponent Button (mobile, 2026)

```tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  onPress: () => Promise<void> | void;
  children: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ActionButton({ onPress, children, disabled, isLoading }: ActionButtonProps) {
  const handlePress = async () => {
    if (disabled || isLoading) return;
    await onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!disabled, busy: !!isLoading }}
      className={cn(
        'min-h-[44px] px-4 py-3 rounded-2xl bg-primary',
        'flex-row items-center justify-center gap-2',
        'active:opacity-80 active:scale-[0.98]',
        (disabled || isLoading) && 'opacity-50'
      )}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
    >
      {isLoading && <ActivityIndicator size="small" color="#fff" />}
      <Text className="text-primary-foreground font-semibold text-[15px]">{children}</Text>
    </Pressable>
  );
}
```

---

## Navigation Guide

| Potrzebujesz... | Przeczytaj |
|-----------------|------------|
| Kolory, typografia, spacing, Safe Area | [design-system.md](resources/design-system.md) |
| A11y (VoiceOver/TalkBack), accessibilityLabel | [accessibility.md](resources/accessibility.md) |
| Responsywność (per-device, orientacja) | [responsive-design.md](resources/responsive-design.md) |
| Reanimated, gesture-handler, worklets | [animations.md](resources/animations.md) |
| Modal, BottomSheet, toast, pull-to-refresh | [component-ux.md](resources/component-ux.md) |
| Stack/Tabs nawigacja, FlatList, search, onboarding | [patterns.md](resources/patterns.md) |
| Concentric radius, opacity/ripple feedback, hit area | [surfaces.md](resources/surfaces.md) |
| Spring animations, scale on press, interruptible | [animation-polish.md](resources/animation-polish.md) |
| Tabular nums, numberOfLines, font scaling | [typography-polish.md](resources/typography-polish.md) |
| FlatList tuning, transform vs layout | [performance.md](resources/performance.md) |
| Polish checklista (16 pryncypiów) | [polish-checklist.md](resources/polish-checklist.md) |

---

## Główne zasady (Expo SDK 54, 2026)

1. **Mobile-first** — myśl `flex-col` domyślnie, breakpointy dla tabletu/landscape
2. **Touch target ≥ 44pt** (iOS HIG) — KAŻDY przycisk/checkbox/link
3. **Safe Area** na każdym rootu ekranu
4. **A11y RN** — `accessibilityLabel/Role/State/Hint`, NIE ARIA
5. **NativeWind v4 + Tailwind v3.4** — `className` w komponentach RN, NIE inline styles
6. **Dark mode** — `useColorScheme()` + `dark:` variants
7. **Reduced motion** — `AccessibilityInfo.isReduceMotionEnabled()` gate
8. **Touch feedback** — `<Pressable>` z opacity/scale/ripple
9. **Tabular numbers** — `fontVariant: ['tabular-nums']` na timerach/cenach
10. **Concentric radius** — outer = inner + padding
11. **Konkretne animacje** — `transform`/`opacity` przez Reanimated worklety; unikaj `width`/`height` animations
12. **Scale on press** — `0.96` lub `0.98` (subtelne tactile)
13. **Keyboard handling** — `<KeyboardAvoidingView>` + `returnKeyType` + focus management
14. **FlatList dla list >20** — `keyExtractor`, memo `renderItem`, `getItemLayout`
15. **Platform-specific tweaks** — `Platform.select({ios, android})` gdy iOS HIG ≠ Material

---

## Czego NIE używać (web-only)

- ❌ Container queries, `@container`, `min-h-dvh/svh/lvh`, OKLCH custom properties
- ❌ View Transitions API (`document.startViewTransition`)
- ❌ `prefers-reduced-motion` jako CSS query — użyj `AccessibilityInfo`
- ❌ `focus-visible:`, `hover:` (na komponentach NIE-Pressable)
- ❌ `<search>` element, `role="search"` — w RN: po prostu `<View>` z `<TextInput>` + a11y label
- ❌ `<a href>`, `<button>`, `<input>`, `<form>` — RN nie ma DOM
- ❌ shadcn/ui (web Radix DOM) — wbudowane RN + `@expo/ui` + własne

---

## Powiązane skille

- `tailwind-react-guidelines` — komponenty React 19, NativeWind, expo-router
- `expo-rn-testing` — testowanie UI (manual + Maestro)
- `supabase-dev-guidelines` — auth, data layer
