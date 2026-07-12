# eaccd19: fix(web): prognoza/oś z ogonem sesji w toku + clamp activeSession (final review C1+C2)

**Data:** 2026-07-12
**Branch:** feat/plan-dnia-os-24h
**Faza zadania:** Fix C1+C2 (web) — finalne review feat/plan-dnia-os-24h

## Co zostało zrobione

### C1 — crash po START (Critical)
- `toLibActiveSession(appSessions, now)` (`adapter.ts`) — nowy parametr `now`; jeśli `start_at` aktywnej sesji jest po `now`, clampuje `start` do `now`. Chroni przed race: świeży refetch po START może dać sesję z `start > state.now`, gdy `useNow` (tick co 30s) jeszcze nie doszedł do aktualnej chwili — silnik (`validateInput`, `recommender.ts` kotki) throwuje na tym warunku.
- `useSleepRecommendation.ts` — wywołanie silnika (`fn(state, profile)`) owinięte w `try/catch` wewnątrz `useMemo`. Catch loguje przez `console.error` (jedyny ustalony wzorzec logowania błędów w repo — brak dedykowanego `lib/log.ts`/Sentry na web) i zwraca `null` zamiast pozwolić na uncaught throw w renderze (brak `ErrorBoundary` nad tym drzewem = biały ekran).
- Testy: `adapter.test.ts` (clamp start>now / brak clampu gdy start<=now), `useSleepRecommendation.invariants.test.ts` (nowy plik, static-invariants grep — hook ma zależności expo-router/react-query trudne do zamontowania w vitest node env; potwierdza try/catch + console.error + return null + wywołanie adaptera z `now`).

### C2 — ogon sesji w toku (Critical)
- Nowy moduł `active-session-tail-entry.ts`: `buildActiveSessionTailEntry(sessions, activeSessionPredictedEnd, now)` syntetyzuje `PlanEntry { plannedStart: now, plannedEnd: activeSessionPredictedEnd, type }` dla sesji w toku; `withActiveSessionTail(plan, sessions, activeSessionPredictedEnd, now)` dokleja go na początku `remainingNapsToday`. Czysta funkcja, testowalna osobno od komponentu.
- `RecommendationTimelineView.tsx` — plan podawany DO `computeDayForecast` i DO `DayTimeline` to teraz `withActiveSessionTail(recommendation.remainingNapsToday, sessions, recommendation.activeSessionPredictedEnd, now)`. Clamp do doby dzieje się już w konsumentach (`day-forecast.plannedSleepMs`, `day-timeline-segments.buildPlanSegments`) — synteza nie duplikuje tej logiki.
- `adapter.ts` — `toLibType` wyeksportowany (był prywatny), reużyty przez `active-session-tail-entry.ts` (jedna funkcja mapująca `'nap'|'night_sleep' -> 'NAP'|'NIGHT'`, bez duplikacji).
- Seam-testy (`active-session-tail-entry.test.ts`) na planie **produkowanym przez `recommendKotkiDwa`** (nie ręcznie skonstruowanym), zgodnie z wymogiem briefu:
  - (a) drzemka w toku: prognoza ciągła w momencie STARTu (Δ ≤ 1 min mimo upływu czasu); bez ogona prognoza spadłaby dokładnie o długość drzemki (1.75h) — zweryfikowane wprost.
  - (b) noc w toku o 2:00: brak dziury na osi (koniec ostatniego segmentu faktu == początek pierwszego segmentu planu, oba w punkcie `now`); bez ogona `plannedMs` traciłby dokładnie 5h (02:00→07:00).
  - (c) wieczór po położeniu (noc w toku zaczęta dziś): `predictedTotalMs`/`deltaMs`/`verdict` identyczne tuż przed i tuż po położeniu (ciągłość, brak nowego "below"); bez ogona `deltaMs` sztucznie się pogarsza w momencie STARTu, mimo że nic się realnie nie zmieniło.
  - Plus 8 testów jednostkowych `buildActiveSessionTailEntry`/`withActiveSessionTail` (happy path NAP/NIGHT, null gdy brak predictedEnd, null gdy brak sesji w toku w `sessions`).

## Zmienione pliki

- `packages/sleeper-web/src/features/recommendation/adapter.ts` — `toLibActiveSession` przyjmuje `now`, clamp `start`; `toLibType` wyeksportowany.
- `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` — `toLibActiveSession(sessionsQuery.data, now)`; `try/catch` wokół wywołania silnika w `useMemo`.
- `packages/sleeper-web/src/features/recommendation/active-session-tail-entry.ts` — NOWY moduł (`buildActiveSessionTailEntry`, `withActiveSessionTail`).
- `packages/sleeper-web/src/features/recommendation/components/RecommendationTimelineView.tsx` — plan rozszerzony o ogon sesji w toku przed przekazaniem do `computeDayForecast`/`DayTimeline`.
- `packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts` — zaktualizowana sygnatura wywołań + 2 nowe testy clamp.
- `packages/sleeper-web/src/features/recommendation/__tests__/useSleepRecommendation.invariants.test.ts` — NOWY plik (static-invariants).
- `packages/sleeper-web/src/features/recommendation/__tests__/active-session-tail-entry.test.ts` — NOWY plik (18 testów: unit + seam).

## Powód / kontekst

Dwa Critical z finalnego review gałęzi `feat/plan-dnia-os-24h` (przed mergem do `main`). Silnikowa strona C2 (`activeSessionPredictedEnd`) była już scommitowana osobno (`83d669b`, `feat(machine-kotki)`) — ten commit to wyłącznie strona web (adapter + hook + komponent + synteza), zgodnie z podziałem scope narzuconym przez commit-msg hook (`feat|fix|perf(web)` bez zmiany `changelog.json` wymaga `[no-changelog]` — użyte, bo branch jeszcze niewydany, poprawka trafia do tej samej niewydanej wersji `0.10.0`, nie do nowego release).

Zastany stan: poprzedni agent zawiesił się dwukrotnie, zostawiając kompletną, poprawną implementację silnikową (zweryfikowaną i uzupełnioną o brakujący test Galland w commicie `83d669b`) i nietkniętą stronę web — cały fix C1+C2 (web) wykonany w tej sesji od zera.

## Walidacja

- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit`)
- lint: PASS (`pnpm --filter sleeper-web lint`)
- test: PASS — `pnpm --filter sleeper-web test` (341/341, w tym 28 nowych: 20 adapter/active-session-tail-entry + 3 useSleepRecommendation.invariants + istniejące niezmienione)
- build: PASS — `pnpm web:build:check` (tsc + lint + vitest + invariants + `sleeper-machine`/`sleeper-machine-kotki` build + `expo export --platform web`) w całości zielony
- runtime: nie zweryfikowane manualnie w przeglądarce (brak w scope tej sesji — praca oparta o testy jednostkowe/integracyjne; rekomendacja: smoke test w Safari/Chrome po merge — START drzemki tuż po odświeżeniu strony + obserwacja osi/prognozy podczas nocy w toku)
