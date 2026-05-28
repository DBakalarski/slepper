# Code Review — Faza 0 (Design system foundation)

**Data:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Commity:** `3018f78` (feat), `fa6db0d` (docs log)
**Reviewer:** dev-docs-review (5 agentów review równolegle, skonsolidowane)
**Severity gate:** ✅ **CZYSTE — GOTOWE DO KONTYNUACJI**

## Statystyki

| Severity | Liczba | Typ |
|---|---|---|
| 🔴 P1 (blocking) | 0 | — |
| 🟠 P2 (important) | 0 | — |
| 🟡 P3 (nit) | 4 | KOD: 3, TEST: 1, MANUAL: 0 |
| ⚪ Manual checklist | 1 plik (`manual-test-faza-0.md`) — non-blocking |

**Pliki sprawdzone:** 11 (9 primitives + sleep-norms.ts + tailwind.config.js)

## Skonsolidowane findings (5 agentów)

### Agent 1 — Security Sentinel

**Verdict:** CZYSTE. Faza 0 to pure UI/data tokens — brak auth, RLS, network, user input. Jedyny "input" to:
- `name: string` w `Avatar` — używany jako accessibilityLabel + `charAt(0).toUpperCase()`. Bez XSS surface w RN (Text component nie renderuje HTML).
- `birthDate: Date` w `getNormForChild` — pure math (timestamp diff), brak path traversal/SQL.

Brak findings.

### Agent 2 — Performance Oracle

**Verdict:** CZYSTE z drobnym nitpickiem.

- 🟡 **P3 [perf-nit]** — `SegmentedControl.tsx:44-48` — `useEffect` deps zawiera `segmentWidth` (SharedValue object). Reanimated best practice: czytaj `.value` bezpośrednio, ESLint plugin Reanimated często ostrzega o deps z SharedValue. W praktyce: object reference jest stable, więc effect nie wystrzeli za dużo razy. Można uprościć do `[selectedIndex, durationMs]` jeśli ESLint to akceptuje.
- N+1, bundle, lazy loading — n/a dla Fazy 0. `lucide-react-native` tree-shake'uje per icon. `react-native-svg` (transitywnie via lucide) — koszt nieunikniony dla ProgressRing.
- Brak memoization — nie potrzebne przy primitivach o tej skali (mountowane raz per ekran, props proste).

### Agent 3 — Architecture & TypeScript

**Verdict:** CZYSTE z 3 nitpickami.

- 🟡 **P3 [arch-nit]** — `ProgressRing.tsx:36-37` i `Switch.tsx:15-17` — HEX literals (`#E8DEF7`, `#7C6BAD`, `#F5F0E8`) duplikują wartości z `tailwind.config.js`. Jeśli `purple` zmieni odcień w configu, ProgressRing/Switch nie podążą. Powód jest dobrze udokumentowany (RN Switch trackColor nie akceptuje className, react-native-svg potrzebuje HEX). Rozwiązanie: wyciągnąć do `src/lib/colors.ts` (single source of truth) — ALE dopiero przy 2+ duplikacji (regula §3). Aktualnie 3 miejsca to próg — rozważ w Fazie 6 polish.
- 🟡 **P3 [arch-nit]** — `Avatar.tsx:11-14` — `color` (HEX) i `bgClassName` (Tailwind) jako dwa props na ten sam concern z priorytetem `color > bgClassName`. Slightly unusual API, ale udokumentowane i uzasadnione (DB trzyma `avatar_color` HEX). Acceptable for current iteration.
- 🟡 **P3 [type-nit]** — Wszystkie 9 primitives mają inferred return type (JSX.Element) zamiast explicit, mimo że regula §10 mówi "Wszystkie publiczne funkcje mają explicit return types". W React/Expo convention to standard. Nie blokuje, ale formalnie odchyłka od reguły. Decyzja: zostawić (zgodne z konwencją RN), lub dodać `: ReactElement` w Fazie 6 — preferencja autora.
- File sizes: max 92 linii (SegmentedControl). Wszystko < 300 linii ✅
- No `any`, no `!.` non-null assertions, no `as` cast (poza importowym aliasem `Switch as RNSwitch`). ✅
- Naming: kebab-case files vs PascalCase — projekt używa PascalCase dla komponentów (`ActiveWindowCard.tsx`, `SleepInProgressCard.tsx`), więc spójnie. Reguła §7 ("kebab-case ... chyba że framework wymusza") tu nie ma zastosowania — React/Expo convention dominuje. ✅
- Boundary handling: `clamp01` w ProgressBar/Ring, `normalize` w Stacked, `name='' → '?'` fallback w Avatar. ✅
- Imports grouped (stdlib → third-party → local). ✅

### Agent 4 — Scenario Exploration & Test Coverage

**Verdict:** CZYSTE — test coverage n/a dla projektu (CLAUDE.md: "testy: brak setupu (Vitest/Jest dojdzie kiedy bedzie potrzebny)").

- 🟡 **P3 [test-future-sugg]** — `sleep-norms.ts > getNormForChild()` to JEDYNA pure function dodana w Fazie 0 i idealny kandydat na pierwszy unit test gdy projekt dostanie test runner. Edge cases warte testu:
  - 0m, 4m (boundary), 13m (boundary), 36m (boundary), 72m (boundary), 84m (school fallback).
  - `now < birthDate` → negative months → trafi w pierwszy bucket (newborn). Acceptable, ale warto udokumentować zachowanie.
