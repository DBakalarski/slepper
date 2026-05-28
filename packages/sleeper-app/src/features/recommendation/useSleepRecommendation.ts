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

// Minimalny shape dziecka, ktory hook potrzebuje. Pelny Child interface jest
// w features/children/hooks — tu unikamy circular dep i ograniczamy zaleznosci.
export type ChildForRecommendation = {
  readonly id: string;
  readonly birth_date: string;
  readonly preferred_naps_per_day: number | null;
  readonly preferred_bedtime: string | null;
};

/**
 * Compute live sleep recommendation for a child.
 *
 * - Pulls last 14 days of sessions via existing `useSessions` query.
 * - Skips active session (`end_at === null`) at adapter layer.
 * - Re-computes on each render (recommend is <1 ms; memoized on inputs).
 * - Returns `null` while sessions are loading or child is null.
 */
export function useSleepRecommendation(
  child: ChildForRecommendation | null,
  now: Date,
  targetWakeTime?: TimeOfDay,
): UseSleepRecommendationResult {
  const rangeStart = useMemo(() => new Date(now.getTime() - 14 * MS_PER_DAY), [now]);
  const sessionsQuery = useSessions(child?.id ?? null, rangeStart, now);

  const recommendation = useMemo<Recommendation | null>(() => {
    if (!child) return null;
    if (!sessionsQuery.data) return null;
    const profile = toLibProfile(
      child.birth_date,
      targetWakeTime,
      child.preferred_naps_per_day,
      child.preferred_bedtime,
    );
    const state = { now, history: toLibSessions(sessionsQuery.data) };
    return recommend(state, profile);
  }, [child, now, targetWakeTime, sessionsQuery.data]);

  return {
    recommendation,
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error as Error | null,
  };
}
