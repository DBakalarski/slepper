import { describe, expect, it } from 'vitest';

import { parseChangelog, selectUnseen, type ChangelogEntry } from '@/features/changelog/changelog';

describe('parseChangelog', () => {
  it('sortuje wpisy malejaco po v (najnowszy pierwszy)', () => {
    const raw = [
      { v: 1, version: '0.1.0', date: '2026-06-20', items: ['A'] },
      { v: 3, version: '0.3.0', date: '2026-06-24', items: ['C'] },
      { v: 2, version: '0.2.0', date: '2026-06-22', items: ['B'] },
    ];
    const result = parseChangelog(raw);
    expect(result.map((e) => e.v)).toEqual([3, 2, 1]);
  });

  it('zwraca [] dla nie-tablicy', () => {
    expect(parseChangelog(null)).toEqual([]);
    expect(parseChangelog({ v: 1 })).toEqual([]);
    expect(parseChangelog('nope')).toEqual([]);
  });

  it('odfiltrowuje wpisy o zlym ksztalcie (w tym brak version)', () => {
    const raw = [
      { v: 1, version: '0.1.0', date: '2026-06-20', items: ['ok'] },
      { v: 'x', version: '0.2.0', date: '2026-06-21', items: ['bad v'] },
      { v: 2, version: '0.2.0', date: 123, items: ['bad date'] },
      { v: 3, version: '0.3.0', date: '2026-06-22', items: [42] },
      { v: 4, version: 9, date: '2026-06-23', items: ['bad version'] },
      { v: 5, date: '2026-06-23', items: ['brak version'] },
    ];
    const result = parseChangelog(raw);
    expect(result).toEqual([{ v: 1, version: '0.1.0', date: '2026-06-20', items: ['ok'] }]);
  });
});

describe('selectUnseen', () => {
  const entries: ChangelogEntry[] = [
    { v: 3, version: '0.3.0', date: '2026-06-24', items: ['C1', 'C2'] },
    { v: 2, version: '0.2.0', date: '2026-06-22', items: ['B1'] },
    { v: 1, version: '0.1.0', date: '2026-06-20', items: ['A1'] },
  ];

  it('pojedynczy niewidziany deploy', () => {
    const result = selectUnseen(entries, 2);
    expect(result.items).toEqual(['C1', 'C2']);
    expect(result.latestVersion).toBe(3);
    expect(result.extraCount).toBe(0);
  });

  it('scala 2+ niewidziane deploye, najnowsze pierwsze', () => {
    const result = selectUnseen(entries, 1);
    expect(result.items).toEqual(['C1', 'C2', 'B1']);
    expect(result.latestVersion).toBe(3);
  });

  it('brak niewidzianych -> items pusty, latestVersion wciaz z pelnej listy', () => {
    const result = selectUnseen(entries, 3);
    expect(result.items).toEqual([]);
    expect(result.latestVersion).toBe(3);
  });

  it('tnie do 6 punktow i raportuje extraCount', () => {
    const many: ChangelogEntry[] = [
      { v: 1, version: '0.1.0', date: '2026-06-20', items: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    ];
    const result = selectUnseen(many, 0);
    expect(result.items).toHaveLength(6);
    expect(result.extraCount).toBe(2);
  });
});
