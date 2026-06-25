import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla UI eksportu (sheet + wpiecie w Historie). Pure-only.
const SHEET_SRC = readFileSync(resolve(__dirname, '../components/ExportSheet.tsx'), 'utf-8');
const HISTORY_SRC = readFileSync(resolve(__dirname, '../../../app/(app)/history.tsx'), 'utf-8');

describe('ExportSheet static invariants', () => {
  it('ma SegmentedControl wyboru zakresu i przycisk eksportu', () => {
    expect(SHEET_SRC).toMatch(/SegmentedControl/);
    expect(SHEET_SRC).toMatch(/accessibilityLabel="Eksportuj CSV"/);
  });

  it('oferuje presety 2 tyg / 30 dni / 90 dni', () => {
    expect(SHEET_SRC).toMatch(/value: '14'/);
    expect(SHEET_SRC).toMatch(/value: '30'/);
    expect(SHEET_SRC).toMatch(/value: '90'/);
  });

  it('blokuje przycisk podczas eksportu', () => {
    expect(SHEET_SRC).toMatch(/disabled=\{isLoading\}/);
  });

  it('nie uzywa native-only API', () => {
    expect(SHEET_SRC).not.toMatch(/Alert\.alert/);
    expect(SHEET_SRC).not.toMatch(/useColorScheme/);
  });
});

describe('history export wiring', () => {
  it('renderuje IconButton eksportu i montuje ExportSheet', () => {
    expect(HISTORY_SRC).toMatch(/accessibilityLabel="Eksportuj dane snu"/);
    expect(HISTORY_SRC).toMatch(/<ExportSheet/);
    expect(HISTORY_SRC).toMatch(/setExportVisible/);
  });
});
