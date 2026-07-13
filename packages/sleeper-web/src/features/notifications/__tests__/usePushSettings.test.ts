import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Static invariants (strategia projektu dla hookow UI) — architektura
// warstwy powiadomien: push API przez lib/push, stabilny queryKey,
// upsert po endpoint, sheet bez bezposredniego supabase.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(path.resolve(__dirname, rel), 'utf-8');
}

describe('usePushSettings static invariants', () => {
  it('dostep do push API wylacznie przez @/lib/push', () => {
    const hookSource = read('../usePushSettings.ts');
    expect(hookSource).toContain("from '@/lib/push'");
    expect(hookSource).not.toMatch(/pushManager|Notification\.requestPermission/);
  });

  it('queryKey stabilny — literal push-settings, bez new Date()/Date.now() w kluczu', () => {
    const hookSource = read('../usePushSettings.ts');
    expect(hookSource).toContain("['push-settings']");
    expect(hookSource).not.toMatch(/queryKey:\s*\[[^\]]*(new Date\(|Date\.now\()/);
  });

  it('upsert po endpoint (onConflict) — jedna subskrypcja per urzadzenie', () => {
    const hookSource = read('../usePushSettings.ts');
    expect(hookSource).toContain("onConflict: 'endpoint'");
  });

  it('sheet uzywa hooka i nie dotyka supabase bezposrednio', () => {
    const sheetSource = read('../NotificationsBottomSheet.tsx');
    expect(sheetSource).toContain('usePushSettings');
    expect(sheetSource).not.toContain("from '@/lib/supabase'");
  });

  it('profil otwiera NotificationsBottomSheet zamiast placeholdera', () => {
    const profileSource = read('../../../app/(app)/profile.tsx');
    expect(profileSource).toContain('NotificationsBottomSheet');
    expect(profileSource).not.toContain('Placeholder');
  });
});
