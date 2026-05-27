# Code Review — Faza 3 (Historia + edycja) — Cykl 2

**Branch:** `feature/mvp-sleep-tracker`
**Commit przegladu:** `04622d7` (fix: poprawki po review fazy 3 cykl 1)
**Poprzedni cykl:** `50ec92e` — patrz historia git (raport nadpisany).
**Data review:** 2026-05-27
**Reviewer:** dev-docs-review (re-review po cyklu fix 1)

## Severity gate

✅ **CZYSTE** — 0 × P1, 0 × P2, 5 × P3 (przeniesione P3 z cyklu 1, nie blokujące).

Oba P2 z poprzedniego cyklu (P2-1 LOC, P2-2 TZ-safety) zostaly skutecznie naprawione. Brak nowych regressionow. Manual mobile checklist (11 scenariuszy) zostaje pending operator.

## Liczniki

- 🔴 P1 (blocking): 0
- 🟠 P2 (important): 0
- 🟡 P3 (nit): 5 (przeniesione z cyklu 1; 2 z 7 zostaly zaadresowane przez fix)
- 🌐 E2E / mobile manual: 11 scenariuszy w `manual-test-faza-3.md` (pending operator)

## Typy findingow

| Severity | KOD | TEST | MOBILE-MANUAL |
|---|---|---|---|
| P1 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 |
| P3 | 5 | 0 | 0 |

(TEST = 0 — brak setupu testow w projekcie, zgodnie z CLAUDE.md.)

## Weryfikacja fixow z cyklu 1

### ✅ P2-1 (LOC > 300) — SKUTECZNIE NAPRAWIONE

**Stan po fix:**

- `src/app/(app)/session/[id].tsx`: **183 LOC** (było 358, redukcja -49%) ✅ pod limitem 300.
- `src/features/sessions/components/SessionEditForm.tsx`: 192 LOC (nowy, presentational, bez zaleznosci do query/mutacji).
- `src/components/Chip.tsx`: 27 LOC (nowy, shared, używany w `SessionEditForm` + `BackdatedSessionModal`).
- `src/features/sessions/components/BackdatedSessionModal.tsx`: 206 LOC (bez zmian struktury, swap lokalnego chipa na shared `Chip`).

**Ocena podzialu odpowiedzialnosci:**

- Strona (`session/[id].tsx`): routing, data fetching (`useSessionById`), state management (`form`, `validationError`), handlers (`handleSave`, `handleDelete`), error/loading branches.
- Komponent (`SessionEditForm`): wylacznie UI — przyjmuje `form`, `onChange`, errory, callbacks. Brak importow z `@/features/sessions/hooks` poza `SessionType`.
- Wspolny `Chip`: spelnia "abstrakcja od 2+ uzyc" (coding-rules §3). Konsystentny styling (rounded-xl px-4 py-2, bg-navy selected / bg-cream inactive).

**Brak regresji semantycznych:** logika edycji (banner aktywnej sesji, ukryte pole konca, walidacja przed mutate) zachowana 1:1.

### ✅ P2-2 (TZ-safety w combineDateAndTime) — SKUTECZNIE NAPRAWIONE

**Stan po fix:**

`src/lib/time.ts:122-133` — nowy helper `combineDateAndTimeInAppTz`:

```ts
export function combineDateAndTimeInAppTz(datePart: Date, timePart: Date): Date {
  const dayKey = format(toZonedTime(datePart, APP_TIMEZONE), 'yyyy-MM-dd');
  const timeKey = format(toZonedTime(timePart, APP_TIMEZONE), 'HH:mm');
  return fromZonedTime(`${dayKey}T${timeKey}:00`, APP_TIMEZONE);
}
```

- Pattern identyczny z `parseAppTzDateTime` i `startOfDayInAppTz` (utrwalony wzorzec TZ-safe date math).
- `SessionEditForm.tsx:7` — import z `@/lib/time`, 4 uzycia w `onChange` callbacks (start date, start time, end time, end date).
- Lokalny `combineDateAndTime` z `setHours()` w `session/[id].tsx` **usuniety**.
- Komentarz w `time.ts:122-128` wyraznie ostrzega: "NIE uzywaj `setHours` na surowym Date" z referencja do review.

**Walidacja TZ-correctness:** logika identyczna z `parseAppTzDateTime` (uzywane od Fazy 2 w `BackdatedSessionModal` bez problemow). Dla usera w UTC/innej tz wynik bedzie poprawny — godzina liczona jest w `Europe/Warsaw`.

## Pliki sprawdzone (cykl 2)

- `src/app/(app)/session/[id].tsx` (183 LOC, zredukowany) — strona edycji
- `src/features/sessions/components/SessionEditForm.tsx` (192 LOC, nowy) — presentational form
- `src/components/Chip.tsx` (27 LOC, nowy) — shared chip
- `src/features/sessions/components/BackdatedSessionModal.tsx` (206 LOC) — swap na shared Chip
- `src/lib/time.ts` (134 LOC) — dodano `combineDateAndTimeInAppTz`
- `src/app/(app)/history.tsx` (205 LOC, bez zmian od cyklu 1)

