import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../hooks.ts');
const source = readFileSync(sourcePath, 'utf-8');

// Static invariant tests dla sessions/hooks.ts.
//
// Pelne behavioralne testowanie (renderHook + supabase mock + QueryClientProvider)
// wymaga @testing-library/react + jsdom + mock @/lib/supabase i @/features/auth.
// Vitest w node env nie sparsuje Flow w react-native/index.js (transitive
// z react-native-url-polyfill w supabase.ts), wiec import samego hooka wybucha
// przed assertami. Parytet z sleeper-app (ktory tez nie ma tych testow) +
// zasada niedodawania zaleznosci bez konsultacji (CLAUDE.md §8) -> static
// invariants pilnuja kluczowych wzorcow (optimistic, stable queryKey, filtry).
// Behavioralna weryfikacja: [Manual-mobile] po IU10.
describe('sessions/hooks (static invariants)', () => {
  describe('export smoke', () => {
    // INVARIANT: wszystkie 9 hookow eksportowane.
    it('exports all 9 expected hooks', () => {
      const expectedExports = [
        'useSessions',
        'useSessionById',
        'useActiveSession',
        'useLastEndedSession',
        'useStartSession',
        'useEndSession',
        'useUpdateSession',
        'useDeleteSession',
        'useInsertBackdatedSession',
      ];
      for (const name of expectedExports) {
        expect(source).toMatch(new RegExp(`export\\s+function\\s+${name}\\s*\\(`));
      }
    });
  });

  describe('useStartSession optimistic update invariants', () => {
    // INVARIANT: onMutate musi cancellowac inflight queries — bez tego refetch
    // w locie nadpisze optimistic state.
    it('onMutate calls cancelQueries before setQueryData', () => {
      expect(source).toMatch(
        /onMutate:[\s\S]+?cancelQueries[\s\S]+?setQueryData/,
      );
    });

    // INVARIANT: onMutate zapamietuje previousActive do rollbacku.
    it('onMutate captures previousActive snapshot', () => {
      expect(source).toMatch(/onMutate:[\s\S]+?getQueryData[\s\S]+?previousActive/);
    });

    // INVARIANT: onError robi rollback do previousActive — regression test
    // na bug "optimistic state stays after error".
    it('onError restores previousActive from context', () => {
      expect(source).toMatch(
        /onError:[\s\S]+?previousActive[\s\S]+?setQueryData[\s\S]+?previousActive/,
      );
    });

    // INVARIANT: onSettled invaliduje aktywna sesje + lista — gwarantuje sync
    // z serwerem niezaleznie od sukcesu/bledu.
    it('onSettled invalidates both activeSessionKey and child sessions list', () => {
      expect(source).toMatch(
        /onSettled:[\s\S]+?invalidateQueries[\s\S]+?activeSessionKey[\s\S]+?invalidateChildSessions/,
      );
    });
  });

  describe('useEndSession optimistic update invariants', () => {
    // INVARIANT: optimistic null = aktywna sesja znika natychmiast.
    it('onMutate sets active session to null optimistically', () => {
      expect(source).toMatch(
        /useEndSession[\s\S]+?onMutate:[\s\S]+?setQueryData[\s\S\S]+?null/,
      );
    });

    // INVARIANT: onError rollback identyczny jak w useStartSession.
    it('onError restores previousActive', () => {
      expect(source).toMatch(
        /useEndSession[\s\S]+?onError:[\s\S]+?previousActive[\s\S]+?setQueryData/,
      );
    });
  });

  describe('stable queryKey patterns (refetch loop regression)', () => {
    // INVARIANT: useSessions uzywa dayKeyInAppTz w queryKey zamiast
    // toISOString() — patrz docs/solutions/2026-05-28-usememo-querykey-refetch-loop.md.
    // Bez tego nowy string per render -> refetch loop -> battery drain.
    it('useSessions uses dayKeyInAppTz (not toISOString) in queryKey', () => {
      expect(source).toContain('dayKeyInAppTz(rangeStart)');
      expect(source).toContain('dayKeyInAppTz(rangeEnd)');
      // Dopasuj sam array literal queryKey (od `queryKey: [` do najblizszego `],`),
      // zeby nie zlapac komentarza ktory tlumaczy dlaczego NIE uzywamy toISOString.
      const queryKeyMatch = source.match(
        /queryKey:\s*\[\s*\.\.\.sessionsByChildKey[\s\S]+?\],/,
      );
      expect(queryKeyMatch).not.toBeNull();
      expect(queryKeyMatch?.[0]).not.toContain('toISOString()');
    });
  });

  describe('domain constraints', () => {
    // INVARIANT: useInsertBackdatedSession waliduje endAt > startAt PRZED INSERT.
    it('useInsertBackdatedSession validates endAt > startAt before insert', () => {
      expect(source).toMatch(
        /useInsertBackdatedSession[\s\S]+?if\s*\(endAt\s*<=\s*startAt\)/,
      );
    });

    // INVARIANT: useActiveSession filtruje end_at IS NULL — kluczowy invariant
    // domeny (max jedna aktywna sesja per dziecko, partial unique idx).
    it('useActiveSession filters by end_at is null', () => {
      expect(source).toMatch(/useActiveSession[\s\S]+?\.is\('end_at',\s*null\)/);
    });

    // INVARIANT: useLastEndedSession bierze tylko zakonczone sesje.
    it('useLastEndedSession filters by end_at not null', () => {
      expect(source).toMatch(
        /useLastEndedSession[\s\S]+?\.not\('end_at',\s*'is',\s*null\)/,
      );
    });
  });

  describe('error translation', () => {
    // INVARIANT: useStartSession mapuje PostgrestError przez translateSessionError
    // (PL message). Bez tego UI dostaje raw "duplicate key value".
    it('useStartSession wraps supabase error via translateSessionError', () => {
      expect(source).toMatch(
        /useStartSession[\s\S]+?throw new Error\(translateSessionError\(error\)\)/,
      );
    });
  });
});
