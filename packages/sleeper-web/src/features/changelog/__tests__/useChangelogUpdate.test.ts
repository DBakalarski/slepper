import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla useChangelogUpdate (strategia pure-only — bez jsdom/RTL).
const SRC = readFileSync(resolve(__dirname, '../useChangelogUpdate.ts'), 'utf-8');

describe('useChangelogUpdate static invariants', () => {
  it('fetchuje changelog z cache no-store (omija stale)', () => {
    expect(SRC).toMatch(/fetch\(\s*CHANGELOG_URL\s*,\s*\{\s*cache:\s*'no-store'/);
  });

  it('nasluchuje visibilitychange i sprzata listener w cleanup', () => {
    expect(SRC).toMatch(/addEventListener\('visibilitychange'/);
    expect(SRC).toMatch(/return\s*\(\)\s*=>\s*document\.removeEventListener\('visibilitychange'/);
  });

  it('restart przeladowuje strone', () => {
    expect(SRC).toMatch(/window\.location\.reload\(\)/);
  });

  it('osłania localStorage (SSR / private mode)', () => {
    expect(SRC).toMatch(/typeof localStorage === 'undefined'/);
  });

  it('nie uzywa native-only API', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
    expect(SRC).not.toMatch(/expo-notifications/);
  });
});
