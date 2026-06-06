import { describe, expect, it } from 'vitest';

import { translateSessionError } from '../translate-session-error';

describe('translateSessionError', () => {
  it('returns Polish message for 23505 unique violation (race ze startem)', () => {
    const err = { code: '23505', message: 'duplicate key value' };
    expect(translateSessionError(err)).toBe(
      'Inny czlonek rodziny juz rozpoczal sesje. Odswiez i sprobuj ponownie.',
    );
  });

  it('translates "koniec musi byc po starcie" walidation message', () => {
    const err = new Error('Koniec musi byc po starcie');
    expect(translateSessionError(err)).toBe(
      'Koniec sesji musi byc pozniej niz start.',
    );
  });

  it('translates "brak zalogowanego usera" to session expired hint', () => {
    const err = new Error('Brak zalogowanego usera');
    expect(translateSessionError(err)).toBe(
      'Sesja wygasla. Zaloguj sie ponownie.',
    );
  });

  it('translates network error to connection hint', () => {
    const err = new Error('network request failed');
    expect(translateSessionError(err)).toBe(
      'Blad polaczenia. Sprawdz internet.',
    );
  });

  it('translates fetch error to connection hint', () => {
    const err = new Error('Failed to fetch');
    expect(translateSessionError(err)).toBe(
      'Blad polaczenia. Sprawdz internet.',
    );
  });

  it('falls back to raw message for unrecognized error', () => {
    const err = new Error('Nieoczekiwany blad XYZ');
    expect(translateSessionError(err)).toBe('Nieoczekiwany blad XYZ');
  });

  it('returns "Nieznany blad." for non-Error value', () => {
    expect(translateSessionError('string error')).toBe('Nieznany blad.');
    expect(translateSessionError(null)).toBe('Nieznany blad.');
    expect(translateSessionError(undefined)).toBe('Nieznany blad.');
  });
});
