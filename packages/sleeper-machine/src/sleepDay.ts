import type { DateTime, SleepSession } from './types.js';

export function sleepDayBoundary(t: DateTime, dayStartHour = 4): DateTime {
  const boundary = new Date(t.getTime());
  boundary.setHours(dayStartHour, 0, 0, 0);
  if (t.getHours() < dayStartHour) {
    boundary.setDate(boundary.getDate() - 1);
  }
  return boundary;
}

export function sleepDayId(boundary: DateTime): string {
  const y = boundary.getFullYear();
  const m = String(boundary.getMonth() + 1).padStart(2, '0');
  const d = String(boundary.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function groupBySleepDay(
  sessions: readonly SleepSession[],
  dayStartHour = 4,
): Map<string, SleepSession[]> {
  const map = new Map<string, SleepSession[]>();
  for (const session of sessions) {
    const id = sleepDayId(sleepDayBoundary(session.start, dayStartHour));
    const bucket = map.get(id);
    if (bucket) {
      bucket.push(session);
    } else {
      map.set(id, [session]);
    }
  }
  return map;
}
