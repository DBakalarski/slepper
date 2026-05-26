---
name: tailwind-react-guidelines
description: Frontend Expo SDK 54 + React Native 0.81 + TypeScript 5.7+ + NativeWind v4 + Tailwind v3.4 + expo-router. Komponenty, TanStack Query, Zustand, formularze (RHF + Zod), lazy loading, Suspense. Używaj przy tworzeniu komponentów, ekranów, stylowaniu, data fetchingu, formularzach, optymalizacji.
---

# Tailwind React Guidelines (Expo/RN)

## Cel

Przewodnik dla **Expo SDK 54** mobile app (React Native 0.81, NativeWind v4, expo-router). Stack zablokowany na SDK 54 dla kompatybilności z Expo Go z App Store — patrz `CLAUDE.md`.

## Kiedy używać tego skilla

- Tworzenie nowych ekranów (`sleeper-app/src/app/`) i komponentów (`sleeper-app/src/components/`)
- Stylowanie z NativeWind v4 (className na komponentach RN)
- Data fetching z TanStack Query
- State management z Zustand (UI state) + TanStack Query (server state)
- Formularze z React Hook Form + Zod
- Routing z expo-router (file-based, layouts, tabs/stacks)
- Loading states (Suspense, early returns)
- Optymalizacja wydajności (FlatList, memo, React Compiler — JEŚLI włączony)

---

## Quick Start Checklist

### Nowy komponent
- [ ] TypeScript interface dla props
- [ ] Funkcja (nie `React.FC`)
- [ ] Ref jako prop (nie `forwardRef`) — React 19
- [ ] Import aliasy: `@/components`, `@/lib`, `@/hooks` (alias `@/*` → `./src/*` w `sleeper-app/`)
- [ ] NativeWind utility classes (`className="..."`)
- [ ] Komponenty RN: `View`, `Text`, `Pressable`, `ScrollView`, `FlatList` — NIE `<div>`, `<span>`, `<button>`
- [ ] Default export na dole (dla lazy)

### Memoizacja
- [ ] Domyślnie BEZ `useMemo`/`useCallback` — RN sam re-renderuje tylko zmienione drzewa
- [ ] `useCallback` tylko gdy handler trafia do `React.memo` child lub do FlatList `renderItem`
- [ ] `useMemo` tylko gdy obliczenie jest naprawdę kosztowne i mierzalne (DevTools Profiler)

### Data fetching
- [ ] TanStack Query (`useQuery`, `useMutation`) — nie `useEffect` do fetch
- [ ] `queryOptions()` helper dla reużywalnych configów
- [ ] Early returns: `isPending` → `isError` → empty → data
- [ ] Realtime Supabase → `queryClient.invalidateQueries(['sessions'])` (NIE ręczny patch cache)

### Formularze
- [ ] React Hook Form + `@hookform/resolvers/zod` — wszystkie nietrywialne formy
- [ ] `<TextInput>` z `onChangeText` (NIE `onChange`)
- [ ] `<Pressable>` do submitu (NIE `<button>`)
- [ ] `KeyboardAvoidingView` (iOS: `padding`, Android: `height`) wokół form na ekranach z input
- [ ] `accessibilityLabel` / `accessibilityHint` na inputach i przyciskach (a11y RN)
- [ ] Toast/feedback: `react-native-toast-message` lub native `Alert.alert()` (decyzja per-flow)

### Nowy ekran (route)
- [ ] Plik w `sleeper-app/src/app/` (file-based routing)
- [ ] Layout: `_layout.tsx` jeśli grupa ekranów dzieli nawigację
- [ ] Lazy: `expo-router` automatycznie code-splituje per route; nie używaj `React.lazy` ręcznie dla route
- [ ] Suspense fallback w `_layout.tsx` (`<Stack screenOptions={{...}}>`)
- [ ] Error Boundary: `ErrorBoundary` export z route module (`expo-router` honoruje)

---

## Import aliasy

| Alias | Ścieżka (od `sleeper-app/`) | Przykład |
|-------|------------------------------|----------|
| `@/` | `./src/` | `import { supabase } from '@/lib/supabase'` |
| `@/components` | `./src/components/` | `import { Button } from '@/components/Button'` |
| `@/hooks` | `./src/hooks/` | `import { useSession } from '@/hooks/useSession'` |
| `@/lib` | `./src/lib/` | `import { queryClient } from '@/lib/query-client'` |

Zdefiniowane w: `sleeper-app/tsconfig.json` (`compilerOptions.paths`) i `sleeper-app/babel.config.js` (jeśli wymaga module-resolver — sprawdź).

---

## Topic Guides

### Wzorce komponentów (React 19 + RN)
Ref jako prop (NIE `forwardRef`), funkcyjne komponenty, `useState`/`useReducer` dla local state, Zustand dla cross-tree state.
**[Pełny przewodnik: resources/component-patterns.md](resources/component-patterns.md)**

### Stylowanie z NativeWind v4 + Tailwind v3.4
NativeWind kompiluje `className` do StyleSheet. Tailwind v3.4 (NIE v4 — `nativewind@4.2` peer dep). Brak container queries, OKLCH ani `min-h-dvh` (web-only). Responsywność: `useWindowDimensions()` + className conditionally. Dark mode: `useColorScheme()` + `dark:` variants NativeWind.
**[Pełny przewodnik: resources/styling-guide.md](resources/styling-guide.md)**

