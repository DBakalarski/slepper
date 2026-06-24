import { useCallback, useEffect, useRef, useState } from 'react';

import { parseChangelog, selectUnseen } from '@/features/changelog/changelog';

const CHANGELOG_URL = '/changelog.json';
const STORAGE_KEY = 'sleeper:lastSeenChangelogVersion';

// localStorage osloniety (SSR / Safari private mode). Brak dostepu -> null
// (traktowane jak „pierwszy run" -> silent catch-up, banner sie nie pokaze).
function readLastSeen(): number | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[changelog] read lastSeen failed', err);
    }
    return null;
  }
}

function writeLastSeen(version: number): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(version));
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[changelog] write lastSeen failed', err);
    }
  }
}

interface ChangelogUpdateState {
  items: string[];
  extraCount: number;
  visible: boolean;
}

export interface UseChangelogUpdate extends ChangelogUpdateState {
  restart: () => void;
  dismiss: () => void;
}

const INITIAL_STATE: ChangelogUpdateState = { items: [], extraCount: 0, visible: false };

// Wykrywa nowy deploy przez /changelog.json (fetch no-store) na mount + przy
// powrocie karty do focusu. Porownuje max(v) z lastSeen (localStorage) —
// obsluguje pojedynczy deploy i scalanie wielu niewidzianych. `restart` zapisuje
// lastSeen i przeladowuje (SW skipWaiting -> swiezy bundle). `dismiss` chowa
// lokalnie bez zapisu (banner wroci przy nastepnym focusie).
export function useChangelogUpdate(): UseChangelogUpdate {
  const [state, setState] = useState<ChangelogUpdateState>(INITIAL_STATE);
  const latestVersionRef = useRef(0);

  const check = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const response = await fetch(CHANGELOG_URL, { cache: 'no-store' });
      if (!response.ok) return;
      const raw: unknown = await response.json();
      const entries = parseChangelog(raw);
      if (entries.length === 0) return;

      const lastSeen = readLastSeen();
      const { items, latestVersion, extraCount } = selectUnseen(entries, lastSeen ?? 0);
      latestVersionRef.current = latestVersion;

      if (lastSeen === null) {
        // Pierwszy run — nie zalewaj usera historia; cicho ustaw aktualna wersje.
        writeLastSeen(latestVersion);
        return;
      }
      if (items.length > 0) {
        setState({ items, extraCount, visible: true });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[changelog] check failed', err);
      }
    }
  }, []);

  useEffect(() => {
    void check();
    if (typeof document === 'undefined') return;
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [check]);

  const restart = useCallback(() => {
    writeLastSeen(latestVersionRef.current);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return { ...state, restart, dismiss };
}
