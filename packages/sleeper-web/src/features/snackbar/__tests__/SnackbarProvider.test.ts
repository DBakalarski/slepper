import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla SnackbarProvider (strategia pure-only — bez jsdom/RTL).
// Pilnuje higieny timera i parytetu web (brak native-only API).
const PROVIDER_SRC = readFileSync(resolve(__dirname, '../SnackbarProvider.tsx'), 'utf-8');
const HOME_SRC = readFileSync(
  resolve(__dirname, '../../../app/(app)/index.tsx'),
  'utf-8',
);

describe('SnackbarProvider static invariants', () => {
  it('czysci timer w cleanup useEffect (clearTimeout)', () => {
    expect(PROVIDER_SRC).toMatch(/setTimeout/);
    expect(PROVIDER_SRC).toMatch(/return\s*\(\)\s*=>\s*clearTimeout/);
  });

  it('rzuca typed error gdy useSnackbar uzyty poza providerem', () => {
    expect(PROVIDER_SRC).toMatch(/must be used within a SnackbarProvider/);
  });

  it('nie uzywa native-only API (Alert / expo-notifications)', () => {
    expect(PROVIDER_SRC).not.toMatch(/Alert\.alert/);
    expect(PROVIDER_SRC).not.toMatch(/expo-notifications/);
  });
});

describe('Home quick-undo wiring', () => {
  it('pokazuje snackbar po zakonczeniu sesji z akcja Przywroc', () => {
    expect(HOME_SRC).toMatch(/useSnackbar/);
    expect(HOME_SRC).toMatch(/snackbar\.show/);
    expect(HOME_SRC).toMatch(/Przywroc/);
  });

  it('cofniecie ustawia end_at na null przez useUpdateSession', () => {
    expect(HOME_SRC).toMatch(/useUpdateSession/);
    expect(HOME_SRC).toMatch(/end_at:\s*null/);
  });
});
