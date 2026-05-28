// React hook wrapping sleeper-machine.recommend() with the app's
// data layer (react-query useSessions + child birth_date).

import { useMemo } from 'react';
import { recommend, type Recommendation, type TimeOfDay } from 'sleeper-machine';
import { useSessions } from '@/features/sessions/hooks';
import { toLibSessions, toLibProfile } from './adapter';

const MS_PER_DAY = 86_400_000;

export type UseSleepRecommendationResult = {
  readonly recommendation: Recommendation | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
};

/**
 * Compute live sleep recommendation for a child.
 *
 * - Pulls last 14 days of sessions via existing `useSessions` query.
 * - Skips active session (`end_at === null`) at adapter layer.
 * - Re-computes on each render (recommend is <1 ms; memoized on inputs).
 * - Returns `null` while sessions are loading or childId is missing.
 *
 * @param childId — child UUID (null disables the query)
 * @param birthDateIso — child.birth_date from your child record
 * @param now — current moment (pass `useNow(1000 * 60)` from a tick hook or
 *              just `new Date()` — recommend is deterministic on this input)
 * @param targetWakeTime — optional, e.g. { hour: 7, minute: 0 }
 */
export function useSleepRecommendation(
  childId: string | null,
  birthDateIso: string | null,
  now: Date,
  targetWakeTime?: TimeOfDay,
): UseSleepRecommendationResult {
  const rangeStart = useMemo(() => new Date(now.getTime() - 14 * MS_PER_DAY), [now]);
  const sessionsQuery = useSessions(childId, rangeStart, now);

  const recommendation = useMemo<Recommendation | null>(() => {
    if (!childId || !birthDateIso) return null;
    if (!sessionsQuery.data) return null;
    const profile = toLibProfile(birthDateIso, targetWakeTime);
    const state = { now, history: toLibSessions(sessionsQuery.data) };
    return recommend(state, profile);
  }, [childId, birthDateIso, now, targetWakeTime, sessionsQuery.data]);

  return {
    recommendation,
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error as Error | null,
  };
}
