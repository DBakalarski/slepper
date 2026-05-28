import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
    },
  },
});

// React Native nie ma `window focus` — uzywamy AppState. Gdy aplikacja
// wraca na pierwszy plan, focusManager.setFocused(true) trigeruje refetch
// stale queries. Krytyczne dla: banner pending invitations, family state,
// w przyszlosci active session.
export function setupFocusManager(): () => void {
  function onAppStateChange(state: AppStateStatus) {
    focusManager.setFocused(state === 'active');
  }

  const subscription = AppState.addEventListener('change', onAppStateChange);
  return () => subscription.remove();
}
