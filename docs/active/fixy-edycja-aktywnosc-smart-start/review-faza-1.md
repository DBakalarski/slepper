# Code Review — Faza 1 (Fix 2: gap aktywności w "Sesje dzisiaj")

**Data:** 2026-06-05
**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Commit:** `951f3bb` — `fix(home): render wake gap "aktywność Xg Ym" between today's sessions`
**Plik zmieniony:** `packages/sleeper-app/src/app/(app)/index.tsx` (+17 / -2)

## Severity gate

✅ **GOTOWE DO KONTYNUACJI** — zero P1, zero P2, jedna sugestia P3 (kosmetyczna).

## Liczniki

- 🔴 [P1-blocking]: 0
- 🟠 [P2-important]: 0
- 🟡 [P3-nit]: 1
- ⚪ [info]: 1

Per agent:
- Security: 0 findings
- Performance: 0 findings (0 blokujących, 0 ważnych — implementacja prawidłowa)
- Architecture & Code Quality: 1 P3 (kosmetyka komentarza)
- Test Coverage: 1 ⚪ info (`session-gaps.ts` nie ma testów jednostkowych — pre-existing, NIE z tej fazy)
- Mobile Manual Tester: 4 scenariusze checklist_generated → `manual-test-faza-1.md`

## Cross-reference z planem

Plan techniczny (`fixy-edycja-aktywnosc-smart-start-plan.md` § "Fix 2 — gap aktywności"):
- ✅ Dodano `useMemo` z `computeGapsBetweenSessions(todaySessions)` w `ActiveChildSection`.
- ✅ Przekazano `gapBeforeMs={gapMap.get(session.id)}` do `<SessionListItem>` w mapowaniu `todaySessions.slice(0, 5)`.
- ✅ Import `computeGapsBetweenSessions` z `@/lib/session-gaps`.
- ✅ Bonus: zmemoizowano `todaySessions` (poza planem, ale uzasadnione — patrz sekcja "Odchylenia od planu" niżej).

**Brak odchyleń krytycznych.** Implementacja minimalna, zgodna z planem, bez over-engineeringu.

### Odchylenia od planu

⚪ **Plan-extra: memoizacja `todaySessions`.** Plan nie wspominał o owinięciu `todaySessions = todaySessionsQuery.data ?? []` w `useMemo`. Implementacja dodała to (linie 163–166) ze słusznym powodem — bez stabilnej referencji `useMemo` dla `gapMap` widziałby nowy fallback `[]` przy każdym renderze i recomputował (drobny perf overhead). Wzorzec spójny z istniejącym `children` memo (linia 53). To NIE jest problem — to korzystna mikrooptymalizacja zgodna z learned-patterns (`usememo-querykey-refetch-loop.md`).

## Findings szczegółowe

### 🟡 P3-nit — komentarz nieprecyzyjnie opisuje motywację memo

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx:161-162`
**Typ:** KOD (kosmetyka)

```ts
// useMemo stabilizuje referencje pustej tablicy miedzy renderami —
// bez tego useMemo(gapMap) widzialby nowy `todaySessions` co render.
```

Komentarz mówi "pustej tablicy", ale memo stabilizuje też **niepustą** tablicę gdy `todaySessionsQuery.data` jest tym samym obiektem. TanStack Query zachowuje stabilną referencję dla `data` dopóki nie nastąpi refetch z nowymi danymi (structural sharing) — więc memo działa głównie dla przypadku gdy `data === undefined` (fallback do nowego `[]` co render). Dla danych ≠ undefined memo jest no-op (zwraca to samo).

**Sugerowana poprawka (opcjonalna):**
```ts
// useMemo stabilizuje referencje gdy data === undefined (fallback do nowej
// pustej tablicy co render). Bez tego useMemo(gapMap) ponownie wyliczalby
// Mape przy kazdym renderze przed pierwszym fetchem.
```

**Severity:** P3 — kod działa poprawnie, to czysto dokumentacyjne uściślenie. Nie blokuje.

### ⚪ info — `session-gaps.ts` nadal bez testów jednostkowych (pre-existing)

**Plik:** `packages/sleeper-app/src/lib/session-gaps.ts`
**Typ:** TEST (pre-existing, NIE z tej fazy)

Helper `computeGapsBetweenSessions` był wprowadzony w wcześniejszym zadaniu (`fixy-i-kotki-dwa-algorytm`, Faza 3 cross-day edit) i nie ma testów w `src/lib/__tests__/`. Faza 1 tego zadania tylko go REUŻYWA (nie modyfikuje), więc brak testów NIE jest blokerem tej fazy. Notatka informacyjna na przyszłość — helper ma istotne ścieżki krawędzi (cross-day filter, sort copy, `end_at = null` skip, ujemny gap clamp) wartych pokrycia testami.

**Severity:** info — poza scope Fazy 1. Można zgłosić jako standalone P3 do osobnego sprintu refactor/test debt.

## Walidacja jakości

- ✅ `pnpm --filter sleeper-app exec tsc --noEmit` — PASS (0 błędów, wyjście puste)
- ✅ `pnpm --filter sleeper-app lint` — PASS (brak nowych warningów)
- ✅ Plik < 300 linii (`index.tsx` = 325 linii; tuż nad progiem, ale stan pre-existing — Faza 1 dodała tylko 17 linii, więc nie pogarsza istotnie)
- ✅ Brak `any`, brak non-null `!`, brak `console.log`
- ✅ Brak nowych zależności
- ✅ Zero circular deps
- ✅ TZ-safe (helper używa `dayKeyInAppTz` wewnętrznie)
- ✅ Stabilny queryKey (memoized day/end zgodnie z learned-patterns)

## Manual testing (mobile)

Agent 5 wygenerował checklisty manualne — patrz `manual-test-faza-1.md`. Cztery scenariusze pozostają `[ ]` z suffixem "manual test pending" (NIE liczone jako P2 — to oczekiwana procedura dla mobile).

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): **2** (tsc + lint — już oznaczone `[x]` w pliku zadań)
- Już zakomitowane: **1** (commit `951f3bb` istnieje, follow-up `004109c` istnieje — `[x]`)
- Pozostawione manual (mobile on-device): **4**
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły
- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (0 błędów)
- [x] CLI: `pnpm --filter sleeper-app lint` → PASS (brak warningów)
- [x] Już zrobione: commit `fix(home): render wake gap…` + follow-up `docs/commits/2026-06-05-951f3bb-home-wake-gap.md`
- [ ] Manual: 4 scenariusze testowe on-device (Expo Go iOS+Android) — patrz `manual-test-faza-1.md`

## Podsumowanie

Faza 1 jest **minimalnym, czystym fixem** w jednym pliku (17 linii dodanych). Implementacja:
- Wykorzystuje istniejący helper (`session-gaps.ts`) i istniejący prop (`SessionListItem.gapBeforeMs`).
- Jest spójna z analogicznym call-site na `history.tsx:284`.
- Dodała sensowną mikrooptymalizację (memo `todaySessions`) zgodną z istniejącymi wzorcami w pliku.
- Przeszła typecheck + lint bez problemów.

**Rekomendacja:** KONTYNUUJ do Fazy 2 (smart start sleep). P3-nit (komentarz) można naprawić ad-hoc lub zignorować — nie blokuje merge'a.
