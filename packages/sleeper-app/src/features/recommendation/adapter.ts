// Adapter: app's domain types ↔ sleeper-machine's domain types.
// sleeper-machine is intentionally agnostic about the app's data layer —
// it consumes plain Date objects and uppercase session types. This file
// is the single boundary where conversion happens.

import type {
  SleepSession as LibSleepSession,
  ChildProfile as LibChildProfile,
  TimeOfDay,
} from 'sleeper-machine';
import type { SleepSession as AppSleepSession } from '@/features/sessions/hooks';

// App stores type as 'nap' | 'night_sleep'. Lib uses 'NAP' | 'NIGHT'.
function toLibType(t: AppSleepSession['type']): LibSleepSession['type'] {
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

export function toLibProfile(
  birthDateIso: string,
  targetWakeTime?: TimeOfDay,
): LibChildProfile {
  const dateOfBirth = new Date(birthDateIso);
  return targetWakeTime ? { dateOfBirth, targetWakeTime } : { dateOfBirth };
}
