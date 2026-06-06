import { describe, it, expect } from 'vitest';
import { addDaysInAppTz } from '../time';

describe('addDaysInAppTz', () => {
  describe('happy path', () => {
    it('n=1: adds one day forward', () => {
      expect(addDaysInAppTz('2026-05-29', 1)).toBe('2026-05-30');
    });

    it('n=-1: subtracts one day backward', () => {
      expect(addDaysInAppTz('2026-05-29', -1)).toBe('2026-05-28');
    });

    it('n=0: returns the same day', () => {
      expect(addDaysInAppTz('2026-05-15', 0)).toBe('2026-05-15');
    });

    it('n=1: month boundary (May 31 → June 1)', () => {
      expect(addDaysInAppTz('2026-05-31', 1)).toBe('2026-06-01');
    });

    it('n=1: year boundary (Dec 31 → Jan 1)', () => {
      expect(addDaysInAppTz('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('n=-1: backward over month boundary (June 1 → May 31)', () => {
      expect(addDaysInAppTz('2026-06-01', -1)).toBe('2026-05-31');
    });

    it('n=7: adds a full week', () => {
      expect(addDaysInAppTz('2026-05-01', 7)).toBe('2026-05-08');
    });
  });

  describe('DST boundary (Europe/Warsaw)', () => {
    // Spring forward: 2026-03-29 at 02:00 clocks move to 03:00 (23h day)
    it('crosses spring-forward DST boundary correctly (n=1)', () => {
      expect(addDaysInAppTz('2026-03-28', 1)).toBe('2026-03-29');
    });

    it('crosses spring-forward DST boundary correctly (n=-1)', () => {
      expect(addDaysInAppTz('2026-03-30', -1)).toBe('2026-03-29');
    });

    // Fall back: 2026-10-25 at 03:00 clocks move to 02:00 (25h day)
    it('crosses fall-back DST boundary correctly (n=1)', () => {
      expect(addDaysInAppTz('2026-10-24', 1)).toBe('2026-10-25');
    });

    it('crosses fall-back DST boundary correctly (n=-1)', () => {
      expect(addDaysInAppTz('2026-10-26', -1)).toBe('2026-10-25');
    });
  });

  describe('invalid input', () => {
    it('throws for empty string dayKey', () => {
      expect(() => addDaysInAppTz('', 1)).toThrow();
    });

    it('throws for wrong format dayKey (not YYYY-MM-DD)', () => {
      expect(() => addDaysInAppTz('29-05-2026', 1)).toThrow();
    });

    it('throws for completely invalid dayKey', () => {
      expect(() => addDaysInAppTz('notadate', 1)).toThrow();
    });
  });
});
