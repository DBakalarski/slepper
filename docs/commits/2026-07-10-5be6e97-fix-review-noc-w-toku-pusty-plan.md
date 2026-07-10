# 5be6e97: fix(machine-kotki): noc w toku zaczęta wieczorem = pusty plan drzemek (review Task 1)

**Data:** 2026-07-10
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Unit 1 — fixy po code review (reviewer: Needs fixes)

## Co zostało zrobione

- **CRITICAL 1 — fantomowe drzemki przy nocy zaczętej wieczorem.** Scenariusz: activeSession NIGHT start 22:00, now 22:15, wake 07:00 dziś (przeszłość) → stary kod anchorował na dzisiejszej 07:00, clamp-do-now generował NAP o 22:15 i kolejne wpisy w środku nocy. Fix: `resolveChainAnchor` w gałęzi NIGHT zwraca `null` gdy `morningWakeMs <= now` (noc zaczęta dziś wieczorem — plan drzemek na dziś zamknięty); `buildChain(null)` → `[]`, więc `remainingNapsToday = []` i `nextSleepAt = null`. Gdy `morningWakeMs > now` (noc z wczoraj, np. now 02:00) — zachowanie bez zmian: plan dnia od pobudki; clamp w tej gałęzi nie zachodzi z definicji (kotwica w przyszłości).
- **IMPORTANT 1 — pokrycie tłumienia warninga.** Dodane testy: activeSession NAP długo po przewidywanym końcu → `warnings` NIE zawiera "ryzyko przemęczenia"; kontrolny bez activeSession → zawiera. (Samo tłumienie istniało od ef1943c — brakowało asercji.)
- **MINOR 1 — non-null assertions.** `chain.ts` miał 3 × `bucket.wakeWindowsHours[len-1]!` — zastąpione helperem `lastWakeWindow(bucket)` z jawnym fallbackiem `?? 0` (BUCKETS nigdy nie ma pustej tablicy; bez zmiany zachowania).
- **MINOR 2 — doc note.** Dopisane w doc-komentarzu `buildChain` (chain.ts) i przy `Recommendation.remainingNapsToday` (types.ts): po clampie do `now` późne wpisy łańcucha mogą przekraczać północ — UI przycina je do końca doby.

## Zmienione pliki

- `packages/sleeper-machine-kotki/src/chain.ts` — `resolveChainAnchor` zwraca `ChainAnchor | null` (gałąź NIGHT: `null` gdy wake <= now), `buildChain` przyjmuje `null` → `[]`, helper `lastWakeWindow`, doc note.
- `packages/sleeper-machine/src/types.ts` — doc note przy `remainingNapsToday`.
- `packages/sleeper-machine-kotki/tests/chain.test.ts` — test NIGHT-wieczorem → `null`; test NIGHT-z-wczoraj (02:00) → anchored; test `buildChain(null)` → pusty łańcuch. (Test NIGHT-wieczorem zaktualizowany do nowej specyfikacji z review — zmiana wymagań, nie osłabienie asercji.)
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — test integracyjny 22:15 → pusty plan + `nextSleepAt = null`; 2 testy tłumienia warninga; istniejący test 02:00 bez zmian (dalej PASS).

## Powód / kontekst

Reviewer Task 1 → Needs fixes. Oczekiwanie produktowe: przy trwającej nocy rozpoczętej wieczorem plan drzemek na dziś jest pusty (dziecko śpi na noc), a przypadek sprawdzenia aplikacji w środku nocy (02:00, pobudka przed nami) ma działać jak dotąd. Rozwiązuje to też flagowany w raporcie Task 1 pre-existing problem `buildMorningWake` (same-calendar-day) dla gałęzi NIGHT — gałąź nie polega już na clampie przy pobudce z przeszłości.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-machine build`, `pnpm --filter sleeper-machine-kotki build`)
- test: PASS — kotki 80/80 (RED przed fixem: 3 faile na nowych testach — chain NIGHT-wieczorem, buildChain(null), recommender 22:15; GREEN po), machine 207/207
- runtime: n/a (biblioteka) — zweryfikowane testami z jawnym `now`
