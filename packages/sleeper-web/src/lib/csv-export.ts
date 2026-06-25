// Czysta serializacja sesji snu do CSV (raport dla pediatry). Bez I/O, bez
// Date.now() — dostarczenie pliku zyje w lib/share-file.ts. Separator `;`
// (domyslny separator listy w Excelu PL); BOM dodaje warstwa share.

import type { SleepSession } from '@/features/sessions/hooks';
import { tagLabel } from '@/features/sessions/tags';
import { dayKeyInAppTz, formatDateShort, formatDuration, formatTime } from '@/lib/time';

const SEPARATOR = ';';
const ROW_DELIMITER = '\r\n';
const HEADERS = ['Data', 'Start', 'Koniec', 'Długość', 'Typ', 'Notatki', 'Tagi'] as const;

const TYPE_LABEL: Record<SleepSession['type'], string> = {
  nap: 'Drzemka',
  night_sleep: 'Sen nocny',
};

// Ujmuje pole w cudzyslowy gdy zawiera separator, cudzyslow lub znak nowej linii;
// wewnetrzne `"` podwaja (RFC 4180).
function escapeCsvField(value: string): string {
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function sessionToRow(s: SleepSession): string {
  const start = new Date(s.start_at);
  const end = s.end_at ? new Date(s.end_at) : null;
  const fields = [
    formatDateShort(start),
    formatTime(start),
    end ? formatTime(end) : '',
    end ? formatDuration(end.getTime() - start.getTime()) : '',
    TYPE_LABEL[s.type],
    s.notes ?? '',
    s.tags.map(tagLabel).join(', '),
  ];
  return fields.map(escapeCsvField).join(SEPARATOR);
}

// Serializuje sesje do CSV: wiersz naglowkow + jeden wiersz per sesja,
// posortowane chronologicznie rosnaco (czytelny raport). Pusta lista -> same naglowki.
export function sessionsToCsv(sessions: SleepSession[]): string {
  const header = HEADERS.join(SEPARATOR);
  const sorted = [...sessions].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const rows = sorted.map(sessionToRow);
  return [header, ...rows].join(ROW_DELIMITER);
}

// Reuznane przez warstwe share przy budowie nazwy pliku — eksport dnia eksportu.
export function csvExportFilename(now: Date): string {
  return `sleeper-sen-${dayKeyInAppTz(now)}.csv`;
}
