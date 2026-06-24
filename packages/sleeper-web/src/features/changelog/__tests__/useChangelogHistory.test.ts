import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla useChangelogHistory (strategia pure-only — bez jsdom/RTL).
const SRC = readFileSync(resolve(__dirname, '../useChangelogHistory.ts'), 'utf-8');

describe('useChangelogHistory static invariants', () => {
  it('fetchuje changelog z cache no-store (omija stale)', () => {
    expect(SRC).toMatch(/cache:\s*'no-store'/);
  });

  it('przerywa fetch w cleanup (AbortController)', () => {
    expect(SRC).toMatch(/new AbortController\(\)/);
    expect(SRC).toMatch(/signal:\s*controller\.signal/);
    expect(SRC).toMatch(/return\s*\(\)\s*=>\s*controller\.abort\(\)/);
  });

  it('osłania srodowisko SSR (brak window/fetch)', () => {
    expect(SRC).toMatch(/typeof window === 'undefined'/);
  });

  it('nie uzywa localStorage ani listenera focus (inna odpowiedzialnosc niz banner)', () => {
    expect(SRC).not.toMatch(/localStorage[.[]/);
    expect(SRC).not.toMatch(/addEventListener/);
  });

  it('nie uzywa native-only API', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
    expect(SRC).not.toMatch(/expo-notifications/);
  });
});
