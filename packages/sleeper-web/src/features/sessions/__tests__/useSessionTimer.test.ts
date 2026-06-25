import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { computeSessionTimer } from '../useSessionTimer';

// react-native/index.js zawiera skladnie Flow ktorej rollup w node env nie
// parsuje (patrz hooks.test.ts). useSessionTimer importuje tylko Platform —
// mockujemy minimalnie. vi.mock jest hoistowane ponad importy przez vitest,
// wiec kolejnosc w zrodle nie wplywa na runtime.
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(__dirname, '../useSessionTimer.ts'), 'utf-8');

// Behawioralne testy gwarancji "timer = derived state" idą na pure
// computeSessionTimer (bez renderera). Wiring efektu (slow tick w tle,
// visibilitychange, cleanup) — static invariants: vitest tu jest w node env
// bez @testing-library/react + jsdom (parytet z hooks.test.ts / changelog).
describe('computeSessionTimer (derived state, no drift)', () => {
  it('startMs = null → bezczynny timer 00:00:00', () => {
    expect(computeSessionTimer(null, Date.now())).toEqual({
      elapsedMs: 0,
      display: '00:00:00',
      short: '0m',
    });
  });

  it('elapsedMs = now - startMs niezaleznie od czestotliwosci ticka', () => {
    const start = 1_000_000;

    // Szybki tick (po 1 s).
    expect(computeSessionTimer(start, start + 1_000).elapsedMs).toBe(1_000);

    // Powolny tick w tle: ten sam now-startMs daje dokladny czas (brak dryfu),
    // bo wartosc nie jest akumulowana — liczona z timestampow.
    expect(computeSessionTimer(start, start + 30_000).elapsedMs).toBe(30_000);
    expect(computeSessionTimer(start, start + 3_661_000).display).toBe('01:01:01');
  });

  it('clampuje ujemny diff do zera (now przed startMs)', () => {
    expect(computeSessionTimer(5_000, 1_000).elapsedMs).toBe(0);
    expect(computeSessionTimer(5_000, 1_000).display).toBe('00:00:00');
  });
});

describe('useSessionTimer effect wiring (static invariants)', () => {
  it('definiuje wolniejszy SLOW_TICK_MS = 30_000', () => {
    expect(source).toMatch(/SLOW_TICK_MS\s*=\s*30_000/);
  });

  it('web-guard: Platform.OS === web + typeof document', () => {
    expect(source).toMatch(/Platform\.OS\s*!==\s*'web'\s*\|\|\s*typeof document === 'undefined'/);
  });

  it('przelacza interwal wg document.hidden i wymusza setNow przy powrocie focusu', () => {
    expect(source).toMatch(/document\.hidden\s*\?\s*SLOW_TICK_MS\s*:\s*TICK_MS/);
    expect(source).toMatch(/if \(document\.hidden\)[\s\S]*?startInterval\(SLOW_TICK_MS\)/);
    expect(source).toMatch(/setNow\(Date\.now\(\)\);\s*\n\s*startInterval\(TICK_MS\)/);
  });

  it('nasluchuje visibilitychange i sprzata interwal + listener w cleanup', () => {
    expect(source).toMatch(/addEventListener\('visibilitychange', handleVisibility\)/);
    expect(source).toMatch(/clearInterval\(intervalId\)/);
    expect(source).toMatch(/removeEventListener\('visibilitychange', handleVisibility\)/);
  });
});
