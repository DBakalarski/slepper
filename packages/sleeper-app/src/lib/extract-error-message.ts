// Wyciaga komunikat bledu z roznych ksztaltow:
// - Error instance -> .message
// - Supabase PostgrestError (plain object) -> "[code] message (details)"
// - cokolwiek innego -> 'unknown'
//
// PostgrestError z @supabase/supabase-js NIE jest instanceof Error w runtime,
// dlatego `error instanceof Error ? .message : 'unknown'` gubi pelny komunikat
// (np. PGRST205, brak RLS, unique violation).
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
    };
    const parts = [
      typeof e.code === 'string' && e.code.length > 0 ? `[${e.code}]` : null,
      typeof e.message === 'string' && e.message.length > 0 ? e.message : null,
      typeof e.details === 'string' && e.details.length > 0 ? `(${e.details})` : null,
    ].filter((part): part is string => part !== null);
    if (parts.length > 0) return parts.join(' ');
  }
  return 'unknown';
}
