# Kontekst: fixy-i-kotki-dwa-algorytm

**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Ostatnia aktualizacja:** 2026-05-29

## Faza 2 — UKOŃCZONA (2026-05-29)

### Zmiany wprowadzone

- `useSleepRecommendation.ts`: `dayKey` memoizowany raz na mount (`useMemo([], [])`); `rangeStart`/`rangeEnd` derived z `dayKey`; `useFocusEffect` invaliduje `['sessions', childId]` gdy ekran wróci na nowy dzień.
- `hooks.ts`: queryKey w `useSessions` używa `dayKeyInAppTz(rangeStart/rangeEnd)` zamiast `.toISOString()`. `.toISOString()` zostaje w `queryFn` jako filtr Supabase.
- `ActiveWindowCard.tsx`: wrapper `<View className="mt-4 h-2">` trzyma stałą wysokość; ProgressBar renderowany inside (conditional) bez zmiany min-height obszaru.

### Decyzje

- `rangeEnd` = `endOfDayInAppTz(dayKey)` zamiast `now` — akceptowalne, sesje z bieżącego dnia zawsze w zakresie (end of day >> now).
- Import `endOfDayInAppTz` z `@/lib/time` — funkcja już istniała.
- `eslint-disable react-hooks/exhaustive-deps` na linii dayKey — świadoma decyzja (intentionally empty deps).

### Commit

`8e04e13` — fix(fixy-i-kotki-dwa-algorytm): stabilizacja queryKey progress bar — brak refetch loop

## Powiązane pliki

| Plik | Faza | Zakres |
|---|---|---|
| `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` | 1 | cross-day logika (start/end na różne dni dla `night_sleep`) |
| `packages/sleeper-app/src/lib/time.ts` | 1 | helper `addDaysInAppTz` / `parseTimeMinutes` (opcjonalny) |
| `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` | 2, 5 | stabilizacja `dayKey` + wybór algorytmu per `child.algorithm` |
| `packages/sleeper-app/src/features/sessions/hooks.ts` | 2 | queryKey: `dayKeyInAppTz` zamiast `toISOString()` |
| `packages/sleeper-app/src/components/ActiveWindowCard.tsx` | 2 | `minHeight` wrapper progress baru |
| `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` | 3 | NOWY — kolumna `algorithm` w `children` |
| `packages/sleeper-app/src/lib/database.types.ts` | 3 | regen po migracji |
| `.gitignore` (root) | 3 | dodać `data-book/` (PDF copyright) |
| `packages/sleeper-machine-kotki/**` | 4 | NOWY package — lookup-based recommender |
| `packages/sleeper-app/package.json` | 5 | workspace dep `sleeper-machine-kotki` |
| `packages/sleeper-app/src/features/children/hooks.ts` | 5 | rozszerzenie `Child` / `UpdateChildInput` o `algorithm` |
| `packages/sleeper-app/src/features/children/components/EditChildForm.tsx` | 5 | sekcja toggle Algorytm (chipy Galland / Kotki Dwa) |
| `packages/sleeper-app/src/app/(app)/index.tsx` | 5 | przekazanie `child.algorithm` do `useSleepRecommendation` |
| `CLAUDE.md` (root) | 6 | aktualizacja sekcji "Layout repozytorium" + "Stack" |

## Decyzje techniczne

Potwierdzone z userem przed planowaniem (zob. plan, sekcja "Decyzje architektoniczne"):

- **Zakres algorytmu Kotki Dwa:** TYLKO krok 3 PDF (harmonogram dnia: lookup WW + forward pass z fixed pobudką). Karmienia, rytuały, NSZ — pominięte.
- **Preferencje dziecka:** `preferred_naps_per_day` i `preferred_bedtime` honorowane przez OBA algorytmy (wspólne pola w `children`).
- **Lokalizacja kodu:** nowy package `packages/sleeper-machine-kotki/`. Wspólne typy (`State`, `ChildProfile`, `Recommendation`, `TimeOfDay`) re-eksportowane z `sleeper-machine` (workspace dep). NIE wprowadzać lookup table WW do `sleeper-machine` — naruszenie jego CLAUDE.md ("scientific-only").
- **Wybór algorytmu:** nowe pole `children.algorithm` (`'galland'` | `'kotki_dwa'`, default `'galland'`).
- **PDF copyright:** `data-book/` dodane do `.gitignore` (Faza 3). Implementacja dla prywatnego użytku — bez cytatów z PDF w UI/kodzie.

