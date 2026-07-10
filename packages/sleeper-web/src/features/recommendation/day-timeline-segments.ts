import type { PlanEntry } from 'sleeper-machine';

import type { SleepSession } from '@/features/sessions/hooks';
import { endOfDayInAppTz, startOfDayInAppTz } from '@/lib/time';

// Geometria osi 24h "rytm dnia": pozycja segmentu w % szerokosci pasa =
// (t - startOfDayInAppTz(now)) / (endOfDayInAppTz(now) - startOfDayInAppTz(now)).
// Nigdy dzielenie przez staly rozmiar doby w minutach/ms — doba w app tz ma
// 23/25h w dniach DST (patrz global-constraints, day-forecast.ts). Pure,
// bez I/O i bez odczytu zegara systemowego — `now` wchodzi argumentem.
//
// Jeden pas: fakty (sesje) clamp do [startOfDay, now] — sesja w toku
// (`end_at === null`) oraz defensywnie `end_at` z przyszlosci koncza sie na
// `now`. Predykcje (plan) clamp do (now, endOfDay] — wpis planu zaczynajacy
// sie przed `now` (clamp z silnika) startuje od `now`, wiec nigdy nie nachodzi
// na fakty. Wpis NIGHT bez `plannedEnd` liczony do konca doby. Segmenty o
// zerowej/ujemnej szerokosci po clampie sa pomijane.

export type DayTimelineSegmentKind = 'fact-nap' | 'fact-night' | 'plan-nap' | 'plan-night';

export interface DayTimelineSegment {
  readonly leftPct: number;
  readonly widthPct: number;
  readonly kind: DayTimelineSegmentKind;
}

export interface DayTimelineGeometry {
  readonly factSegments: DayTimelineSegment[];
  readonly planSegments: DayTimelineSegment[];
  readonly nowPct: number;
}

export function computeDayTimelineGeometry(
  sessions: readonly SleepSession[],
  plan: readonly PlanEntry[],
  now: Date,
): DayTimelineGeometry {
  const dayStart = startOfDayInAppTz(now);
  const dayEnd = endOfDayInAppTz(now);
  const dayMs = dayEnd.getTime() - dayStart.getTime();

  return {
    factSegments: buildFactSegments(sessions, dayStart, now, dayMs),
    planSegments: buildPlanSegments(plan, dayStart, dayEnd, now, dayMs),
    nowPct: toPct(now.getTime() - dayStart.getTime(), dayMs),
  };
}

function toPct(offsetMs: number, dayMs: number): number {
  return (offsetMs / dayMs) * 100;
}

function factKind(type: SleepSession['type']): DayTimelineSegmentKind {
  return type === 'night_sleep' ? 'fact-night' : 'fact-nap';
}

function planKind(type: PlanEntry['type']): DayTimelineSegmentKind {
  return type === 'NIGHT' ? 'plan-night' : 'plan-nap';
}

// Fakty: sesje obciete do [dayStart, now]. Sesja w toku (`end_at === null`)
// oraz defensywnie `end_at` z przyszlosci -> koniec clampowany do `now`.
function buildFactSegments(
  sessions: readonly SleepSession[],
  dayStart: Date,
  now: Date,
  dayMs: number,
): DayTimelineSegment[] {
  const segments: DayTimelineSegment[] = [];
  for (const session of sessions) {
    const start = new Date(session.start_at);
    const rawEnd = session.end_at ? new Date(session.end_at) : now;
    const clampedStart = start < dayStart ? dayStart : start;
    const clampedEnd = rawEnd > now ? now : rawEnd;
    const widthMs = clampedEnd.getTime() - clampedStart.getTime();
    if (widthMs <= 0) continue;
    segments.push({
      leftPct: toPct(clampedStart.getTime() - dayStart.getTime(), dayMs),
      widthPct: toPct(widthMs, dayMs),
      kind: factKind(session.type),
    });
  }
  return segments;
}

// Predykcje: wpisy planu obciete do (now, dayEnd]. Wpis bez `plannedEnd`
// (typowo NIGHT w toku bez znanej pobudki) liczony do konca doby.
function buildPlanSegments(
  plan: readonly PlanEntry[],
  dayStart: Date,
  dayEnd: Date,
  now: Date,
  dayMs: number,
): DayTimelineSegment[] {
  const segments: DayTimelineSegment[] = [];
  for (const entry of plan) {
    const rawEnd = entry.plannedEnd ?? dayEnd;
    const clampedStart = entry.plannedStart < now ? now : entry.plannedStart;
    const clampedEnd = rawEnd > dayEnd ? dayEnd : rawEnd;
    const widthMs = clampedEnd.getTime() - clampedStart.getTime();
    if (widthMs <= 0) continue;
    segments.push({
      leftPct: toPct(clampedStart.getTime() - dayStart.getTime(), dayMs),
      widthPct: toPct(widthMs, dayMs),
      kind: planKind(entry.type),
    });
  }
  return segments;
}
