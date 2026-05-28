# Code review — Faza 4 (Historia redesign)

**Commit:** `22dd268` — `feat(ui-redesign): faza 4 — historia redesign`
**Data review:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Pliki sprawdzone (3):**
- `sleeper-app/src/lib/session-gaps.ts` (NEW, 48 LOC)
- `sleeper-app/src/components/SessionListItem.tsx` (REWRITE, 117 LOC)
- `sleeper-app/src/app/(app)/history.tsx` (REWRITE, 293 LOC)

## Severity gate

**CZYSTE** — 0 P1, 0 P2, 5 P3.

> Kontynuacja do Fazy 5 (Profil redesign) odblokowana. Wszystkie zastrzezenia
> kosmetyczne / batch-fix kandydaci do Fazy 6 polish.

## Liczniki

| Severity | Liczba |
|---|---|
| 🔴 P1-blocking | 0 |
| 🟠 P2-important | 0 |
| 🟡 P3-nit | 5 |

## Cross-reference z planem

Plan techniczny dla Fazy 4 (`ui-redesign-plan.md` §Faza 4 + `ui-redesign-zadania.md` §190-218):
- ✅ Header "Historia" + subtitle "Wszystkie sesje snu"
- ✅ `SegmentedControl` Lista / Kalendarz
- ✅ Widok kalendarza placeholder
- ✅ Grupowanie po dniach z agregatem `Xg Ym · N sesji`
- ✅ Sesje wewnatrz jednej Card z separatorem
- ✅ Linia "aktywnosc Xg Ym" miedzy sesjami
- ✅ `session-gaps.ts` helper z `computeGapsBetweenSessions`
- ✅ `SessionListItem` chip Sun/Moon, zakres bold, ChevronRight, `gapBeforeMs?`
- ❌ `MoreVertical` placeholder — POMINIETO (visual deviation, udokumentowane w kontekscie, info-level, nie blokuje merge)

**Acceptance kryteria (plan §Faza 4):**
> "aktywność między sesjami liczona prawidłowo (test ręcznie z 2 sesjami w bliskim odstępie)"

Spelniony w warstwie kodu — manual on-device weryfikacja w `manual-test-faza-4.md`.

## Ocena 4 odchylen wskazanych w kontekscie

| # | Odchylenie | Ocena | Akcja |
|---|---|---|---|
| 1 | `MoreVertical` placeholder pominiety | ⚪ info / visual decision | Brak korekty. Decyzja designerska zgodna z fizjologia screen #2 (3-kropki na poziomie karty, nie wiersza). Rozwazyc dodanie w Fazie 6 polish JESLI manual test S1 wykaze brak parity ze screenem. |
| 2 | `DatePickerField` + tryb `day` usuniety z `history.tsx` | ✅ uproszczenie zgodne z planem | Brak korekty. Plan eksplicytnie zastepuje stary day-picker przez `SegmentedControl`. `DatePickerField` wciaz uzywany w `SessionEditForm.tsx:74,121` (kontekst byl niescisly mowiac o `BackdatedSessionModal` — popraw notatke). Brak orphana, brak regresji. |
| 3 | `SectionList` → `ScrollView` + map | ✅ uzasadniona pragmatyka | Brak korekty. SectionList nie wspiera Card-per-section z internal separators natywnie. Przy ~70 itemach (14 dni × ~5) zero ryzyka performance. Patrz P3-3 ponizej dla skali. |
| 4 | Polski format "Dzisiaj/Wczoraj/DD.MM" zamiast date-fns `pl` locale | ✅ pragmatyczna decyzja MVP | Brak korekty. DD.MM JEST polskim formatem daty; "Piatek, 22 maja" wymagaloby importu `date-fns/locale/pl` (transitively dostepne, ale nowy import). Plan mowi "data po polsku" — DD.MM spelnia. Mozliwa przyszla iteracja gdy projekt zdecyduje sie na full locale rozne formatowanie. |

## Findings (Agent-by-agent consolidated)

### Agent 1: Security Review

**Wynik:** clean.

- Pliki sa pure UI / pure compute. Brak nowych endpointow, brak walidacji user input (formularze), brak nowych zapytan supabase poza istniejacym `useSessions` (juz przereviewowany).
- `accessibilityLabel` korzysta z `TYPE_LABELS[session.type]` — `type` jest enum union `'nap' | 'night_sleep'`, brak XSS surface w RN Text.
- `dayKey` w `dayTitleFor` budowany przez interpolacje `${dayKey}T12:00:00Z` — `dayKey` pochodzi z `dayKeyInAppTz` (format `yyyy-MM-dd`, zawsze 10 znakow), brak prototype pollution / interpolation escape risk.

### Agent 2: Performance Review

