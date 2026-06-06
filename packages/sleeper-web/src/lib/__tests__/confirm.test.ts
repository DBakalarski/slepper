import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants test dla `confirmAction`. Pure-only — runtime test
// wymagalby mockowania `react-native` (Flow syntax) ktore jest poza scope
// vitest node env (parytet z innymi testami w pakiecie).
// Krytyczne wzorce:
//   1. Platform.OS === 'web' guard → window.confirm (resolve true/false).
//   2. Native sciezka → Alert.alert + Promise wrapper (resolve w onPress).
//   3. Zwracany typ Promise<boolean> (wspolny kontrakt API).
//
// (review Fazy 3 P2.1 + P2.4)

const SRC_PATH = resolve(__dirname, '../confirm.ts');
const src = readFileSync(SRC_PATH, 'utf-8');

describe('confirmAction static invariants', () => {
  it('importuje Alert + Platform z react-native', () => {
    expect(src).toMatch(/import \{ Alert, Platform \} from 'react-native'/);
  });

  it('uzywa Platform.OS === \'web\' guard zeby wybrac sciezke', () => {
    expect(src).toMatch(/Platform\.OS === 'web'/);
  });

  it('sciezka web uzywa window.confirm (synchroniczna, blocking)', () => {
    expect(src).toMatch(/window\.confirm/);
  });

  it('sciezka web zwraca Promise.resolve (parytet API)', () => {
    expect(src).toMatch(/Promise\.resolve/);
  });

  it('sciezka native uzywa Alert.alert z 2 buttonami (cancel + confirm)', () => {
    expect(src).toMatch(/Alert\.alert/);
    expect(src).toMatch(/style:\s*'cancel'/);
    expect(src).toMatch(/style:\s*destructive\s*\?\s*'destructive'\s*:\s*'default'/);
  });

  it('sciezka native rozwiazuje Promise w onPress + onDismiss (no leak)', () => {
    expect(src).toMatch(/onPress:\s*\(\)\s*=>\s*resolve\(false\)/);
    expect(src).toMatch(/onPress:\s*\(\)\s*=>\s*resolve\(true\)/);
    expect(src).toMatch(/onDismiss:\s*\(\)\s*=>\s*resolve\(false\)/);
  });

  it('eksportuje typ ConfirmOptions (TS public API)', () => {
    expect(src).toMatch(/export type ConfirmOptions/);
  });

  it('eksportuje confirmAction z sygnatura zwracajaca Promise<boolean>', () => {
    expect(src).toMatch(/export function confirmAction[\s\S]{0,200}Promise<boolean>/);
  });

  it('does NOT zwracac void / no-op fallback (każda sciezka resolve bool)', () => {
    // Defensive: nie powinno byc ukrytego return;` bez wartosci w funkcji.
    expect(src).not.toMatch(/^\s*return\s*;\s*$/m);
  });
});
