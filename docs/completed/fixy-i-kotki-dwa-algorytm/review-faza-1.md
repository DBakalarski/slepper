# Code Review: Faza 1 — Cross-day editing BackdatedSessionModal

**Data:** 2026-05-29
**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Commit:** `21b5deb` (implementacja) + `790e837` (poprawki cykl 1)
**Cykl review:** 2 (po fix cyklu 1)
**Pliki sprawdzone:**
- `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx`
- `packages/sleeper-app/src/lib/time.ts`
- `packages/sleeper-app/src/lib/__tests__/time.test.ts` (nowy)
- `packages/sleeper-app/vitest.config.mjs` (nowy)

---

## Severity Gate

**ZASTRZEŻENIA (P2=0, P3=2)** — poprzedni P2 naprawiony. Pozostają 2 nity (P3), opcjonalne do naprawy.

---

## Status poprzedniego P2

**TEST-01 (brakujący test addDaysInAppTz) — NAPRAWIONY ✅**

Commit `790e837` dodał:
- `packages/sleeper-app/src/lib/__tests__/time.test.ts` — 14 testów: happy path (n=1, n=-1, n=0, granice miesiąca/roku), DST boundary (Europe/Warsaw spring-forward 2026-03-29 + fall-back 2026-10-25), invalid input (pusty string, zły format, non-date string).
- `packages/sleeper-app/vitest.config.mjs` — konfiguracja vitest dla sleeper-app.
- `packages/sleeper-app/package.json` — `vitest` jako devDependency.

Weryfikacja: `pnpm --filter sleeper-app exec vitest run src/lib/__tests__/time.test.ts` → **14/14 PASS**.

Dodatkowa weryfikacja: implementacja `addDaysInAppTz` faktycznie rzuca (`Invalid time value`) dla pustego stringa, złego formatu i non-date — testy "throws" są prawdziwie zielone, nie fałszywymi pozytywami.

---

## Skonsolidowane Findings (cykl 2)

### 🟡 [P3-nit]

**ARCH-01** — `time.ts:138` — `addDaysInAppTz` bez walidacji wejściowego `dayKey`

Funkcja rzuca `Invalid time value` (z `date-fns`) dla niepoprawnych inputów — co testy potwierdzają. Jednak błąd nie daje kontekstu skąd pochodzi. Opcja A: JSDoc `@param dayKey - musi być YYYY-MM-DD`; Opcja B: explicit guard na początku z własnym komunikatem. Nie blokuje — testy to pokrywają.

**ARCH-02** — `BackdatedSessionModal.tsx:96` — safety net bez komentarza kontekstu

Linia 96: `if (end <= start)` nie ma komentarza wyjaśniającego, że po cross-day korekcie trafia tu tylko edge case (np. 00:00 → 00:00). Sugestia: `// safety net: identyczne czasy (np. 00:00 → 00:00)`.

---

## Odchylenia od planu

Brak negatywnych odchyleń. Fix cyklu 1 zgodny z planem:
- Testy obejmują scenariusze wymienione w planie (n=1, n=-1, DST boundary, niepoprawny format) ✓
- Lokalizacja `__tests__/time.test.ts` zgodna z sugestią z review-faza-1 cykl 1 ✓
- Vitest dodany jako devDependency sleeper-app (brak nowej produkcyjnej zależności) ✓

---

## Podsumowanie per perspektywa

| Perspektywa | Status | Findings |
|---|---|---|
| Security | ✅ PASS | brak |
| Performance | ✅ PASS | brak |
| Architecture & Quality | ✅ PASS (drobne nity) | P3-1, P3-2 (bez zmian z cyklu 1) |
| Test Coverage | ✅ PASS | P2 naprawiony — 14 testów zielonych |
| Mobile Manual Checklist | ✅ checklist_generated | `manual-test-faza-1.md` |

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): 2
- Odznaczone na podstawie Agent 5: 0
- Pozostawione dla operatora (Manual): 2
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (exit 0)
- [x] CLI: `pnpm --filter sleeper-app lint` → PASS (exit 0)
- [x] CLI: `pnpm --filter sleeper-app exec vitest run src/lib/__tests__/time.test.ts` → PASS (14/14)
- [ ] Manual: `Manual w Expo Go — "Dodaj sesje wstecz" → Sen nocny → 22:00→06:30 → zapisz → sesja cross-day` — manual test (patrz manual-test-faza-1.md)
- [ ] Manual: `Manual — same-day drzemka 09:00 → 10:30 nadal działa bez zmian` — manual test (patrz manual-test-faza-1.md)
