# Kontekst: fixy-edycja-aktywnosc-smart-start

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Ostatnia aktualizacja:** 2026-06-05 (Faza 2 done)

## Postep

### Faza 1 — Fix 2: gap aktywności w "Sesje dzisiaj" (DONE 2026-06-05)
- Dodano import `computeGapsBetweenSessions` w `src/app/(app)/index.tsx`.
- Dodano `gapMap` przez `useMemo` w `ActiveChildSection` (po `useSleepRecommendation`).
- Przekazano `gapBeforeMs={gapMap.get(session.id)}` do `SessionListItem` w mapowaniu `todaySessions.slice(0, 5)`.
- Dodatkowo zmemoizowano `todaySessions` (`useMemo([todaySessionsQuery.data])`) zeby zapobiec ostrzezeniu `react-hooks/exhaustive-deps` przy `gapMap` — wzorzec spojny z istniejacym memo `children` na linii 52.
- Typecheck PASS, lint PASS (0 warningow).
- Manual on-device test pending (Expo Go iOS+Android).

### Review fazy 1 (2026-06-05)
- Raport: `review-faza-1.md`. Severity: ✅ GOTOWE DO KONTYNUACJI.
- Liczniki: P1=0, P2=0, P3=1 (kosmetyka komentarza w `index.tsx:161-162`), info=1 (`session-gaps.ts` bez testow — pre-existing).
- Manual test checklist: `manual-test-faza-1.md` (4 scenariusze + 2 edge cases opcjonalne).
- Kluczowy wniosek: Faza 1 = minimalny clean fix (17 LOC dodanych w 1 pliku), zgodny z planem, bez nowych deps, typecheck+lint zielone. Bonus memoizacja `todaySessions` to mikrooptymalizacja zgodna z learned-patterns (queryKey stability). Rekomendacja: kontynuuj Faza 2.

### Faza 2 — Fix 3: smart start sleep (DONE 2026-06-05)
- Dodano helper `smartSessionType(): 'nap' | 'night_sleep'` w `ActiveChildSection` po `handleStart`/`handleStop`. Czyta `recommendation?.remainingNapsToday[0]?.type`, mapuje `'NIGHT' -> 'night_sleep'` / `'NAP' -> 'nap'`. Fallback: `recommendation !== null` z pustym planem -> `'night_sleep'`; `recommendation === null` (cold start) -> `'nap'`.
- Podmieniono `BigActionButton` props (linia 213-218): `sessionType={activeSession?.type ?? smartSessionType()}` i `onPress={activeSession ? handleStop : () => handleStart(smartSessionType())}`.
- `QuickActions` BEZ ZMIAN — explicit "Drzemka" / "Sen nocny" jako jawny override smart logic.
- **Faza 2b N/A** — `BigActionButton` JUZ przyjmuje `sessionType?: SessionType` (sprawdzone w `packages/sleeper-app/src/components/BigActionButton.tsx:16`, typ z `@/features/sessions/hooks`, discriminated union). Komponent juz uzywa go do warunku `showMoonIcon = mode === 'start' && sessionType === 'night_sleep'`. Zero zmian w komponencie.
- Typecheck PASS (0 bledow), lint PASS (0 warningow).
- Manual on-device test pending (Expo Go iOS+Android — 7 scenariuszy zdefiniowanych w `*-zadania.md`).
- Zmiana to 14 LOC dodanych w 1 pliku (`src/app/(app)/index.tsx`), zero nowych deps, zero modyfikacji komponentow.

## Cel

Trzy punktowe fixy UX zgłoszone przez usera po ostatnich zmianach (kotki-dwa + cross-day edit):

1. iOS picker minut nie pokazuje kolumny MM w edycji sesji.
2. Sekcja "Sesje dzisiaj" na home nie renderuje "aktywność Xg Ym" między sesjami (Historia już to ma).
3. Główny przycisk "Rozpocznij sen" zawsze startuje `nap`, ignorując rekomendację (po wieczorze powinien startować `night_sleep`).

Brak refaktorów, brak nowych zależności, brak zmian w schemacie bazy / algorytmach.