### Anty-wzorce (czego unikać)

- Lookup table WW per wiek w `packages/sleeper-machine/` — naruszenie CLAUDE.md tego packagu. **MUSI iść do `packages/sleeper-machine-kotki/`**.
- `new Date()` / `Date.now()` / `Math.random()` w `src/` żadnego z packagów algorytmów — łamie determinizm testów.
- Duplikacja typów `Recommendation`, `State`, `ChildProfile` w nowym packagu — re-eksport z `sleeper-machine`.
- Inline `new Date()` / `.toISOString()` w queryKey — udokumentowane w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`.
- Bezpośrednie cytowanie treści marketingowych z PDF do UI/kodu (zostawiamy tylko liczby z tabeli WW).

## Zależności

### Workspace deps (pnpm)

```
sleeper-machine-kotki  ─┐
        │ workspace:*   │
        ▼               │
sleeper-machine         │
                        │
        ┌───────────────┘
        │ workspace:*
        ▼
   sleeper-app  ──→ używa OBU
```

### Kolejność faz (sekwencyjna)

1. **Faza 2** (queryKey + progress) — niezależna, najszybszy wizualny efekt.
2. **Faza 1** (cross-day modal) — niezależna od reszty.
3. **Faza 3** (migracja `0011` + `.gitignore`) — **must-precede Fazę 5** (Faza 5 czyta `algorithm` z bazy → wymaga regenu `database.types.ts`).
4. **Faza 4** (package sleeper-machine-kotki) — **must-precede Fazę 5** (Faza 5 importuje `recommendKotkiDwa`).
5. **Faza 5** (adapter + UI toggle) — wymaga Faz 3 + 4.
6. **Faza 6** (CLAUDE.md root + konfigi) — finalne, po Fazach 4-5.

### Zewnętrzne biblioteki

Brak nowych zależności do instalacji:
- `sleeper-machine-kotki`: tylko `sleeper-machine` (workspace) + `typescript`/`vitest`/`@types/node` (devDeps — analogicznie jak w `sleeper-machine`).
- `sleeper-app`: workspace dep `sleeper-machine-kotki` (zero npm install).

## Reuse istniejących utilities

- `combineDateAndTimeInAppTz`, `parseAppTzDateTime`, `todayDateInAppTz`, `dayKeyInAppTz`, `formatDateShort`, `formatTime` (`packages/sleeper-app/src/lib/time.ts`)
- `Chip` komponent (`packages/sleeper-app/src/components/Chip.tsx`)
- Typy `State`, `ChildProfile`, `Recommendation`, `TimeOfDay`, `SleepType`, `Minutes`, `Hours`, `AgeMonths` — re-eksport z `sleeper-machine` (NIE duplikować w sleeper-machine-kotki).
- Wzorzec walidacji inputu — analogiczny do `validateInput` w `sleeper-machine/src/recommender.ts`.
- Wzorzec adaptera (DB row → lib type) — analogiczny do `toLibProfile` / `toLibSessions` w `packages/sleeper-app/src/features/recommendation/adapter.ts`.

## Źródła

- Requirements doc: brak (zgłoszenie usera bezpośrednio w sesji)
- Plan techniczny: brak w `docs/plans/`; oryginał z plan mode: `~/.claude/plans/1-w-edycji-frolicking-cupcake.md`
- PDF źródłowy algorytmu Kotki Dwa: `data-book/przewodnik_sen.pdf` (do gitignore w Fazie 3)
- Precedens refetch loop: `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`
- TZ-safe pattern: `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md`
- Anti-pattern lookup table WW: `packages/sleeper-machine/CLAUDE.md` (sekcja "Anti-patterns")
- Plan zadania: `docs/active/fixy-i-kotki-dwa-algorytm/fixy-i-kotki-dwa-algorytm-plan.md`
