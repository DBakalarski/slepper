import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants dla ChangelogBanner (strategia pure-only).
const SRC = readFileSync(resolve(__dirname, '../ChangelogBanner.tsx'), 'utf-8');

describe('ChangelogBanner static invariants', () => {
  it('ma przycisk restartu i odlozenia (oba akcje)', () => {
    expect(SRC).toMatch(/onRestart/);
    expect(SRC).toMatch(/onDismiss/);
    expect(SRC).toMatch(/Zrestartuj teraz/);
    expect(SRC).toMatch(/Później/);
  });

  it('przyciski maja a11y role i label', () => {
    expect(SRC).toMatch(/accessibilityRole="button"/);
    expect(SRC).toMatch(/accessibilityLabel="Zrestartuj teraz"/);
  });

  it('pokazuje „i N innych" gdy extraCount > 0', () => {
    expect(SRC).toMatch(/extraCount > 0/);
  });

  it('nie uzywa native-only API', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
  });
});
