import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Static-invariants dla useSleepRecommendation.ts (vitest node env — bez
// jsdom/RTL, hook zaleznosci expo-router/react-query nie da sie latwo
// zamontowac). Styl grep-asercji: day-timeline.invariants.test.ts.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK_SRC = readFileSync(path.resolve(__dirname, '../useSleepRecommendation.ts'), 'utf-8');

describe('useSleepRecommendation static invariants', () => {
  it('recommend() call jest owinięty w try/catch (finding C1: uncaught throw w useMemo = crash bez ErrorBoundary)', () => {
    expect(HOOK_SRC).toMatch(/try\s*\{\s*\n\s*return fn\(state, profile\);/);
    expect(HOOK_SRC).toMatch(/catch\s*\(err\)\s*\{/);
  });

  it('catch block loguje błąd (nie pusty catch) i degraduje do null zamiast re-throw', () => {
    const catchBlockMatch = /catch \(err\) \{([\s\S]*?)\n\s*\}/.exec(HOOK_SRC);
    expect(catchBlockMatch).not.toBeNull();
    const body = catchBlockMatch?.[1] ?? '';
    expect(body).toMatch(/console\.error/);
    expect(body).toMatch(/return null;/);
  });

  it('toLibActiveSession jest wołane z `now` (finding C1: clamp stale-tick w adapterze, nie w hooku)', () => {
    expect(HOOK_SRC).toMatch(/toLibActiveSession\(sessionsQuery\.data, now\)/);
  });
});
