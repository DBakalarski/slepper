// Dostarczenie pliku CSV na web (PWA). Web Share API (iOS/Android arkusz
// udostepniania) z fallbackiem na klasyczne pobranie (desktop). Web-only, ale
// osloniete SSR (parytet z lib/ wrapperami, learned-patterns).

const BOM = '﻿';
const CSV_MIME = 'text/csv;charset=utf-8';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function downloadBlob(filename: string, blob: Blob): ShareResult {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// BOM prefiksuje tresc, zeby Excel (zwl. PL) rozpoznal UTF-8 i polskie znaki.
export async function shareOrDownloadCsv(filename: string, csv: string): Promise<ShareResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'failed';

  const blob = new Blob([BOM + csv], { type: CSV_MIME });

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.canShare && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: CSV_MIME });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return 'shared';
      } catch (err) {
        if (isAbortError(err)) return 'cancelled';
        // Inny blad share (np. permission) -> sprobuj fallback download.
        if (process.env.NODE_ENV !== 'production') {
          console.log('[share-file] share failed, falling back to download', err);
        }
      }
    }
  }

  try {
    return downloadBlob(filename, blob);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[share-file] download failed', err);
    }
    return 'failed';
  }
}
