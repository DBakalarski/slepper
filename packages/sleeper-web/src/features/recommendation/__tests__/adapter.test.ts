import { describe, expect, it } from 'vitest';

import type { SleepSession as AppSleepSession } from '@/features/sessions/hooks';

import { toLibActiveSession, toLibProfile, toLibSessions } from '../adapter';

const baseSession = (overrides: Partial<AppSleepSession>): AppSleepSession => ({
  id: 'session-1',
  child_id: 'child-1',
  type: 'nap',
  start_at: '2026-06-05T10:00:00.000Z',
  end_at: '2026-06-05T11:00:00.000Z',
  notes: null,
  tags: [],
  created_by: 'user-1',
  created_at: '2026-06-05T10:00:00.000Z',
  ...overrides,
});

describe('toLibSessions', () => {
  it('maps "nap" type to "NAP" and "night_sleep" to "NIGHT"', () => {
    const sessions = [
      baseSession({ id: 'n1', type: 'nap' }),
      baseSession({ id: 'n2', type: 'night_sleep' }),
    ];
    const lib = toLibSessions(sessions);
    expect(lib).toHaveLength(2);
    expect(lib[0]?.type).toBe('NAP');
    expect(lib[1]?.type).toBe('NIGHT');
  });

  it('converts ISO string timestamps to Date objects', () => {
    const sessions = [baseSession({})];
    const lib = toLibSessions(sessions);
    expect(lib[0]?.start).toBeInstanceOf(Date);
    expect(lib[0]?.end).toBeInstanceOf(Date);
    expect(lib[0]?.start.toISOString()).toBe('2026-06-05T10:00:00.000Z');
    expect(lib[0]?.end.toISOString()).toBe('2026-06-05T11:00:00.000Z');
  });

  it('filters out active sessions (end_at === null)', () => {
    const sessions = [
      baseSession({ id: 'ended' }),
      baseSession({ id: 'active', end_at: null }),
    ];
    const lib = toLibSessions(sessions);
    expect(lib).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(toLibSessions([])).toEqual([]);
  });
});

describe('toLibActiveSession', () => {
  it('maps the active session (end_at === null) to { start, type }, absent from history', () => {
    const sessions = [
      baseSession({ id: 'ended' }),
      baseSession({ id: 'active', type: 'night_sleep', start_at: '2026-06-05T20:00:00.000Z', end_at: null }),
    ];
    const active = toLibActiveSession(sessions);
    expect(active).toEqual({ start: new Date('2026-06-05T20:00:00.000Z'), type: 'NIGHT' });
    // Active session is excluded from history (regression: toLibSessions filter kept intact).
    expect(toLibSessions(sessions)).toHaveLength(1);
    expect(toLibSessions(sessions)[0]?.type).toBe('NAP');
  });

  it('maps NAP type correctly', () => {
    const sessions = [baseSession({ id: 'active', type: 'nap', end_at: null })];
    expect(toLibActiveSession(sessions)?.type).toBe('NAP');
  });

  it('returns undefined when no session is active', () => {
    const sessions = [baseSession({ id: 'ended-1' }), baseSession({ id: 'ended-2' })];
    expect(toLibActiveSession(sessions)).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(toLibActiveSession([])).toBeUndefined();
  });
});

describe('toLibProfile', () => {
  it('builds profile with only dateOfBirth from birthDateIso', () => {
    const profile = toLibProfile('2024-01-15');
    expect(profile.dateOfBirth).toBeInstanceOf(Date);
    expect(profile.targetWakeTime).toBeUndefined();
    expect(profile.preferredNapsCount).toBeUndefined();
    expect(profile.preferredBedtime).toBeUndefined();
  });

  it('parses targetWakeTime "HH:MM" / "HH:MM:SS" (Postgres) to TimeOfDay', () => {
    expect(toLibProfile('2024-01-15', '07:30').targetWakeTime).toEqual({ hour: 7, minute: 30 });
    expect(toLibProfile('2024-01-15', '06:00:00').targetWakeTime).toEqual({ hour: 6, minute: 0 });
  });

  it('ignores invalid/null targetWakeTime silently (fail-safe)', () => {
    expect(toLibProfile('2024-01-15', null).targetWakeTime).toBeUndefined();
    expect(toLibProfile('2024-01-15', '25:00').targetWakeTime).toBeUndefined();
  });

  it('attaches preferredNapsCount only when not null', () => {
    expect(toLibProfile('2024-01-15', undefined, 2).preferredNapsCount).toBe(2);
    expect(toLibProfile('2024-01-15', undefined, 0).preferredNapsCount).toBe(0);
    expect(toLibProfile('2024-01-15', undefined, null).preferredNapsCount).toBeUndefined();
  });

  it('parses preferredBedtime "HH:MM" to TimeOfDay', () => {
    const profile = toLibProfile('2024-01-15', undefined, null, '19:30');
    expect(profile.preferredBedtime).toEqual({ hour: 19, minute: 30 });
  });

  it('parses preferredBedtime "HH:MM:SS" to TimeOfDay (Postgres format)', () => {
    const profile = toLibProfile('2024-01-15', undefined, null, '20:15:00');
    expect(profile.preferredBedtime).toEqual({ hour: 20, minute: 15 });
  });

  it('ignores invalid preferredBedtime format silently (fail-safe)', () => {
    expect(toLibProfile('2024-01-15', undefined, null, 'not-a-time').preferredBedtime).toBeUndefined();
    expect(toLibProfile('2024-01-15', undefined, null, '25:00').preferredBedtime).toBeUndefined();
    expect(toLibProfile('2024-01-15', undefined, null, '12:60').preferredBedtime).toBeUndefined();
  });

  it('handles null preferredBedtime gracefully', () => {
    expect(toLibProfile('2024-01-15', undefined, null, null).preferredBedtime).toBeUndefined();
  });
});