**🟡 P3-1: `ScrollView` zamiast `FlatList`/`SectionList`**
**Plik:** `sleeper-app/src/app/(app)/history.tsx:91`
**Opis:** ScrollView renderuje wszystkie wiersze synchronicznie, bez virtualization. Przy aktualnym scope (14 dni × ~5 sesji = ~70 itemow + headery dni + obudowa Card) wydajnosc jest OK. Jezeli przyszla iteracja rozszerzy `RANGE_DAYS` do 30+ lub `useSessions` zwroci 200+ rekordow — przejdz na `FlatList` z `getItemLayout` lub `SectionList` z `ItemSeparatorComponent`.
**Severity:** P3 (info / future-proofing).
**Akcja:** brak teraz; rozwazyc w Fazie 6 polish lub gdy `RANGE_DAYS` wzrosnie.

**🟡 P3-2: `groupByDay` ma O(n) ale `dayKeyInAppTz` woła `format(toZonedTime(...))` n+m razy**
**Plik:** `sleeper-app/src/app/(app)/history.tsx:183-209` + `sleeper-app/src/lib/session-gaps.ts:39`
**Opis:** Dla kazdej sesji liczymy `dayKeyInAppTz` dwukrotnie (raz w `groupByDay`, raz wewnatrz `computeGapsBetweenSessions`). `format` + `toZonedTime` z `date-fns-tz` to nietrywialny koszt. Przy 70 sesjach to ~210 wywolan format() — w praktyce ms-y, ale przy 500+ moze sie odczuc.
**Severity:** P3 (info).
**Akcja:** Brak. Gdy ScrollView zostanie zastapione FlatList (P3-1), naturalnie wymusi memoizacje per-row.

### Agent 3: Architecture & Type Safety

**🟡 P3-3: `setDate(getDate() - N)` w `range` memo zamiast `addDays`**
**Plik:** `sleeper-app/src/app/(app)/history.tsx:57-58`
**Opis:**
```ts
const startBase = new Date(createdAt);
startBase.setDate(startBase.getDate() - (RANGE_DAYS - 1));
```
`learned-patterns.md` (TZ-safe time pattern) zaleca uzywanie `addDays` z `date-fns` zamiast manualnych operacji na `Date.getDate/setDate`. W tym kontekscie wynik jest natychmiast przepuszczany przez `startOfDayInAppTz` (ktora normalizuje przez `format(toZonedTime)`), wiec end-effect jest poprawny w app tz. Jednak wzorzec niespojny z reszta kodu.
**Severity:** P3 (style / pattern consistency).
**Sugerowana zmiana:**
```ts
import { addDays } from 'date-fns';
const start = startOfDayInAppTz(addDays(createdAt, -(RANGE_DAYS - 1)));
const end = endOfDayInAppTz(createdAt);
```
**Akcja:** Batch-fix w Fazie 6 polish.

**🟡 P3-4: Implicit return types w eksportowanych funkcjach**
**Pliki:**
- `sleeper-app/src/lib/session-gaps.ts:16` (`computeGapsBetweenSessions` MA explicit `Map<string, number>` — OK)
- `sleeper-app/src/app/(app)/history.tsx:169,183` — `dayTitleFor: string` explicit, `groupByDay` brak explicit return type (inferred `DayGroup[]`)

**Opis:** `groupByDay` zwraca `DayGroup[]` przez inference. Konwencja z `coding-rules.md` §10: "Wszystkie publiczne funkcje mają explicit return types" dotyczy publicznych API; `groupByDay` jest module-local helper (nie eksportowany), wiec OK. Wzmianka tylko dla spojnosci.
**Severity:** P3 (nit, no action).

### Agent 4: Scenarios & Test Coverage

**Happy path:** ✅ Lista pokazuje grupy dni, sesje z gapami.
**Invalid inputs:** ✅ `hasChild === false` → Card "Brak dziecka"; `sessions === []` → Card "Brak sesji w historii"; `sessionsQuery.isError` → Card z `extractErrorMessage`.
**Boundary conditions:**
- ✅ Sesja w toku (`end_at === null`): `formatTime` zwroci "trwa", `formatDuration` na 0 → "0m" (nieuzyte bo `isActive` → wyswietla `trwa`).
- ✅ `gapMs <= 0` filtrowany (linia 42 session-gaps.ts).
- ✅ Cross-day pomijany (linia 39 session-gaps.ts).
- ⚠️ **Edge case (P3-5):** Sesja przez polnoc app tz (start 23:30, end 01:30). `dayKeyInAppTz(start)` ≠ `dayKeyInAppTz(end)`. Grupowanie w `history.tsx:189` uzywa `start_at`, wiec sesja trafi do dnia start. Gap do nastepnej sesji w dniu start (przed polnoca) NIE bedzie liczony (`prev.end_at` w dniu D+1, `next.start_at` w dniu D → roznica dni). To jest INTENCJONALNE (cross-day = nowa sekcja), ale UI moze wygladac dziwnie: sesja "23:30 — 01:30" w grupie "Dzisiaj" bez jasnej informacji ze konczy sie nastepnego dnia.
**Severity:** P3 (UX edge, nie regresja).
**Akcja:** Manual test scenariusz w `manual-test-faza-4.md` Sm S4 (cross-midnight session display).

