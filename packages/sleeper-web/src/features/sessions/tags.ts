// Predefiniowane tagi kontekstu snu. Slug trzymany w DB (sessions.tags text[]),
// label PL renderowany w UI — zmiana wordingu bez migracji.

export interface SessionTag {
  slug: string;
  label: string;
}

export const SESSION_TAGS: SessionTag[] = [
  { slug: 'teething', label: 'Ząbkowanie' },
  { slug: 'illness', label: 'Choroba' },
  { slug: 'growth_spurt', label: 'Skok rozwojowy' },
  { slug: 'new_location', label: 'Nowa lokalizacja' },
  { slug: 'caregiver_change', label: 'Zmiana opiekuna' },
];

const SLUG_TO_LABEL = new Map(SESSION_TAGS.map((tag) => [tag.slug, tag.label]));

export function isValidTagSlug(slug: string): boolean {
  return SLUG_TO_LABEL.has(slug);
}

// Label dla slugu; fallback = sam slug (np. tag z DB spoza aktualnej listy).
export function tagLabel(slug: string): string {
  return SLUG_TO_LABEL.get(slug) ?? slug;
}
