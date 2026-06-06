import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static-invariants test dla `registerSW` + manifest + sw.js.
// Runtime test wymaga DOM (`navigator`, `window.load`) — pomijamy w favor pure
// invariant check (parytet z confirm.test.ts).
//
// IU11: PWA shell — krytyczne wzorce:
//   1. registerSW: idempotentny scope: '/'
//   2. registerSW: typeof window/navigator guard (RN compat)
//   3. registerSW: no-op gdy brak 'serviceWorker' in navigator
//   4. sw.js: cache-first dla shell, network for API
//   5. sw.js: skip /rest/v1/, /auth/v1/, /realtime/v1/
//   6. manifest.json: valid JSON, display: standalone, theme_color

const PKG_ROOT = resolve(__dirname, '../../../..');
const registerSrc = readFileSync(resolve(__dirname, '../registerSW.ts'), 'utf-8');
const swSrc = readFileSync(resolve(PKG_ROOT, 'public/sw.js'), 'utf-8');
const manifestSrc = readFileSync(resolve(PKG_ROOT, 'public/manifest.json'), 'utf-8');
const indexHtmlSrc = readFileSync(resolve(PKG_ROOT, 'public/index.html'), 'utf-8');
const supabaseSrc = readFileSync(resolve(PKG_ROOT, 'src/lib/supabase.ts'), 'utf-8');