## Źródła

- Requirements doc: brak
- Plan techniczny: brak (`docs/plans/`)
- Plan zadania: `docs/active/fixy-edycja-aktywnosc-smart-start/fixy-edycja-aktywnosc-smart-start-plan.md`

## Powiązane pliki

### Do modyfikacji
- `packages/sleeper-app/src/components/TimePickerField.tsx` — Fix 1: owinąć iOS spinner w `<Modal>` z bottom-sheet + przyciskami Anuluj/Gotowe. Android bez zmian (gałąź `Platform.OS === 'android'`).
- `packages/sleeper-app/src/app/(app)/index.tsx` — Fix 2 + Fix 3:
  - `useMemo` z `computeGapsBetweenSessions(todaySessions)` koło istniejących `useMemo` (~linia 154–164).
  - Przekazanie `gapBeforeMs={gapMap.get(session.id)}` w `todaySessions.slice(0, 5).map(...)` (linia 233–234).
  - Helper `smartSessionType()` w `ActiveChildSection` po `handleStart` (linia 166).
  - Podmiana `onPress` BigActionButton (linia 194) z hardcoded `'nap'` na `smartSessionType()`.
  - `sessionType={activeSession?.type ?? smartSessionType()}` na `BigActionButton`.

### Do referencji (nie modyfikujemy)
- `packages/sleeper-app/src/lib/session-gaps.ts` — helper `computeGapsBetweenSessions`, już używany w `src/app/(app)/history.tsx:256`.
- `packages/sleeper-app/src/components/SessionListItem.tsx` — komponent już przyjmuje prop `gapBeforeMs` (wykorzystywany przez History).
- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — hook zwracający `recommendation.remainingNapsToday: PlanEntry[]`.
- `packages/sleeper-machine/src/types.ts:22,48-52` (i analogiczny `sleeper-machine-kotki`) — `PlanEntry.type: 'NIGHT' | 'NAP'`.
- `packages/sleeper-app/src/app/(app)/history.tsx:256` — referencyjny call-site `gapBeforeMs`, działający na DESC ordering.

## Decyzje techniczne

### Fix 1 — Modal wrapper zamiast custom wheel
- **Wybór:** owinąć istniejący `<DateTimePicker display="spinner">` w `<Modal transparent>` z bottom-sheet kontenerem full-width + przyciskami "Anuluj" / "Gotowe".
- **Dlaczego nie alternatywa:** `react-native-wheel-picker` / własny FlatList = nowa dependency + custom UX odbiega od iOS pattern. `display="default"` iOS pokazuje modal natywny — niespójność z resztą aplikacji w v54.
- **Tempo commit:** osobny stan `tempValue` (lokalny do Modal), commit przez `onChange(tempValue)` dopiero przy "Gotowe". Eliminuje spam `onChange` podczas scroll na iOS.
- **Android:** bez Modala (system picker dialog) — zachowuje obecną gałąź `Platform.OS === 'android'`.

### Fix 2 — gapMap przez `useMemo`, klucz `session.id`
- **Wybór:** `gapMap` jako `Map<id, ms>` zwrócony przez `computeGapsBetweenSessions(todaySessions)`. Lookup `O(1)` per item.
- **Dlaczego nie iteracja in-place:** `todaySessions` przychodzi DESC (`useSessions` zwraca latest first). Helper sortuje ASC wewnętrznie i mapuje per id — kolejność rendera nie ma znaczenia.
- **Memoizacja:** `useMemo` z dependencją `[todaySessions]`. Bez memoizacji nowa Mapa per render — stable ref nie jest krytyczny (Map nie jest propsem listy), ale i tak best practice.

### Fix 3 — typ sesji z `recommendation.remainingNapsToday[0]`
- **Wybór:** `smartSessionType()` czyta `recommendation?.remainingNapsToday[0]?.type`, mapuje `'NIGHT' → 'night_sleep'`, `'NAP' → 'nap'`. Fallbacks:
  - `recommendation !== null && remainingNapsToday.length === 0` → wszystkie drzemki dnia zrobione → `'night_sleep'`.
  - `recommendation === null` (cold start, brak `targetWakeTime`) → `'nap'` (zachowuje obecne UX, brak regresji).
