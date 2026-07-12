import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recommendGallandMock, recommendKotkiMock } = vi.hoisted(() => ({
  recommendGallandMock: vi.fn(),
  recommendKotkiMock: vi.fn(),
}));

vi.mock('sleeper-machine', () => ({ recommend: recommendGallandMock }));
vi.mock('sleeper-machine-kotki', () => ({ recommendKotkiDwa: recommendKotkiMock }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { computeNextSleepAt } from '../nap-schedule';

const CHILD = {
  birth_date: '2025-11-01',
  algorithm: 'kotki_dwa',
  preferred_naps_per_day: null,
  preferred_bedtime: null,
  preferred_wake_time: null,
};

const NOW = new Date('2026-07-12T10:00:00Z');

describe('computeNextSleepAt', () => {
  beforeEach(() => {
    recommendGallandMock.mockReset();
    recommendKotkiMock.mockReset();
  });

  it('zwraca nextSleepAt z algorytmu kotki_dwa dla historii bez sesji w toku', () => {
    const next = new Date('2026-07-12T11:30:00Z');
    recommendKotkiMock.mockReturnValue({ nextSleepAt: next });
    const rows = [
      { type: 'nap', start_at: '2026-07-12T08:00:00Z', end_at: '2026-07-12T09:00:00Z' },
    ];
    expect(computeNextSleepAt(rows, CHILD, NOW)).toEqual(next);
    expect(recommendKotkiMock).toHaveBeenCalledTimes(1);
    // Historia zmapowana na shape lib: Date + uppercase type.
    const [state] = recommendKotkiMock.mock.calls[0];
    expect(state.history).toEqual([
      {
        start: new Date('2026-07-12T08:00:00Z'),
        end: new Date('2026-07-12T09:00:00Z'),
        type: 'NAP',
      },
    ]);
  });

  it('uzywa algorytmu galland gdy child.algorithm !== kotki_dwa', () => {
    recommendGallandMock.mockReturnValue({ nextSleepAt: null });
    expect(computeNextSleepAt([], { ...CHILD, algorithm: 'galland' }, NOW)).toBeNull();
    expect(recommendGallandMock).toHaveBeenCalledTimes(1);
    expect(recommendKotkiMock).not.toHaveBeenCalled();
  });

  it('sesja w toku (end_at null) => null bez wolania algorytmu', () => {
    const rows = [{ type: 'nap', start_at: '2026-07-12T09:50:00Z', end_at: null }];
    expect(computeNextSleepAt(rows, CHILD, NOW)).toBeNull();
    expect(recommendKotkiMock).not.toHaveBeenCalled();
  });

  it('mapuje night_sleep na NIGHT', () => {
    recommendKotkiMock.mockReturnValue({ nextSleepAt: null });
    const rows = [
      {
        type: 'night_sleep',
        start_at: '2026-07-11T19:00:00Z',
        end_at: '2026-07-12T05:00:00Z',
      },
    ];
    computeNextSleepAt(rows, CHILD, NOW);
    const [state] = recommendKotkiMock.mock.calls[0];
    expect(state.history[0].type).toBe('NIGHT');
  });

  it('throw z algorytmu => null (fail-safe, mutacja sesji nie moze pasc)', () => {
    recommendKotkiMock.mockImplementation(() => {
      throw new Error('invariant violation');
    });
    expect(computeNextSleepAt([], CHILD, NOW)).toBeNull();
  });
});
