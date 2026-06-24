// Czysta logika stanu snackbara (jeden widoczny naraz). Wydzielona z
// SnackbarProvider, zeby byla testowalna bez jsdom/RTL (strategia pure-only).
// `seq` to deterministyczny licznik id — unikamy Date.now()/Math.random().

export interface SnackbarAction {
  label: string;
  onPress: () => void;
}

export interface SnackbarItem {
  id: number;
  message: string;
  action?: SnackbarAction;
  durationMs: number;
}

export interface SnackbarState {
  current: SnackbarItem | null;
  seq: number;
}

export type SnackbarEvent =
  | { type: 'SHOW'; payload: { message: string; action?: SnackbarAction; durationMs: number } }
  | { type: 'DISMISS'; payload: { id: number } };

export const initialSnackbarState: SnackbarState = { current: null, seq: 0 };

export function snackbarReducer(state: SnackbarState, event: SnackbarEvent): SnackbarState {
  switch (event.type) {
    case 'SHOW': {
      const id = state.seq + 1;
      return {
        current: {
          id,
          message: event.payload.message,
          action: event.payload.action,
          durationMs: event.payload.durationMs,
        },
        seq: id,
      };
    }
    case 'DISMISS': {
      // Ignoruj DISMISS dla nieaktualnego id (np. timer starej pozycji odpalil
      // sie po tym jak nowy SHOW ja zastapil) — zachowaj referencje stanu.
      if (state.current === null || state.current.id !== event.payload.id) {
        return state;
      }
      return { ...state, current: null };
    }
  }
}
