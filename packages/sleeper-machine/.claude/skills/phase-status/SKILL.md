---
name: phase-status
description: Report current implementation phase from tasks.md cross-referenced against src/ state. Use when the user asks "gdzie jesteśmy", "co dalej", "który Phase", or before planning a non-trivial change so suggestions match the actual project stage.
user-invocable: false
---

# phase-status

Sleeper Machine ma plan inkrementalny w `tasks.md` rozbity na Phase 0–9. Ten skill mapuje stan `src/`+`tests/` na ten plan i raportuje:

- aktualną Phase w realizacji,
- co już jest zrobione (✅), w toku (🟡), nieruszone (⬜),
- pierwszy zalecany następny krok.

## Procedura

1. Przeczytaj `tasks.md` — wyciągnij listę checkboxów dla każdej Phase.
2. Wylistuj `src/` (głębokość 2) i `tests/`.
3. Dla każdego punktu w `tasks.md`:
   - jeśli dotyczy pliku, sprawdź czy plik istnieje (`Read`/`Glob`),
   - jeśli dotyczy funkcji, `Grep` po nazwie funkcji w `src/`,
   - jeśli dotyczy testu, sprawdź paired test file.
4. Klasyfikuj:
   - ✅ done — plik/funkcja istnieje i ma paired test który nie jest pustym placeholderem,
   - 🟡 in progress — plik istnieje, ale brak testów albo test ma `expect(true).toBe(true)`,
   - ⬜ todo — nie znaleziono pliku/funkcji.
5. Pierwsza Phase, w której są pozycje 🟡 lub ⬜ → "aktualna Phase".

## Format raportu (zwięzły)

```
## Phase status — Sleeper Machine

**Aktualna Phase**: Phase 3 — Baseline (in progress)

- Phase 0 ✅ Setup
- Phase 1 ✅ Types & branded units
- Phase 2 ✅ Math helpers (median, MAD, EWMA)
- Phase 3 🟡 Baseline (4/6)
  - ✅ baselineTotalSleep
  - ✅ baselineLongestSleep
  - 🟡 baselineNapCount — funkcja jest, brak testów
  - ⬜ baselineWakeAfterSleepOnset
- Phase 4 ⬜ Adaptive layer
- …

**Następny krok**: dodaj testy dla `baselineNapCount` w `tests/baseline.test.ts`, w szczególności:
- referencyjne wieki (3/6/9/12/18/24 mo) sprawdzone przeciw Galland 2012 Tabela 3 (±5%),
- monotoniczność: count nierosnące względem wieku.
```

Bądź zwięzły. Nie powtarzaj treści `tasks.md` w całości — tylko status i pierwsza luka.
