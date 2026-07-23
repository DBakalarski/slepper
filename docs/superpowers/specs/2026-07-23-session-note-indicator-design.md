# Wskaźnik notatki w wierszu sesji + popup

**Data:** 2026-07-23
**Zakres:** `packages/sleeper-web/` (web-only)

## Problem / cel

W wierszu sesji (lista „Sesje dzisiaj" na Home oraz ekran Historia) nie widać, czy
sesja ma notatkę. User chce:
1. Wizualny sygnał, że notatka istnieje — ikona + skrócony fragment tekstu.
2. Kliknięcie w notatkę **nie** przenosi do edycji sesji, tylko otwiera popup z
   pełną treścią notatki. Reszta wiersza dalej nawiguje do `/session/[id]`.

Dane już są: `SleepSession.notes: string | null` (`features/sessions/hooks.ts`).

## Rozwiązanie

### Nowy komponent: `components/SessionNotePopup.tsx`

Read-only bottom sheet. Wzorzec 1:1 z `features/notifications/NotificationsBottomSheet.tsx`:
`Modal transparent + animationType="slide"`, backdrop `Pressable` (close),
wewnętrzny `Pressable` stop-propagation, `SafeAreaView edges={['bottom']}`.

- Nagłówek: typ sesji + zakres godzin (kontekst, której sesji dotyczy notatka).
- Treść: pełny tekst `session.notes`.
- Bez edycji — edycja nadal przez wejście w sesję.
- Props: `{ visible, onClose, note, headerLabel }`.

### Zmiana: `components/SessionListItem.tsx`

Rozbicie wiersza tak, by **nie zagnieżdżać `Pressable` w `Pressable`** (na RN web
kliknięcia bąbelkują — zagnieżdżenie jest problematyczne):

```
<View flex-row items-center>
  <Pressable onPress={navigate} className="flex-1 flex-row ...">
    {chip}{middle}
  </Pressable>
  {hasNote && (
    <Pressable onPress={openPopup} accessibilityLabel="Pokaż notatkę">
      <StickyNote/> {snippet}
    </Pressable>
  )}
  <Pressable onPress={navigate}>{chevron}</Pressable>
</View>
```

- `hasNote = Boolean(session.notes?.trim())`.
- Snippet: `numberOfLines={1}`, `ellipsizeMode="tail"`, `max-w-[40%]`,
  `text-xs text-text-muted dark:text-cream/70`. Ikona `StickyNote` ~14, kolor muted.
- Lokalny `useState` na widoczność popupu — per wiersz, self-contained.
- Tap w notatkę **zawsze** otwiera popup, niezależnie od `disableNavigation` /
  `onPress` override → spójne zachowanie Home + Historia.
- Główny wiersz i chevron zachowują dotychczasową nawigację (`onPress` override /
  `router.push('/session/[id]')` / `disableNavigation`).

### Ikona: `lib/icons.tsx`

Dodać `export { default as StickyNote } from 'lucide-react/dist/esm/icons/sticky-note'`
(deep import — zgodnie z regułą pliku, bez wciągania całego barrela lucide).

## A11y

- Snippet `Pressable`: `accessibilityRole="button"`, `accessibilityLabel="Pokaż notatkę"`.
- Popup backdrop: `accessibilityLabel="Zamknij notatkę"`.
- Główny wiersz — label bez zmian.

## Testy

Static-invariants (`readFileSync` + regex, wzorzec `recommendation-card.invariants.test.ts`) —
brak RNTL w projekcie. Nowy plik `components/__tests__/session-note.invariants.test.ts`:
- `SessionListItem` renderuje `StickyNote` i `<SessionNotePopup`.
- warunek `session.notes?.trim()` obecny (snippet warunkowy, nie zawsze).
- brak zagnieżdżonego `Pressable` w głównym `Pressable` (note tap oddzielony).
- `SessionNotePopup` używa prymitywów RN (`<View`, brak `<div`) i wzorca Modal
  transparent + backdrop-close.

## Changelog

Zmiana user-facing (`feat(web)`) → wpis w `public/changelog.json` + bump wersji w
`app.json` i `package.json` w tym samym commicie (wymuszane hookiem).

## Poza zakresem (YAGNI)

- Edycja notatki z popupu.
- Wskaźnik dla tagów (`tags`) — tylko notatki.
