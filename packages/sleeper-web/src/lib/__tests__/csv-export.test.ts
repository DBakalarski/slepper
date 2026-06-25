import { describe, expect, it } from 'vitest';

import { sessionsToCsv } from '@/lib/csv-export';
import type { SleepSession } from '@/features/sessions/hooks';

// Strefa aplikacji = Europe/Warsaw. Czerwiec = CEST (UTC+2), wiec 06:30Z -> 08:30.
function session(overrides: Partial<SleepSession>): SleepSession {
  return {
    id: 'id',
    child_id: 'child',
    type: 'nap',
    start_at: '2026-06-20T06:30:00Z',
    end_at: '2026-06-20T08:00:00Z',
    notes: null,
    tags: [],
    created_by: 'user',
    created_at: '2026-06-20T06:30:00Z',
    ...overrides,
  };
}

const HEADER = 'Data;Start;Koniec;Długość;Typ;Notatki;Tagi';

describe('sessionsToCsv', () => {
  it('pusta lista -> same naglowki', () => {
    expect(sessionsToCsv([])).toBe(HEADER);
  });

  it('mapuje sesje: data dd.MM.yyyy, czas Warsaw, czas trwania, typ PL, tagi', () => {
    const csv = sessionsToCsv([
      session({ type: 'nap', notes: 'spokojnie', tags: ['teething'] }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe('20.06.2026;08:30;10:00;1g 30m;Drzemka;spokojnie;Ząbkowanie');
  });

  it('sesja w toku (end_at=null) -> puste Koniec i Długość', () => {
    const csv = sessionsToCsv([
      session({ type: 'night_sleep', start_at: '2026-06-21T19:00:00Z', end_at: null }),
    ]);
    expect(csv.split('\r\n')[1]).toBe('21.06.2026;21:00;;;Sen nocny;;');
  });

  it('escapuje pola z separatorem, cudzyslowem i nowa linia', () => {
    const csv = sessionsToCsv([session({ notes: 'dobrze; spał\nale "krótko"' })]);
    const row = csv.split('\r\n')[1];
    expect(row).toContain('"dobrze; spał\nale ""krótko"""');
  });

  it('laczy wiele tagow przecinkiem i ujmuje w cudzyslowy (zawiera separator listy)', () => {
    const csv = sessionsToCsv([session({ tags: ['teething', 'illness'] })]);
    expect(csv.split('\r\n')[1]).toContain(';Ząbkowanie, Choroba');
  });

  it('sortuje wiersze chronologicznie rosnaco (po start_at)', () => {
    const csv = sessionsToCsv([
      session({ id: 'b', start_at: '2026-06-21T06:30:00Z', end_at: '2026-06-21T08:00:00Z' }),
      session({ id: 'a', start_at: '2026-06-20T06:30:00Z', end_at: '2026-06-20T08:00:00Z' }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('20.06.2026');
    expect(lines[2]).toContain('21.06.2026');
  });
});
