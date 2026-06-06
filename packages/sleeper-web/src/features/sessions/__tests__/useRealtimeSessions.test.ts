import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../useRealtimeSessions.ts');
const source = readFileSync(sourcePath, 'utf-8');

// Static invariant tests dla useRealtimeSessions.
//
// Pelne behavioralne testowanie (renderHook + supabase mock) wymagaloby
// @testing-library/react + jsdom + mocka @/lib/supabase (z transitive react-native
// w react-native-url-polyfill). Vitest w node env nie sparsuje Flow w
// react-native/index.js — import samego hooka wybucha jeszcze przed assertami.
//
// Parytet z sleeper-app (ktory tez nie ma tych testow) + zasada niedodawania
// nowych zaleznosci bez konsultacji (CLAUDE.md §8) -> static invariants
// chronia przed regresjami w cleanup pattern (coding-rules §13) i kluczach
// invalidacji bez calej maszynerii React. Behavioralna weryfikacja: [Manual-mobile]
// po IU10.
describe('useRealtimeSessions (static invariants)', () => {
  // INVARIANT: hook eksportowany jako nazwana funkcja.
  it('exports useRealtimeSessions as a named function', () => {
    expect(source).toMatch(/export\s+function\s+useRealtimeSessions\s*\(/);
  });

  // INVARIANT: cleanup function w useEffect return musi wywolac removeChannel.
  // Coding-rules §13: "subskrypcje = ZAWSZE cleanup".
  // Regression test na bug: zapomniany cleanup -> wiszace kanaly po remount.
  it('contains supabase.removeChannel cleanup in useEffect return', () => {
    expect(source).toMatch(/return\s*\(\s*\)\s*=>/);
    expect(source).toContain('supabase.removeChannel(channel)');
  });

  // INVARIANT: dependency array obejmuje childId — bez tego po zmianie dziecka
  // subskrypcja zostalaby na starym child_id.
  it('uses childId as useEffect dependency', () => {
    expect(source).toMatch(/\[childId,\s*queryClient\]/);
  });

  // INVARIANT: filter postgres_changes scopuje per child_id (RLS-safe + perf).
  // Bez tego dostajemy eventy WSZYSTKICH sesji w bazie.
  it('filters postgres_changes by child_id', () => {
    expect(source).toContain('filter: `child_id=eq.${childId}`');
  });

  // INVARIANT: invalidate dotyka obu prefixow ['sessions'] i ['session'].
  // P3.2 z review — duplikacja udokumentowana, regression test pilnuje obu.
  it('invalidates both ["sessions"] (plural) and ["session"] (singular) prefixes', () => {
    expect(source).toMatch(/queryKey:\s*\['sessions'\]/);
    expect(source).toMatch(/queryKey:\s*\['session'\]/);
  });

  // INVARIANT: early return gdy childId === null — bez tego channel name
  // "sessions:child=null" laduje w supabase.
  it('early returns when childId is null', () => {
    expect(source).toMatch(/if\s*\(!childId\)\s*return/);
  });

  // INVARIANT: channel name zawiera childId — unikalny per dziecko.
  it('uses unique channel name per childId', () => {
    expect(source).toContain('`sessions:child=${childId}`');
  });
});
