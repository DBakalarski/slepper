import type { ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { useThemeStore } from '@/features/settings/useThemeStore';

export type EffectiveTheme = 'light' | 'dark';

/**
 * Liczy efektywny motyw na podstawie ustawienia usera + systemowego scheme.
 * `system` -> systemScheme (fallback 'light' gdy systemScheme === null).
 */
export function useEffectiveTheme(): EffectiveTheme {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Opakowuje aplikacje w root View z klasa `dark` gdy effectiveTheme === 'dark'.
 * NativeWind v4 z `darkMode: 'class'` w tailwind.config.js propaguje klase
 * w dol drzewa komponentow — wszystkie `dark:` utility classes reaguja.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const effectiveTheme = useEffectiveTheme();
  return (
    <View className={effectiveTheme === 'dark' ? 'dark flex-1' : 'flex-1'}>
      {children}
    </View>
  );
}
