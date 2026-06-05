# Zadania: fixy-edycja-aktywnosc-smart-start

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Ostatnia aktualizacja:** 2026-06-05

Legenda effort: **S** = ≤30 min, **M** = ≤90 min, **L** = >90 min.

---

## Faza 1 — Fix 2: gap aktywności w "Sesje dzisiaj" (home)

**Effort:** S
**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`
**Zależności:** brak.

### Implementacja
- [x] Dodaj import: `import { computeGapsBetweenSessions } from '@/lib/session-gaps';` (sprawdź czy alias `@/*` rozwiązuje się — jeśli nie, użyj relatywnej ścieżki tak jak inne importy w `index.tsx`).
- [x] W `ActiveChildSection` (koło linii 154–164) dodaj `const gapMap = useMemo(() => computeGapsBetweenSessions(todaySessions), [todaySessions]);`.
- [x] W mapowaniu `todaySessions.slice(0, 5).map(...)` (linia 233–234) dorzuć prop: `<SessionListItem key={session.id} session={session} gapBeforeMs={gapMap.get(session.id)} />`.

### Test (manual, Expo Go)
- [ ] **Test:** dziecko z ≥2 zakończonymi sesjami dziś (np. drzemka rano + drzemka po południu) → home → sekcja "Sesje dzisiaj" → nad drugą (i kolejnymi) sesjami widać `aktywność Xg Ym` w kolorze orange. — manual test (patrz manual-test-faza-1.md)
- [ ] **Test:** pierwsza sesja (najwcześniejsza chronologicznie) NIE ma gap nad sobą. — manual test (patrz manual-test-faza-1.md)
- [ ] **Test:** porównanie wizualne z ekranem Historia (powinno wyglądać identycznie — ten sam komponent + helper). — manual test (patrz manual-test-faza-1.md)
- [ ] **Test:** brak sesji dziś → sekcja niewidoczna (regression-check: `todaySessions.length > 0` gate na linii 216 niezmieniony). — manual test (patrz manual-test-faza-1.md)

### Weryfikacja
- [x] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [x] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [x] **Weryfikacja:** commit `fix(home): render wake gap "aktywność Xg Ym" between today's sessions` + follow-up `docs/commits/YYYY-MM-DD-<hash>-home-wake-gap.md`.

### Do poprawy po review fazy 1

- [ ] 🟡 [nit] **packages/sleeper-app/src/app/(app)/index.tsx:161-162** — komentarz mówi "stabilizuje referencje pustej tablicy", ale precyzyjniej: stabilizuje gdy `data === undefined` (fallback `?? []` tworzy nową tablicę co render). Dla niepustego `data` TanStack Query trzyma stabilną ref przez structural sharing. Kosmetyczne uściślenie tekstu, kod działa poprawnie.

---

## Faza 2 — Fix 3: smart start sleep (typ z rekomendacji)

**Effort:** S–M
**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`
**Zależności:** brak (niezależna od Fix 2; może lecieć w jednym lub osobnym commicie).

### Implementacja
- [x] W `ActiveChildSection` po `handleStart` (linia ~166) dodaj helper:
  ```ts
  function smartSessionType(): 'nap' | 'night_sleep' {
    const next = recommendation?.remainingNapsToday[0];
    if (next) return next.type === 'NIGHT' ? 'night_sleep' : 'nap';
    if (recommendation) return 'night_sleep';
    return 'nap';
  }
  ```
- [x] Linia 194 — podmień `onPress={activeSession ? handleStop : () => handleStart('nap')}` na `onPress={activeSession ? handleStop : () => handleStart(smartSessionType())}`.
- [x] `BigActionButton` (linia 191–196) — dodaj prop `sessionType={activeSession?.type ?? smartSessionType()}` (sprawdź czy komponent już go przyjmuje; jeśli nie — patrz Faza 2b poniżej).
- [x] `QuickActions` (linia 199–200) — BEZ ZMIAN: `onStartNap={() => handleStart('nap')}` i `onStartNight={() => handleStart('night_sleep')}` jako jawny override.

### Faza 2b (warunkowa) — jeśli `BigActionButton` nie przyjmuje `sessionType`
- [x] N/A — `BigActionButton` JUZ przyjmuje optional prop `sessionType?: SessionType` (typ z `@/features/sessions/hooks`, discriminated string union). Komponent uzywa go do warunku `showMoonIcon = mode === 'start' && sessionType === 'night_sleep'`. Zaden dodatkowy edit nie byl konieczny — Faza 2b skipped.

### Test (manual, Expo Go)
- [ ] **Test:** rano (przed `preferred_bedtime`, plan zawiera napy) — tap "Rozpocznij" → nowa sesja typu `nap` → SessionListItem z orange Sun ikoną. — manual test (patrz manual-test-faza-2.md)
- [ ] **Test:** wieczór (po `preferred_bedtime`, lub `remainingNapsToday[0].type === 'NIGHT'`) — tap "Rozpocznij" → sesja `night_sleep` → fioletowa Moon ikona. — manual test (patrz manual-test-faza-2.md)
- [ ] **Test:** cold start (świeże dziecko, brak `targetWakeTime`, `recommendation === null`) — tap "Rozpocznij" → fallback `nap` (zachowane stare zachowanie). — manual test (patrz manual-test-faza-2.md)
- [ ] **Test:** wszystkie drzemki dnia wykonane (`remainingNapsToday.length === 0`, `recommendation !== null`) — tap "Rozpocznij" → `night_sleep`. — manual test (patrz manual-test-faza-2.md)
- [ ] **Test:** `QuickActions` — explicit "Drzemka" / "Sen nocny" działają niezależnie od smart (override). — manual test (patrz manual-test-faza-2.md)
- [ ] **Test (UX):** label/ikona `BigActionButton` ZMIENIA SIĘ między rano a wieczorem (sessionType binding). — manual test (patrz manual-test-faza-2.md); UWAGA review: label jest staly ("Rozpocznij sen"), zmienia sie tylko ikona Moon (info P3)
- [ ] **Test (regression):** start sesji NIE crashuje gdy `recommendation === null` (loading / brak kotwicy). — manual test (patrz manual-test-faza-2.md)

### Weryfikacja
- [x] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [x] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [x] **Weryfikacja:** Promise.allSettled / race conditions niezmienione (helper synchroniczny, czyta state hooka — bez async).
- [x] **Weryfikacja:** commit `feat(start-sleep): derive session type from sleep recommendation` + follow-up `docs/commits/YYYY-MM-DD-<hash>-smart-session-type.md`.

### Do poprawy po review fazy 2

- [ ] 🟡 [nit] **packages/sleeper-app/src/app/(app)/index.tsx:216-217** — `smartSessionType()` wywoływane 2× per render (raz dla propa `sessionType`, raz w arrow `onPress`). Wyekstrahuj do lokalnej zmiennej `const nextType = activeSession?.type ?? smartSessionType()` i użyj dwa razy. Mikro-perf + jeden source of truth. Niefunkcjonalne, opcjonalne.
- [ ] 🟡 [nit] **docs/active/fixy-edycja-aktywnosc-smart-start/fixy-edycja-aktywnosc-smart-start-zadania.md (Test UX Fazy 2)** — opis "label/ikona BigActionButton ZMIENIA SIĘ" jest nieprecyzyjny. Label jest staly ("Rozpocznij sen"), zmienia sie tylko ikona (Moon prepend dla `night_sleep`) zgodnie z `BigActionButton.tsx:29,31`. Doprecyzuj test do "ikona Moon pojawia sie tylko dla smartSessionType()==='night_sleep'". Doc-only.

---

## Faza 3 — Fix 1: wheel picker minut (TimePickerField, iOS Modal)

**Effort:** M
**Plik:** `packages/sleeper-app/src/components/TimePickerField.tsx`
**Zależności:** brak (komponent samodzielny). Najbardziej ryzykowna zmiana — rób na końcu.

### Implementacja
- [x] W `TimePickerField` rozbij gałęzie:
  - iOS: open Modal po `Pressable.onPress` zamiast inline picker.
  - Android: zachowaj obecne zachowanie (`show && <DateTimePicker>` poza Modal).
- [x] Wprowadź lokalny state `tempValue: Date` (init z `value` przy otwarciu Modala). Commit przez `onChange(tempValue)` dopiero przy "Gotowe", nie w `handleChange`.
- [x] Modal layout:
  - `<Modal transparent animationType="fade" visible={show} onRequestClose={() => setShow(false)}>`.
  - Pełny ekran semi-transparent backdrop (`<Pressable onPress={() => setShow(false)} className="flex-1 bg-black/50">`).
  - Bottom sheet container: pełna szerokość, `safeAreaBottom` padding, `<View className="bg-cream dark:bg-navy rounded-t-2xl p-4">`.
  - Header z dwoma Pressable: "Anuluj" (lewo) zamyka bez commitu, "Gotowe" (prawo) commituje `tempValue` i zamyka.
  - `<DateTimePicker value={tempValue} mode="time" display="spinner" is24Hour onChange={(e, sel) => sel && setTempValue(sel)} />` w środku.
- [x] Akcesybilność: `accessibilityRole` na obu przyciskach, `accessibilityLabel` z polskim tekstem.
- [x] hitSlop dla Anuluj/Gotowe (zgodnie z learned-patterns `[[hitslop-vs-padding-for-touch-targets]]`).

### Test (manual, Expo Go iOS — krytyczny)
- [ ] **Test:** edycja sesji → tap "Godz. start" → Modal pojawia się od dołu z dwiema kolumnami HH + MM. — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** scroll kolumny minut → wartość zmienia się w `tempValue` (visual feedback w spinnerze). — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** tap "Gotowe" → Modal zamyka się → pole "Godz. start" pokazuje nowy czas (np. `13:47`). — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** tap "Anuluj" → Modal zamyka się → pole pokazuje STARY czas (brak commitu). — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** tap backdrop (poza bottom sheet) → traktowany jako Anuluj (bez commitu). — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** powtórz dla "Godz. koniec". — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** dark mode — sprawdź kontrast bottom sheet (`bg-cream dark:bg-navy`). — manual test (patrz manual-test-faza-3.md)

### Test (manual, Expo Go Android)
- [ ] **Test:** edycja sesji → tap "Godz. start" → natywny system picker dialog (BEZ Modala) — bez regresji. — manual test (patrz manual-test-faza-3.md)
- [ ] **Test:** wybór czasu → commit po OK → pole pokazuje nowy czas. — manual test (patrz manual-test-faza-3.md)

### Weryfikacja
- [x] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [x] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [x] **Weryfikacja:** nie wprowadzono nowych dependencji (`Modal` z `react-native`, `SafeAreaView` z `react-native-safe-area-context` — oba juz w `package.json`).
- [x] **Weryfikacja:** commit `fix(time-picker): wrap iOS spinner in modal to show minutes column` (`22724b4`) + follow-up `docs/commits/2026-06-05-22724b4-timepicker-modal.md`.

### Do poprawy po review fazy 3

- [ ] 🟡 [nit] **packages/sleeper-app/src/components/TimePickerField.tsx:34** — `useState<Date>(value)` zapamietuje wartosc tylko przy mount. Jesli rodzic zmieni prop `value` przy zamknietym Modalu, `tempValue` zostaje stary do momentu `handleOpen()` (ktore zawsze robi `setTempValue(value)`). Praktycznie nie blokuje (dzis nikt nie czyta `tempValue` przy `show === false`), ale dla pelnego hardening dodaj `useEffect(() => { if (!show) setTempValue(value); }, [value, show]);` lub uzyj lazy initializer `useState(() => value)` z komentarzem.
- [ ] 🟡 [nit] **packages/sleeper-app/src/components/TimePickerField.tsx:75** — `animationType="fade"` (zgodnie z planem), ale `ThemeModeBottomSheet.tsx:53` uzywa `animationType="slide"` dla identycznego patternu bottom-sheet. `slide` lepiej oddaje opis "Modal pojawia sie od dolu" (manual-test-faza-3.md:20). Rozwaz `slide` dla spojnosci. Czysta UX kosmetyka.
- [ ] 🟡 [nit] **packages/sleeper-app/src/components/TimePickerField.tsx:91,102** — `HIT_SLOP = 12` per krawedz daje formalnie ~40x32pt touch area dla przyciskow Anuluj/Gotowe (poniżej 44pt z `learned-patterns [[hitslop-vs-padding-for-touch-targets]]`). W praktyce line-height tekstu `text-base` (~22pt) podbija wysokosc do ~46pt — spelnione. Dla pewnosci podbij `HIT_SLOP` do `{top:16, bottom:16, left:16, right:16}` — zero ryzyka, gwarancja >=44pt.

---

## Faza 4 — End-to-end sanity check + merge

**Effort:** S
**Zależności:** Fazy 1–3 wykonane.

### Weryfikacja
- [x] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` z poziomu roota — 0 błędów.
- [x] **Weryfikacja:** `pnpm --filter sleeper-app lint` — bez nowych warningów względem main.
- [x] **Weryfikacja:** `pnpm --filter sleeper-machine test` (204/204) i `pnpm --filter sleeper-machine-kotki test` (43/43) — PASS.
- [ ] **Weryfikacja:** Expo Go iOS — happy path (start sesji + edycja godziny + gap na home) bez crashy. — manual test pending (patrz manual-test-faza-1.md / -2.md / -3.md)
- [ ] **Weryfikacja:** Expo Go Android (drugi telefon) — Fix 2 + Fix 3 działają, Fix 1 niezregresowany (system picker OK). — manual test pending
- [x] **Weryfikacja:** branch ma 3 commity feature (951f3bb, eb5a176, 22724b4) + 3 commity docs/commits log (004109c, 87b2587, a7e9325) + bookkeeping faz; historia czytelna.

### Archiwizacja (po merge do main)
- [ ] Przenieś `docs/active/fixy-edycja-aktywnosc-smart-start/` → `docs/completed/fixy-edycja-aktywnosc-smart-start/`.
- [ ] Update `CLAUDE.md`: ukończone zadanie + reset "Aktualne zadanie".
- [ ] (opcjonalnie) `dev-compound` jeśli wyłoniły się nowe wzorce (np. modal-wrapped picker pattern).

---

## Podsumowanie zakresu

| Faza | Plik | Effort | Risk |
|---|---|---|---|
| 1 — gap aktywności | `src/app/(app)/index.tsx` | S | low |
| 2 — smart start sleep | `src/app/(app)/index.tsx` (+ ew. `BigActionButton.tsx`) | S–M | low |
| 3 — Modal picker iOS | `src/components/TimePickerField.tsx` | M | medium (iOS-specific UX) |
| 4 — sanity + merge | — | S | low |

**Łączny effort:** ~2–3h roboty + ~30 min on-device testing per telefon.

**Brak zmian w:** schema bazy, migracje, `sleeper-machine*`, hooks (poza importem helpera w index.tsx), `RecommendationCard`, `ActiveWindowCard`, `SessionListItem` (komponent już przyjmuje `gapBeforeMs`).
