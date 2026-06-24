import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isValidTagSlug, SESSION_TAGS, tagLabel } from '@/features/sessions/tags';

describe('session tags', () => {
  it('isValidTagSlug rozpoznaje znane slugi', () => {
    expect(isValidTagSlug('teething')).toBe(true);
    expect(isValidTagSlug('illness')).toBe(true);
    expect(isValidTagSlug('nieistniejacy')).toBe(false);
  });

  it('tagLabel zwraca etykiete dla znanego slugu', () => {
    expect(tagLabel('teething')).toBe('Ząbkowanie');
    expect(tagLabel('caregiver_change')).toBe('Zmiana opiekuna');
  });

  it('tagLabel fallbackuje na sam slug dla nieznanego', () => {
    expect(tagLabel('legacy_tag')).toBe('legacy_tag');
  });

  it('lista ma 5 unikalnych slugow', () => {
    const slugs = SESSION_TAGS.map((tag) => tag.slug);
    expect(slugs).toHaveLength(5);
    expect(new Set(slugs).size).toBe(5);
  });
});

describe('sessions hooks static invariant', () => {
  it('SELECT zawiera kolumne tags (inaczej tags zawsze puste)', () => {
    const hooksSrc = readFileSync(resolve(__dirname, '../hooks.ts'), 'utf-8');
    // Kazdy literal select kolumn powinien zawierac `tags`.
    const selectLiterals = hooksSrc.match(/'id, child_id, type[^']*'/g) ?? [];
    expect(selectLiterals.length).toBeGreaterThan(0);
    for (const literal of selectLiterals) {
      expect(literal).toContain('tags');
    }
  });
});
