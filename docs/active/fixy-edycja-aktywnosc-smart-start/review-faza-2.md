# Code Review — Faza 2 (Fix 3: smart start sleep — typ z rekomendacji)

**Data:** 2026-06-05
**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Commit:** `eb5a176` — `feat(start-sleep): derive session type from sleep recommendation`
**Plik zmieniony:** `packages/sleeper-app/src/app/(app)/index.tsx` (+14 / -2)

## Severity gate

✅ **GOTOWE DO KONTYNUACJI** — zero P1, zero P2, dwie sugestie P3 (kosmetyczne / doc-only).

## Liczniki

- 🔴 [P1-blocking]: 0
- 🟠 [P2-important]: 0
- 🟡 [P3-nit]: 2
- ⚪ [info]: 1

Per agent:
- Security: 0 findings
- Performance: 0 findings (helper synchroniczny, brak nowych re-renderów, brak async/race)
- Architecture & Code Quality: 2 P3 (kosmetyka — patrz niżej)
- Test Coverage: 0 P2 (helper jest 1:1 z kontraktem hooka, edge cases pokryte fallbackami; mobile manual tests pending)
- Mobile Manual Tester: 7 scenariuszy → `manual-test-faza-2.md`

## Cross-reference z planem

Plan techniczny (`fixy-edycja-aktywnosc-smart-start-plan.md` § "Fix 3 — smart start sleep"):
- ✅ Dodano helper `smartSessionType(): 'nap' | 'night_sleep'` w `ActiveChildSection` po `handleStart`/`handleStop` (linie 192–197).
- ✅ Mapowanie `'NIGHT' → 'night_sleep'`, `'NAP' → 'nap'` zgodne z `PlanEntry.type` (`sleeper-machine/src/types.ts:22,48-52`).
- ✅ Fallback `recommendation !== null && plan pusty → 'night_sleep'` (wszystkie drzemki dnia zrobione).
- ✅ Fallback `recommendation === null → 'nap'` (cold start, brak kotwicy — preserve obecne UX).
- ✅ `BigActionButton`: `sessionType={activeSession?.type ?? smartSessionType()}` + `onPress={... smartSessionType()}` (linie 216–217).
- ✅ `QuickActions` BEZ ZMIAN — explicit "Drzemka" / "Sen nocny" pozostaje jako override.
- ✅ Faza 2b N/A — `BigActionButton` już przyjmował `sessionType?: SessionType` (potwierdzone w `BigActionButton.tsx:16`).

**Brak odchyleń od planu.** Implementacja minimalna (14 LOC), zero refactoringu, zero nowych deps.

### Odchylenia od planu

Brak. Implementacja 1:1 z planem § "Fix 3".

## Findings szczegółowe

### 🟡 P3-nit — `smartSessionType()` wywoływany dwa razy per render

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx:216-217`
**Typ:** KOD (mikro-perf, kosmetyczny)

```tsx
<BigActionButton
  mode={activeSession ? 'stop' : 'start'}
  sessionType={activeSession?.type ?? smartSessionType()}
  onPress={activeSession ? handleStop : () => handleStart(smartSessionType())}
  isPending={startSession.isPending || endSession.isPending}
/>
```

Helper `smartSessionType()` jest wywoływany dwukrotnie per render — raz dla propa `sessionType` (eager, zawsze), drugi raz wewnątrz arrow w `onPress` (lazy, tylko gdy tap). To 2× O(1) lookup `recommendation?.remainingNapsToday[0]?.type` — bez praktycznego wpływu na perf (Map.get + jeden warunek), ale teoretycznie można:

**Sugerowana poprawka (opcjonalna):**
```tsx
const nextType = activeSession?.type ?? smartSessionType();
// ...
<BigActionButton
  mode={activeSession ? 'stop' : 'start'}
  sessionType={nextType}
  onPress={activeSession ? handleStop : () => handleStart(nextType)}
/>
```

Korzyść: jedna ewaluacja per render, jeden punkt prawdy dla "typ który zostanie utworzony". Spójność: prop i callback gwarantowane same.

**Severity:** P3 — mikro-poprawa, kod działa poprawnie. Brak race condition (helper jest synchroniczny, `recommendation` stabilny w obrębie renderu — confirmed w `useSleepRecommendation.ts:77` memoized).

### 🟡 P3-nit — `smartSessionType` re-tworzony każdy render (nie memo)

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx:192-197`
**Typ:** KOD (consistency z resztą pliku)

Funkcja `smartSessionType` jest deklarowana jako function declaration (hoistowana wewnątrz komponentu) — to OK i spójne z `handleStart`/`handleStop` w tym samym pliku (linie 177, 182). Nie wymaga `useCallback` (nie jest propsem do memoized child). To NIE jest problem — to świadoma decyzja.

Notatka: jeśli kiedyś `smartSessionType()` zacznie być przekazywane jako prop do `React.memo`-owanego komponentu, trzeba będzie owinąć w `useCallback`. Obecnie nie ma takiej potrzeby.

**Severity:** P3 — info, nie wymaga zmiany.

### ⚪ info — label `BigActionButton` NIE zmienia się dla `night_sleep`

**Plik:** `packages/sleeper-app/src/components/BigActionButton.tsx:29`
**Typ:** DOC mismatch (zadanie vs. realny komponent)

Plik zadań mówi: *"Test (UX): label/ikona BigActionButton ZMIENIA SIĘ między rano a wieczorem (sessionType binding)"*. Realnie:
- **Label** — zawsze `'Rozpocznij sen'` (linia 29: `const label = mode === 'start' ? 'Rozpocznij sen' : 'Zakończ sen';`). NIE zależy od `sessionType`.
- **Ikona** — tylko Moon prepend dla `mode === 'start' && sessionType === 'night_sleep'` (linia 31: `showMoonIcon`).

