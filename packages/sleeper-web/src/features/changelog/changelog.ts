// Czysta logika changelogu „co nowego po deployu". Bez I/O, bez Date.now() —
// fetch i localStorage zyja w useChangelogUpdate. Testowalna w izolacji.

export interface ChangelogEntry {
  v: number;
  version: string;
  date: string;
  items: string[];
}

export interface UnseenChangelog {
  items: string[];
  latestVersion: number;
  extraCount: number;
}

const MAX_ITEMS = 6;

function isChangelogEntry(value: unknown): value is ChangelogEntry {
  if (typeof value !== 'object' || value === null) return false;
  if (!('v' in value) || !('version' in value) || !('date' in value) || !('items' in value)) {
    return false;
  }
  const { v, version, date, items } = value;
  return (
    typeof v === 'number' &&
    typeof version === 'string' &&
    typeof date === 'string' &&
    Array.isArray(items) &&
    items.every((item) => typeof item === 'string')
  );
}

// Parsuje surowy JSON do listy wpisow posortowanych malejaco po `v` (najnowszy
// pierwszy). Odfiltrowuje wpisy o zlym ksztalcie; nie-tablica -> [].
export function parseChangelog(raw: unknown): ChangelogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isChangelogEntry).sort((a, b) => b.v - a.v);
}

// Wybiera niewidziane punkty (wpisy o `v > lastSeen`), splaszcza je (najnowsze
// pierwsze) i tnie do MAX_ITEMS. `latestVersion` liczone z PELNEJ listy.
export function selectUnseen(entries: ChangelogEntry[], lastSeen: number): UnseenChangelog {
  const latestVersion = entries.reduce((max, entry) => (entry.v > max ? entry.v : max), 0);
  const allItems = entries.filter((entry) => entry.v > lastSeen).flatMap((entry) => entry.items);
  const items = allItems.slice(0, MAX_ITEMS);
  const extraCount = Math.max(0, allItems.length - MAX_ITEMS);
  return { items, latestVersion, extraCount };
}
