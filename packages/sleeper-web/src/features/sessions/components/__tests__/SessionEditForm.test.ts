import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants test dla SessionEditForm (web). Strategia "pure-only"
// z Fazy 2 — bez jsdom / RTL, sprawdzamy zrodlo na obecnosc krytycznych
// wzorcow (TZ-safe time, brak native-only depsow, hooked-up pickers).
// (review Fazy 3 P2.4)

const SRC_PATH = resolve(__dirname, '../SessionEditForm.tsx');
const src = readFileSync(SRC_PATH, 'utf-8');

describe('SessionEditForm static invariants', () => {
  it('uses combineDateAndTimeInAppTz dla TZ-safe merge daty + godziny', () => {
    expect(src).toMatch(/combineDateAndTimeInAppTz/);
  });

  it('uses DatePickerField dla daty (HTML5 input on web)', () => {
    expect(src).toMatch(/DatePickerField/);
  });

  it('uses TimePickerField dla godziny (HTML5 input on web)', () => {
    expect(src).toMatch(/TimePickerField/);
  });

  it('uses Chip dla wyboru typu sesji (parytet z mobile)', () => {
    expect(src).toMatch(/Chip/);
  });

  it('does NOT use setHours / setMinutes / setDate na raw Date', () => {
    expect(src).not.toMatch(/\.setHours\(/);
    expect(src).not.toMatch(/\.setMinutes\(/);
    expect(src).not.toMatch(/\.setDate\(/);
    expect(src).not.toMatch(/\.setMonth\(/);
    expect(src).not.toMatch(/\.setFullYear\(/);
  });

  it('does NOT import @react-native-community/datetimepicker (native-only)', () => {
    expect(src).not.toMatch(/@react-native-community\/datetimepicker/);
  });

  it('does NOT import Alert (cross-platform handle przez @/lib/confirm)', () => {
    // SessionEditForm jest presentational — destrukcyjne confirm-y zyja w stronie.
    expect(src).not.toMatch(/\bAlert\b/);
  });

  it('maximumDate ustawione na new Date() (no future-dated sessions)', () => {
    expect(src).toMatch(/maximumDate=\{new Date\(\)\}/);
  });

  it('disabled state proxied z isPending do pickerow i przyciskow', () => {
    expect(src).toMatch(/disabled=\{isPending\}/);
  });

  it('renderuje przyciski Save i Delete (parytet mobile)', () => {
    expect(src).toMatch(/Zapisz zmiany/);
    expect(src).toMatch(/Usun sesje/);
  });
});
