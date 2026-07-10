import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Przelacznik widoku karty rekomendacji. `timeline` = os 24h (DayTimeline +
// prognoza bilansu), `list` = tekstowa lista planu dnia. Default `timeline`
// (glowny widok tej funkcji, patrz plan Taska 5).
export type RecommendationView = 'timeline' | 'list';

interface RecommendationViewState {
  view: RecommendationView;
  setView: (view: RecommendationView) => void;
}

// Kopia wzorca `useThemeStore` 1:1 — FOWT prevention: AsyncStorage na web
// async-wrapuje localStorage, wiec synchroniczny localStorage adapter
// eliminuje flash pierwszego widoku po hydratacji. Native (sleeper-app,
// juz usuniety z repo) pozostawaloby na AsyncStorage.
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

export const useRecommendationViewStore = create<RecommendationViewState>()(
  persist(
    (set) => ({
      view: 'timeline',
      setView: (view) => set({ view }),
    }),
    {
      name: 'recommendation-view',
      storage: createJSONStorage(() =>
        Platform.OS === 'web' ? webLocalStorage : AsyncStorage,
      ),
    },
  ),
);
