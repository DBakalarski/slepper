import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import {
  APP_TIMEZONE,
  combineDateAndTimeInAppTz,
  parseAppTzDateTime,
} from '@/lib/time';

// Testy dla NEW komponentow TimePickerField + DatePickerField (web-only).
// Strategia: static invariants (readFileSync) + assertion na ekwiwalentny pipeline
// konwersji ktory komponenty wykonuja per render / onChange. Bez jsdom +
// @testing-library/react bo wymagaloby dodania deps i mockowania
// react-native-web (poza scope). Pure-function strategy zachowana — patrz
// `features/sessions/__tests__/hooks.test.ts` precedens.

const TIME_PICKER_PATH = resolve(__dirname, '../TimePickerField.tsx');
const DATE_PICKER_PATH = resolve(__dirname, '../DatePickerField.tsx');

describe('TimePickerField static invariants', () => {
  const src = readFileSync(TIME_PICKER_PATH, 'utf-8');

  it('uses HTML5 input type=time', () => {
    expect(src).toMatch(/type="time"/);
  });

  it('uses fontSize 16 (iOS no-zoom)', () => {
    expect(src).toMatch(/fontSize:\s*16/);
  });

  it('uses minHeight 44 (touch target HIG)', () => {
    expect(src).toMatch(/minHeight:\s*44/);
  });

  it('uses parseAppTzDateTime (tz-safe time pattern)', () => {
    expect(src).toMatch(/parseAppTzDateTime/);
  });

  it('does NOT import @react-native-community/datetimepicker (native-only)', () => {
    expect(src).not.toMatch(/@react-native-community\/datetimepicker/);
  });

  it('does NOT use setHours/setMinutes on raw Date (tz-unsafe pattern)', () => {
    expect(src).not.toMatch(/\.setHours\(/);
    expect(src).not.toMatch(/\.setMinutes\(/);
  });
});

describe('DatePickerField static invariants', () => {
  const src = readFileSync(DATE_PICKER_PATH, 'utf-8');

  it('uses HTML5 input type=date', () => {
    expect(src).toMatch(/type="date"/);
  });

  it('uses fontSize 16 (iOS no-zoom)', () => {
    expect(src).toMatch(/fontSize:\s*16/);
  });

  it('uses combineDateAndTimeInAppTz (tz-safe date+time merge)', () => {
    expect(src).toMatch(/combineDateAndTimeInAppTz/);
  });

  it('passes maximumDate through to HTML5 max attr', () => {
    expect(src).toMatch(/max=\{maxKey\}/);
  });

  it('does NOT import @react-native-community/datetimepicker (native-only)', () => {
    expect(src).not.toMatch(/@react-native-community\/datetimepicker/);
  });

  it('does NOT use setDate/setMonth/setFullYear on raw Date (tz-unsafe)', () => {
    expect(src).not.toMatch(/\.setDate\(/);
    expect(src).not.toMatch(/\.setMonth\(/);
    expect(src).not.toMatch(/\.setFullYear\(/);
  });
});

describe('TimePicker conversion pipeline (replicate handleChangeWeb)', () => {
  // Replikujemy logike TimePickerField.handleChangeWeb: bierze dayKey z `value`
  // w app tz, sklada z nowa godzina przez parseAppTzDateTime. Test gwarantuje
  // ze edycja godziny NIE przeskakuje na inny dzien w app tz.
  function simulateTimeChange(value: Date, newHHmm: string): Date | null {
    const dayKey = format(toZonedTime(value, APP_TIMEZONE), 'yyyy-MM-dd');
    return parseAppTzDateTime(dayKey, newHHmm);
  }

  it('edycja godziny zachowuje dzien w app tz', () => {
    // 2026-05-27 09:30 Warsaw = 2026-05-27T07:30:00Z (CEST UTC+2)
    const initial = new Date('2026-05-27T07:30:00Z');
    const result = simulateTimeChange(initial, '11:15');
    expect(result).not.toBeNull();
    if (!result) return;
    const dayKey = format(toZonedTime(result, APP_TIMEZONE), 'yyyy-MM-dd');
    const timeKey = format(toZonedTime(result, APP_TIMEZONE), 'HH:mm');
    expect(dayKey).toBe('2026-05-27');
    expect(timeKey).toBe('11:15');
  });

  it('cross-DST: edycja godziny zachowuje dzien (winter time, UTC+1)', () => {
    // 2026-01-15 14:00 Warsaw = 2026-01-15T13:00:00Z (CET UTC+1)
    const initial = new Date('2026-01-15T13:00:00Z');
    const result = simulateTimeChange(initial, '20:45');
    expect(result).not.toBeNull();
    if (!result) return;
    const dayKey = format(toZonedTime(result, APP_TIMEZONE), 'yyyy-MM-dd');
    const timeKey = format(toZonedTime(result, APP_TIMEZONE), 'HH:mm');
    expect(dayKey).toBe('2026-01-15');
    expect(timeKey).toBe('20:45');
  });

  it('zwraca null dla niepoprawnego time stringa', () => {
    const initial = new Date('2026-05-27T07:30:00Z');
    const result = simulateTimeChange(initial, 'not-a-time');
    expect(result).toBeNull();
  });
});

describe('DatePicker conversion pipeline (replicate handleChangeWeb)', () => {
  // Replikujemy logike DatePickerField.handleChangeWeb: bierze nowy day-key
  // z input, sklada z `value` (godzina) przez combineDateAndTimeInAppTz.
  function simulateDateChange(value: Date, newDayKey: string): Date | null {
    const timeKey = format(toZonedTime(value, APP_TIMEZONE), 'HH:mm');
    const parsedNewDay = parseAppTzDateTime(newDayKey, timeKey);
    if (!parsedNewDay) return null;
    return combineDateAndTimeInAppTz(parsedNewDay, value);
  }

  it('edycja daty zachowuje godzine w app tz', () => {
    // 2026-05-27 09:30 Warsaw
    const initial = new Date('2026-05-27T07:30:00Z');
    const result = simulateDateChange(initial, '2026-06-15');
    expect(result).not.toBeNull();
    if (!result) return;
    const dayKey = format(toZonedTime(result, APP_TIMEZONE), 'yyyy-MM-dd');
    const timeKey = format(toZonedTime(result, APP_TIMEZONE), 'HH:mm');
    expect(dayKey).toBe('2026-06-15');
    expect(timeKey).toBe('09:30');
  });

  it('przejscie z DST (lato CEST) na non-DST (zima CET) zachowuje godzine', () => {
    // 2026-08-15 22:30 Warsaw = 2026-08-15T20:30:00Z (CEST UTC+2)
    const initial = new Date('2026-08-15T20:30:00Z');
    const result = simulateDateChange(initial, '2026-12-20');
    expect(result).not.toBeNull();
    if (!result) return;
    const dayKey = format(toZonedTime(result, APP_TIMEZONE), 'yyyy-MM-dd');
    const timeKey = format(toZonedTime(result, APP_TIMEZONE), 'HH:mm');
    expect(dayKey).toBe('2026-12-20');
    expect(timeKey).toBe('22:30');
  });
});
