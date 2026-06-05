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
- [ ] Dodaj import: `import { computeGapsBetweenSessions } from '@/lib/session-gaps';` (sprawdź czy alias `@/*` rozwiązuje się — jeśli nie, użyj relatywnej ścieżki tak jak inne importy w `index.tsx`).
- [ ] W `ActiveChildSection` (koło linii 154–164) dodaj `const gapMap = useMemo(() => computeGapsBetweenSessions(todaySessions), [todaySessions]);`.
- [ ] W mapowaniu `todaySessions.slice(0, 5).map(...)` (linia 233–234) dorzuć prop: `<SessionListItem key={session.id} session={session} gapBeforeMs={gapMap.get(session.id)} />`.

### Test (manual, Expo Go)
- [ ] **Test:** dziecko z ≥2 zakończonymi sesjami dziś (np. drzemka rano + drzemka po południu) → home → sekcja "Sesje dzisiaj" → nad drugą (i kolejnymi) sesjami widać `aktywność Xg Ym` w kolorze orange.
- [ ] **Test:** pierwsza sesja (najwcześniejsza chronologicznie) NIE ma gap nad sobą.
- [ ] **Test:** porównanie wizualne z ekranem Historia (powinno wyglądać identycznie — ten sam komponent + helper).
- [ ] **Test:** brak sesji dziś → sekcja niewidoczna (regression-check: `todaySessions.length > 0` gate na linii 216 niezmieniony).

### Weryfikacja
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [ ] **Weryfikacja:** commit `fix(home): render wake gap "aktywność Xg Ym" between today's sessions` + follow-up `docs/commits/YYYY-MM-DD-<hash>-home-wake-gap.md`.

---

## Faza 2 — Fix 3: smart start sleep (typ z rekomendacji)

