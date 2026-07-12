import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Do 2026-07-12 ten plik testowal no-op mock (push poza scope PWA). Feature
// web-push wypelnil implementacje — testujemy delegacje do recomputeNapSchedule
// i fail-safe (fire-and-forget). Spec:
// docs/superpowers/specs/2026-07-12-web-push-notifications-design.md.

const { recomputeMock } = vi.hoisted(() => ({
  recomputeMock: vi.fn<(childId: string) => Promise<void>>(),
}));

vi.mock('../nap-schedule', () => ({
  recomputeNapSchedule: (childId: string) => recomputeMock(childId),
}));

import {
  cancelNapNotificationSafe,
  rescheduleFromLastEnded,
  rescheduleNapNotification,
} from '../schedule-nap-side-effects';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../schedule-nap-side-effects.ts');

describe('schedule-nap-side-effects (delegacja do recomputeNapSchedule)', () => {
  beforeEach(() => {
    recomputeMock.mockReset();
    recomputeMock.mockResolvedValue(undefined);
  });

  it('rescheduleNapNotification przelicza harmonogram dziecka', async () => {
    await rescheduleNapNotification('child-1', new Date());
    expect(recomputeMock).toHaveBeenCalledTimes(1);
    expect(recomputeMock).toHaveBeenCalledWith('child-1');
  });

  it('cancelNapNotificationSafe przelicza harmonogram dziecka', async () => {
    await cancelNapNotificationSafe('child-2');
    expect(recomputeMock).toHaveBeenCalledTimes(1);
    expect(recomputeMock).toHaveBeenCalledWith('child-2');
  });

  it('rescheduleFromLastEnded przelicza harmonogram dziecka', async () => {
    await rescheduleFromLastEnded('child-3');
    expect(recomputeMock).toHaveBeenCalledTimes(1);
    expect(recomputeMock).toHaveBeenCalledWith('child-3');
  });

  it('blad przeliczenia NIE propaguje (fire-and-forget z hooks.ts)', async () => {
    recomputeMock.mockRejectedValue(new Error('network down'));
    await expect(rescheduleNapNotification('child-1', null)).resolves.toBeUndefined();
    await expect(cancelNapNotificationSafe('child-1')).resolves.toBeUndefined();
    await expect(rescheduleFromLastEnded('child-1')).resolves.toBeUndefined();
  });

  // Invariant: web build NIE moze importowac expo-notifications (native-only).
  it('does NOT import expo-notifications', () => {
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toContain('expo-notifications');
  });
});
