// Side-effects harmonogramu powiadomien push po mutacjach sesji.
// Do 2026-07-12 no-op (push wykluczony ze scope PWA); wypelnione w ramach
// feature/web-push-notifications — patrz spec
// docs/superpowers/specs/2026-07-12-web-push-notifications-design.md.
// Sygnatury bez zmian — hooks.ts (callsite'y start/end/update/delete) nietkniete.
// Wszystkie trzy funkcje deleguja do jednego przeliczenia z bazy: to scisle
// mocniejsza wersja kazdej z dawnych semantyk (cancel/reschedule/from-last-ended).

import { recomputeNapSchedule } from './nap-schedule';

async function recomputeSafe(childId: string): Promise<void> {
  try {
    await recomputeNapSchedule(childId);
  } catch (err) {
    // Fire-and-forget: harmonogram powiadomien nie moze wywalic mutacji sesji.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[nap-schedule] recompute failed', err);
    }
  }
}

export async function rescheduleNapNotification(
  childId: string,
  _lastSleepEndAt: Date | null,
): Promise<void> {
  await recomputeSafe(childId);
}

export async function cancelNapNotificationSafe(childId: string): Promise<void> {
  await recomputeSafe(childId);
}

export async function rescheduleFromLastEnded(childId: string): Promise<void> {
  await recomputeSafe(childId);
}
