---
title: Code Review — Faza 2 sleeper-web-pwa
data: 2026-06-05
faza: 2 (IU5-IU7)
branch: feature/sleeper-web-pwa
status: WYMAGA POPRAWEK (P1 blocking — build na web fail)
---

# Code Review — Faza 2 sleeper-web-pwa

**Branch:** `feature/sleeper-web-pwa`
**Data review:** 2026-06-05
**Zakres:** IU5 (Sessions data layer) + IU6 (Children + family data layer) + IU7 (Recommendation data + algorytm wiring)
**Pliki:** 11 plików implementacji + 4 pliki testow (~1100 LOC dodanych)

## Tldr

Implementacja Fazy 2 jest **wzorowa pod katem parytetu 1:1** — wszystkie 11 plikow ma `diff = 0` z odpowiednikami w sleeper-app (zweryfikowane `diff` w narzedziu). 27 unit testow pure-functions dorzucone (translate-* + adapter), wszystkie zielone. Typecheck i lint przechodza, sleeper-app bez regresji.

**Krytyczna sprawa wykryta podczas browser-bundle smoke test (Agent 5 / E2E):** `pnpm --filter sleeper-web build` (`expo export --platform web`) **failuje** z dwoma roznymi bledami w zaleznosci od wersji Node:
- Node 22: `ReferenceError: window is not defined` w `@react-native-async-storage/async-storage` (AsyncStorage->localStorage dostepny tylko w browserze)
- Node 20: `Node.js 20 detected without native WebSocket support` z `@supabase/realtime-js`

Powod: `app.json` ma `web.output: "static"` ktore aktywuje SSR/SSG prerendering w Metro. `supabase.ts` tworzy klienta z `AsyncStorage` + Realtime jako module-level side effect → execute sie podczas Node prerender. Faza 1 mialaby to samo, ale `_layout.tsx` jeszcze nie konsumowal `useRealtimeSessions` ani aktywnie nie odpalal queries — w Fazie 2 wprawdzie tez jeszcze nie ma UI, ALE supabase eager init w `lib/supabase.ts` byl tam od IU2. Tak wiec to **stary bug Fazy 1 zweryfikowany dopiero teraz** przez pierwszy realny `expo export`.

**Reszta findings:** 0 P1 czysto Fazy 2 (sam IU5-IU7 kod jest 1:1 z mobile, nie wprowadza nowych bugow). Bundle-build to systemic issue ujawniony przez pierwszy `expo export`. Dodatkowo 3 P2 dotyczace test coverage hooks (manual) + console.warn w hooks (nieoptymalne dla prod) + `useFocusEffect` w hooku ktore wymaga context expo-router.

## Statystyki

| Severity | Count |
|---|---|
| 🔴 P1-blocking | 1 (bundle build, ujawniony w Fazie 2 ale technicznie pre-existing z Fazy 1) |
| 🟠 P2-important | 3 |
| 🟡 P3-nit | 5 |
| ⚪ info | 2 |

**Klasyfikacja typow findingow:**
- KOD: 1 P1, 2 P2, 4 P3 (logika/perf/security/architektura)
- TEST: 0 P1, 1 P2, 1 P3 (brakujace/nieoptymalne testy)
- E2E: 1 P1 (bundle build smoke fail przez Agent 5)

**Decyzja severity gate:** ⛔ **WYMAGA POPRAWEK** — P1 bundle issue blokuje Faze 4 (deploy). Mozna kontynuowac Faze 3 (UI) ale przed `expo export` w IU11/IU12 musi byc rozwiazane.

## CLI weryfikacje (executed)