## Nowe findings (cykl 2)

**Brak.** Refactor nie wprowadzil regresji:

- Typecheck PASS (0 bledow).
- Lint PASS (0 errors, 0 warnings).
- `SessionEditForm` jest czystym presentational komponentem — brak side-effectow, brak query/mutacji.
- API komponentu (props) jest jawne, wszystkie pola wymagane lub explicit `| null`.
- `Chip` ma `accessibilityRole="button"` + `accessibilityState={{ selected }}` (a11y zachowane).
- Lokalna duplikacja `form.endDate ?? next` w callbackach `SessionEditForm` (linie 109, 127) to defensive code wymuszony przez TS narrowing przez closure — akceptowalne, nie jest to "defensive over-engineering" bo TS faktycznie nie zwesza typu wewnatrz callback.

## Pozostale P3 (przeniesione z cyklu 1, nie blokujace)

Z 7 pierwotnych P3 — 2 zaadresowane przez fix cyklu 1 (Chip extract, removal lokalnych chip variantow w 2 z 3 miejsc). Pozostalo 5 zaadresowanych jako backlog:

- 🟡 **P3-1** `history.tsx:44-50` — `startBase.setDate(... - 13)` → `addDays(today, -(ALL_RANGE_DAYS - 1))` (DST safety).
- 🟡 **P3-2** `history.tsx:172-176` — `new Date(\`${key}T12:00:00Z\`)` trick → `new Date(groups[key][0].start_at)`.
- 🟡 **P3-3** `history.tsx:194` — inline `renderItem` (mikro-optymalizacja, mozna `memo` + useCallback).
- 🟡 **P3-4** `session/[id].tsx:38-47` — form nie odswieza sie po refetch (last-write-wins). Backlog: po Fazie 4 (realtime) dodac banner "Sesja byla edytowana".
- 🟡 **P3-5** `session/[id].tsx:92-125` — `handleSave` walidacja inline; jesli urosnie >50 LOC wyciagnac do `validateForm(form): string | null`. Obecnie 33 LOC — pod limitem.
- 🟡 **P3-6** `hooks.ts:284, 311` — `useUpdateSession`/`useDeleteSession` bez explicit `UseMutationResult` return type (konsystencja z innymi hookami).
- 🟡 **P3-7 (czesciowo OPEN)** `history.tsx:117-129` — lokalny `ModeChip` wciaz istnieje (pad `px-3 py-2`, `bg-white`, `text-xs` — wizualnie inny niz shared `Chip`). Wariant 'small' do dodania jesli pojawi sie 3-ci taki przypadek. Obecnie OK (2 vs 1 mode + 2 chips type = nie ten sam visual).

(Liczniki: 5 otwartych P3 — `P3-7` traktuje jako "częściowo zamknięty" — shared Chip pokrywa kluczowy use-case, lokalny ModeChip ma inny styling.)

## Odchylenia od planu

Brak zmian od cyklu 1. Notatki implementacyjne Fazy 3 (`mvp-sleep-tracker-zadania.md`) pozostaja aktualne.

## Manual mobile verification

Plik `manual-test-faza-3.md` zawiera 11 scenariuszy (link/nav, day picker, 14-day mode, SessionListItem -> edit, edycja + agregaty, walidacja, typ sesji, notatki, aktywna sesja, delete confirm, multi-device).

Checkboxy `Weryfikacja:` (3 sztuki) pozostaja `[ ]` jako pending operator (Expo Go on-device). Suffix `manual test (patrz manual-test-faza-3.md)` zachowany od cyklu 1.

## Walidacja

- `npx tsc --noEmit` → PASS (0 bledow)
- `npm run lint` → PASS (0 errors, 0 warnings)
- Refactor diff (`git diff 50ec92e..04622d7`): +271/-213 linii, 6 plikow, czysta ekstrakcja (brak ukrytej logiki).

## Decyzja severity gate

✅ **CZYSTE — gotowe do Fazy 4 (Realtime sync)**

- 0 × P1, 0 × P2.
- 5 × P3 backlog (nie blokuje).
- Manual mobile testing pozostaje pending operator (osobny workflow, nie jest gate).

**Rekomendacja dla `/dev-docs-complete`:**

- Utrwalić w `learned-patterns.md` regule: `combineDateAndTimeInAppTz` (helper centralizuje pattern, ekrany formularzy NIE powinny robic recznie `setHours`).
- Wzmiankowac w kontekscie: `Chip` jako shared atom dla future screens (settings, profile).

## Bookkeeping checkboxow Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 0
- Pozostawione dla operatora (Manual mobile): 3
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [ ] Manual: `edycja sesji aktualizuje agregaty Dzisiaj po powrocie` — wymaga operatora (patrz `manual-test-faza-3.md`)
- [ ] Manual: `day picker → wybierz wczoraj → pokazuja sie sesje z wczoraj` — wymaga operatora
- [ ] Manual: `usuniecie sesji wymaga potwierdzenia + znika z listy` — wymaga operatora

(Wszystkie trzy checkboxy juz maja suffix `— manual test (patrz manual-test-faza-3.md)` od cyklu 1.)
