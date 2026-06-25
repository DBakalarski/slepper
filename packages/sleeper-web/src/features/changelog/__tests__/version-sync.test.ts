import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Invariant zgodnosci wersji (uruchamiany w `web:build:check` przez `vitest run`).
//
// Cel: jedno zrodlo prawdy o wersji release'u. Numer w Ustawieniach czyta
// `app.json` (Constants.expoConfig.version), a baner "Co nowego" + historia
// czytaja `public/changelog.json`. Gdy te trzy sie rozjada (np. bump app.json
// bez wpisu w changelogu) — deploy idzie z bledna lub niezapowiedziana wersja.
// Ten test wymusza: app.json == package.json == najnowszy wpis changelogu.
//
// UWAGA (swiadome ograniczenie): test NIE wykryje sytuacji "zapomniano calego
// wpisu", gdy wszystkie trzy zostana na starej wersji (sa wtedy spojne). Lapie
// rozjazd, nie brak bumpa. Pelne wymuszenie "user-facing zmiana => wpis"
// wymagaloby pre-push guarda (swiadomie odrzucone na rzecz tego lzejszego gate).

const PKG_ROOT = resolve(__dirname, '../../../..');

interface ChangelogEntryRaw {
  v: number;
  version: string;
  date: string;
  items: string[];
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(PKG_ROOT, relPath), 'utf-8')) as T;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

describe('version sync invariant', () => {
  const appVersion = readJson<{ expo: { version: string } }>('app.json').expo.version;
  const pkgVersion = readJson<{ version: string }>('package.json').version;
  const changelog = readJson<ChangelogEntryRaw[]>('public/changelog.json');
  const topEntry = changelog[0];

  it('app.json i package.json maja te sama wersje', () => {
    expect(appVersion).toBe(pkgVersion);
  });

  it('najnowszy wpis changelogu ma wersje zgodna z app.json/package.json', () => {
    expect(topEntry.version).toBe(appVersion);
  });

  it('wszystkie trzy wersje to poprawny semver', () => {
    expect(appVersion).toMatch(SEMVER);
    expect(pkgVersion).toMatch(SEMVER);
    expect(topEntry.version).toMatch(SEMVER);
  });

  it('najnowszy wpis ma najwyzsze v (changelog posortowany malejaco)', () => {
    const maxV = Math.max(...changelog.map((e) => e.v));
    expect(topEntry.v).toBe(maxV);
  });

  it('kazde v w changelogu jest unikalne (brak duplikatow numeru wersji)', () => {
    const versionNumbers = changelog.map((e) => e.v);
    expect(new Set(versionNumbers).size).toBe(versionNumbers.length);
  });
});
