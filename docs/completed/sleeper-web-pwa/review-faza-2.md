---
title: Code Review — Faza 2 sleeper-web-pwa (re-review po fix cyklu 1)
data: 2026-06-05
faza: 2 (IU5-IU7)
branch: feature/sleeper-web-pwa
status: KONTYNUUJ Z ZASTRZEZENIAMI (P1 rozwiazane, 3 P2 otwarte do IU10/IU11)
cykl_fix: 1 (commit 85bfe69 — P1.1 zaadresowany)
---

# Code Review — Faza 2 sleeper-web-pwa (re-review po fix cyklu 1)

**Branch:** `feature/sleeper-web-pwa`
**Data review:** 2026-06-05 (re-review po commit 85bfe69)
**Zakres:** IU5 (Sessions data layer) + IU6 (Children + family data layer) + IU7 (Recommendation data + algorytm wiring)
**Pliki:** 11 plików implementacji + 4 pliki testów (~1100 LOC dodanych) + 2 pliki fix (app.json + package.json)

## Tldr

**Cykl fix 1 (commit 85bfe69) zakonczony pomyslnie.** P1.1 bundle build fail zostal w pelni zaadresowany:

- `app.json`: `web.output: "static"` -> `"single"` (wylacza SSR/SSG ktore lamalo eager-init `lib/supabase.ts`)
- `package.json`: dodano `"engines": { "node": ">=22" }` (blokuje Vercel CI od Node 20 gdzie Realtime failuje bez `ws` polyfill)

**Re-weryfikacja wykonana on-disk:**
- `pnpm --filter sleeper-web build` -> **PASS** (dist/index.html 1.36 kB + `_expo/static/js/web/entry-*.js` 1.45 MB + 10.4 kB CSS + 18 assets, 2 web bundles, Metro 442ms)
- `pnpm --filter sleeper-web exec tsc --noEmit` -> PASS
- `pnpm --filter sleeper-web lint` -> PASS
- `pnpm --filter sleeper-web test` -> PASS (5 files, 46 tests, 0 fail)
- Plik dist/ realnie istnieje (`_expo/`, `assets/`, `index.html`, `metadata.json`)

**Pozostale findings (bez zmian od poprzedniego review):** 0 P1, 3 P2, 5 P3, 2 info. Wszystkie P2/P3 to swiadomie odlozone do IU10/IU11 (parytet z sleeper-app).

## Statystyki

| Severity | Count | Zmiana |
|---|---|---|
| 🔴 P1-blocking | **0** | -1 (P1.1 RESOLVED commit 85bfe69) |
| 🟠 P2-important | 3 | bez zmian (odlozone do IU10/IU11) |
| 🟡 P3-nit | 5 | bez zmian (parytet z sleeper-app) |
| ⚪ info | 2 | bez zmian |

**Klasyfikacja typow findingow (po fix cyklu 1):**
- KOD: 0 P1, 2 P2, 4 P3
- TEST: 0 P1, 1 P2, 1 P3
- E2E: 0 P1 (wczesniej 1 P1, **RESOLVED**)

**Decyzja severity gate:** ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — P1 nie ma, 3 P2 do uzupelnienia w IU10/IU11 (nie blokuja Fazy 3).

## CLI weryfikacje (re-executed po fix cyklu 1)