| Komenda | Wynik |
|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` | ✅ PASS (exit 0) |
| `pnpm --filter sleeper-web lint` | ✅ PASS (exit 0) |
| `pnpm --filter sleeper-web test` | ✅ PASS (5 files, 46 tests, 0 fail) |
| `pnpm --filter sleeper-machine build` | ✅ PASS |
| `pnpm --filter sleeper-machine-kotki build` | ✅ PASS |
| `pnpm --filter sleeper-app exec tsc --noEmit` | ✅ PASS (regression OK) |
| `grep -c "expo-notifications" schedule-nap-side-effects.ts` | ✅ 0 |
| **`pnpm --filter sleeper-web build`** (browser smoke) | **❌ FAIL** (SSR + AsyncStorage/Realtime — patrz P1.1) |
| `diff` parity (11 plikow vs sleeper-app) | ✅ 0 roznic (wszystkie 1:1) |

## 🔴 P1-blocking

### P1.1 🌐 `expo export --platform web` failuje — supabase/AsyncStorage module-level side effect w trybie static SSR
**Files:** `packages/sleeper-web/app.json` (`web.output: "static"`) + `packages/sleeper-web/src/lib/supabase.ts:18-28` + `packages/sleeper-web/src/features/auth/AuthProvider.tsx:5`
**Kategoria:** E2E / KOD
**Wykryte przez:** Agent 5 (browser-bundle smoke test)

Pierwszy realny `pnpm --filter sleeper-web build` (Faza 2 = pierwsza okazja zeby zrobic full export — Faza 1 nie wymagala) ujawnia **fundamentalny problem z trybem static rendering**:

```
Node 22:
  ReferenceError: window is not defined
    at getValue (AsyncStorage.js:63)
    at getItemAsync (supabase auth-js helpers.js)
    at __loadSession (GoTrueClient.js:2334)
    at module factory (sleeper-web/src/lib/supabase.ts:18)
    at module factory (sleeper-web/src/features/auth/AuthProvider.tsx:5)

Node 20 (vendored przez Volta dla pnpm):
  Error: Node.js 20 detected without native WebSocket support.
    at RealtimeClient (supabase realtime-js)
    at createClient (supabase-js index.mjs:862)
    at sleeper-web/src/lib/supabase.ts:18