**Concurrent operations:** ✅ Brak optimistic updates w tym widoku (read-only); zmiany przez Realtime invalidiuja `['sessions']` query → re-render.

**Test coverage:** Plan nie definiowal plikow testowych. Brak Jest setupu w projekcie (zgodnie z `CLAUDE.md`). `computeGapsBetweenSessions` to pure function — idealny kandydat na pierwszy unit test gdy Jest dojdzie (test cases: empty, single, 2 sesje same-day, 2 sesje cross-day, prev.end_at=null, gap <= 0, sort).

### Agent 5: Mobile Manual Test Checklist Generator

**Wynik:** ✅ 4 scenariusze wygenerowane → `manual-test-faza-4.md` (non-blocking, do wykonania on-device po Fazie 5).

Niezaznaczone `Weryfikacja:` mobile-manual:
- "Aktywność między sesjami liczona prawidłowo (test: dodać 2 sesje w bliskim odstępie) — manual test"
- "Tap na sesję otwiera detal (`/session/[id]`) — manual test"
- "Segment 'Kalendarz' pokazuje placeholder — manual test"
- "Dark mode parity — manual test"

Wszystkie 4 wymagaja Expo Go on-device (interakcja, dwa stany, render w dark/light) — nie automatyzowalne w sleeper MVP.

## A11y notes (non-blocking)

- ✅ `Pressable` ma `accessibilityRole="button"` + descriptive `accessibilityLabel` z typem sesji i zakresem.
- ⚠️ Label NIE wymienia `gapBeforeMs` — gdy gap > 0, VoiceOver przeczyta "Otworz sesje Drzemka 14:00 — 15:30" bez kontekstu o aktywnosci. Minor; rozwazyc dolaczenie "po aktywnosci Xg Ym" w label gdy `showGap`. P3, batch-fix Faza 6.
- ⚠️ Gap row (`<View>` z aktywnoscia) jest WEWNATRZ `<Pressable>` — tapniecie nad rowem ale w obszarze gap-line tez navige na sesje. UX OK (intent: caly bblok = jedna sesja z prefixem aktywnosci), ale przy VoiceOver swipe ide po pojedynczych accessibility nodes — Text gap-line nie ma osobnego roli, czytany jako "aktywnosc 1g 30m" przed nawigacja sesji.

## Walidacja CLI

- ✅ `npx tsc --noEmit` → PASS (0 bledow, exit 0)
- ✅ `npm run lint` (expo lint) → PASS (0 bledow)

## Bookkeeping checkboxow Weryfikacja:

- Odznaczone automatycznie (CLI): 1 — `npx tsc --noEmit + npm run lint` (juz [x] przed review)
- Pozostawione dla manual on-device: 4 — gap calc, tap session, calendar placeholder, dark mode parity (oznaczone "— manual test" w pliku zadan)
- Pozostale: 2 — Commit + Commit log (czynnosci git, nie weryfikacja)

### Szczegoly
- [x] CLI: `npx tsc --noEmit + npm run lint PASS` → PASS (re-run)
- [ ] Manual: `Aktywność między sesjami liczona prawidłowo` — manual test (patrz manual-test-faza-4.md S1)
- [ ] Manual: `Tap na sesję otwiera detal` — manual test (manual-test-faza-4.md S2)
- [ ] Manual: `Segment 'Kalendarz' pokazuje placeholder` — manual test (S3)
- [ ] Manual: `Dark mode parity` — manual test (S4)
- [ ] git: `Commit: feat(ui-redesign): faza 4` — wymaga akcji uzytkownika (juz utworzony jako 22dd268)
- [ ] git: `Commit log w docs/commits/` — wymaga akcji uzytkownika (juz utworzony jako 460a2aa)

## Podsumowanie

Implementacja Fazy 4 jest **CZYSTA** — zero blockerow, zero important issues. Wszystkie 5 P3 to kosmetyka / pattern consistency do batch-fixa w Fazie 6 polish (`addDays` zamiast `setDate`, accessibility label dla gap, FlatList przy skalowaniu, MoreVertical placeholder, cross-midnight UI edge). TZ-safety zachowana zgodnie z `learned-patterns.md` (gap calc przez `dayKeyInAppTz`, brak `setHours` na surowym Date — z minorem na `setDate` opisanym w P3-3).

**Kontynuacja Fazy 5 odblokowana.**