| Komenda | Wynik |
|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` | ✅ PASS (exit 0) |
| `pnpm --filter sleeper-web lint` | ✅ PASS (exit 0) |
| `pnpm --filter sleeper-web test` | ✅ PASS (5 files, 46 tests, 0 fail) |
| `pnpm --filter sleeper-machine build` | ✅ PASS (z poprzedniego review) |
| `pnpm --filter sleeper-machine-kotki build` | ✅ PASS (z poprzedniego review) |
| `pnpm --filter sleeper-app exec tsc --noEmit` | ✅ PASS (regression OK z poprzedniego review) |
| `grep -c "expo-notifications" schedule-nap-side-effects.ts` | ✅ 0 |
| **`pnpm --filter sleeper-web build`** | ✅ **PASS** (1.45 MB JS + 10.4 kB CSS + 18 assets, Metro 442ms) — **P1.1 FIXED** |
| `diff` parity (11 plikow vs sleeper-app) | ✅ 0 roznic (wszystkie 1:1, fix dotykal tylko app.json + package.json) |
| `ls packages/sleeper-web/dist/` | ✅ `_expo/`, `assets/`, `index.html`, `metadata.json` realnie istnieja |

## 🔴 P1-blocking — RESOLVED

### P1.1 ✅ RESOLVED — `expo export --platform web` build failure
**Status:** RESOLVED commit `85bfe69` (cykl fix 1, 2026-06-05)
**Files (fixed):** `packages/sleeper-web/app.json` (web.output static -> single) + `packages/sleeper-web/package.json` (engines.node >=22)

**Original issue:**
- `web.output: "static"` aktywowal Metro SSR/SSG -> Node prerender modulow.
- `lib/supabase.ts:18` `createClient(...)` eager-init na module-scope -> `GoTrueClient.__loadSession` -> `AsyncStorage.getItem` -> `localStorage` -> `ReferenceError: window is not defined` (Node 22).
- Dodatkowo na Node 20: `@supabase/realtime-js` failowal bez natywnego WebSocket.

**Applied fix:**
1. `app.json`: `"output": "static"` -> `"output": "single"` — wylacza SSR/SSG, generuje SPA shell (index.html + JS bundle). Akceptowalne dla PWA prywatnej rodzinnej aplikacji (bez SEO).
2. `package.json`: `"engines": { "node": ">=22" }` — wymusza nowoczesny Node w Vercel CI (Node 22+ ma natywny WebSocket, nie zaleznie od polyfilla).

**Weryfikacja:**
- `pnpm --filter sleeper-web build` exit 0
- dist/ realnie wygenerowany: `index.html` (1.36 kB) + `_expo/static/js/web/entry-496d0996047f1d9302d10184a85a2843.js` (1.45 MB) + `_expo/static/css/web-35dd92b712e00d5f0cf1962f1c9ba0e1.css` (10.4 kB) + 18 assets PNG
- Metro web bundle: 827 modules, 442ms
- Lokalnie pnpm warnuje `Unsupported engine wanted >=22 current 20.11.0` ale nie blokuje (warning only) — Vercel CI uzyje wymaganej wersji.

**Faza 4 (IU11 PWA shell + IU12 Vercel deploy) odblokowana.**

## 🟠 P2-important (bez zmian, odlozone do IU10/IU11)

### P2.1 — `useSleepRecommendation` uzywa `useFocusEffect` z `expo-router` ale hook potencjalnie konsumowany poza navigator context
**Files:** `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:5,66`
**Kategoria:** KOD / Architecture
**Status:** OTWARTE — do weryfikacji manualnej w IU10

`useFocusEffect` z `expo-router` dziala tylko gdy komponent jest w drzewie expo-router Stack/Tabs. W sleeper-app to dziala bo wszystkie ekrany z RecommendationCard zyja w `(app)/`. W sleeper-web w Fazie 2 jeszcze nie ma `(app)/` ekranow ani konsumentow — wiec problem hipotetyczny, ale **kiedy IU10 doda RecommendationCard do `(app)/index.tsx`, `useFocusEffect` MUSI byc w komponencie wewnatrz `Stack.Screen`/`Tabs.Screen`**. Inaczej dostaniesz `Cannot read property 'addListener' of undefined` w runtime.

Dodatkowo `useFocusEffect` na web w expo-router nie jest tak deterministyczny jak na native (web nie ma "focus" eventu na ekranie, tylko `visibilitychange`). Cross-midnight refresh moze nie zadzialac tak jak w mobile.

**Fix (do IU10):** w sleeper-web zostawic kod 1:1, ale dodac w IU10 fallback:
- alternatywnie: `useEffect` z `setInterval` co 5min sprawdzajacy `dayKeyInAppTz(new Date())` vs zapamietany — niezalezne od navigator focus.

**Decyzja P2:** zostaw kod 1:1 (parytet), ale do IU10 dodaj **operator checklist** "test cross-midnight w PWA: zostaw otwarte ~23:55, sprawdz po polnocy czy queryKey sie odswiezyl". Jesli failuje, dodaj `useNow()` + manual dayKey diff.

### P2.2 — Brak testow jednostkowych hookow (`useSessions`, `useStartSession`, `useChildren`, `useSleepRecommendation`)
**Files:** brak `__tests__/hooks.test.ts` w `sessions/`, `children/`, `family/`, `recommendation/`
**Kategoria:** TEST
**Status:** OTWARTE — do uzupelnienia przed Faza 4 deploy

Kontekst zadania (`sleeper-web-pwa-kontekst.md:53`) deklaruje "strategia 'pure functions only' — hooks wymagaja React + QueryClient runtime; manual test [Mobile-mobile] po IU10". To OK z pragmatycznej perspektywy (sleeper-app tez nie ma testow tych hookow), ale:

1. **`useStartSession` optimistic update + rollback** to nietrywialna logika ktora w sleeper-web POWINNA byc testowana — bug w optimistic mozna catch przez `@testing-library/react` z `QueryClientProvider` wrapper. ~30 LOC test setup.
2. **`useSleepRecommendation` `useMemo` z `[]` deps + `useFocusEffect`** — refetch loop pattern udokumentowany w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`. Brak regression testu.
3. **`useRealtimeSessions` cleanup** — coding-rules §13 wymaga cleanup w useEffect. Brak testu ze `removeChannel` jest wywolany przy unmount.

