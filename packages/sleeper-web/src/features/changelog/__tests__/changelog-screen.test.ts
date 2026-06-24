import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla ekranu Historia zmian + jego wpiecia (settings row,
// rejestracja route). Strategia pure-only — bez jsdom/RTL.
const SCREEN_SRC = readFileSync(resolve(__dirname, '../../../app/(app)/changelog.tsx'), 'utf-8');
const SETTINGS_SRC = readFileSync(resolve(__dirname, '../../../app/(app)/settings.tsx'), 'utf-8');
const LAYOUT_SRC = readFileSync(resolve(__dirname, '../../../app/(app)/_layout.tsx'), 'utf-8');

describe('changelog screen static invariants', () => {
  it('obsluguje wszystkie stany (loading/error/empty/ready)', () => {
    expect(SCREEN_SRC).toMatch(/status === 'loading'/);
    expect(SCREEN_SRC).toMatch(/status === 'error'/);
    expect(SCREEN_SRC).toMatch(/entries\.length === 0/);
    expect(SCREEN_SRC).toMatch(/entries\.map/);
  });

  it('ma dostepny back button', () => {
    expect(SCREEN_SRC).toMatch(/accessibilityRole="button"/);
    expect(SCREEN_SRC).toMatch(/router\.back\(\)/);
  });

  it('nie uzywa native-only API', () => {
    expect(SCREEN_SRC).not.toMatch(/Alert\.alert/);
    expect(SCREEN_SRC).not.toMatch(/expo-notifications/);
    expect(SCREEN_SRC).not.toMatch(/useColorScheme/);
  });
});

describe('settings row + route registration', () => {
  it('settings ma wiersz nawigujacy do /changelog z wersja appki', () => {
    expect(SETTINGS_SRC).toMatch(/router\.push\('\/changelog'\)/);
    expect(SETTINGS_SRC).toMatch(/Constants\.expoConfig\?\.version/);
  });

  it('layout rejestruje route changelog jako ukryty (href: null)', () => {
    expect(LAYOUT_SRC).toMatch(/name="changelog"\s+options=\{\{\s*href:\s*null\s*\}\}/);
  });
});
