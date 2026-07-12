import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Static invariants dla web push (strategia: docs/solutions/testing-issues/
// 2026-06-06-static-invariants-testing-strategy.md). Caly dostep do
// Notification/PushManager zyje w lib/push.ts (wzorzec lib-wrapper).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../..');
const swPath = path.resolve(srcRoot, '../public/sw.js');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('web push static invariants', () => {
  it('Notification/pushManager tylko w lib/push.ts (poza testami)', () => {
    const offenders = walk(srcRoot).filter((file) => {
      if (file.endsWith(path.join('lib', 'push.ts'))) return false;
      if (file.includes('__tests__')) return false;
      const source = readFileSync(file, 'utf-8');
      return /Notification\.requestPermission|pushManager/.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('sw.js ma handlery push i notificationclick', () => {
    const sw = readFileSync(swPath, 'utf-8');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
  });

  it('lib/push.ts nie importuje expo-notifications', () => {
    const source = readFileSync(path.resolve(srcRoot, 'lib/push.ts'), 'utf-8');
    expect(source).not.toContain('expo-notifications');
  });
});
