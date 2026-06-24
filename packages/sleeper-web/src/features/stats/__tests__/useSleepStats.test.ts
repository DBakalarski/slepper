import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla useSleepStats (strategia pure-only).
const HOOK_SRC = readFileSync(resolve(__dirname, '../useSleepStats.ts'), 'utf-8');
const SCREEN_SRC = readFileSync(
  resolve(__dirname, '../../../app/(app)/stats.tsx'),
  'utf-8',
);

describe('useSleepStats static invariants', () => {
  it('stabilizuje zakres przez useMemo na dayKey (anty-refetch loop)', () => {
    expect(HOOK_SRC).toMatch(/dayKeyInAppTz\(new Date\(\)\)/);
    expect(HOOK_SRC).toMatch(/useMemo/);
  });

  it('nie przekazuje new Date() inline do useSessions (stabilny queryKey)', () => {
    expect(HOOK_SRC).not.toMatch(/useSessions\([^)]*new Date\(\)/);
  });

  it('reuzywa logiki agregacji z lib (brak duplikacji day-splitu)', () => {
    expect(HOOK_SRC).toMatch(/from '@\/lib\/sleep-aggregation'/);
  });

  it('nie liczy czasu przez setHours na raw Date', () => {
    expect(HOOK_SRC).not.toMatch(/\.setHours\(/);
  });
});

describe('stats screen static invariants', () => {
  it('uzywa SegmentedControl dla zakresu 7/14/30', () => {
    expect(SCREEN_SRC).toMatch(/SegmentedControl/);
  });

  it('obsluguje stany loading / error / empty', () => {
    expect(SCREEN_SRC).toMatch(/isLoading/);
    expect(SCREEN_SRC).toMatch(/isError/);
    expect(SCREEN_SRC).toMatch(/daysCovered === 0/);
  });

  it('nie uzywa setHours / native-only Alert', () => {
    expect(SCREEN_SRC).not.toMatch(/\.setHours\(/);
    expect(SCREEN_SRC).not.toMatch(/Alert\.alert/);
  });
});
