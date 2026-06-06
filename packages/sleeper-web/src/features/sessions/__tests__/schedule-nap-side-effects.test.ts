import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cancelNapNotificationSafe,
  rescheduleFromLastEnded,
  rescheduleNapNotification,
} from '../schedule-nap-side-effects';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../schedule-nap-side-effects.ts');

describe('schedule-nap-side-effects (web no-op mock)', () => {
  it('exports rescheduleNapNotification as resolved no-op', async () => {
    await expect(
      rescheduleNapNotification('child-id', new Date()),
    ).resolves.toBeUndefined();
    await expect(
      rescheduleNapNotification('child-id', null),
    ).resolves.toBeUndefined();
  });

  it('exports cancelNapNotificationSafe as resolved no-op', async () => {
    await expect(cancelNapNotificationSafe('child-id')).resolves.toBeUndefined();
  });

  it('exports rescheduleFromLastEnded as resolved no-op', async () => {
    await expect(rescheduleFromLastEnded('child-id')).resolves.toBeUndefined();
  });

  // Invariant: web build NIE moze importowac expo-notifications (native-only,
  // poza scope PWA per plan techniczny "Granice scope'u").
  it('does NOT import expo-notifications', () => {
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toContain('expo-notifications');
  });

  // Invariant: web build NIE importuje nawet @/lib/notifications. Mock jest
  // celowo standalone — eliminuje calkowity graf zaleznosci notyfikacji.
  it('does NOT import @/lib/notifications (standalone web mock)', () => {
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"]@\/lib\/notifications['"]/);
  });
});
