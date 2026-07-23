import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Static-invariants (grep-asercje, vitest node env — bez jsdom/RTL, wzorzec
// z recommendation-card.invariants.test.ts) dla wskaznika notatki w wierszu
// sesji + read-only popup.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSrc(relPath: string): string {
  return readFileSync(path.resolve(__dirname, relPath), 'utf-8');
}

const LIST_ITEM_SRC = readSrc('../SessionListItem.tsx');
const POPUP_SRC = readSrc('../SessionNotePopup.tsx');

describe('SessionListItem: wskaznik notatki', () => {
  it('snippet jest warunkowy — tylko dla niepustej notatki (po trim)', () => {
    expect(LIST_ITEM_SRC).toMatch(/session\.notes\?\.trim\(\)/);
    expect(LIST_ITEM_SRC).toMatch(/const hasNote = noteText\.length > 0/);
    // Snippet i popup renderowane pod warunkiem hasNote.
    expect(LIST_ITEM_SRC).toMatch(/hasNote \?/);
  });

  it('renderuje ikone StickyNote + skrocony tekst notatki', () => {
    expect(LIST_ITEM_SRC).toMatch(/<StickyNote/);
    expect(LIST_ITEM_SRC).toMatch(/numberOfLines=\{1\}/);
    expect(LIST_ITEM_SRC).toMatch(/ellipsizeMode="tail"/);
  });

  it('tap w notatke otwiera popup (setIsNoteVisible), NIE nawiguje (handlePress)', () => {
    // Snippet Pressable ustawia stan popupu, nie wola handlePress.
    expect(LIST_ITEM_SRC).toMatch(/onPress=\{\(\) => setIsNoteVisible\(true\)\}/);
    // Popup jest osobnym komponentem, nie inline nawigacja.
    expect(LIST_ITEM_SRC).toMatch(/<SessionNotePopup/);
  });

  it('a11y: snippet ma label "Pokaż notatkę"', () => {
    expect(LIST_ITEM_SRC).toMatch(/accessibilityLabel="Pokaż notatkę"/);
  });

  it('uzywa prymitywow RN (View/Text), nie web HTML', () => {
    expect(LIST_ITEM_SRC).toMatch(/<View/);
    expect(LIST_ITEM_SRC).not.toMatch(/<div/);
    expect(LIST_ITEM_SRC).not.toMatch(/<span/);
  });
});

describe('SessionNotePopup: read-only bottom sheet', () => {
  it('wzorzec Modal transparent + slide + backdrop-close', () => {
    expect(POPUP_SRC).toMatch(/<Modal[^>]*transparent/);
    expect(POPUP_SRC).toMatch(/animationType="slide"/);
    expect(POPUP_SRC).toMatch(/accessibilityLabel="Zamknij notatke"/);
  });

  it('renderuje pelna tresc notatki (prop note) i naglowek (prop headerLabel)', () => {
    expect(POPUP_SRC).toMatch(/\{note\}/);
    expect(POPUP_SRC).toMatch(/\{headerLabel\}/);
  });

  it('read-only — brak pola edycji (TextInput) w popupie', () => {
    expect(POPUP_SRC).not.toMatch(/TextInput/);
  });

  it('uzywa prymitywow RN (View/Text), nie web HTML', () => {
    expect(POPUP_SRC).toMatch(/<View/);
    expect(POPUP_SRC).not.toMatch(/<div/);
    expect(POPUP_SRC).not.toMatch(/<span/);
  });
});
