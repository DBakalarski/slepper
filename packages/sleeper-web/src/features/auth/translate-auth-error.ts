// Tlumaczenie typowych bledow Supabase Auth na PL. Konsumowane przez
// sign-in i sign-up.
export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Niepoprawny email lub haslo.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email niepotwierdzony. Sprawdz skrzynke.';
  }
  if (lower.includes('already registered') || lower.includes('user already')) {
    return 'Konto z tym emailem juz istnieje. Zaloguj sie.';
  }
  if (lower.includes('password')) {
    return 'Haslo nie spelnia wymagan. Sprobuj dluzsze.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Blad polaczenia. Sprawdz internet.';
  }
  return message;
}
