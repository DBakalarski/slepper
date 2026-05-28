import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Manual override z 3 trybami. `system` sledzi `useColorScheme()` z RN,
// `light`/`dark` ignoruja system. Domyslnie `system` — najmniej zaskakuje
// usera przy pierwszym uruchomieniu (zgodne z preferencjami OS).
export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'theme-mode',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
