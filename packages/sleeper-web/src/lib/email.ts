// Walidacja email po stronie klienta. Wzorzec celowo prosty — nie
// pretenduje do RFC 5322 compliance, blokuje typowe literowki.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
