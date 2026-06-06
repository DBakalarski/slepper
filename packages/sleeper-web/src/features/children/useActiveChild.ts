import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// MVP: jedno dziecko per rodzina, ale store przygotowany na multi-child
// (gdy user ma kilkoro, ostatnio wybrane utrzymuje sie miedzy startami).
interface ActiveChildState {
  activeChildId: string | null;
  setActiveChildId: (childId: string | null) => void;
}

export const useActiveChildStore = create<ActiveChildState>()(
  persist(
    (set) => ({
      activeChildId: null,
      setActiveChildId: (childId) => set({ activeChildId: childId }),
    }),
    {
      name: 'sleeper.active-child',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Convenience hook: zwraca id i setter razem, czytelniej w komponentach.
export function useActiveChild(): {
  activeChildId: string | null;
  setActiveChildId: (childId: string | null) => void;
} {
  const activeChildId = useActiveChildStore((s) => s.activeChildId);
  const setActiveChildId = useActiveChildStore((s) => s.setActiveChildId);
  return { activeChildId, setActiveChildId };
}