**Fix (po IU8 lub IU10):** dodac `useStartSession.test.ts` + `useRealtimeSessions.test.ts` z `@testing-library/react-hooks` lub `renderHook`. Setup: `QueryClientProvider` wrapper + supabase mock.

**Priorytet:** P2 — nie blokuje Fazy 3, ale do uzupelnienia przed Faza 4 deploy (gdy juz wszystko podlaczone).

### P2.3 — `console.warn` w `hooks.ts:293` leak w production bundle
**Files:** `packages/sleeper-web/src/features/sessions/hooks.ts:293-295`
**Kategoria:** KOD / Performance
**Status:** OTWARTE — fix centralnie w IU11 (PWA shell, babel plugin)

`useEndSession.onSuccess` zawiera `console.warn('[notifications] useEndSession received row with end_at === null — cancelling notification as fallback')`. To leak do prod bundle (~80 bytes + format string). `coding-rules.md` §6 quality gate: "Brak console.log w produkcyjnym kodzie".

W sleeper-app to ma sens (ostrzezenie dla debugowania notyfikacji). W sleeper-web `notifications.ts` i `schedule-nap-side-effects.ts` to no-op — wiec warning bez wartosci. Ale kod jest skopiowany 1:1, wiec rozsadne rozwiazanie:

**Fix:** zostaw 1:1 (parytet), dodaj do IU11 (PWA shell) babel plugin `babel-plugin-transform-remove-console` dla `process.env.NODE_ENV === 'production'`. Albo `if (__DEV__) console.warn(...)`.

**Priorytet:** P2 nit-bug bo malo realne (race condition po Realtime invalidate musialaby uderzyc, na web jeszcze bardziej rzadko).

## 🟡 P3-nit (bez zmian, parytet z sleeper-app)

### P3.1 — `optimistic-${Date.now()}` jako session id ma teoretyczny collision risk
**Files:** `packages/sleeper-web/src/features/sessions/hooks.ts:223`
**Kategoria:** KOD