describe('registerSW invariants', () => {
  it('uzywa typeof window guard (RN compat)', () => {
    expect(registerSrc).toMatch(/typeof window === 'undefined'/);
  });

  it('uzywa typeof navigator guard (RN compat)', () => {
    expect(registerSrc).toMatch(/typeof navigator === 'undefined'/);
  });

  it("sprawdza 'serviceWorker' in navigator przed register", () => {
    expect(registerSrc).toMatch(/'serviceWorker' in navigator/);
  });

  it('rejestruje sw.js z scope root', () => {
    expect(registerSrc).toMatch(/register\('\/sw\.js', \{ scope: '\/' \}\)/);
  });

  it('error path uzywa console.error (NIE warn — to operacyjny problem)', () => {
    expect(registerSrc).toMatch(/console\.error/);
  });

  it('odracza rejestracje do window.load (nie konkuruje z bundle parse)', () => {
    expect(registerSrc).toMatch(/window\.addEventListener\('load'/);
  });
});

describe('sw.js invariants', () => {
  it('ma wersjonowany cache name (sleeper-shell-v{N})', () => {
    expect(swSrc).toMatch(/CACHE_NAME = 'sleeper-shell-v\d+'/);
  });

  it('install: skipWaiting()', () => {
    expect(swSrc).toMatch(/skipWaiting/);
  });

  it('activate: clean old caches + clients.claim()', () => {
    expect(swSrc).toMatch(/clients\.claim/);
    expect(swSrc).toMatch(/caches\.delete/);
  });

  it('fetch: skip Supabase API paths (/rest/v1/, /auth/v1/, /realtime/v1/, /storage/v1/)', () => {
    expect(swSrc).toMatch(/\/rest\/v1\//);
    expect(swSrc).toMatch(/\/auth\/v1\//);
    expect(swSrc).toMatch(/\/realtime\/v1\//);
    expect(swSrc).toMatch(/\/storage\/v1\//);
  });

  it('fetch: skip cross-origin Supabase hostname (.supabase.co)', () => {
    expect(swSrc).toMatch(/supabase\.co/);
  });

  it('fetch: cache-first dla static assets (caches.match + fallback fetch)', () => {
    expect(swSrc).toMatch(/caches\.match\(request\)/);
  });

  it('cachuje tylko same-origin static assets (_expo, icons, manifest, favicon)', () => {
    expect(swSrc).toMatch(/\/_expo\//);
    expect(swSrc).toMatch(/\/icons\//);
    expect(swSrc).toMatch(/\/manifest\.json/);
  });

  it('fetch: network-first dla nawigacji (P2.3 review fazy 4 — stale-HTML guard)', () => {
    // navigate request → najpierw fetch (swiezy HTML z nowym hashem JS),
    // potem cache (offline fallback). Cache-first daloby 404 white screen po deploy.
    expect(swSrc).toMatch(/request\.mode === 'navigate'/);
    // network-first pattern: fetch przed caches.match w branchu navigate
    expect(swSrc).toMatch(/network-first/i);
  });

  it('pomija POST/PUT/DELETE (tylko GET cache)', () => {
    expect(swSrc).toMatch(/request\.method !== 'GET'/);
  });
});

describe('manifest.json invariants', () => {
  it('parsuje sie jako poprawny JSON', () => {
    expect(() => JSON.parse(manifestSrc)).not.toThrow();
  });

  it('zawiera wymagane PWA pola (name, short_name, start_url, display, icons)', () => {
    const manifest = JSON.parse(manifestSrc);
    expect(manifest.name).toBe('Sleeper');
    expect(manifest.short_name).toBe('Sleeper');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it('ma theme_color zgodny z app palette (#208AEF — navy from tailwind.config)', () => {
    const manifest = JSON.parse(manifestSrc);
    expect(manifest.theme_color).toBe('#208AEF');
  });

  it('ma background_color zgodny z cream palette (#F5F0E8)', () => {
    const manifest = JSON.parse(manifestSrc);
    expect(manifest.background_color).toBe('#F5F0E8');
  });

  it('definiuje ikony 192 + 512 z purpose "any maskable"', () => {
    const manifest = JSON.parse(manifestSrc);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons) {
      expect(icon.purpose).toContain('maskable');
    }
  });

  it('orientation: portrait (mobile-first)', () => {
    const manifest = JSON.parse(manifestSrc);
    expect(manifest.orientation).toBe('portrait');
  });
});

describe('public/index.html invariants (PWA shell template)', () => {
  it('linkuje manifest.json', () => {
    expect(indexHtmlSrc).toMatch(/<link\s+rel="manifest"\s+href="\/manifest\.json"/);
  });

  it('viewport ma viewport-fit=cover (notch / safe-area)', () => {
    expect(indexHtmlSrc).toMatch(/viewport-fit=cover/);
  });

  it('apple-mobile-web-app-capable: yes (standalone)', () => {
    expect(indexHtmlSrc).toMatch(/apple-mobile-web-app-capable" content="yes"/);
  });

  it('apple-mobile-web-app-status-bar-style: black-translucent (notch handling)', () => {
    expect(indexHtmlSrc).toMatch(/apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  });

  it('apple-touch-icon 180x180', () => {
    expect(indexHtmlSrc).toMatch(/apple-touch-icon.*sizes="180x180"/);
  });

  it('theme-color tag (light + dark variant)', () => {
    expect(indexHtmlSrc).toMatch(/<meta name="theme-color" content="#208AEF"/);
    expect(indexHtmlSrc).toMatch(/<meta name="theme-color" content="#0F0F1A" media="\(prefers-color-scheme: dark\)"/);
  });

  it('body background-color FOWT prevention (cream / dark navy matchuje tab bar)', () => {
    expect(indexHtmlSrc).toMatch(/background-color: #F5F0E8/);
    // Dark bg = #0F0D26 (kolor tab baru) zeby na iOS PWA pas pod tab barem nie byl widoczny.
    expect(indexHtmlSrc).toMatch(/background-color: #0F0D26/);
  });

  it('zachowuje Expo template placeholders (%LANG_ISO_CODE%, %WEB_TITLE%)', () => {
    expect(indexHtmlSrc).toMatch(/%LANG_ISO_CODE%/);
    expect(indexHtmlSrc).toMatch(/%WEB_TITLE%/);
  });
});

describe('supabase.ts invariants (security)', () => {
  it("uzywa flowType: 'pkce' (P3.3 review fazy 4 — security: nie leakuj access_token w URL fragment)", () => {
    expect(supabaseSrc).toMatch(/flowType:\s*['"]pkce['"]/);
  });

  it("uzywa detectSessionInUrl: true (wymagane przez PKCE callback flow)", () => {
    expect(supabaseSrc).toMatch(/detectSessionInUrl:\s*true/);
  });
});
