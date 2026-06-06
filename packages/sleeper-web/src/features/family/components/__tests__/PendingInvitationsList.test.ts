import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants test dla PendingInvitationsList (web).
// Krytyczne: NIE wolno zostawic Alert.alert (no-op na web → revoke ciche
// failuje). Wszystko musi przechodzic przez confirmAction (@/lib/confirm).
// (review Fazy 3 P2.1 + P2.4)

const SRC_PATH = resolve(__dirname, '../PendingInvitationsList.tsx');
const src = readFileSync(SRC_PATH, 'utf-8');

describe('PendingInvitationsList static invariants', () => {
  it('does NOT import Alert (Alert.alert na web = no-op)', () => {
    expect(src).not.toMatch(/\bAlert\b/);
  });

  it('uses confirmAction z @/lib/confirm dla destruktywnego revoke', () => {
    expect(src).toMatch(/confirmAction/);
    expect(src).toMatch(/from '@\/lib\/confirm'/);
  });

  it('handleRevoke jest async (czeka na user confirm)', () => {
    expect(src).toMatch(/async function handleRevoke/);
  });

  it('przerywa revoke gdy user wybral cancel (early return na !ok)', () => {
    expect(src).toMatch(/if \(!ok\) return/);
  });

  it('uses destructive: true dla revoke confirm dialog', () => {
    expect(src).toMatch(/destructive:\s*true/);
  });

  it('renderuje email zaproszenia oraz przycisk Cofnij', () => {
    expect(src).toMatch(/inv\.email/);
    expect(src).toMatch(/Cofnij/);
  });
});