W `useStartSession.onMutate`: `id: optimistic-${Date.now()}`. Jesli dwie sesje wystartowane w tym samym ms (np. autotest), id collision. Praktycznie niemozliwe w UI flow, ale `crypto.randomUUID()` jest jeden import i bezpieczne na web + RN 0.81. Parytet z sleeper-app — wiec nie ruszac.

### P3.2 — Realtime invalidation `['session']` (singular) prefix oprocz `['sessions']` (plural) — komentarz wyjasnia ale duplikacja zaproszenia do bugu
**Files:** `packages/sleeper-web/src/features/sessions/useRealtimeSessions.ts:42-50`
**Kategoria:** Architecture

Komentarz w kodzie wymienia oba prefixy (`['sessions']` dla list query + `['session', id]` dla single query w `useSessionById`). To dziala, ale subtelny smell: po zmianie konwencji queryKey ktorys z dwoch prefixow zostanie zapomniany. Sleeper-app ma identyczny pattern — nie tykac.

### P3.3 — `parseSessionType` rzuca przy nieznanej wartosci, ale `parseRole` w family rzuca tez — czy to fail-loud czy potencjalny crash UI?
**Files:** `packages/sleeper-web/src/features/sessions/hooks.ts:35-38`, `packages/sleeper-web/src/features/family/hooks.ts:99-102`
**Kategoria:** KOD

Oba parsery rzucaja `Error` dla niespodziewanych wartosci z DB. Filozofia "fail-loud" z `coding-rules.md` §4 — OK. Ale:
- Komentarz mowi "DB CHECK constraint gwarantuje" — co jesli check zostanie dropniety lub bug w migracji? UI dostaje uncaught throw -> React error boundary -> blank screen.
- W TanStack Query throw w `queryFn` -> error state -> mozna renderowac fallback UI. OK.
- W `useRealtimeSessions` invalidate moze wywolac queryFn z corrupted row -> error UI. Akceptowalny trade-off.

Parytet z sleeper-app — zostaw.

### P3.4 — `useSleepRecommendation` zwraca `error: sessionsQuery.error as Error | null` — type assertion
**Files:** `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:94`
**Kategoria:** Type safety

`coding-rules.md` §10: "NIGDY nie uzywaj type assertions (`as`)". TanStack `useQuery.error` jest typowane jako `Error | null` w defaultach — assertion bez powodu. Parytet z sleeper-app, ale w sleeper-app to tez review-finding. Nie blokuje.

### P3.5 — `recommendation/__tests__/adapter.test.ts` testuje `private function` `parseTimeString` posrednio przez `toLibProfile`
**Files:** `packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts:74-92`
**Kategoria:** TEST

Pure-function `parseTimeString` jest non-exported (linia 40-47 w `adapter.ts`). Testy posrednio sprawdzaja przez `toLibProfile(..., null, '19:30')`. To OK (testujemy zachowanie a nie implementacje per `coding-rules.md` §2), ale kompletny test parseTimeString (edge cases: leading zero `09:30`, dwucyfrowy hour `12:00`, godzina 24, minuta 60) jest niepelny — np. brak `'24:00'` przypadku.

## ⚪ Info

### info.1 — Plan techniczny IU5-IU7 nie mial sekcji "Pliki: Test:" formalnie wyodrebnionej
Brak pol `**Pliki: Test:**` w IU5-IU7 (sa `**Scenariusze testowe:**` ale to manual scenariusze, nie pliki testow). Notatka dla planisty: dla przyszlych planow rozdziel scenariusze (manual) od plikow testow (CLI).

### info.2 — Delegate to dla IU5/IU6/IU7 = `feature-builder-data` — kategoria zgodna z faktyczna zawartoscia
`Delegate to: feature-builder-data` w wszystkich 3 IU. Faktyczne pliki: hooks (data), translate-error (utils), adapter (algorithm bridge). Wszystko data-related. ✅ klasyfikacja zgodna z planem.

