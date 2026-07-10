import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Static-invariants (grep-asercje, vitest node env — bez jsdom/RTL, wzorzec
// z day-timeline.invariants.test.ts) dla Taska 5: karta rekomendacji +
// przelacznik widoku + store.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSrc(relPath: string): string {
  return readFileSync(path.resolve(__dirname, relPath), 'utf-8');
}

const CARD_SRC = readSrc('../RecommendationCard.tsx');
const LIST_VIEW_SRC = readSrc('../components/RecommendationListView.tsx');
const TIMELINE_VIEW_SRC = readSrc('../components/RecommendationTimelineView.tsx');
const STORE_SRC = readSrc('../useRecommendationViewStore.ts');
const ALL_COMPONENT_SRC = [CARD_SRC, LIST_VIEW_SRC, TIMELINE_VIEW_SRC];

describe('RecommendationCard + widoki: static invariants', () => {
  it('zaden plik nie uzywa raw useColorScheme (tylko useEffectiveTheme dozwolony)', () => {
    for (const src of ALL_COMPONENT_SRC) {
      expect(src).not.toMatch(/useColorScheme/);
    }
  });

  it('komponenty sa props-driven — brak inline new Date() (now/birthDate przychodza propami)', () => {
    for (const src of ALL_COMPONENT_SRC) {
      expect(src).not.toMatch(/new Date\(/);
    }
  });

  it('store jest konsumowany przez selektor, nie przez caly obiekt store', () => {
    // Poprawny wzorzec: useRecommendationViewStore((s) => s.xyz).
    expect(CARD_SRC).toMatch(/useRecommendationViewStore\(\s*\(\s*s\s*\)\s*=>/);
    // Anti-pattern: wywolanie bez selektora (subskrybuje caly store, re-render
    // na kazda zmiane pola) — nie moze wystapic.
    expect(CARD_SRC).not.toMatch(/useRecommendationViewStore\(\s*\)/);
  });

  it('komponenty uzywaja prymitywow RN (View/Text), nie web HTML', () => {
    for (const src of ALL_COMPONENT_SRC) {
      expect(src).toMatch(/<View/);
      expect(src).not.toMatch(/<div/);
      expect(src).not.toMatch(/<span/);
      expect(src).not.toMatch(/<button/);
      expect(src).not.toMatch(/<input/);
    }
  });

  it('RecommendationCard deleguje render do RecommendationListView / RecommendationTimelineView', () => {
    expect(CARD_SRC).toMatch(/<RecommendationListView/);
    expect(CARD_SRC).toMatch(/<RecommendationTimelineView/);
  });

  it('RecommendationTimelineView renderuje DayTimeline (oś 24h) i uzywa computeDayForecast', () => {
    expect(TIMELINE_VIEW_SRC).toMatch(/<DayTimeline/);
    expect(TIMELINE_VIEW_SRC).toMatch(/computeDayForecast/);
  });

  it('store: persist + web localStorage adapter (wzorzec useThemeStore), default "timeline"', () => {
    expect(STORE_SRC).toMatch(/persist\(/);
    expect(STORE_SRC).toMatch(/name:\s*'recommendation-view'/);
    expect(STORE_SRC).toMatch(/view:\s*'timeline'/);
  });

  it('store uzywa wylacznie zmapowanych subpathow zustand (create, zustand/middleware)', () => {
    expect(STORE_SRC).toMatch(/from 'zustand'/);
    expect(STORE_SRC).toMatch(/from 'zustand\/middleware'/);
    expect(STORE_SRC).not.toMatch(/from 'zustand\/(?!middleware)/);
  });
});
