// FAZA 2 (IU5): import z @/features/sessions/hooks świadomie niedziałający do kopii features/sessions/.
// Patrz docs/active/sleeper-web-pwa/sleeper-web-pwa-kontekst.md sekcja "Faza 1 — znane TS errors (deferred do IU5)".
import type { SleepSession } from '@/features/sessions/hooks';

import { dayKeyInAppTz } from './time';

// Mapuje `sessionId -> gapBeforeMs` (czas aktywnosci miedzy zakonczeniem
// poprzedniej sesji a startem tej sesji, w UTC ms).
//
// Wejscie: lista sesji w dowolnej kolejnosci. Funkcja sama je sortuje rosnaco
// po `start_at` i grupuje per dzien (app tz). Gap liczony tylko miedzy parami
// w obrebie tego samego dnia (cross-day = nowa sekcja w UI, bez aktywnosci).
//
// Wyjscie: Map<sessionId, gapMs>. Sesje bez poprzednika w danym dniu, lub
// te ktorych poprzednik jeszcze trwa (end_at=null), nie pojawiaja sie w mapie.
//
// TZ-safe: input/output w UTC ms, grupowanie po `dayKeyInAppTz` (Europe/Warsaw).
export function computeGapsBetweenSessions(
  sessions: SleepSession[],
): Map<string, number> {
  const result = new Map<string, number>();
  if (sessions.length < 2) return result;

  // Posortuj rosnaco po start_at — kopia zeby nie mutowac inputu.
  const sorted = [...sessions].sort((a, b) => {
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];

    // Poprzednia sesja jeszcze trwa — nie liczymy gapu (logicznie sa rownolegle,
    // co i tak nie powinno sie zdarzyc przez partial unique idx, ale defensywnie).
    if (prev.end_at === null) continue;

    const prevEnd = new Date(prev.end_at);
    const nextStart = new Date(next.start_at);

    // Pary z roznych dni app tz — gap pomijamy (cross-day to nowa sekcja w UI).
    if (dayKeyInAppTz(prevEnd) !== dayKeyInAppTz(nextStart)) continue;

    const gapMs = nextStart.getTime() - prevEnd.getTime();
    if (gapMs <= 0) continue;

    result.set(next.id, gapMs);
  }

  return result;
}
