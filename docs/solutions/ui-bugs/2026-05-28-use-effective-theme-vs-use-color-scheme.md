---
title: "Manual dark mode override ignorowany przez komponenty używające `useColorScheme()`"
date: 2026-05-28
category: ui-bugs
severity: high
stack:
  - Expo SDK 54
  - React Native
  - NativeWind v4
  - Zustand
tags:
  - dark-mode
  - theme
  - useColorScheme
  - zustand-persist
  - single-source-of-truth
status: verified
last_verified: 2026-05-28
---

# Manual dark mode override ignorowany przez komponenty używające `useColorScheme()`

## Symptomy

- Po wybraniu trybu "Dark" w UI (manual override) niektóre części interfejsu (np. tab bar, ikony lucide, status bar) pozostają w trybie systemowym
- `dark:*` klasy na `<View>` aktualizują się poprawnie (bo root layout ustawia klasę z manual override), ale logika imperatywna w komponentach (np. `iconColor = scheme === 'dark' ? '#FFF' : '#000'`) używa innej wartości
- Inconsistency widoczna głównie tam, gdzie kolor jest przekazywany jako prop (lucide-react-native `color`, expo-status-bar `style`, native tab bar `tintColor`)

## Root Cause

`useColorScheme()` z `react-native` zwraca **wyłącznie** systemowe ustawienie (dictated by OS appearance). Jeśli aplikacja implementuje własny tri-state toggle (System/Light/Dark) zapisywany w Zustand + AsyncStorage persist, `useColorScheme()` IGNORUJE ten override — zwraca to, co system, niezależnie od wyboru usera.

Dwa źródła prawdy o motywie = cicha rozjazd między klasami Tailwind (`dark:*`, driven przez root View `className`) a kodem imperatywnym (kolor ikon, status bar).

## Rozwiązanie

Wprowadź jeden hook `useEffectiveTheme()` eksportowany z `ThemeProvider` i używaj go w KAŻDYM miejscu, gdzie potrzebny jest light/dark — nigdy raw `useColorScheme()`.

```typescript
// src/features/settings/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'theme-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

```typescript
// src/features/settings/ThemeProvider.tsx
import { useColorScheme } from 'react-native';
import { useThemeStore } from './useThemeStore';

export function useEffectiveTheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useEffectiveTheme();
  return (
    <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
      {children}
    </View>
  );
}
```

```typescript
// Zła praktyka — IGNORUJE manual override
const scheme = useColorScheme();
const iconColor = scheme === 'dark' ? '#FFF' : '#000';

// Dobra praktyka — szanuje manual override + system
const theme = useEffectiveTheme();
const iconColor = theme === 'dark' ? '#FFF' : '#000';
```

Status bar również:

```typescript
import { StatusBar } from 'expo-status-bar';
const theme = useEffectiveTheme();
<StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
```

## Komendy diagnostyczne

```bash
# Znajdź wszystkie miejsca używające raw useColorScheme()
grep -rn "useColorScheme" sleeper-app/src/

# Powinno pojawić się TYLKO w ThemeProvider.tsx (jedno użycie).
# Każde inne wystąpienie = potencjalny bug.
```

## Zapobieganie

- Lint custom rule (przyszłość): zabronić importu `useColorScheme` z `react-native` poza `src/features/settings/ThemeProvider.tsx`
- Code review checklist: szukaj `useColorScheme(` w PR, sugeruj `useEffectiveTheme()`
- Bottom sheet / settings UI dla theme toggle MUSI zapisywać do tego samego store, który czyta `useEffectiveTheme`
- Wprowadź heads-up note w `ThemeProvider.tsx` przy eksporcie hooka — przyszli developerzy zobaczą intencję

## Powiązane

- `docs/completed/ui-redesign/ui-redesign-podsumowanie.md` (Faza 1+2) — wzorzec wprowadzony po Fazie 1, uratował refaktor tab bara w Fazie 2

## Kontekst

Manifestowane w `feature/ui-redesign` (Expo SDK 54). Dotyczy każdej aplikacji RN która ma manual theme toggle nad system default. NativeWind v4 driven przez `className="dark"` na root View używa wartości z Zustand, więc rozjazd ujawnia się tylko w kodzie imperatywnym czytającym kolor przez prop API biblioteki natywnej.
