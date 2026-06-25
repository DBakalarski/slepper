# Design: Faza 3 — Eksport CSV danych snu

**Data:** 2026-06-25
**Status:** Zaakceptowany (brainstorming) → implementacja
**Pakiet:** `packages/sleeper-web`
**Roadmap:** Faza 3 — Eksport / raport dla pediatry (tylko CSV; PDF/Edge Function = osobna iteracja)

## Cel

Umożliwić eksport historii snu dziecka do pliku CSV (jeden wiersz per sesja) z poziomu
ekranu Historia, do wysłania pediatrze. Zakres czasu wybierany z presetów (2 tyg / 30 dni
/ 90 dni). Dostarczenie pliku przez Web Share API (iOS/Android arkusz udostępniania) z
fallbackiem na klasyczne pobranie (desktop).

## Kontekst / istniejący stan

- `useSessions(childId, start, end)` (`features/sessions/hooks.ts`) — fetch sesji w oknie
  (select `id, child_id, type, start_at, end_at, notes, tags, created_by, created_at`,
  `rowToSession`). Historia używa stałego okna 14 dni.
- `lib/time.ts` — `dayKeyInAppTz`, `formatTime`, `formatDuration`, `startOfDayInAppTz`,
  `endOfDayInAppTz` (wszystkie TZ-safe, `Europe/Warsaw`).
- `features/sessions/tags.ts` — `tagLabel(slug)` (PL label, fallback = slug).
- Reużywalne: `IconButton`, `SegmentedControl`, `Modal` bottom-sheet (wzorzec
  `features/settings/ThemeModeBottomSheet.tsx`), `useSnackbar` (`features/snackbar`).
- PWA web-only; native-only API przez `lib/` wrapper + guard (learned-patterns).

## Decyzje (z brainstormingu)

1. **Zakres:** presety 2 tyg / 30 dni / 90 dni (`SegmentedControl`).
2. **Dostarczenie:** Web Share API (`navigator.canShare({files})`) + fallback Blob+`<a download>`.
3. **Granularność:** jeden wiersz per sesja.
4. **Separator CSV:** średnik `;` (domyślny separator listy w Excelu PL) + BOM UTF-8.
5. **Entry point:** ikona w nagłówku Historii → bottom-sheet z wyborem zakresu.

## Architektura / przepływ

```
History header [⤴ IconButton] → ExportSheet (SegmentedControl zakresu + „Eksportuj CSV”)
   tap → useExportCsv.exportCsv(childId, rangeDays)
      ├─ fetchSessionsInRange(childId, start, end)        (supabase, wydzielone z useSessions)
      ├─ sessionsToCsv(sessions)                          (lib/csv-export.ts — pure)
      └─ shareOrDownloadCsv(filename, csv)                (lib/share-file.ts — web, guarded)
            └─ useSnackbar: „Wyeksportowano” | „Brak sesji w zakresie” | „Błąd eksportu”
```

## Komponenty (jednostki, granice, testy)

### 1. `src/lib/csv-export.ts` — czysta serializacja
- `sessionsToCsv(sessions: SleepSession[]): string`.
- Kolumny (nagłówki PL): `Data;Start;Koniec;Długość;Typ;Notatki;Tagi`.
- Mapowania per sesja:
  - Data: `dayKeyInAppTz(start_at)` (YYYY-MM-DD).
  - Start: `formatTime(start_at)`; Koniec: `formatTime(end_at)` lub `''` gdy `end_at=null`.
  - Długość: `formatDuration(end_at - start_at)` lub `''` gdy w toku.
  - Typ: `nap → 'Drzemka'`, `night_sleep → 'Sen nocny'`.
  - Notatki: surowe (`notes ?? ''`).
  - Tagi: `tags.map(tagLabel).join(', ')` (oddzielone przecinkiem WEWNĄTRZ pola — pole
    będzie ujęte w cudzysłowy bo zawiera przecinek lub gdy separator to `;`, escaping
    obejmuje to automatycznie).
- **Escaping**: `escapeCsvField(value)` — jeśli zawiera `;`, `"`, `\n` lub `\r` → ujmij w
  `"`, podwajając wewnętrzne `"`. Stała `SEPARATOR = ';'`.
- Wiersze łączone `\r\n` (CRLF — konwencja CSV/Excel). Bez BOM (BOM dodaje share layer).
- Pusta lista → sam wiersz nagłówków.
- Bez `Date.now()`/I/O.

### 2. `src/lib/share-file.ts` — dostarczenie pliku (web, guarded)
- `shareOrDownloadCsv(filename: string, csv: string): Promise<ShareResult>`,
  `type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed'`.
- Buduje `Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })` (BOM → Excel czyta PL znaki).
- Guard: `typeof window/document/navigator === 'undefined'` → `'failed'`.
- Share path: `const file = new File([blob], filename, { type })`; jeśli
  `navigator.canShare?.({ files: [file] })` → `await navigator.share({ files: [file] })`
  → `'shared'`; `AbortError` (user anulował) → `'cancelled'`; inny błąd → spróbuj fallback.
