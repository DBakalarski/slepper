import { useEffect, useState } from 'react';

import { formatDuration, formatTimer } from '@/lib/time';

const TICK_MS = 1000;

interface SessionTimer {
  elapsedMs: number;
  display: string; // "HH:MM:SS"
  short: string; // "1g 43m"
}

// Tickujacy hook: czyta start_at jako zrodlo prawdy, lokalnie liczy diff.
// Nie zapisuje runnig countera w bazie — timer jest derived state.
export function useSessionTimer(startAt: Date | null): SessionTimer {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startAt) return;
    // Pierwszy tick natychmiast po remount, zeby UI nie pokazal stale value.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [startAt]);

  if (!startAt) {
    return { elapsedMs: 0, display: '00:00:00', short: '0m' };
  }

  const elapsedMs = Math.max(0, now - startAt.getTime());
  return {
    elapsedMs,
    display: formatTimer(elapsedMs),
    short: formatDuration(elapsedMs),
  };
}
