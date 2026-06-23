import { describe, it, expect } from 'vitest';
import { BUCKETS, pickBucket } from '../src/lookup.js';

describe('BUCKETS — struktura danych', () => {
  it('każdy bucket ma wakeWindowsHours.length === typicalNaps + 1', () => {
    for (const bucket of BUCKETS) {
      expect(bucket.wakeWindowsHours.length, `bucket ${bucket.id}`).toBe(bucket.typicalNaps + 1);
    }
  });

  it('każdy bucket ma dodatnie wartości maxNapHours i maxTotalDayNapHours', () => {
    for (const bucket of BUCKETS) {
      expect(bucket.maxNapHours, `bucket ${bucket.id} maxNapHours`).toBeGreaterThan(0);
      expect(bucket.maxTotalDayNapHours, `bucket ${bucket.id} maxTotalDayNapHours`).toBeGreaterThan(0);
    }
  });

  it('nightHoursRange[0] <= nightHoursRange[1]', () => {
    for (const bucket of BUCKETS) {
      const [min, max] = bucket.nightHoursRange;
      expect(min, `bucket ${bucket.id} nightHoursRange`).toBeLessThanOrEqual(max);
    }
  });

  it('każdy bucket ma poprawny zakres id (pokrycie dat)', () => {
    const ids = BUCKETS.map((b) => b.id);
    expect(ids).toContain('5m');
    expect(ids).toContain('6m-3naps');
    expect(ids).toContain('6m-2naps');
    expect(ids).toContain('7m');
    expect(ids).toContain('8m');
    expect(ids).toContain('9m');
    expect(ids).toContain('10m');
    expect(ids).toContain('11m');
    expect(ids).toContain('12m-2naps');
    expect(ids).toContain('12m-1nap');
    expect(ids).toContain('18m+');
  });

  it('6m-2naps ma okna aktywności 2.5/2.75/3.0 (przewodnik: harmonogram 6m-2drzemki)', () => {
    const b = BUCKETS.find((x) => x.id === '6m-2naps');
    expect(b).toBeDefined();
    expect(b!.wakeWindowsHours).toEqual([2.5, 2.75, 3.0]);
  });
});

describe('pickBucket — selekcja bucketa', () => {
  it('5m bez override → bucket 5m (3 drzemki)', () => {
    const b = pickBucket(5, null);
    expect(b.id).toBe('5m');
    expect(b.typicalNaps).toBe(3);
  });

  it('6m bez override → 3 drzemki (domyślnie dla młodszych)', () => {
    const b = pickBucket(6, null);
    expect(b.typicalNaps).toBe(3);
    expect(b.id).toBe('6m-3naps');
  });

  it('6m z preferredNaps=2 → bucket 6m-2naps', () => {
    const b = pickBucket(6, 2);
    expect(b.id).toBe('6m-2naps');
    expect(b.typicalNaps).toBe(2);
  });

  it('6m z preferredNaps=3 → bucket 6m-3naps', () => {
    const b = pickBucket(6, 3);
    expect(b.id).toBe('6m-3naps');
    expect(b.typicalNaps).toBe(3);
  });

  it('7m bez override → 2 drzemki', () => {
    const b = pickBucket(7, null);
    expect(b.id).toBe('7m');
    expect(b.typicalNaps).toBe(2);
  });

  it('9m bez override → bucket 9m (2 drzemki)', () => {
    const b = pickBucket(9, null);
    expect(b.id).toBe('9m');
    expect(b.typicalNaps).toBe(2);
  });

  it('12m bez override → 2 drzemki (domyślne dla 12m)', () => {
    const b = pickBucket(12, null);
    expect(b.typicalNaps).toBe(2);
  });

  it('12m z preferredNaps=1 → bucket 12m-1nap', () => {
    const b = pickBucket(12, 1);
    expect(b.id).toBe('12m-1nap');
    expect(b.typicalNaps).toBe(1);
  });

  it('18m bez override → 1 drzemka', () => {
    const b = pickBucket(18, null);
    expect(b.id).toBe('18m+');
    expect(b.typicalNaps).toBe(1);
  });

  it('24m → 18m+ bucket (wewnątrz zakresu)', () => {
    const b = pickBucket(24, null);
    expect(b.id).toBe('18m+');
  });

  it('wiek < 5m (np. 4) → clamp do 5m bucket', () => {
    const b = pickBucket(4, null);
    expect(b.id).toBe('5m');
  });

  it('wiek > 36m → 18m+ bucket (clamp)', () => {
    const b = pickBucket(40, null);
    expect(b.id).toBe('18m+');
  });

  it('preferredNaps bez pasującego bucketa → zwraca domyślny dla wieku', () => {
    // 9m z preferredNaps=3 → brak bucketa 3-nap dla 9m → fallback na default
    const b = pickBucket(9, 3);
    expect(b).toBeDefined();
    expect(b.minMonths).toBeLessThanOrEqual(9);
    expect(b.maxMonths).toBeGreaterThanOrEqual(9);
  });
});
