import { isUniqueViolation } from '@/lib/postgres-errors';

// Tlumaczenie bledow z mutacji sessions na PL. Najczestszy edge-case:
// 23505 z partial unique idx `sessions_one_active_per_child` — dwa telefony
// rodzicow startuja sesje w tym samym momencie, drugi insert padnie.
export function translateSessionError(error: unknown): string {
  if (isUniqueViolation(error)) {
    return 'Inny czlonek rodziny juz rozpoczal sesje. Odswiez i sprobuj ponownie.';
  }

  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();

  if (lower.includes('koniec musi byc po starcie')) {
    return 'Koniec sesji musi byc pozniej niz start.';
  }
  if (lower.includes('brak zalogowanego usera')) {
    return 'Sesja wygasla. Zaloguj sie ponownie.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Blad polaczenia. Sprawdz internet.';
  }

  return message || 'Nieznany blad.';
}
