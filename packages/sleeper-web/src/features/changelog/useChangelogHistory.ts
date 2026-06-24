import { useEffect, useState } from 'react';

import { parseChangelog, type ChangelogEntry } from '@/features/changelog/changelog';

// Osobny hook od `useChangelogUpdate` (banner). Tu interesuje nas PELNA historia
// do ekranu „Historia zmian" — pojedynczy fetch na mount, bez localStorage i bez
// listenera focus. Swiadoma ~duplikacja stalej/fetcha (granica: inna
// odpowiedzialnosc) zamiast laczenia dwoch celow w jeden hook.
const CHANGELOG_URL = '/changelog.json';

export type ChangelogHistoryState =
  | { status: 'loading' }
  | { status: 'ready'; entries: ChangelogEntry[] }
  | { status: 'error' };

export function useChangelogHistory(): ChangelogHistoryState {
  const [state, setState] = useState<ChangelogHistoryState>({ status: 'loading' });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const response = await fetch(CHANGELOG_URL, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`changelog fetch ${response.status}`);
        const raw: unknown = await response.json();
        setState({ status: 'ready', entries: parseChangelog(raw) });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[changelog] history load failed', err);
        }
        setState({ status: 'error' });
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return state;
}
