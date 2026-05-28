import { useEffect, useMemo, useState } from 'react';

import { formatDuration, formatTimer } from '@/lib/time';

const TICK_MS = 1000;

interface SessionTimer {
  elapsedMs: number;
  display: string; // "HH:MM:SS"
  short: string; // "1g 43m"
}

// Tickujacy hook: czyta start_at jako zrodlo prawdy, lokalnie liczy diff.
// Nie zapisuje runnig countera w bazie — timer jest derived state.
//
// API przyjmuje string (ISO z bazy) zamiast Date — string jest stable po
// porownaniu referencji w useEffect deps, podczas gdy `new Date(s.start_at)`
// po stronie wywolujacego tworzylby nowa referencje co render i useEffect
// re-tworzylby setInterval (drift co render).
export function useSessionTimer(startAt: string | null): SessionTimer {
  const [now, setNow] = useState<number>(() => Date.now());

  const startMs = useMemo(() => {
    if (!startAt) return null;
    const parsed = Date.parse(startAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [startAt]);

  useEffect(() => {
    if (startMs === null) return;
    // Pierwszy tick natychmiast po remount, zeby UI nie pokazal stale value.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [startMs]);

  if (startMs === null) {
    return { elapsedMs: 0, display: '00:00:00', short: '0m' };
  }

  const elapsedMs = Math.max(0, now - startMs);
  return {
    elapsedMs,
    display: formatTimer(elapsedMs),
    short: formatDuration(elapsedMs),
  };
}