- **Dlaczego nie inny próg czasowy (np. `preferred_bedtime`):** rekomendacja już uwzględnia bedtime + age-based logic (Galland EWMA / Kotki Dwa lookup). Duplikacja w UI = ryzyko rozjazdu.
- **Override:** `QuickActions` (drzemka / sen nocny ręcznie) pozostaje — user może wymusić typ niezależnie od smart.
- **Visual:** `sessionType` przekazany do `BigActionButton` → label + ikona (Sun orange / Moon purple) odpowiada typowi *przed* tapnięciem (nie tylko po starcie sesji).

## Zależności

### Pre-conditions
- Branch `feature/fixy-edycja-aktywnosc-smart-start` zbranchowany z `main` (uwzględnia: kotki-dwa archiwum, learned-patterns cross-day, app.json bundleIdentifier).
- `pnpm install` aktualny — brak nowych dependencji w tym zadaniu.

### Cross-fix dependencies
Brak — wszystkie trzy fixy są niezależne i mogą lecieć w dowolnej kolejności / równolegle. Sugerowana sekwencja (od najmniej ryzykownego):

1. **Fix 2 (gap aktywności)** — pure UI prop wiring, najmniejsze ryzyko regresji.
2. **Fix 3 (smart start)** — dodaje helper + 2 callbacki, edge cases dobrze pokryte fallbackiem.
3. **Fix 1 (Modal picker)** — największa zmiana strukturalna (`tempValue`, JSX wrapper); wymaga testu na iOS Expo Go i sanity check na Android.

### Walidacja end-to-end
- `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
- `pnpm --filter sleeper-app lint` — bez nowych warningów.
- Manual on-device (Expo Go, iOS + Android): patrz checklisty w `*-zadania.md`.

## Ryzyko

| Ryzyko | Prawdopodobieństwo | Mitigacja |
|---|---|---|
| Modal z DateTimePicker scroll-locked na iOS (gest wewnątrz Modala) | niskie | testy gestowe na fizycznym iPhone w Expo Go (Tester: user); fallback `presentationStyle="overFullScreen"` jeśli `transparent` koliduje. |
| `recommendation` zwraca `remainingNapsToday[0]` z innym `type` niż oczekiwany ('NIGHT' | 'NAP') | bardzo niskie | typ jest discriminated union w `sleeper-machine*`; TS chroni. Fallback `'nap'` dla `null`/empty. |
| `gapBeforeMs` pokazuje gap dla pierwszej (chronologicznie) sesji | niskie | `computeGapsBetweenSessions` zwraca `undefined` dla pierwszej sesji ASC — `SessionListItem` traktuje `undefined` jako brak gap (referencja: history.tsx). |
| Regression: BigActionButton zmienia ikonę/label mid-tap (race między `recommendation` a renderem) | niskie | `recommendation` jest stable w obrębie renderu (memoized w hooku); `smartSessionType` deterministyczny per render. |
| Android system picker odmiennie reaguje na Modal (Fix 1 ma gałąź Android bez Modala) | bardzo niskie | gałąź `Platform.OS === 'android'` zostaje bez zmian; weryfikacja sanity check na Pixelu. |

## Sukces

- Edycja sesji: oba pola "Godz. start" / "Godz. koniec" pokazują OBIE kolumny (HH + MM) na iOS, commit dopiero po "Gotowe".
- Home / "Sesje dzisiaj": nad każdą sesją (poza najwcześniejszą chronologicznie dnia) widać "aktywność Xg Ym" w kolorze orange — identycznie jak Historia.
- Home / "Rozpocznij": rano `nap` (Sun orange), wieczorem `night_sleep` (Moon purple). `QuickActions` daje override.
- Typecheck: PASS. Lint: PASS (zero nowych warningów). Runtime iOS + Android: PASS.
- 3 commity, 3 docs/commits log entries.
