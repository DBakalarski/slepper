import { useEffect, useState } from 'react';

/**
 * Re-renders the consumer with a fresh `Date` every `intervalMs` milliseconds.
 *
 * Use for time-sensitive UI (sleep recommendations, countdowns, activity windows)
 * where you need `now` to advance without user interaction.
 *
 * Returns a stable `Date` reference per tick (same value across re-renders
 * within an interval — so dependency arrays in downstream `useMemo` stay stable).
 *
 * @example
 *   const now = useNow(30_000); // tick every 30s
 *   const elapsed = now.getTime() - lastSleepEnd.getTime();
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