- Scenariusze sprawdzone manualnie:
  - **Happy path**: `Avatar('Maja', '#FFAABB', 'md')` → kółko z 'M', tło HEX. ✅
  - **Invalid inputs**: `ProgressBar value=NaN` → `clamp01` → 0. ✅
  - **Boundary**: `ProgressBarStacked segments=[]` → tylko track, brak crash. ✅
  - `Avatar name=''` → initial = `'?'` fallback. ✅
  - `Avatar name='   '` (whitespace) → `trim().charAt(0)` → `'?'`. ✅
  - **Concurrent**: brak race conditions — primitives stateless (poza `SegmentedControl` shared values, zarządzane Reanimated). ✅
  - **Scale**: 3 segmenty w stacked = trywial. Brak listów/N+1.
- Brak plików testowych zdefiniowanych w planie technicznym dla Fazy 0 (brak `docs/plans/`, source-of-truth to `design.md`). Plan nie definiował `Pliki: Test:`. ✅

### Agent 5 — Mobile Manual Test Checklist Generator

**Verdict:** ✅ checklist_generated — `docs/active/ui-redesign/manual-test-faza-0.md`

Niezaznaczone `Weryfikacja:` checkboxy z Fazy 0 to manual/device:
- L34 `Walidacja wartości eye-dropperem` — visual on-device → wpisane do checklist
- L37 `shadow-card iOS+Android renderowanie` — on-device → wpisane do checklist
- L61 `Smoke test: każdy primitive użyty raz` — covered in Fazach 2-5 (notatka w checklist)

Wszystkie powyższe są **non-blocking dla mergu Fazy 0** — Faza 0 to foundation bez konsumentów. Manualne testy odznaczy user PO Fazie 2/3 gdy primitives wejdą na ekran.

## Odchylenia od planu

Brak. Implementacja pokrywa się 1:1 z `ui-redesign-zadania.md > Faza 0` poza:
- `expo-linear-gradient` SKIPPED zgodnie z zatwierdzoną decyzją (nie jest to odchyłka, lecz wykonanie decyzji).
- `react-native-svg` tranzytywnie via `lucide-react-native` — zamiast osobnej instalacji. Wynik = ten sam (dependency dostępna), zgodne z decyzją zatwierdzoną przez usera.

## Walidacja (uruchomione)

| Komenda | Wynik |
|---|---|
| `npx tsc --noEmit` w `sleeper-app/` | ✅ 0 błędów |
| `npm run lint` w `sleeper-app/` | ✅ 0 błędów |
| `npm ls react-native-svg lucide-react-native` | ✅ `lucide-react-native@1.17.0`, `react-native-svg@15.15.5` (transitive) |
| Test suite | n/a (projekt nie ma test runnera, decyzja project-level) |

## Bookkeeping checkboxów Weryfikacja:

Niezaznaczone `Weryfikacja:` w Fazie 0 (przed bookkeeping):
- L34 `Walidacja wartości eye-dropperem na finalnym mockupie/screenie` — **Mobile manual** → zostaw `[ ]`, dopisz suffix
- L37 `Zweryfikować renderowanie shadow-card na iOS + Android` — **Mobile manual** → zostaw `[ ]`, dopisz suffix
- L61 `Smoke test: każdy primitive użyty raz na ekranie placeholder` — **Mobile manual** (pokrywa się w Fazach 2-5) → zostaw `[ ]`, dopisz suffix

CLI checkboxy (już zaznaczone w trakcie wykonania fazy):
- L59 `npx tsc --noEmit` → już `[x]` (PASS potwierdzony w review)
- L60 `npm run lint` → już `[x]` (PASS potwierdzony w review)

### Podsumowanie

- Odznaczone automatycznie (CLI/grep): 0 (wszystkie CLI już były odznaczone)
- Pozostawione dla mobile manual: 3
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [x] CLI: `npx tsc --noEmit` → PASS (re-uruchomione w review, 0 błędów)
- [x] CLI: `npm run lint` → PASS (re-uruchomione w review, 0 błędów)
- [ ] Manual: `Walidacja wartości eye-dropperem` — manual test (patrz `manual-test-faza-0.md`)
- [ ] Manual: `shadow-card iOS+Android` — manual test (patrz `manual-test-faza-0.md`)
- [ ] Manual: `Smoke test primitives` — manual test (patrz `manual-test-faza-0.md`) — wykona się naturalnie w Fazach 2-5

## Decyzja severity gate

✅ **GOTOWE DO KONTYNUACJI** — 0 P1, 0 P2, 4 P3 (sugestie do rozważenia, NIE blokują).

Rekomendowane akcje (opcjonalne, do uwzględnienia w Fazie 6 polish):
1. Wyciągnąć `purple`/`purple-soft`/`cream` HEX do `src/lib/colors.ts` (gdy 3+ użycia HEX zamiast Tailwind).
2. Rozważyć explicit return types `ReactElement` w primitives — preferencja konwencji.
3. Pierwszy unit test gdy projekt dostanie Jest: `getNormForChild` boundary cases.
4. `SegmentedControl` — usunąć `segmentWidth` z useEffect deps jeśli ESLint Reanimated to wymaga.

## Kontynuacja

Można uruchomić `/dev-docs-execute` dla **Fazy 1 — Dark mode manual override**.