### Organizacja plików i routing
```
sleeper-app/src/
  app/                 # expo-router routes (file-based)
    _layout.tsx        # root layout
    (tabs)/            # tab group
      _layout.tsx
      index.tsx        # / route
    auth/
      login.tsx
  components/          # shared UI (Button, Card)
  features/            # domain features (sessions, children)
  hooks/               # use* hooks
  lib/                 # supabase.ts, query-client.ts, utils
  types/               # TypeScript types
```
**[Pełny przewodnik: resources/file-organization.md](resources/file-organization.md)**

### Formularze (RHF + Zod + RN)
React Hook Form z `Controller` dla `TextInput`, walidacja Zod, `KeyboardAvoidingView`, focus management (`useRef<TextInput>` + `.focus()`), error display per pole.
**[Pełny przewodnik: resources/forms.md](resources/forms.md)**

### Stany ładowania i błędów

**Suspense dla code-splittowanych komponentów (rzadko — expo-router robi to per route):**
```tsx
<Suspense fallback={<ActivityIndicator />}>
  <HeavyComponent />
</Suspense>
```

**Early returns dla TanStack Query:**
```tsx
const { data, isPending, isError, error } = useChildren();

if (isPending) return <ActivityIndicator />;
if (isError) return <ErrorMessage error={error} />;
if (!data?.length) return <EmptyState />;

return <ChildrenList data={data} />;
```

**[Pełny przewodnik: resources/loading-and-error-states.md](resources/loading-and-error-states.md)**

### Testowanie
Setup testowy **nie istnieje jeszcze** w `sleeper-app/`. Planowane: Vitest + `@testing-library/react-native` (RNTL) — dojdzie gdy będzie pierwszy testowalny moduł. Patrz `expo-rn-testing` skill po strategię (unit + manual + EAS preview).
**[Pełny przewodnik: resources/testing.md](resources/testing.md)** _(uwaga: web-stack content TBD migracji)_

### Wydajność RN
FlatList (NIE `.map()` w ScrollView dla list > 20 elementów), `keyExtractor`, `getItemLayout` gdy znamy wysokość, `removeClippedSubviews` na Androidzie, `react-native-reanimated` worklety dla animacji 60fps, Hermes engine domyślnie włączony w SDK 54.
**[Pełny przewodnik: resources/performance.md](resources/performance.md)**

### TypeScript standards
Strict mode ON, `moduleResolution: "bundler"`, inline type imports (`import type { X }`), `satisfies` operator, Zod na granicach (API responses, deep link params, AsyncStorage payloads).
**[Pełny przewodnik: resources/typescript-standards.md](resources/typescript-standards.md)**

---

## Główne zasady (Expo SDK 54)

1. **TanStack Query dla server state** — nie `useEffect`; nie patch cache ręcznie (używaj `invalidateQueries`)
2. **Zustand dla UI state** — minimalne store'y per-feature, NIE global blob
3. **React Hook Form + Zod dla formularzy** — `Controller` wrappuje RN `TextInput`
4. **expo-router file-based routing** — `_layout.tsx`, `(group)`, dynamic `[id].tsx`; NIE `React.lazy` ręcznie dla route
5. **NativeWind className na komponentach RN** — nie ma DOM, nie `<div>`/`<span>`
6. **TypeScript strict** — zero `any`, Zod dla runtime validation
7. **Error boundaries** — `ErrorBoundary` export z route module (expo-router honoruje)
8. **A11y RN** — `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, touch target ≥ 44pt
9. **Daty** — `date-fns` + `date-fns-tz` (`Europe/Warsaw`); UTC w bazie, lokalna strefa w UI
10. **Realtime + invalidacja** — Supabase event → `queryClient.invalidateQueries(...)`, nie ręczny patch

---

## Czego NIE używać (web-only)

- ❌ `<div>`, `<span>`, `<button>`, `<input>`, `<form>` — RN nie ma DOM
- ❌ `forwardRef` — w React 19 ref jest zwykłym propem
- ❌ Container queries, `min-h-dvh`, OKLCH — Tailwind v4 / web-only
- ❌ View Transitions API, `document.startViewTransition` — brak DOM
- ❌ `prefers-reduced-motion` (CSS) — w RN użyj `AccessibilityInfo.isReduceMotionEnabled()`
- ❌ `localStorage`, `sessionStorage` — użyj `AsyncStorage` lub `SecureStore`
- ❌ `window.fetch` jest OK; ale `<a href>` NIE — użyj `<Link>` z expo-router lub `Linking.openURL`
- ❌ shadcn/ui — to komponenty na Radix (DOM); użyj wbudowanych RN + `@expo/ui` + własnych
- ❌ React Router — używamy expo-router
- ❌ Sonner (web toast) — `react-native-toast-message` lub `Alert.alert()`

---

## Navigation Guide

| Potrzebujesz... | Przeczytaj |
|-----------------|------------|
| Stworzyć komponent | [component-patterns.md](resources/component-patterns.md) |
| Stylować z NativeWind | [styling-guide.md](resources/styling-guide.md) |
| Organizować pliki, routing | [file-organization.md](resources/file-organization.md) |
| Formularze (RHF + Zod + RN) | [forms.md](resources/forms.md) |
| Obsłużyć loading/błędy | [loading-and-error-states.md](resources/loading-and-error-states.md) |
| Strategia testów | skill `expo-rn-testing` |
| Optymalizować RN | [performance.md](resources/performance.md) |
| TypeScript patterns | [typescript-standards.md](resources/typescript-standards.md) |
| UI/UX polish (mobile) | skill `ux-ui-guidelines` |
| Supabase + Expo | skill `supabase-dev-guidelines` |
