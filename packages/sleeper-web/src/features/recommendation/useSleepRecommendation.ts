// React hook wrapping sleeper-machine.recommend() with the app's
// data layer (react-query useSessions + child birth_date).

import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { recommend as recommendGalland, type Recommendation } from 'sleeper-machine';
import { recommendKotkiDwa } from 'sleeper-machine-kotki';
import { useSessions } from '@/features/sessions/hooks';
import { dayKeyInAppTz, startOfDayInAppTz, endOfDayInAppTz } from '@/lib/time';
import { toLibSessions, toLibActiveSession, toLibProfile } from './adapter';

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
  readonly preferred_wake_time: string | null;
  readonly algorithm: 'galland' | 'kotki_dwa';
};

/**
 * Compute live sleep recommendation for a child.
 *
 * - Pulls last 14 days of sessions via existing `useSessions` query.
 * - Active session (`end_at === null`) is excluded from `history` but
 *   passed separately as `state.activeSession` — the engine uses it to
 *   re-anchor the plan (kaskada kotwicy). No extra query: the 14-day
 *   range already includes the in-progress session.
 * - Re-computes on each render (recommend is <1 ms; memoized on inputs).
 * - Returns `null` while sessions are loading or child is null.
 *
 * queryKey stabilization: dayKey computed ONCE on mount (useMemo with []).
 * Cross-midnight refresh handled by useFocusEffect invalidating ['sessions']
 * when dayKeyInAppTz(new Date()) differs from the mounted dayKey.
 */
export function useSleepRecommendation(
  child: ChildForRecommendation | null,
  now: Date,
): UseSleepRecommendationResult {
  const queryClient = useQueryClient();

  // dayKey stabilized once on mount — prevents refetch loop caused by
  // now ticking every 30s producing a new toISOString() in queryKey.
  // See: docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dayKey = useMemo(() => dayKeyInAppTz(now), []);

  // rangeStart = start of the day 14 days ago; rangeEnd = end of today.
  // Both derived from stable dayKey — stable across 30s ticks.
  const rangeStart = useMemo(() => {
    const todayStart = startOfDayInAppTz(new Date(dayKey));
    return new Date(todayStart.getTime() - 14 * 86_400_000);
  }, [dayKey]);

  const rangeEnd = useMemo(() => endOfDayInAppTz(new Date(dayKey)), [dayKey]);

  // Cross-midnight: when screen regains focus on a new day, invalidate
  // sessions so fresh data is loaded. This triggers a re-mount of the
  // hook's consumer which will compute a new dayKey.
  useFocusEffect(
    useCallback(() => {
      const currentDayKey = dayKeyInAppTz(new Date());
      if (currentDayKey !== dayKey && child?.id) {
        void queryClient.invalidateQueries({ queryKey: ['sessions', child.id] });
      }
    }, [dayKey, child?.id, queryClient]),
  );

  // Web edge: useFocusEffect na react-native-web reaguje tylko na
  // `visibilitychange` (bg → fg). Jesli user trzyma karte otwarta przez
  // polnoc bez przelaczania zakladki, dayKey w queryKey nie odswiezy sie.
  // Fallback: polling co 5 min — jezeli dayKeyInAppTz zmieni sie, invalidate
  // ['sessions'] i pozwol konsumentowi re-mountowac. (review Fazy 3 P2.2)
  useEffect(() => {
    if (!child?.id) return;
    const interval = setInterval(
      () => {
        const currentDayKey = dayKeyInAppTz(new Date());
        if (currentDayKey !== dayKey) {
          void queryClient.invalidateQueries({ queryKey: ['sessions', child.id] });
        }
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [dayKey, child?.id, queryClient]);

  const sessionsQuery = useSessions(child?.id ?? null, rangeStart, rangeEnd);

  const recommendation = useMemo<Recommendation | null>(() => {
    if (!child) return null;
    if (!sessionsQuery.data) return null;
    const profile = toLibProfile(
      child.birth_date,
      child.preferred_wake_time,
      child.preferred_naps_per_day,
      child.preferred_bedtime,
    );
    const state = {
      now,
      history: toLibSessions(sessionsQuery.data),
      activeSession: toLibActiveSession(sessionsQuery.data, now),
    };
    const fn = child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland;
    // Fail-safe (finding C1, final review): the engine validates its input
    // and throws on invariant violations (e.g. stale `now` racing a fresh
    // active session). This runs inside useMemo — an uncaught throw here
    // happens during render with no ErrorBoundary above this tree, so it
    // would white-screen the whole app. Swallow, log, and degrade to "no
    // recommendation" rather than crash.
    try {
      return fn(state, profile);
    } catch (err) {
      console.error('[useSleepRecommendation] recommend() threw, degrading to null', err);
      return null;
    }
  }, [child, now, sessionsQuery.data]);

  return {
    recommendation,
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error as Error | null,
  };
}
