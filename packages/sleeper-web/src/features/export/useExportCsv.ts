import { addDays } from 'date-fns';
import { useCallback, useState } from 'react';

import { fetchSessionsInRange } from '@/features/sessions/hooks';
import { useSnackbar } from '@/features/snackbar/SnackbarProvider';
import { csvExportFilename, sessionsToCsv } from '@/lib/csv-export';
import { endOfDayInAppTz, startOfDayInAppTz } from '@/lib/time';
import { shareOrDownloadCsv } from '@/lib/share-file';

export type ExportStatus = 'idle' | 'loading';

export interface UseExportCsv {
  status: ExportStatus;
  exportCsv: (childId: string, rangeDays: number) => Promise<void>;
}

// Orkiestruje eksport CSV: fetch sesji dla zakresu -> serializacja -> share/download
// -> feedback przez snackbar. Wynik komunikowany snackbarem (nie stanem), `status`
// tylko do spinnera w UI. Daty TZ-safe (addDays z date-fns + helpery app tz).
export function useExportCsv(): UseExportCsv {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const { show } = useSnackbar();

  const exportCsv = useCallback(
    async (childId: string, rangeDays: number): Promise<void> => {
      setStatus('loading');
      try {
        const now = new Date();
        const start = startOfDayInAppTz(addDays(now, -(rangeDays - 1)));
        const end = endOfDayInAppTz(now);

        const sessions = await fetchSessionsInRange(childId, start, end);
        if (sessions.length === 0) {
          show({ message: 'Brak sesji w wybranym zakresie' });
          return;
        }

        const csv = sessionsToCsv(sessions);
        const result = await shareOrDownloadCsv(csvExportFilename(now), csv);
        if (result === 'shared' || result === 'downloaded') {
          show({ message: 'Wyeksportowano dane snu' });
        } else if (result === 'failed') {
          show({ message: 'Błąd eksportu — spróbuj ponownie' });
        }
        // 'cancelled' -> user anulowal arkusz share, bez komunikatu.
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[export] csv export failed', err);
        }
        show({ message: 'Błąd eksportu — spróbuj ponownie' });
      } finally {
        setStatus('idle');
      }
    },
    [show],
  );

  return { status, exportCsv };
}
