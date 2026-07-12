import { describe, expect, it } from 'vitest';

// due.ts to czysta logika edge function send-nap-push (zero Deno API) —
// importowana relatywnie spoza src/, testowana vitestem web paczki.
import { classifyDue, formatPushBody } from '../../../../supabase/functions/send-nap-push/due';

const NEXT = new Date('2026-07-12T11:00:00Z');

function candidate(leadMinutes: number, alreadyDelivered = false) {
  return { nextSleepAt: NEXT, leadMinutes, alreadyDelivered };
}

describe('classifyDue', () => {
  it('not-yet gdy za wczesnie (przed oknem lead)', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:30:00Z'))).toBe('not-yet');
  });

  it('send gdy w oknie [next-lead, next)', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:45:00Z'))).toBe('send');
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:59:59Z'))).toBe('send');
  });

  it('skip-expired gdy next_sleep_at minal', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T11:00:00Z'))).toBe('skip-expired');
    expect(classifyDue(candidate(15), new Date('2026-07-12T12:00:00Z'))).toBe('skip-expired');
  });

  it('already-delivered ma priorytet', () => {
    expect(classifyDue(candidate(15, true), new Date('2026-07-12T10:45:00Z'))).toBe(
      'already-delivered',
    );
  });

  it('respektuje lead_minutes per subskrypcja', () => {
    const now = new Date('2026-07-12T10:35:00Z');
    expect(classifyDue(candidate(30), now)).toBe('send');
    expect(classifyDue(candidate(15), now)).toBe('not-yet');
  });
});

describe('formatPushBody', () => {
  it('formatuje czas w Europe/Warsaw i zaokragla minuty', () => {
    // 11:00 UTC = 13:00 w Europe/Warsaw (CEST w lipcu).
    expect(formatPushBody(NEXT, new Date('2026-07-12T10:46:00Z'))).toBe(
      'Rekomendowany sen ok. 13:00 (za ~14 min)',
    );
  });
});
