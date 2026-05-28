import { isRaiseException, isUniqueViolation } from '@/lib/postgres-errors';

// Tlumaczenie bledow z RPC family/invitations na PL. Mapuje:
//  - 23505 (unique violation) z INSERT family_invitations
//  - P0001 (raise exception) z RPC accept_invitation
//  - "Cannot leave family as sole owner" (last-owner guard)
//  - "Not authenticated" (race po wylogowaniu)
export function translateFamilyError(error: unknown): string {
  if (isUniqueViolation(error)) {
    return 'To zaproszenie juz istnieje.';
  }

  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();

  if (isRaiseException(error) || lower.includes('invitation not available')) {
    return 'Zaproszenie nie jest juz dostepne (cofniete lub zaakceptowane).';
  }
  if (lower.includes('cannot leave family as sole owner')) {
    return 'Nie mozesz odejsc — jestes jedynym wlascicielem rodziny z innymi czlonkami.';
  }
  if (lower.includes('not authenticated')) {
    return 'Sesja wygasla. Zaloguj sie ponownie.';
  }
  if (lower.includes('no email claim')) {
    return 'Brak emaila w sesji. Zaloguj sie ponownie.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Blad polaczenia. Sprawdz internet.';
  }

  return message || 'Nieznany blad.';
}
