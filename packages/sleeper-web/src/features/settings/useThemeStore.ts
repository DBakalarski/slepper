import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

// FOWT prevention: AsyncStorage na web async-wrapuje localStorage → pierwszy
// render z default `'system'` → re-render z prawdziwym mode = Flash of Wrong
// Theme. Synchroniczny localStorage adapter eliminuje flash. Native (iOS/Android
// w sleeper-app) pozostaje na AsyncStorage. (Faza 1 P2.4)
// Synchronous localStorage adapter zwracajacy Promise dla zgodnosci z zustand
// StateStorage interface. Wewnetrznie sync (localStorage IS sync API), wiec
// nawet jako Promise pierwszy render po hydratacji ma juz mode z storage —
// brak FOWT.
const webLocalStorage = {
  getItem: (name: string): string | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(name, value);
    } catch {
      // ignore (private mode, quota exceeded)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'theme-mode',
      storage: createJSONStorage(() =>
        Platform.OS === 'web' ? webLocalStorage : AsyncStorage,
      ),
    },
  ),
);
