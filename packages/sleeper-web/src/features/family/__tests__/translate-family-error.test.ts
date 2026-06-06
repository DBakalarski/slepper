import { describe, expect, it } from 'vitest';

import { translateFamilyError } from '../translate-family-error';

describe('translateFamilyError', () => {
  it('returns Polish message for 23505 unique violation (duplicate invitation)', () => {
    const err = { code: '23505', message: 'duplicate key value' };
    expect(translateFamilyError(err)).toBe('To zaproszenie juz istnieje.');
  });

  it('returns invitation-unavailable for P0001 raise exception', () => {
    const err = { code: 'P0001', message: 'whatever' };
    expect(translateFamilyError(err)).toBe(
      'Zaproszenie nie jest juz dostepne (cofniete lub zaakceptowane).',
    );
  });

  it('returns invitation-unavailable for "invitation not available" message', () => {
    const err = new Error('Invitation not available');
    expect(translateFamilyError(err)).toBe(
      'Zaproszenie nie jest juz dostepne (cofniete lub zaakceptowane).',
    );
  });

  it('translates "cannot leave family as sole owner" guard', () => {
    const err = new Error('Cannot leave family as sole owner');
    expect(translateFamilyError(err)).toBe(
      'Nie mozesz odejsc — jestes jedynym wlascicielem rodziny z innymi czlonkami.',
    );
  });

  it('translates "not authenticated" to session expired hint', () => {
    const err = new Error('Not authenticated');
    expect(translateFamilyError(err)).toBe(
      'Sesja wygasla. Zaloguj sie ponownie.',
    );
  });

  it('translates "no email claim" to email hint', () => {
    const err = new Error('No email claim in JWT');
    expect(translateFamilyError(err)).toBe(
      'Brak emaila w sesji. Zaloguj sie ponownie.',
    );
  });

  it('translates network/fetch error to connection hint', () => {
    expect(translateFamilyError(new Error('network failure'))).toBe(
      'Blad polaczenia. Sprawdz internet.',
    );
    expect(translateFamilyError(new Error('Failed to fetch'))).toBe(
      'Blad polaczenia. Sprawdz internet.',
    );
  });

  it('falls back to raw message for unrecognized error', () => {
    const err = new Error('Random error XYZ');
    expect(translateFamilyError(err)).toBe('Random error XYZ');
  });

  it('returns "Nieznany blad." for non-Error value', () => {
    expect(translateFamilyError('string error')).toBe('Nieznany blad.');
    expect(translateFamilyError(null)).toBe('Nieznany blad.');
    expect(translateFamilyError(undefined)).toBe('Nieznany blad.');
  });
});
