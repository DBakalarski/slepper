import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { Snackbar } from '@/components/ui/Snackbar';
import {
  initialSnackbarState,
  snackbarReducer,
  type SnackbarAction,
} from '@/features/snackbar/snackbar-reducer';

interface ShowOptions {
  message: string;
  action?: SnackbarAction;
  durationMs?: number;
}

interface SnackbarContextValue {
  show: (options: ShowOptions) => void;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION_MS = 3000;

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

// Globalny snackbar/toast (jeden naraz). `show` kolejkuje pojedyncza pozycje,
// auto-dismiss po `durationMs` przez setTimeout (cleanup w useEffect — regula
// async #13). Re-uzywalny: Faza 4 podepnie tu toast "edytowane przez partnera".
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(snackbarReducer, initialSnackbarState);

  const show = useCallback((options: ShowOptions) => {
    dispatch({
      type: 'SHOW',
      payload: {
        message: options.message,
        action: options.action,
        durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      },
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    dispatch({ type: 'DISMISS', payload: { id } });
  }, []);

  const current = state.current;
  useEffect(() => {
    if (current === null) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'DISMISS', payload: { id: current.id } });
    }, current.durationMs);
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo<SnackbarContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current ? (
        <Snackbar
          message={current.message}
          actionLabel={current.action?.label}
          onAction={
            current.action
              ? () => {
                  current.action?.onPress();
                  dismiss(current.id);
                }
              : undefined
          }
        />
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (context === null) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}
