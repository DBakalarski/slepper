import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla share-file (web delivery). Strategia pure-only — bez jsdom.
const SRC = readFileSync(resolve(__dirname, '../share-file.ts'), 'utf-8');

describe('share-file static invariants', () => {
  it('prefiksuje tresc BOM (Excel PL rozpoznaje UTF-8)', () => {
    expect(SRC).toMatch(/const BOM = '﻿'/);
    expect(SRC).toMatch(/new Blob\(\[BOM \+ csv\]/);
  });

  it('uzywa Web Share API gdy canShare({files}) dostepne', () => {
    expect(SRC).toMatch(/canShare\(\{ files: \[file\] \}\)/);
    expect(SRC).toMatch(/nav\.share\(\{ files: \[file\] \}\)/);
  });

  it('traktuje AbortError jako cancelled (nie blad)', () => {
    expect(SRC).toMatch(/AbortError/);
    expect(SRC).toMatch(/return 'cancelled'/);
  });

  it('ma fallback na <a download>', () => {
    expect(SRC).toMatch(/createElement\('a'\)/);
    expect(SRC).toMatch(/\.download = filename/);
    expect(SRC).toMatch(/revokeObjectURL/);
  });

  it('osłania srodowisko SSR (brak window/document)', () => {
    expect(SRC).toMatch(/typeof window === 'undefined'/);
    expect(SRC).toMatch(/typeof document === 'undefined'/);
  });

  it('nie uzywa native-only API', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
    expect(SRC).not.toMatch(/expo-/);
  });
});
