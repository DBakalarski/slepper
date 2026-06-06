import { describe, expect, it } from 'vitest';

import { translateAuthError } from '../translate-auth-error';

// Pure-function unit testy dla translate-auth-error.
// Pokrycie 6 branchy + 1 fallback. (Faza 1 P2.7 — fix przed Faza 4 deploy.)

describe('translateAuthError', () => {
  it('rozpoznaje "Invalid login credentials" jako niepoprawny email/haslo', () => {
    expect(translateAuthError('Invalid login credentials')).toBe(
      'Niepoprawny email lub haslo.',
    );
  });

  it('rozpoznaje "invalid credentials" (case-insensitive)', () => {
    expect(translateAuthError('INVALID CREDENTIALS')).toBe('Niepoprawny email lub haslo.');
  });

  it('rozpoznaje "Email not confirmed"', () => {
    expect(translateAuthError('Email not confirmed')).toBe(
      'Email niepotwierdzony. Sprawdz skrzynke.',
    );
  });

  it('rozpoznaje "already registered" jako konto juz istnieje', () => {
    expect(translateAuthError('User already registered')).toBe(
      'Konto z tym emailem juz istnieje. Zaloguj sie.',
    );
  });

  it('rozpoznaje "User already" (alternatywny phrasing)', () => {
    expect(translateAuthError('User already exists')).toBe(
      'Konto z tym emailem juz istnieje. Zaloguj sie.',
    );
  });

  it('rozpoznaje generyczny "password" error', () => {
    expect(translateAuthError('Password too short')).toBe(
      'Haslo nie spelnia wymagan. Sprobuj dluzsze.',
    );
  });

  it('rozpoznaje "network" error', () => {
    expect(translateAuthError('Network request failed')).toBe('Blad polaczenia. Sprawdz internet.');
  });

  it('rozpoznaje "fetch" error jako network', () => {
    expect(translateAuthError('TypeError: Failed to fetch')).toBe(
      'Blad polaczenia. Sprawdz internet.',
    );
  });

  it('fallback zwraca generic message, NIE leakuje raw Supabase error (security)', () => {
    // Krytyczne: raw PostgREST hint/infra info nie moze wyciec do UI.
    expect(translateAuthError('PGRST301: JWT expired (hint: ...)')).toBe(
      'Nie udalo sie. Sprobuj ponownie.',
    );
  });

  it('fallback dla pustego stringa', () => {
    expect(translateAuthError('')).toBe('Nie udalo sie. Sprobuj ponownie.');
  });
});