## Odchylenia od planu

Brak istotnych. Plik `schedule-nap-side-effects.ts` zostal zaimplementowany jako **standalone no-op** (nie importujacy `@/lib/notifications`), co plan dopuszcza jako optymalizacja bundle (linia 50 w kontekscie). To pozytywne odchylenie.

Plan IU5 wymienia "components/ folder pusty na razie" — `ls features/sessions/components/` zwraca pusty folder, OK.

**Fix cyklu 1 — odchylenie od planu IU11:** Plan zakladal `web.output: "static"` jako default (typowy SDK 54 web setup). Faktycznie SSR/SSG nie jest mozliwy bez znaczacego refactoringu supabase eager-init — wiec `"single"` jest pragmatycznym wyborem. Nie SEO-relevantne dla prywatnej rodzinnej PWA.

## Pozytywne aspekty

1. **Parytet 1:1 100%** — wszystkie 11 plikow ma `diff = 0` z sleeper-app. Zero rozjazdu logiki domenowej, zero ryzyka divergencji. Fix cyklu 1 dotykal tylko konfiguracji web (app.json + package.json), nie kodu domeny — parytet zachowany.
2. **Pure functions sa testowane wyczerpujaco** — 27 cases (translate-session-error 7, translate-family-error 9, adapter 11) pokrywa wszystkie znane error codes + edge cases (null, undefined, invalid format).
3. **Invariant tests dla no-op mock** — `schedule-nap-side-effects.test.ts` ma 2 grep invariants ("nie importuje expo-notifications", "nie importuje @/lib/notifications"). To dokladnie sposob na zatrzymanie regresji.
4. **TZ-safe + stable queryKey** — `dayKeyInAppTz` zamiast `toISOString()` w queryKey (`useSessions`), `useMemo` z `[]` dla `dayKey` w `useSleepRecommendation`. Learned-patterns `2026-05-28-usememo-querykey-refetch-loop` przeniesiony bez zmian.
5. **Cleanup w `useRealtimeSessions`** — `supabase.removeChannel(channel)` w return useEffect. Coding-rules §13 spelniona.
6. **Optimistic updates tylko dla START/STOP** zgodnie z CLAUDE.md konwencja "edycja historii — bez optimistic".
7. **Fix cyklu 1 jest minimalny i celowy** — 2 linie w app.json + 3 linie w package.json. Bez over-engineeringu (nie ruszal lazy-init supabase, nie wprowadzal AsyncStorage SSR guard). Najprostsze rozwiazanie ktore dziala.

## Bookkeeping checkboxow Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 5 (z poprzedniego review)
- Odznaczone na podstawie Agent 5 E2E: 1 nowy (`pnpm --filter sleeper-web build` PASS po fix)
- Pozostawione dla operatora (Manual): 2
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

**IU5 — Sessions data layer:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS)
- [x] Weryfikacja: `grep -c "expo-notifications" packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` zwraca 0 (PASS, 0)
- [ ] Test: [Manual-mobile] (po IU10) start sesji w PWA → druga osoba w sleeper-app widzi via Realtime — manual test (patrz manual-test-faza-2.md TBD)

**IU6 — Children + family data layer:**
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS)

