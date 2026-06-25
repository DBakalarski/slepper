import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { formatDuration, formatTimer } from '@/lib/time';

const TICK_MS = 1000;
// Wolniejszy tick gdy karta jest w tle (document.hidden) — oszczednosc baterii.
// Czas pozostaje derived (now - startMs), wiec rzadszy tick NIE powoduje dryfu;
// po powrocie focusu wymuszamy natychmiastowy setNow + szybki interwal.
const SLOW_TICK_MS = 30_000;

interface SessionTimer {
  elapsedMs: number;
  display: string; // "HH:MM:SS"
  short: string; // "1g 43m"
}

const IDLE_TIMER: SessionTimer = { elapsedMs: 0, display: '00:00:00', short: '0m' };

// Pure derived-state: timer to zawsze funkcja (startMs, now), nigdy zapisany
// counter. Wyciagniete osobno, zeby gwarancje braku dryfu testowac
// behawioralnie bez renderera.
export function computeSessionTimer(startMs: number | null, now: number): SessionTimer {
  if (startMs === null) return IDLE_TIMER;
  const elapsedMs = Math.max(0, now - startMs);
  return {
    elapsedMs,
    display: formatTimer(elapsedMs),
    short: formatDuration(elapsedMs),
  };
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

    // Native (Expo Go) lub brak DOM: zachowaj prosty staly interwal — brak
    // visibilitychange, brak regresji parytetu (learned-patterns: web-guard).
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      const id = setInterval(() => setNow(Date.now()), TICK_MS);
      return () => clearInterval(id);
    }

    let intervalId: ReturnType<typeof setInterval>;

    function startInterval(periodMs: number): void {
      intervalId = setInterval(() => setNow(Date.now()), periodMs);
    }

    function handleVisibility(): void {
      clearInterval(intervalId);
      if (document.hidden) {
        startInterval(SLOW_TICK_MS);
      } else {
        // Powrot focusu: natychmiast dokladny czas + powrot do szybkiego ticka.
        setNow(Date.now());
        startInterval(TICK_MS);
      }
    }

    startInterval(document.hidden ? SLOW_TICK_MS : TICK_MS);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [startMs]);

  return computeSessionTimer(startMs, now);
}
