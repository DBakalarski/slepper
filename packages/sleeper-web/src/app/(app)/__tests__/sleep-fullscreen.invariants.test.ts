import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Static-invariants dla sleep-fullscreen.tsx (vitest node env — bez jsdom/RTL).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(path.resolve(__dirname, '../sleep-fullscreen.tsx'), 'utf-8');

describe('sleep-fullscreen static invariants', () => {
  it('uzywa true-black tla (bg-black), nie bg-navy (R1)', () => {
    expect(SRC).toMatch(/bg-black/);
    expect(SRC).not.toMatch(/bg-navy/);
  });

  it('wpina auto-dim przez useIdleDimmer (R2)', () => {
    expect(SRC).toMatch(/useIdleDimmer/);
    expect(SRC).toMatch(/isDimmed/);
  });

  it('renderuje overlay wybudzania wolajacy wake() w stanie dimmed (R3)', () => {
    expect(SRC).toMatch(/isDimmed\s*\?\s*\(/);
    expect(SRC).toMatch(/onPress=\{wake\}/);
    expect(SRC).toMatch(/accessibilityLabel="Rozjasnij ekran"/);
  });

  it('efekt web (Wake Lock) ma Platform.OS === web guard i cleanup w return', () => {
    expect(SRC).toMatch(/Platform\.OS !== 'web'/);
    expect(SRC).toMatch(/addEventListener\('visibilitychange'/);
    // Cleanup listenera + sentinela w useEffect return.
    expect(SRC).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*removeEventListener\('visibilitychange'/);
  });

  it('nie uzywa native-only API (Alert.alert / expo-notifications)', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
    expect(SRC).not.toMatch(/expo-notifications/);
  });
});