**Effort:** S–M
**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`
**Zależności:** brak (niezależna od Fix 2; może lecieć w jednym lub osobnym commicie).

### Implementacja
- [ ] W `ActiveChildSection` po `handleStart` (linia ~166) dodaj helper:
  ```ts
  function smartSessionType(): 'nap' | 'night_sleep' {
    const next = recommendation?.remainingNapsToday[0];
    if (next) return next.type === 'NIGHT' ? 'night_sleep' : 'nap';
    if (recommendation) return 'night_sleep';
    return 'nap';
  }
  ```
- [ ] Linia 194 — podmień `onPress={activeSession ? handleStop : () => handleStart('nap')}` na `onPress={activeSession ? handleStop : () => handleStart(smartSessionType())}`.
- [ ] `BigActionButton` (linia 191–196) — dodaj prop `sessionType={activeSession?.type ?? smartSessionType()}` (sprawdź czy komponent już go przyjmuje; jeśli nie — patrz Faza 2b poniżej).
- [ ] `QuickActions` (linia 199–200) — BEZ ZMIAN: `onStartNap={() => handleStart('nap')}` i `onStartNight={() => handleStart('night_sleep')}` jako jawny override.

### Faza 2b (warunkowa) — jeśli `BigActionButton` nie przyjmuje `sessionType`
- [ ] Otwórz `packages/sleeper-app/src/components/BigActionButton.tsx` (lub gdziekolwiek jest definiowany).
- [ ] Sprawdź czy ikona/label zależy od typu (nap = Sun orange, night_sleep = Moon purple).
- [ ] Jeśli komponent już derywuje z `activeSession?.type` — przekaż `sessionType` jako optional override.
- [ ] Jeśli komponent hardcoduje 'nap' label — wprowadź prop `sessionType` (discriminated string union `'nap' | 'night_sleep'`).

### Test (manual, Expo Go)
- [ ] **Test:** rano (przed `preferred_bedtime`, plan zawiera napy) — tap "Rozpocznij" → nowa sesja typu `nap` → SessionListItem z orange Sun ikoną.
- [ ] **Test:** wieczór (po `preferred_bedtime`, lub `remainingNapsToday[0].type === 'NIGHT'`) — tap "Rozpocznij" → sesja `night_sleep` → fioletowa Moon ikona.
- [ ] **Test:** cold start (świeże dziecko, brak `targetWakeTime`, `recommendation === null`) — tap "Rozpocznij" → fallback `nap` (zachowane stare zachowanie).
- [ ] **Test:** wszystkie drzemki dnia wykonane (`remainingNapsToday.length === 0`, `recommendation !== null`) — tap "Rozpocznij" → `night_sleep`.
- [ ] **Test:** `QuickActions` — explicit "Drzemka" / "Sen nocny" działają niezależnie od smart (override).
- [ ] **Test (UX):** label/ikona `BigActionButton` ZMIENIA SIĘ między rano a wieczorem (sessionType binding).
- [ ] **Test (regression):** start sesji NIE crashuje gdy `recommendation === null` (loading / brak kotwicy).

### Weryfikacja
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [ ] **Weryfikacja:** Promise.allSettled / race conditions niezmienione (helper synchroniczny, czyta state hooka — bez async).
- [ ] **Weryfikacja:** commit `feat(start-sleep): derive session type from sleep recommendation` + follow-up `docs/commits/YYYY-MM-DD-<hash>-smart-session-type.md`.

---

## Faza 3 — Fix 1: wheel picker minut (TimePickerField, iOS Modal)

**Effort:** M
**Plik:** `packages/sleeper-app/src/components/TimePickerField.tsx`
**Zależności:** brak (komponent samodzielny). Najbardziej ryzykowna zmiana — rób na końcu.

### Implementacja
- [ ] W `TimePickerField` rozbij gałęzie:
  - iOS: open Modal po `Pressable.onPress` zamiast inline picker.
  - Android: zachowaj obecne zachowanie (`show && <DateTimePicker>` poza Modal).
- [ ] Wprowadź lokalny state `tempValue: Date` (init z `value` przy otwarciu Modala). Commit przez `onChange(tempValue)` dopiero przy "Gotowe", nie w `handleChange`.
- [ ] Modal layout:
  - `<Modal transparent animationType="fade" visible={show} onRequestClose={() => setShow(false)}>`.
  - Pełny ekran semi-transparent backdrop (`<Pressable onPress={() => setShow(false)} className="flex-1 bg-black/50">`).
  - Bottom sheet container: pełna szerokość, `safeAreaBottom` padding, `<View className="bg-cream dark:bg-navy rounded-t-2xl p-4">`.
  - Header z dwoma Pressable: "Anuluj" (lewo) zamyka bez commitu, "Gotowe" (prawo) commituje `tempValue` i zamyka.
  - `<DateTimePicker value={tempValue} mode="time" display="spinner" is24Hour onChange={(e, sel) => sel && setTempValue(sel)} />` w środku.
- [ ] Akcesybilność: `accessibilityRole` na obu przyciskach, `accessibilityLabel` z polskim tekstem.
- [ ] hitSlop dla Anuluj/Gotowe (zgodnie z learned-patterns `[[hitslop-vs-padding-for-touch-targets]]`).

### Test (manual, Expo Go iOS — krytyczny)
- [ ] **Test:** edycja sesji → tap "Godz. start" → Modal pojawia się od dołu z dwiema kolumnami HH + MM.
- [ ] **Test:** scroll kolumny minut → wartość zmienia się w `tempValue` (visual feedback w spinnerze).
- [ ] **Test:** tap "Gotowe" → Modal zamyka się → pole "Godz. start" pokazuje nowy czas (np. `13:47`).
- [ ] **Test:** tap "Anuluj" → Modal zamyka się → pole pokazuje STARY czas (brak commitu).
- [ ] **Test:** tap backdrop (poza bottom sheet) → traktowany jako Anuluj (bez commitu).
- [ ] **Test:** powtórz dla "Godz. koniec".
- [ ] **Test:** dark mode — sprawdź kontrast bottom sheet (`bg-cream dark:bg-navy`).

### Test (manual, Expo Go Android)
- [ ] **Test:** edycja sesji → tap "Godz. start" → natywny system picker dialog (BEZ Modala) — bez regresji.
- [ ] **Test:** wybór czasu → commit po OK → pole pokazuje nowy czas.

### Weryfikacja
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` → 0 błędów.
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app lint` → brak nowych warningów.
- [ ] **Weryfikacja:** nie wprowadzono nowych dependencji (`pnpm --filter sleeper-app exec pnpm list --depth 0` bez zmian względem main).
- [ ] **Weryfikacja:** commit `fix(time-picker): wrap iOS spinner in modal to show minutes column` + follow-up `docs/commits/YYYY-MM-DD-<hash>-timepicker-modal.md`.

---

## Faza 4 — End-to-end sanity check + merge

**Effort:** S
**Zależności:** Fazy 1–3 wykonane.

### Weryfikacja
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app exec tsc --noEmit` z poziomu roota — 0 błędów.
- [ ] **Weryfikacja:** `pnpm --filter sleeper-app lint` — bez nowych warningów względem main.
- [ ] **Weryfikacja:** `pnpm --filter sleeper-machine test` i `pnpm --filter sleeper-machine-kotki test` — PASS (nie dotykamy algorytmów, ale sanity check że ich nie zepsuliśmy).
- [ ] **Weryfikacja:** Expo Go iOS — happy path (start sesji + edycja godziny + gap na home) bez crashy.
- [ ] **Weryfikacja:** Expo Go Android (drugi telefon) — Fix 2 + Fix 3 działają, Fix 1 niezregresowany (system picker OK).
- [ ] **Weryfikacja:** branch ma 3 commity feature + 3 commity docs/commits log; historia czytelna.

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
