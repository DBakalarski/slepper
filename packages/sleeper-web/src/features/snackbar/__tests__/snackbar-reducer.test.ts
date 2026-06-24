import { describe, expect, it } from 'vitest';

import {
  initialSnackbarState,
  snackbarReducer,
  type SnackbarState,
} from '@/features/snackbar/snackbar-reducer';

describe('snackbarReducer', () => {
  it('SHOW ustawia current z inkrementowanym id i przekazanymi polami', () => {
    const action = { label: 'Przywroc', onPress: () => {} };
    const next = snackbarReducer(initialSnackbarState, {
      type: 'SHOW',
      payload: { message: 'Sen zakonczony', action, durationMs: 3000 },
    });

    expect(next.seq).toBe(1);
    expect(next.current).toEqual({
      id: 1,
      message: 'Sen zakonczony',
      action,
      durationMs: 3000,
    });
  });

  it('kolejny SHOW inkrementuje seq i zastepuje current', () => {
    const first = snackbarReducer(initialSnackbarState, {
      type: 'SHOW',
      payload: { message: 'A', durationMs: 3000 },
    });
    const second = snackbarReducer(first, {
      type: 'SHOW',
      payload: { message: 'B', durationMs: 1000 },
    });

    expect(second.seq).toBe(2);
    expect(second.current?.id).toBe(2);
    expect(second.current?.message).toBe('B');
  });

  it('DISMISS pasujacego id czysci current', () => {
    const shown = snackbarReducer(initialSnackbarState, {
      type: 'SHOW',
      payload: { message: 'A', durationMs: 3000 },
    });
    const dismissed = snackbarReducer(shown, { type: 'DISMISS', payload: { id: 1 } });

    expect(dismissed.current).toBeNull();
    expect(dismissed.seq).toBe(1);
  });

  it('DISMISS nieaktualnego id to no-op (zachowuje referencje stanu)', () => {
    const shown = snackbarReducer(initialSnackbarState, {
      type: 'SHOW',
      payload: { message: 'A', durationMs: 3000 },
    });
    const result = snackbarReducer(shown, { type: 'DISMISS', payload: { id: 999 } });

    expect(result).toBe(shown);
    expect(result.current?.id).toBe(1);
  });

  it('DISMISS na pustym stanie to no-op', () => {
    const empty: SnackbarState = initialSnackbarState;
    const result = snackbarReducer(empty, { type: 'DISMISS', payload: { id: 1 } });

    expect(result).toBe(empty);
  });
});
