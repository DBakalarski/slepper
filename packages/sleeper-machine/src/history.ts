import { Hours, Minutes } from './types.js';
import type { DateTime, SleepSession } from './types.js';
import { groupBySleepDay } from './sleepDay.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_MINUTE = 1000 * 60;

function filterByLookback(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays: number,
  key: (s: SleepSession) => DateTime,
): SleepSession[] {
  const cutoff = now.getTime() - lookbackDays * MS_PER_DAY;
  return history.filter((s) => key(s).getTime() >= cutoff);
}

function durationHours(s: SleepSession): Hours {
  return Hours((s.end.getTime() - s.start.getTime()) / MS_PER_HOUR);
}

function durationMinutes(s: SleepSession): Minutes {
  return Minutes((s.end.getTime() - s.start.getTime()) / MS_PER_MINUTE);
}

export function observedTotalSleepPerDay(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays = 14,
): Map<string, Hours> {
  const filtered = filterByLookback(history, now, lookbackDays, (s) => s.start);
  const grouped = groupBySleepDay(filtered);
  const out = new Map<string, Hours>();
  for (const [id, sessions] of grouped) {
    const total = sessions.reduce((acc, s) => acc + durationHours(s), 0);
    out.set(id, Hours(total));
  }
  return out;
}

export function observedNapsPerDay(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays = 14,
): Map<string, number> {
  const filtered = filterByLookback(history, now, lookbackDays, (s) => s.start);
  const grouped = groupBySleepDay(filtered);
  const out = new Map<string, number>();
  for (const [id, sessions] of grouped) {
    out.set(id, sessions.filter((s) => s.type === 'NAP').length);
  }
  return out;
}

export function observedLongestSleepPerDay(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays = 14,
): Map<string, Hours> {
  const filtered = filterByLookback(history, now, lookbackDays, (s) => s.start);
  const grouped = groupBySleepDay(filtered);
  const out = new Map<string, Hours>();
  for (const [id, sessions] of grouped) {
    const longest = sessions.reduce(
      (max, s) => Math.max(max, durationHours(s)),
      0,
    );
    out.set(id, Hours(longest));
  }
  return out;
}

export function observedNapLengthsPerDay(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays = 14,
): Map<string, Minutes[]> {
  const filtered = filterByLookback(history, now, lookbackDays, (s) => s.start);
  const grouped = groupBySleepDay(filtered);
  const out = new Map<string, Minutes[]>();
  for (const [id, sessions] of grouped) {
    out.set(
      id,
      sessions.filter((s) => s.type === 'NAP').map(durationMinutes),
    );
  }
  return out;
}

export function observedMorningWake(
  history: readonly SleepSession[],
  now: DateTime,
  lookbackDays = 7,
): DateTime[] {
  const filtered = filterByLookback(history, now, lookbackDays, (s) => s.end);
  return filtered
    .filter((s) => s.type === 'NIGHT')
    .map((s) => s.end)
    .sort((a, b) => a.getTime() - b.getTime());
}
