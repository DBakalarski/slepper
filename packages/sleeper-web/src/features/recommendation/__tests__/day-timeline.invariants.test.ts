import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Static-invariants dla day-timeline-segments.ts + DayTimeline.tsx (vitest
// node env — bez jsdom/RTL). Styl grep-asercji: sleep-fullscreen.invariants.test.ts.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOMETRY_SRC = readFileSync(
  path.resolve(__dirname, '../day-timeline-segments.ts'),
  'utf-8',
);
const COMPONENT_SRC = readFileSync(
  path.resolve(__dirname, '../components/DayTimeline.tsx'),
  'utf-8',
);

describe('day-timeline static invariants', () => {
  it('geometria nie uzywa device-tz Date API (setHours / new Date(y,m,d) / arytmetyki dnia w ms)', () => {
    expect(GEOMETRY_SRC).not.toMatch(/setHours/);
    expect(GEOMETRY_SRC).not.toMatch(/new Date\(\d/);
    expect(GEOMETRY_SRC).not.toMatch(/86400000/);
    expect(GEOMETRY_SRC).not.toMatch(/\/\s*1440\b/);
  });

  it('geometria liczy pozycje przez startOfDayInAppTz/endOfDayInAppTz, nie stale dobowe', () => {
    expect(GEOMETRY_SRC).toMatch(/startOfDayInAppTz/);
    expect(GEOMETRY_SRC).toMatch(/endOfDayInAppTz/);
  });

  it('geometria jest pure — brak Date.now()/Math.random(), `now` wchodzi argumentem', () => {
    expect(GEOMETRY_SRC).not.toMatch(/Date\.now\(\)/);
    expect(GEOMETRY_SRC).not.toMatch(/Math\.random\(\)/);
  });

  it('komponent nie uzywa device-tz Date API', () => {
    expect(COMPONENT_SRC).not.toMatch(/setHours/);
    expect(COMPONENT_SRC).not.toMatch(/new Date\(\d/);
    expect(COMPONENT_SRC).not.toMatch(/86400000/);
  });

  it('komponent nie uzywa raw useColorScheme (tylko useEffectiveTheme dozwolony)', () => {
    expect(COMPONENT_SRC).not.toMatch(/useColorScheme/);
  });

  it('komponent uzywa prymitywow RN (View/Text), nie web HTML', () => {
    expect(COMPONENT_SRC).toMatch(/<View/);
    expect(COMPONENT_SRC).toMatch(/<Text/);
    expect(COMPONENT_SRC).not.toMatch(/<div/);
    expect(COMPONENT_SRC).not.toMatch(/<span/);
    expect(COMPONENT_SRC).not.toMatch(/<button/);
  });

  it('komponent jest props-driven bez hookow danych/timera (brak useEffect/useState/setInterval)', () => {
    expect(COMPONENT_SRC).not.toMatch(/useEffect/);
    expect(COMPONENT_SRC).not.toMatch(/useState/);
    expect(COMPONENT_SRC).not.toMatch(/setInterval/);
  });

  it('kontener osi ma accessibilityLabel z tekstowym podsumowaniem', () => {
    expect(COMPONENT_SRC).toMatch(/accessibilityLabel=\{summaryLabel\}/);
    expect(COMPONENT_SRC).toMatch(/Rytm dnia/);
  });
});
