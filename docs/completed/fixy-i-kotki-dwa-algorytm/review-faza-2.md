# Review Fazy 2 — Progress bar flicker (stabilizacja queryKey)

**Data:** 2026-05-29
**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Commit:** `8e04e13`
**Reviewer:** dev-docs-review (5-agent parallel review)

---

## Severity Gate

**✅ GOTOWE DO KONTYNUACJI** — P1=0, P2=0, P3=2 sugestie do rozważenia.

---

## Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Plików sprawdzonych | 4 (`useSleepRecommendation.ts`, `hooks.ts`, `ActiveWindowCard.tsx`, + kontekst: `index.tsx`, `useRealtimeSessions.ts`, `ProgressBar.tsx`, `sleep-stats.ts`) |
| 🔴 P1 blocking | 0 |
| 🟠 P2 important | 0 |
| 🟡 P3 nit | 2 |

---

## Findings

### 🟡 [P3-nit] Stale comment w `useRealtimeSessions.ts:36`

**Plik:** `packages/sleeper-app/src/features/sessions/useRealtimeSessions.ts:36`

**Problem:** Komentarz opisuje stary format queryKey:
```
//  - useSessions(childId, range) -> ['sessions', childId, startISO, endISO]
```
Po Fazie 2 format zmienił się na `dayKey` strings (`YYYY-MM-DD`), nie `ISO`. Komentarz jest mylący dla następnego developera.

**Poprawka:**
```ts
//  - useSessions(childId, range) -> ['sessions', childId, startDayKey, endDayKey]
```
gdzie `startDayKey`/`endDayKey` = `YYYY-MM-DD` via `dayKeyInAppTz`.

**Klasyfikacja:** P3 (nie blokuje, stary komentarz w pliku poza zakresem Fazy 2).

---

### 🟡 [P3-nit] `index.tsx` tworzy nowy obiekt `Date` co 30s (semantycznie ok, ale można uprościć)

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx:145-148`

**Obserwacja:**
```ts
const startOfDay = useMemo(() => startOfDayInAppTz(now), [now]);
const endOfDay = useMemo(() => endOfDayInAppTz(now), [now]);
const todaySessionsQuery = useSessions(childId, startOfDay, endOfDay);
```

`now` tickuje co 30s → `startOfDayInAppTz(now)` tworzy nowy `Date` co 30s. Ponieważ jednak `useSessions` używa `dayKeyInAppTz(rangeStart)` w queryKey (po Fazie 2), string `YYYY-MM-DD` pozostaje identyczny przez cały dzień → queryKey jest faktycznie stabilny → brak refetch loopa.

Semantycznie kod jest poprawny. Jednak tworzy zbędne alokacje `Date` co 30s i wymaga rozumienia "dwa poziomy" (memo w `index.tsx` + dayKey w `hooks.ts`). Opcjonalne uproszczenie (analogiczne do `useSleepRecommendation`): stabilizować przez `dayKey` w `index.tsx` zamiast memoizacji z `[now]`.

**Priorytet:** P3 — nie powoduje żadnych problemów runtime, czysto sugestia czytelności.

---

## Ocena agentów

### Agent 1: Security — PASS

Brak problemów bezpieczeństwa w Fazie 2:
- Brak nowych API boundaries ani form inputs
- Brak secretów / hardcoded keys
- Supabase query filtruje po `child_id` — RLS niezmienione
- `eslint-disable react-hooks/exhaustive-deps` jest użyty świadomie i udokumentowany komentarzem

### Agent 2: Performance — PASS (z P3 powyżej)

Główny cel fazy osiągnięty:
- `queryKey` w `useSessions` stabilny (`dayKeyInAppTz` strings zamiast `toISOString()`)
- `dayKey` w `useSleepRecommendation` memoizowany raz na mount (`[]`)
- `rangeStart`/`rangeEnd` derived z `dayKey` — stabilne obiekty
- `useFocusEffect` cross-midnight invalidation zamiast tickującego queryKey
- `ActiveWindowCard` wrapper `h-2` eliminuje layout shift

Pattern zgodny z udokumentowanym w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`.

### Agent 3: Architecture & Code Quality — PASS (z P3 komentarz)

- Podział warstw poprawny: hook w `features/recommendation/`, zmiana `queryKey` w `features/sessions/hooks.ts`, UI fix w `components/`
- Brak circular dependencies
- Import `dayKeyInAppTz` z `@/lib/time` — poprawna warstwa
- `useFocusEffect` z `expo-router` w hooku recommendation — akceptowalne (hook żyje w ekranie focused)
- TypeScript: zero `any`, zero `!`, explicit return types — PASS
- Naming conventions: `dayKey`, `rangeStart`, `rangeEnd` — czytelne
- `eslint-disable` z komentarzem dokumentującym intencję — OK

### Agent 4: Scenario Exploration & Test Coverage — PASS

Faza 2 nie definiuje w planie scenariuszy testowych jednostkowych (hook testowanie wymaga mock TanStack Query + time mocking). Plan jawnie wskazuje na manual testing w Expo Go jako weryfikację. Brak Unit testów = zgodnie z planem.

Edge cases ocena:
- **queryKey stale**: sprawdzono — `dayKeyInAppTz(startOfDay)` stabilny przez cały dzień
- **cross-midnight**: obsłużony przez `useFocusEffect` z porównaniem `currentDayKey !== dayKey`
- **child === null**: guard `if (!child) return null` — ok
- **sessionsQuery.data === null/undefined**: guard `if (!sessionsQuery.data) return null` — ok
- **progressValue = 0**: `Math.min(1, 0 / targetMs) = 0` → ProgressBar renderuje 0% — poprawne
- **targetMs = 0**: guard `targetMs > 0` w kalkulacji `progressValue` — chroniony przed dzieleniem przez zero ✅
- **`recommendation = null` po załadowaniu**: wrapper `h-2` trzyma przestrzeń — layout shift fix działa

### Agent 5: Mobile Manual Tests — generuje checklist

Patrz sekcja "Manual test checklist" poniżej.

---

## Odchylenia od planu

Brak odchyleń. Implementacja pokrywa wszystkie 3 checkboxy implementacyjne z planu:
- `useSleepRecommendation.ts` — `dayKey = useMemo(() => dayKeyInAppTz(now), [])` ✅
- `hooks.ts` — queryKey używa `dayKeyInAppTz` ✅
- `ActiveWindowCard.tsx` — wrapper `minHeight ≥ 8` (h-2) ✅

Jedyna drobna różnica: `rangeEnd` = `endOfDayInAppTz(dayKey)` zamiast `now` (udokumentowane w kontekście jako świadoma decyzja — sesje z bieżącego dnia zawsze w zakresie).

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): 2
- Pozostawione dla operatora (Manual mobile): 3
- Failujące: 0
- Niejasne: 0

### Szczegóły

- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (exit 0)
- [x] CLI: `pnpm --filter sleeper-app lint` → PASS (exit 0)
- [ ] Manual: "Manual w Expo Go — ekran Dzisiaj przez 5 minut → progress bar stabilny, brak skoków layoutu" — manual test (patrz manual-test-faza-2.md)
- [ ] Manual: "DevTools Network → brak refetch sessions co 30s w spoczynku" — manual test (patrz manual-test-faza-2.md)
- [ ] Manual: "(opcjonalnie) Cross-midnight test" — manual test (patrz manual-test-faza-2.md)
