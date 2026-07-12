// Adapter: app's domain types ↔ sleeper-machine's domain types.
// sleeper-machine is intentionally agnostic about the app's data layer —
// it consumes plain Date objects and uppercase session types. This file
// is the single boundary where conversion happens.

import type {
  SleepSession as LibSleepSession,
  ActiveSleepSession as LibActiveSleepSession,
  ChildProfile as LibChildProfile,
  TimeOfDay,
} from 'sleeper-machine';
import type { SleepSession as AppSleepSession } from '@/features/sessions/hooks';

// App stores type as 'nap' | 'night_sleep'. Lib uses 'NAP' | 'NIGHT'.
// Exported: also reused by active-session-tail-entry.ts (synthesizing a
// PlanEntry for the in-progress session's tail, finding C2) — single boundary
// for this mapping, no duplication.
export function toLibType(t: AppSleepSession['type']): LibSleepSession['type'] {
  return t === 'nap' ? 'NAP' : 'NIGHT';
}

/**
 * Convert app sessions to lib format. Filters out active sessions
 * (end_at === null) — `recommend()` throws on end ≤ start, and an
 * active session has no `end_at` yet. Surface the active session
 * separately in UI if needed.
 */
export function toLibSessions(appSessions: readonly AppSleepSession[]): LibSleepSession[] {
  const out: LibSleepSession[] = [];
  for (const s of appSessions) {
    if (s.end_at === null) continue; // skip active/ongoing sessions
    out.push({
      start: new Date(s.start_at),
      end: new Date(s.end_at),
      type: toLibType(s.type),
    });
  }
  return out;
}

/**
 * Extract the active (in-progress) session — `end_at === null` — and map it
 * to the lib's `ActiveSleepSession` shape (`{ start, type }`, no `end`).
 * Returns `undefined` when no session is in progress. Consumed as
 * `state.activeSession` so the engine can re-anchor the plan (kaskada
 * kotwicy: NAP w toku / NIGHT w toku / brak). At most one active session
 * exists per child (DB constraint), so the first match wins.
 *
 * Clamps `start` to `now` when `start > now`. The engine validates
 * `activeSession.start <= state.now` and throws otherwise — a refetch right
 * after START can race a stale `now` tick (`useNow` ticks every 30s), so the
 * freshly-created session's `start_at` can be a few seconds ahead of the
 * `now` still held by the render. Clamping here (rather than loosening the
 * engine's invariant) keeps the boundary validation strict while making the
 * UI-side adapter tolerant of this specific clock race (finding C1, final
 * review feat/plan-dnia-os-24h).
 */
export function toLibActiveSession(
  appSessions: readonly AppSleepSession[],
  now: Date,
): LibActiveSleepSession | undefined {
  const active = appSessions.find((s) => s.end_at === null);
  if (!active) return undefined;
  const start = new Date(active.start_at);
  return {
    start: start.getTime() > now.getTime() ? now : start,
    type: toLibType(active.type),
  };
}

// Parser Postgres 'HH:MM:SS' (lub 'HH:MM') -> TimeOfDay. Zwraca null gdy
// format niepoprawny — pole jest opcjonalne, wiec fail-safe (algorytm dziala
// dalej bez bedtime override).
function parseTimeString(value: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function toLibProfile(
  birthDateIso: string,
  targetWakeTime?: string | null,
  preferredNapsCount?: number | null,
  preferredBedtime?: string | null,
): LibChildProfile {
  const dateOfBirth = new Date(birthDateIso);
  const profile: {
    dateOfBirth: Date;
    targetWakeTime?: TimeOfDay;
    preferredNapsCount?: number;
    preferredBedtime?: TimeOfDay;
  } = { dateOfBirth };
  if (targetWakeTime) {
    const parsed = parseTimeString(targetWakeTime);
    if (parsed) profile.targetWakeTime = parsed;
  }
  if (preferredNapsCount != null) profile.preferredNapsCount = preferredNapsCount;
  if (preferredBedtime) {
    const parsed = parseTimeString(preferredBedtime);
    if (parsed) profile.preferredBedtime = parsed;
  }
  return profile;
}