- Fallback download: `createObjectURL` → `<a download=filename>` → `click()` →
  `revokeObjectURL` → `'downloaded'`.
- Bez native-only API.

### 3. `src/features/sessions/hooks.ts` — ekstrakcja `fetchSessionsInRange`
- Wydzielić `export async function fetchSessionsInRange(childId, start, end): Promise<SleepSession[]>`
  z obecnego `useSessions` queryFn (ten sam select + filtr + `rowToSession`). `useSessions`
  woła go w queryFn (single source). Export woła bezpośrednio (akcja jednorazowa).

### 4. `src/features/export/useExportCsv.ts` — hook orkiestracji
- Stan: `type ExportStatus = 'idle' | 'loading'` (feedback wyniku przez snackbar, nie przez stan).
- `exportCsv(childId: string, rangeDays: number): Promise<void>`:
  1. `start = startOfDayInAppTz(addDays(now, -(rangeDays - 1)))`, `end = endOfDayInAppTz(now)`
     (TZ-safe, `addDays` z date-fns).
  2. `setStatus('loading')`; `fetchSessionsInRange`; przy pustej liście → snackbar „Brak sesji…”, koniec.
  3. `sessionsToCsv` → `shareOrDownloadCsv('sleeper-sen-{dayKey}.csv', csv)`.
  4. Mapuj wynik na snackbar: `shared`/`downloaded` → „Wyeksportowano”, `cancelled` → nic,
     `failed` → „Błąd eksportu”. `catch` → snackbar błędu (log w dev).
  5. `finally` → `setStatus('idle')`.

### 5. `src/features/export/components/ExportSheet.tsx` — bottom-sheet
- Propsy: `{ visible: boolean; onClose: () => void; childId: string }`.
- `Modal transparent animationType="slide"` + backdrop tap-to-close (wzorzec `ThemeModeBottomSheet`).
- Lokalny stan `rangeDays` (default 14). `SegmentedControl` (2 tyg=14 / 30 dni=30 / 90 dni=90).
- Przycisk „Eksportuj CSV” → `useExportCsv().exportCsv(childId, rangeDays)`; spinner przy `loading`;
  po sukcesie `onClose()`. a11y labels.

### 6. `src/app/(app)/history.tsx` — wpięcie
- W wierszu nagłówka `IconButton` (ikona `Share`/`Upload` z lucide) z `accessibilityLabel="Eksportuj dane"`,
  `onPress` → `setExportVisible(true)`. Disabled/ukryty gdy `!hasChild`.
- Mount `<ExportSheet visible={exportVisible} onClose={…} childId={activeChildId} />`.

## Edge cases

| Sytuacja | Zachowanie |
|---|---|
| Brak sesji w zakresie | snackbar „Brak sesji w wybranym zakresie”, brak share |
| Sesja w toku (`end_at=null`) | Koniec/Długość puste, wiersz mimo to w CSV |
| Notatki z `;`/cudzysłowem/nową linią | escaping CSV (cudzysłowy) |
| Tag spoza listy | `tagLabel` fallback = slug |
| `navigator.share` niedostępny (desktop) | fallback download |
| User anuluje arkusz share | `'cancelled'` → brak snackbara błędu |
| Brak dziecka | przycisk eksportu nieaktywny |
| Błąd fetcha/share | snackbar „Błąd eksportu”, log w dev |

## Testy

- **Unit (`csv-export.test.ts`):** nagłówki + separator `;`; escaping (`;`, `"`, `\n`);
  sesja w toku (puste Koniec/Długość); tagi `tagLabel` po przecinku; typ PL
  (Drzemka/Sen nocny); pusta lista → same nagłówki; CRLF między wierszami.
- **Static-invariants (`share-file.test.ts`):** BOM `﻿`, `navigator.canShare`,
  fallback `download`, guard `window`, brak native-only API.
- **Static-invariants (`export-ui.test.ts`):** `ExportSheet` ma `SegmentedControl` +
  przycisk eksportu + brak native-only; `history.tsx` ma `IconButton` eksportu wpięty.

## Out of scope (YAGNI)

- Raport agregowany PDF / Edge Function (osobna iteracja wg roadmapy).
- Apple Health (native-only), Google Sheets sync (odrzucone w ideacji).
- Dowolny zakres dat (date range picker) — presety wystarczają.
- Eksport z poziomu Dashboardu (tylko Historia w tej iteracji).

## Walidacja (Definition of Done)

`pnpm web:build:check` zielony (tsc + lint + test + invariants + build) + nowy kod ma testy
+ commit + log w `docs/commits/`. Daty/czas wyłącznie przez `lib/time.ts` (TZ-safe).
Runtime: Historia → ikona eksportu → wybór zakresu → CSV (share/download), otwiera się w Excelu PL z polskimi znakami.