```

**Root cause:**
1. `app.json` ma `web.output: "static"` → expo-router uruchamia static rendering (Node prerender ekranow do HTML).
2. `supabase.ts` linia 18: `createClient(...)` na module-scope (eager init) → wykonuje sie podczas Node import grafu modulow.
3. `createClient` wewnatrz inicjalizuje GoTrueClient → wywoluje `__loadSession` → `AsyncStorage.getItem` → `localStorage` → `ReferenceError: window`.
4. Realtime client takze sie inicjuje → wymaga `WebSocket` global → Node 20 nie ma natywnego, Node 22 ma ale i tak failuje wczesniej.

**Dlaczego to Faza 2 bug a nie Faza 1:**
- Technicznie kod supabase init istniał od IU2 (Faza 1).
- Faza 1 NIE wykonywała `expo export` jako weryfikacji (zostawila to do IU11/IU12).
- Faza 2 jest pierwszym IU gdzie `useRealtimeSessions` w grafie modulow jest spinany do hooks — co podnosi powiazanie supabase client jako "really used at runtime".
- W praktyce `expo export` failuje juz w Fazie 1 — odkrylem to dopiero teraz bo nikt nie odpalal `build`.

**Wplyw:** Faza 4 (IU11 + IU12 deploy do Vercel) jest zablokowana — `vercel build` nie ukonczy. Faza 3 (UI w `_layout.tsx`, `(app)/*.tsx`) mozna implementowac, ALE bez build verification.

**Mozliwe rozwiazania (do decyzji w IU8/IU11):**

1. **`web.output: "single"`** w `app.json` — wylacza static rendering, build robi SPA shell zamiast SSG. Trade-off: bez SEO (akceptowalne dla PWA-prywatnej aplikacji rodzinnej), Lighthouse PWA audit nadal pass. **Najprostsze rozwiazanie, zalecane.**
2. **Lazy supabase init** — wrap `createClient` w funkcji `getSupabase()` wywolywanej z useEffect/handlerow, nie module-scope. Wymaga refactoringu ~40 callsites supabase.from(...).
3. **Server/client component split** — wprowadzic `+server.ts` granice, ale to znaczace przebudowanie expo-router app/.
4. **AsyncStorage guard** — branch `Platform.OS === 'web' && typeof window === 'undefined'` w storage adapter → fallback do memory storage podczas SSR. Naprawa lokalne ale Realtime nadal failuje na Node 20.

**Rekomendacja:** opcja 1 (`web.output: "single"`) zaadresowana w IU11 PWA shell, dodatkowo `engines.node >= 22` w `packages/sleeper-web/package.json` zeby Vercel CI nie laducic na realtime issue.

**Fix:** dodac do `sleeper-web-pwa-zadania.md` w IU11 PRE-PWA krok:
```diff
# packages/sleeper-web/app.json
   "web": {
-    "output": "static",
+    "output": "single",
     "bundler": "metro"
   }
```
+ `"engines": { "node": ">=22" }` w `packages/sleeper-web/package.json`.

## 🟠 P2-important

### P2.1 — `useSleepRecommendation` uzywa `useFocusEffect` z `expo-router` ale hook potencjalnie konsumowany poza navigator context
**Files:** `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:5,66`
**Kategoria:** KOD / Architecture

`useFocusEffect` z `expo-router` dziala tylko gdy komponent jest w drzewie expo-router Stack/Tabs. W sleeper-app to dziala bo wszystkie ekrany z RecommendationCard zyja w `(app)/`. W sleeper-web w Fazie 2 jeszcze nie ma `(app)/` ekranow ani konsumentow — wiec problem hipotetyczny, ale **kiedy IU10 doda RecommendationCard do `(app)/index.tsx`, `useFocusEffect` MUSI byc w komponencie wewnatrz `Stack.Screen`/`Tabs.Screen`**. Inaczej dostaniesz `Cannot read property 'addListener' of undefined` w runtime.

Dodatkowo `useFocusEffect` na web w expo-router nie jest tak deterministyczny jak na native (web nie ma "focus" eventu na ekranie, tylko `visibilitychange`). Cross-midnight refresh moze nie zadziala tak jak w mobile.

**Fix (do IU10):** w sleeper-web zostawic kod 1:1, ale dodac w IU10 fallback:
- alternatywnie: `useEffect` z `setInterval` co 5min sprawdzajacy `dayKeyInAppTz(new Date())` vs zapamietany — niezalezne od navigator focus.

**Decyzja P2:** zostaw kod 1:1 (parytet), ale do IU10 dodaj **operator checklist** "test cross-midnight w PWA: zostaw otwarte ~23:55, sprawdz po polnocy czy queryKey sie odswiezyl". Jesli failuje, dodaj `useNow()` + manual dayKey diff.

### P2.2 — Brak testow jednostkowych hookow (`useSessions`, `useStartSession`, `useChildren`, `useSleepRecommendation`)
**Files:** brak `__tests__/hooks.test.ts` w `sessions/`, `children/`, `family/`, `recommendation/`
**Kategoria:** TEST

Kontekst zadania (`sleeper-web-pwa-kontekst.md:53`) deklaruje "strategia 'pure functions only' — hooks wymagaja React + QueryClient runtime; manual test [Mobile-mobile] po IU10". To OK z pragmatycznej perspektywy (sleeper-app tez nie ma testow tych hookow), ale:

1. **`useStartSession` optimistic update + rollback** to nietrywialna logika ktora w sleeper-web POWINNA byc testowana — bug w optimistic mozna catch przez `@testing-library/react` z `QueryClientProvider` wrapper. ~30 LOC test setup.
2. **`useSleepRecommendation` `useMemo` z `[]` deps + `useFocusEffect`** — refetch loop pattern udokumentowany w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`. Brak regression testu.
3. **`useRealtimeSessions` cleanup** — coding-rules §13 wymaga cleanup w useEffect. Brak testu ze `removeChannel` jest wywolany przy unmount.

**Fix (po IU8 lub IU10):** dodac `useStartSession.test.ts` + `useRealtimeSessions.test.ts` z `@testing-library/react-hooks` lub `renderHook`. Setup: `QueryClientProvider` wrapper + supabase mock.

**Priorytet:** P2 — nie blokuje Fazy 3, ale do uzupelnienia przed Faza 4 deploy (gdy juz wszystko podlaczone).

### P2.3 — `console.warn` w `hooks.ts:293` leak w production bundle
**Files:** `packages/sleeper-web/src/features/sessions/hooks.ts:293-295`
**Kategoria:** KOD / Performance

`useEndSession.onSuccess` zawiera `console.warn('[notifications] useEndSession received row with end_at === null — cancelling notification as fallback')`. To leak do prod bundle (~80 bytes + format string). `coding-rules.md` §6 quality gate: "Brak console.log w produkcyjnym kodzie".

W sleeper-app to ma sens (ostrzezenie dla debugowania notyfikacji). W sleeper-web `notifications.ts` i `schedule-nap-side-effects.ts` to no-op — wiec warning bez wartosci. Ale kod jest skopiowany 1:1, wiec rozsadne rozwiazanie:

**Fix:** zostaw 1:1 (parytet), dodaj do IU11 (PWA shell) babel plugin `babel-plugin-transform-remove-console` dla `process.env.NODE_ENV === 'production'`. Albo `if (__DEV__) console.warn(...)`.

**Priorytet:** P2 nit-bug bo malo realne (race condition po Realtime invalidate musialaby uderzyc, na web jeszcze bardziej rzadko).

## 🟡 P3-nit

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

## Pozytywne aspekty

1. **Parytet 1:1 100%** — wszystkie 11 plikow ma `diff = 0` z sleeper-app. Zero rozjazdu logiki domenowej, zero ryzyka divergencji.
2. **Pure functions sa testowane wyczerpujaco** — 27 cases (translate-session-error 7, translate-family-error 9, adapter 11) pokrywa wszystkie znane error codes + edge cases (null, undefined, invalid format).
3. **Invariant tests dla no-op mock** — `schedule-nap-side-effects.test.ts` ma 2 grep invariants ("nie importuje expo-notifications", "nie importuje @/lib/notifications"). To dokladnie sposob na zatrzymanie regresji.
4. **TZ-safe + stable queryKey** — `dayKeyInAppTz` zamiast `toISOString()` w queryKey (`useSessions`), `useMemo` z `[]` dla `dayKey` w `useSleepRecommendation`. Learned-patterns `2026-05-28-usememo-querykey-refetch-loop` przeniesiony bez zmian.
5. **Cleanup w `useRealtimeSessions`** — `supabase.removeChannel(channel)` w return useEffect. Coding-rules §13 spelniona.
6. **Optimistic updates tylko dla START/STOP** zgodnie z CLAUDE.md konwencja "edycja historii — bez optimistic".

## Bookkeeping checkboxow Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 5
- Odznaczone na podstawie Agent 5 E2E: 0
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

**Manual-mobile testy ZOSTAJĄ niezaznaczone** — wymagaja IU8-IU10 (UI screens) zanim mozna ich faktycznie wykonac. Zgodnie z konwencja `dev-docs-review` krok 4.6 — to nie blokuje Fazy 2, sa explicit (po IU10).

## Decyzja severity gate

⛔ **WYMAGA POPRAWEK** — 1 problem P1 blocking:

- **P1.1 bundle build fail** — bezposrednio NIE blokuje przejscia do Fazy 3 (mozna implementowac UI bez `expo export`), ale **MUSI byc rozwiazane PRZED IU11 (PWA shell)** zeby Faza 4 deploy mogla sie powiesc. Rekomendacja: przemiescic `web.output: "single"` + `engines.node >= 22` jako PRE-IU11 step do `sleeper-web-pwa-zadania.md`.

**Czysta Faza 2 (kod IU5-IU7) jest CZYSTA** — 0 wlasnych P1, 3 P2, 5 P3 — wszystkie do naprawy w IU10/IU11 ale nie blokuja Fazy 3.

## Rekomendacja

Mozna kontynuowac Faze 3 (UI & Routes) z zalozeniem ze:
1. P1.1 zostanie zaadresowany w pierwszym kroku IU11.
2. P2.1 (useFocusEffect cross-midnight web edge) bedzie zweryfikowany w manual-test-faza-3.md po IU10.
3. P2.2 (testy hookow) sa nice-to-have, ale do uzupelnienia przed Faza 4 deploy.
4. P2.3 (console.warn w prod) zaadresowany centralnie w IU11 przez babel plugin.

Nie ma sensu robic poprawek P3 teraz — to parytet z sleeper-app i czesc to istniejacy tech debt.
