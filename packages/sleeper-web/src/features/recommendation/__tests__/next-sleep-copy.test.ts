import { describe, expect, it } from 'vitest';

import type { SleepSession } from '@/features/sessions/hooks';

import {
  hasActiveNightSession,
  hasCompletedNightSessionToday,
  nextSleepEmptyCopy,
} from '../next-sleep-copy';

const baseSession = (overrides: Partial<SleepSession>): SleepSession => ({
  id: 'session-1',
  child_id: 'child-1',
  type: 'nap',
  start_at: '2026-07-10T05:00:00.000Z',
  end_at: '2026-07-10T06:00:00.000Z',
  notes: null,
  tags: [],
  created_by: 'user-1',
  created_at: '2026-07-10T05:00:00.000Z',
  ...overrides,
});

describe('hasActiveNightSession', () => {
  it('true gdy sesja typu night_sleep ma end_at === null (w toku)', () => {
    const sessions = [baseSession({ type: 'night_sleep', end_at: null })];
    expect(hasActiveNightSession(sessions)).toBe(true);
  });

  it('false gdy brak sesji nocnej w toku (tylko zakonczona drzemka)', () => {
    const sessions = [baseSession({ type: 'nap' })];
    expect(hasActiveNightSession(sessions)).toBe(false);
  });
});

describe('hasCompletedNightSessionToday', () => {
  it('true gdy sesja nocna ma ustawione end_at', () => {
    const sessions = [baseSession({ type: 'night_sleep', end_at: '2026-07-10T06:30:00.000Z' })];
    expect(hasCompletedNightSessionToday(sessions)).toBe(true);
  });

  it('false gdy sesja nocna wciaz trwa (end_at === null)', () => {
    const sessions = [baseSession({ type: 'night_sleep', end_at: null })];
    expect(hasCompletedNightSessionToday(sessions)).toBe(false);
  });
});

describe('nextSleepEmptyCopy', () => {
  it('zwraca komunikat o trwajacym snie nocnym gdy sesja nocna jest w toku', () => {
    const sessions = [baseSession({ type: 'night_sleep', end_at: null })];
    expect(nextSleepEmptyCopy(sessions)).toMatch(/śpi/);
  });

  it('zwraca komunikat "Brak kotwicy" gdy nie ma zadnych sesji (cold start)', () => {
    expect(nextSleepEmptyCopy([])).toMatch(/Brak kotwicy/);
  });
});