Czyli wieczorem zobaczymy **"Rozpocznij sen"** z ikoną Moon, rano "Rozpocznij sen" bez ikony. Funkcjonalnie poprawne — Faza 2 NIE wprowadza regresji — ale opis testu w zadaniach jest nieprecyzyjny (sugeruje zmianę labela której nie ma). Doprecyzowanie: test powinien sprawdzać IKONĘ (Moon dla night, brak dla nap), nie label.

**Severity:** info — nie blokuje (kod działa), tylko warto poprawić treść Test (UX) w pliku zadań na: `"Test (UX): ikona BigActionButton (Moon prepend) pojawia się tylko gdy smartSessionType()==='night_sleep'"`. Nie wymaga zmiany kodu produkcyjnego.

## Walidacja jakości

- ✅ `pnpm --filter sleeper-app exec tsc --noEmit` — PASS (0 błędów)
- ✅ `pnpm --filter sleeper-app lint` — PASS (brak nowych warningów)
- ✅ Plik nadal 337 linii (`index.tsx` był 325 przed Fazą 2, dodano 14 → 339-2=337). Powyżej guideline 300, ale stan był pre-existing — Faza 2 dodała tylko 14 LOC. Refaktor splitu pliku NIE jest scope tej fazy.
- ✅ Brak `any`, brak non-null `!`, brak `console.log`
- ✅ Brak nowych zależności
- ✅ Zero circular deps
- ✅ Type safety: `SleepType = 'NIGHT' | 'NAP'` (z `sleeper-machine`) → `SessionType = 'nap' | 'night_sleep'` (z `@/features/sessions/hooks`) — discriminated union, TS wymusza ścieżki kompletne (`if next.type === 'NIGHT' return 'night_sleep'; else 'nap'` — domknięte).
- ✅ Determinizm: `recommendation` jest memoized w hooku (`useSleepRecommendation.ts:77`), `smartSessionType()` deterministyczny per render — brak race między `BigActionButton` props a `onPress` callback (oba w tym samym JSX evaluation pass).
- ✅ Cold start safety: `recommendation === null` (brak `targetWakeTime` / brak history) → fallback `'nap'` — zachowuje pre-Faza-2 zachowanie (`handleStart('nap')` hardcoded).
- ✅ Override path: `QuickActions` (linie 222–225) bez zmian → user ma jawny override jeśli smart logic mu nie pasuje.

## Manual testing (mobile)

Agent 5 (mobile-feature-tester) wygenerował checklist 7 scenariuszy on-device — patrz `manual-test-faza-2.md`. Pozostają `[ ]` z suffixem "manual test pending" (NIE liczone jako P2 — to oczekiwana procedura dla mobile Expo Go testing).

Scenariusze:
1. Rano (przed bedtime) → tap "Rozpocznij" → sesja `nap` + Sun orange.
2. Wieczór (po bedtime / NIGHT w planie) → tap "Rozpocznij" → sesja `night_sleep` + Moon purple + ikona Moon w przycisku.
3. Cold start (brak `targetWakeTime`) → fallback `nap`.
4. Wszystkie drzemki dnia zrobione (`remainingNapsToday.length===0`) → `night_sleep`.
5. `QuickActions` override "Drzemka"/"Sen nocny" działają niezależnie.
6. UX: ikona Moon w BigActionButton pojawia się przy night_sleep (NIE label — patrz info wyżej).
7. Regression: start sesji nie crashuje przy `recommendation === null` (loading).

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): **2** (tsc + lint — już oznaczone `[x]` w pliku zadań)
- Już zakomitowane: **1** (commit `eb5a176` + follow-up `87b2587` — `[x]` już w pliku)
- Pozostawione manual (mobile on-device): **7** Test + 0 Weryfikacja
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły
- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (0 błędów, exit 0)
- [x] CLI: `pnpm --filter sleeper-app lint` → PASS (brak warningów, exit 0)
- [x] Inspection: race conditions — helper synchroniczny, czyta state hooka bez async, brak Promise.allSettled potrzebne
- [x] Już zrobione: commit `feat(start-sleep): derive session type from sleep recommendation` + follow-up `docs/commits/2026-06-05-eb5a176-smart-session-type.md`
- [ ] Manual: 7 scenariuszy testowych on-device (Expo Go iOS+Android) — patrz `manual-test-faza-2.md`

## Podsumowanie

Faza 2 to **najmniejszy możliwy fix** wdrażający smart session type:
- 14 LOC dodanych w jednym pliku, zero modyfikacji innych komponentów.
- Wykorzystuje istniejący kontrakt hooka (`recommendation.remainingNapsToday[0].type`) i istniejący prop (`BigActionButton.sessionType`).
- Domknięte gałęzie typów (`'NIGHT' | 'NAP'` discriminated union → `'nap' | 'night_sleep'`).
- Bezpieczne fallbacki dla cold start (preserve `'nap'`) i empty plan (`'night_sleep'`).
- Zachowany override przez `QuickActions` (user może zignorować rekomendację).
- Typecheck + lint zielone.

**Rekomendacja:** KONTYNUUJ do Fazy 3 (Modal picker iOS — największa zmiana). Dwa P3-nity są opcjonalne do naprawy ad-hoc:
1. Wyekstrahuj `nextType = activeSession?.type ?? smartSessionType()` do lokalnej zmiennej (jedna ewaluacja, jeden source of truth).
2. (info) Popraw treść Test (UX) w zadaniach z "label/ikona" na "ikona Moon" — odzwierciedla realny `BigActionButton`.

Żaden P3 NIE blokuje merge'a ani kontynuacji.