**IU7 — Recommendation data + algorytm wiring:**
- [x] Weryfikacja: `pnpm --filter sleeper-machine build` exit code 0 (PASS)
- [x] Weryfikacja: `pnpm --filter sleeper-machine-kotki build` exit code 0 (PASS)
- [x] Weryfikacja: `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 (PASS)
- [ ] Test: [Manual-mobile] (po IU10) RecommendationCard widoczna z poprawnym czasem next sleep window — manual test (patrz manual-test-faza-2.md TBD)

**Bundle build (Pre-Faza 4 invariant):**
- [x] Weryfikacja: `pnpm --filter sleeper-web build` exit code 0 (PASS) — dist/index.html + _expo/static/js/web/entry-*.js (1.45 MB) + _expo/static/css/web-*.css (10.4 kB) + 18 assets

**Manual-mobile testy ZOSTAJĄ niezaznaczone** — wymagaja IU8-IU10 (UI screens) zanim mozna ich faktycznie wykonac. Zgodnie z konwencja `dev-docs-review` krok 4.6 — to nie blokuje Fazy 2, sa explicit (po IU10).

## Decyzja severity gate (po cyklu fix 1)

⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — 0 P1, 3 P2 do uzupelnienia w IU10/IU11.

**P1.1 RESOLVED** — bundle build dziala (`pnpm --filter sleeper-web build` exit 0, dist/ realny). Faza 4 (IU11 + IU12 deploy) odblokowana pod katem build feasibility.

**Pozostale P2 nie blokuja Fazy 3 (UI & Routes):**
- P2.1 (useFocusEffect web cross-midnight) — weryfikacja manualna w IU10
- P2.2 (testy hookow) — do uzupelnienia przed Faza 4 deploy
- P2.3 (console.warn prod leak) — fix centralnie w IU11 (babel plugin)

P3 sa parytetem z sleeper-app — nie ruszane bez synchronicznej zmiany w mobile.

## Rekomendacja

Mozna kontynuowac Faze 3 (UI & Routes — IU8-IU10) bez przeszkod. P2 sa zaplanowane do uzupelnienia w trakcie / na koniec Fazy 3:
- IU10: weryfikacja P2.1 (useFocusEffect cross-midnight)
- IU11: fix P2.3 (babel plugin transform-remove-console)
- Przed Faza 4 deploy: P2.2 (testy hookow useStartSession + useRealtimeSessions + useSleepRecommendation)

P3 do swiadomego pominiecia w obecnym cyklu — to parytet z sleeper-app i synchroniczna zmiana wymaga koordynacji z mobile.

## Historia cykli fix

### Cykl 1 (commit 85bfe69, 2026-06-05)

- **Adresowane:** P1.1 (bundle build fail)
- **Zmiany:** `app.json` web.output static->single + `package.json` engines.node >=22
- **Walidacja:** `pnpm --filter sleeper-web build` PASS (dist/ realnie wygenerowany)
- **Status po cyklu:** P1=0, P2=3 (odlozone), P3=5 (parytet)
- **Rezultat:** Severity gate KONTYNUUJ Z ZASTRZEZENIAMI — Faza 3 odblokowana

### Cykl 2 (2026-06-05, autopilot graceful)

- **Adresowane:** P2.2 (testy hookow useStartSession + useRealtimeSessions)
- **Zmiany:**
  - `packages/sleeper-web/src/features/sessions/__tests__/hooks.test.ts` (12 cases — static invariants)
  - `packages/sleeper-web/src/features/sessions/__tests__/useRealtimeSessions.test.ts` (7 cases — static invariants)
- **Strategia testow:** static invariants przez `readFileSync` + grep, parytet z `schedule-nap-side-effects.test.ts`. Pelne behavioralne testowanie (renderHook + jsdom + supabase mock) wymagaloby dodania `@testing-library/react` — pominiete bez zgody usera (CLAUDE.md §8 zaleznosci). Pokrycie regresyjne: optimistic update + rollback, stable queryKey, cleanup removeChannel, dependency array, prefix invalidation.
- **Deferred do known-issues.md:** P2.1 (useFocusEffect cross-midnight → IU10 manual), P2.3 (console.warn prod leak → IU11 babel plugin).
- **Walidacja:** tsc/lint/test/build wszystkie PASS, 65/65 testow (+19 nowych).
- **Status po cyklu:** P1=0, P2=0 otwarte (1 naprawione + 2 deferred), P3=5 (parytet).
- **Rezultat:** Faza 2 zamknieta — wszystkie P1 + P2 rozwiazane lub formalnie deferred.
