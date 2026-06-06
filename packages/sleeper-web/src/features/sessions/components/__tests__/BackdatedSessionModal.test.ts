import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { addDaysInAppTz, parseAppTzDateTime } from '@/lib/time';

// Static-invariants + pipeline-simulation test dla BackdatedSessionModal (web).
// Pure-function strategy: weryfikujemy logike `endDate = addDaysInAppTz(...)`
// dla cross-day night sleep przez bezposrednie wywolanie helperow
// (komponent nie eksportuje wewn. parserow). Static invariants pokrywaja
// reszte (regex format, brak setHours/setDate, brak native picker depsa).
// (review Fazy 3 P2.4 + learned-patterns 2026-05-29 cross-day night sleep)

const SRC_PATH = resolve(__dirname, '../BackdatedSessionModal.tsx');
const src = readFileSync(SRC_PATH, 'utf-8');

describe('BackdatedSessionModal static invariants', () => {
  it('uses parseAppTzDateTime dla TZ-safe parsing inputow', () => {
    expect(src).toMatch(/parseAppTzDateTime/);
  });

  it('uses addDaysInAppTz dla cross-day night sleep (NIE +86400000)', () => {
    expect(src).toMatch(/addDaysInAppTz/);
    // anti-pattern: dodawanie milisekund do Date
    expect(src).not.toMatch(/86_?400_?000/);
  });

  it('walidacja czasu HH:MM przez regex (00:00-23:59)', () => {
    expect(src).toMatch(/TIME_REGEX/);
    expect(src).toMatch(/\^\(\[01\]\\d\|2\[0-3\]\):\(\[0-5\]\\d\)\$/);
  });

  it('walidacja daty YYYY-MM-DD przez regex', () => {
    expect(src).toMatch(/DATE_REGEX/);
  });

  it('blokuje przyszle sesje (Date.now() > start)', () => {
    expect(src).toMatch(/Date\.now\(\)/);
    expect(src).toMatch(/przyszlosci/);
  });

  it('blokuje end <= start (oprocz cross-day night sleep)', () => {
    expect(src).toMatch(/end <= start/);
  });

  it('does NOT use setHours / setDate / setMonth na raw Date', () => {
    expect(src).not.toMatch(/\.setHours\(/);
    expect(src).not.toMatch(/\.setDate\(/);
    expect(src).not.toMatch(/\.setMonth\(/);
    expect(src).not.toMatch(/\.setFullYear\(/);
  });

  it('does NOT import @react-native-community/datetimepicker', () => {
    expect(src).not.toMatch(/@react-native-community\/datetimepicker/);
  });

  it('does NOT import Alert (modal handle bledow przez inline Text)', () => {
    expect(src).not.toMatch(/from 'react-native'[\s\S]{0,200}\bAlert\b/);
  });
});

describe('BackdatedSessionModal cross-day pipeline (pure-function simulation)', () => {
  it('night_sleep 22:00 → 06:30: end na nastepny dzien (addDaysInAppTz)', () => {
    const date = '2026-06-05';
    const startTime = '22:00';
    const endTime = '06:30';
    const start = parseAppTzDateTime(date, startTime);
    expect(start).not.toBeNull();

    // Replikuje logike komponentu: jesli end <= start (minuty), addDaysInAppTz.
    const startMin = 22 * 60 + 0;
    const endMin = 6 * 60 + 30;
    expect(endMin).toBeLessThan(startMin);

    const endDate = addDaysInAppTz(date, 1);
    expect(endDate).toBe('2026-06-06');

    const end = parseAppTzDateTime(endDate, endTime);
    expect(end).not.toBeNull();
    expect(end!.getTime()).toBeGreaterThan(start!.getTime());
  });

  it('nap 09:00 → 10:30: end ten sam dzien (no roll-over)', () => {
    const date = '2026-06-05';
    const start = parseAppTzDateTime(date, '09:00');
    const end = parseAppTzDateTime(date, '10:30');
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    expect(end!.getTime()).toBeGreaterThan(start!.getTime());
  });

  it('addDaysInAppTz przekracza DST boundary bezpiecznie (warsaw spring forward)', () => {
    // 2026-03-29 02:00 → 03:00 (CEST) — addDaysInAppTz nie powinno gubic godzin
    const next = addDaysInAppTz('2026-03-28', 1);
    expect(next).toBe('2026-03-29');
  });
});
