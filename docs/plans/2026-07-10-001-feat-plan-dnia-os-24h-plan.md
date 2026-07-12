---
title: "feat: Plan całego dnia + oś 24h (rytm dnia) w karcie rekomendacji"
type: feat
status: active
date: 2026-07-10
origin: docs/dev-brainstorms/2026-07-10-plan-dnia-os-24h-requirements.md
design_md: null
figma_spec: null
figma_screens: {}
---

# feat: Plan całego dnia + oś 24h („rytm dnia") w karcie rekomendacji

## Przegląd

Rozszerzamy rekomendację snu z pojedynczego „następne okno" do **re-kotwiczonego planu reszty dnia** (łańcuch przyszłych drzemek liczony od realnego końca ostatniego snu, bedtime stały) oraz dodajemy **oś 24h** w karcie rekomendacji na home (fakty + predykcje + znacznik „teraz"), **przełącznik widoku** (lista ↔ oś, persystowany) i **prognozę bilansu snu** (fakty + plan vs norma wieku).

## Ujęcie problemu

(zob. źródło: `docs/dev-brainstorms/2026-07-10-plan-dnia-os-24h-requirements.md`)

1. Zgrzyt danych: „Następny sen" kotwiczony na realnym końcu ostatniej drzemki, ale „Plan reszty dnia" to filtr **idealnego** planu od pobudki (`plan.filter(e => plannedStart > now)` w `recommender.ts:200`) — po nietypowej drzemce obie informacje sobie przeczą.
2. Brak obrazu całej doby i odpowiedzi „czy dziś wyrobimy normę?".

Krytyczna luka odkryta w researchu: adapter **odfiltrowuje sesję w toku** (`adapter.ts:27`), więc podczas trwającej drzemki (najczęstszy stan ekranu) silnik nie ma kotwicy — plan liczy się jakby dziecko czuwało.

## Śledzenie wymagań

- R1. Re-kotwiczony plan: przyszłe drzemki łańcuchowo od realnego końca ostatniego snu; bedtime stały (`preferred_bedtime`); kolizja → warning (istniejący mechanizm `warnings`).
- R2. Plan przeliczany po każdym START/STOP/edycji (naturalne: derive z `sessionsQuery.data` + istniejący realtime invalidate).
- R3. Oś 24h w karcie rekomendacji: fakty (noc/drzemki/sesja w toku), predykcje odróżnione wizualnie, znacznik „teraz".
- R4. Przełącznik widoku lista ↔ oś u góry karty; persystowany; default: oś; obie wersje pokazują ten sam re-kotwiczony plan.
- R5. Prognoza bilansu: fakty do „teraz" + plan reszty dnia vs norma wieku; granica dnia = dzień kalendarzowy w `Europe/Warsaw`.
- R6. Stany brzegowe: plan istnieje zawsze (kaskada kotwicy: realna pobudka → `preferred_wake_time` → 7:00 + nota); sesja w toku = część obrazu (drzemka: kotwica = max(now, start + długość wg wieku); noc: fakt do now, planowany koniec = preferowana pobudka); cold start OK.

## Granice scope'u

- Bez sekcji w stats i przeglądania poprzednich dni (wariant C odłożony; komponent osi pisać tak, by dało się go później re-użyć z innym dniem).
- Bez alertów/powiadomień, bez interakcji na osi (read-only).
- Bez zmiany filozofii kotki_dwa (lookup table, zero EWMA/adaptacji — `packages/sleeper-machine-kotki/CLAUDE.md`).
- Bez naprawy device-tz w pakiecie kotki (`sameCalendarDay`/`buildMorningWake` używają device-lokalnych komponentów Date) — known limitation, user w PL; oś/prognoza po stronie web używają WYŁĄCZNIE helperów `lib/time.ts`.

## Kontekst i research

### Relevantny kod i wzorce

- `packages/sleeper-machine-kotki/src/recommender.ts` — kotwica `lastWakeMs` (realny koniec ostatniej drzemki, linie 186-191) już liczona dla `nextSleepAt`, ale nieużywana do planu; `findRealMorningWake` (:116); bedtimeOverride (:153-177); mechanizm `warnings` (:216-234).
- `packages/sleeper-machine-kotki/src/forwardPass.ts` — czysta funkcja `forwardPass(morningWake, bucket, napLengths)`; re-kotwiczenie = wariant startujący od podanej kotwicy i indeksu okna (`napsDone.length`), nie zawsze od `[0]`.
- `packages/sleeper-machine/src/types.ts:54-65` — `Recommendation`; precedens rozszerzania: `nextSleepShiftMinutes` z semantyką „null gdy algorytm nie wspiera". `State` — tu wejdzie opcjonalna sesja aktywna.
- Konsumenci `Recommendation` w web (3, wszystkie type-only z `'sleeper-machine'`): `useSleepRecommendation.ts:7`, `RecommendationCard.tsx:2`, `components/ActiveWindowCard.tsx:2`. Dodatkowy konsument semantyki `remainingNapsToday`: `smartSessionType()` w `app/(app)/index.tsx:209`.
- Wzorzec wykresu bez biblioteki: `packages/sleeper-web/src/features/stats/components/SleepBarChart.tsx` — kontener `relative` + warstwy `absolute`, skalowanie w `style`, kolory klasami NativeWind z wariantem `dark:`.
- Wzorzec persist store: `packages/sleeper-web/src/features/settings/useThemeStore.ts` — Zustand persist z **synchronicznym** adapterem localStorage na web (anty-FOUC); kopiować 1:1 z nowym `name:` (filozofia: duplication > complexity).
- Prognoza — klocki: `lib/sleep-aggregation.ts` (`durationWithinWindow` — clamp cross-midnight; `dailySleepTotalsMs` **pomija** `end_at === null` → sesję w toku doliczać osobno), `lib/sleep-norms.ts` (`getNormForChild` → przedział min–max), `lib/time.ts` (`startOfDayInAppTz`/`endOfDayInAppTz`/`minutesOfDayInAppTz`/`formatTime`/`formatDuration`).
- Tick: `useNow(TICK_MS=30s)` w `app/(app)/index.tsx:41,139`; rekomendacja liczona raz na sekcję (:167) i podawana propem — oś wpina się w istniejący tick bez nowego timera.
- Testy: vitest `environment: 'node'` (bez jsdom/RNTL) — komponenty testowane przez ekstrakcję czystej logiki + static-invariants (`src/app/(app)/__tests__/sleep-fullscreen.invariants.test.ts` jako wzorzec regexowy). Kotki: testy w `tests/`, `now` zawsze jawny, helpery `dobForAge`/`hhmm`, test-only eksporty z prefiksem `_`.

### Wiedza instytucjonalna

- TZ-safe (`docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md`): pozycja % na osi = `(t − startOfDayInAppTz) / (endOfDayInAppTz − startOfDayInAppTz)` — **nigdy stała 1440 min** (doba DST ma 23/25 h). Zakazane: `setHours`, `+ 86400000`.
- Stabilny queryKey (`docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`): tickujący `now` nie może wpadać do queryKey; predykcje = pure derive z `(sessions, now)`.
- Cross-midnight (`docs/solutions/runtime-errors/2026-05-29-cross-day-editing-night-sleep-session.md`): sesje nocne mają `end_at` na dniu N+1; przy sumowaniu przycinać do `[startOfDay, endOfDay)`.
- Static-invariants (`docs/solutions/testing-issues/2026-06-06-static-invariants-testing-strategy.md`): architektura komponentu = grep-testy; logika = unit na pure functions.
- Changelog enforcement (`docs/solutions/deployment-issues/2026-07-09-changelog-entry-enforcement-commit-msg-hook.md`): commit `feat(web)` bez zmiany `changelog.json` jest **blokowany** hookiem — wpis + bump wersji (`app.json` + `package.json`, invariant `version-sync.test.ts`) w tym samym commicie co zmiana user-facing.
- Zustand na web (`docs/solutions/build-errors/2026-06-06-zustand-esm-import-meta-metro-web.md`): subpathy `zustand`, `zustand/middleware`, `zustand/shallow`, `zustand/vanilla` już zmapowane w `metro.config.js` — nie wprowadzać nowych subpathów.
- Theme (`docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`): kolory imperatywne wyłącznie przez `useEffectiveTheme()`.

### Referencje zewnętrzne

- Brak (silne wzorce lokalne; research zewnętrzny świadomie pominięty).

## Kluczowe decyzje techniczne

- **Re-kotwiczenie żyje w pakiecie `sleeper-machine-kotki`** (zob. źródło — preferencja potwierdzona researchem): czysta funkcja łańcucha od podanej kotwicy + indeksu drzemki; testowalna w izolacji, blisko lookup table.
- **Semantyka `remainingNapsToday` zmienia się w miejscu** (bez nowego pola): oba realne callsite'y (`RecommendationCard`, `smartSessionType`) chcą wersji re-kotwiczonej — utrzymywanie dwóch planów obok siebie to prosta droga do ponownego zgrzytu. `nextSleepAt` musi być równy `plannedStart` pierwszego wpisu łańcucha (jedno źródło prawdy).
- **Sesja aktywna wchodzi do silnika** przez nowe opcjonalne pole `State.activeSession?: { start: Date; type: 'NAP' | 'NIGHT' }` (typ w `sleeper-machine`, pole opcjonalne = non-breaking; Galland je ignoruje). Kotwica przy drzemce w toku = `max(now, start + długość drzemki wg wieku)`; przy nocy w toku plan dnia liczy się od `preferred_wake_time` (fallback 7:00).
- **Plan „w przeszłości" clampowany do `now`**: gdy okno czuwania minęło, pierwszy przyszły wpis startuje od `now` („jak najszybciej") + istniejący warning „ryzyko przemęczenia"; kolejne wpisy łańcuchowo od clampa.
- **Oś: jeden pas, reguła fakty ≤ now < plan**: fakty rysowane wyłącznie w `[startOfDay, now]` (sesja w toku ucięta na `now`), predykcje wyłącznie w `(now, endOfDay]` — nakładki niemożliwe z konstrukcji. Bloki przycinane do granic doby (`durationWithinWindow`-style); przewidziany NIGHT bez `plannedEnd` → rysowany do końca doby.
- **Prognoza bilansu**: `fakty(clamp do [startOfDay, now], w tym sesja w toku) + plan(clamp do (now, endOfDay])` vs przedział normy; format: w przedziale → „w normie (11–14 g)"; poniżej min → „−X do normy"; powyżej max → „+X ponad normę". Zero podwójnego liczenia (fakt do now, plan od now).
- **Prognoza tylko w widoku osi**; widok listy pozostaje bez zmian (legacy).
- **Przełącznik = `SegmentedControl`** (istniejący komponent) + nowy mały store `useRecommendationViewStore` (kopia wzorca `useThemeStore`, name: `recommendation-view`, default `'timeline'`).
- **Oś jako `View` z pozycjonowaniem procentowym** (wzorzec `SleepBarChart`) — zero nowych zależności; geometria segmentów wyliczana w czystym module (testowalne w node env).
- **Kolejność buildów**: zmiana typów wymaga `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build` przed typecheckiem web (web konsumuje `dist/`).

## Otwarte pytania

### Rozwiązane podczas planowania

- Kotwica łańcucha przy sesji w toku → `max(now, start + długość drzemki wg wieku)`; noc w toku → fakt do `now`, koniec = preferowana pobudka (bez tego bilans o 2 w nocy pokazuje absurdalny minus).
- Los R6 („brak kotwicy") → stan nie istnieje w kotki_dwa (kaskada kotwicy z fallbackiem 7:00); requirements doc zaktualizowany 2026-07-10.
- „±X vs norma" gdy norma jest przedziałem → delta do najbliższej krawędzi, „w normie" wewnątrz przedziału.
- Jeden pas vs dwa pasy na osi → jeden pas (reguła fakty ≤ now < plan).
- Wpisy planu wykraczające poza dobę → oś: clip do końca doby; lista tekstowa: nie pokazuje wpisów „jutro"; prognoza: liczy tylko część w dniu.
- Gdzie żyje łańcuch → pakiet kotki (nie adapter web).
- Persystencja przełącznika → nowy mały store wg wzorca `useThemeStore` (świadomie osobny plik, nie rozszerzanie settings — duplication > complexity; identyczne subpathy zustand, zero ryzyka metro).

### Odroczone do implementacji

- Dokładne sygnatury/nazwy funkcji łańcucha w kotki (parametryzacja `forwardPass` vs nowa funkcja obok) — decyzja przy kodzie, oba warianty zgodne z planem.
- Dokładne copy UI (nota „przyjęto pobudkę 07:00", etykieta prognozy, legenda) — przy implementacji, po polsku, ton bez obwiniania.
- Ewentualna walidacja/defensywny clamp faktu z `end_at` w przyszłości (błędny backdate) — sprawdzić istniejącą walidację formularza przy implementacji IU4.
- Skeleton vs same fakty podczas ładowania rekomendacji — rozstrzygnąć przy implementacji IU5 (niski koszt, obecna karta zwraca `null`).
- Brak `docs/DESIGN.md` — buildery UI bazują na istniejących wzorcach i ux-ui-guidelines; utworzyć przed kolejnym dużym UI feature'em.

## Implementation Units

- [x] **Unit 1: Silnik kotki_dwa — re-kotwiczony łańcuch planu + sesja aktywna**

**Cel:** `remainingNapsToday` liczone łańcuchowo od realnej kotwicy (koniec ostatniego snu / przewidywany koniec sesji w toku), bedtime stały, warning przy kolizji; `nextSleepAt` = pierwszy wpis łańcucha.

**Wymagania:** R1, R6 (+fundament R2)

**Zależności:** Brak

**Pliki:**
- Modyfikuj: `packages/sleeper-machine/src/types.ts` (opcjonalne `State.activeSession`)
- Modyfikuj: `packages/sleeper-machine-kotki/src/recommender.ts`, `packages/sleeper-machine-kotki/src/forwardPass.ts` (lub nowy moduł łańcucha obok — decyzja przy kodzie)
- Test (unit): `packages/sleeper-machine-kotki/tests/recommender.test.ts`, `packages/sleeper-machine-kotki/tests/forwardPass.test.ts`

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Kaskada kotwicy łańcucha: (1) sesja w toku typu NAP → `max(now, start + długość drzemki wg bucketa)`; (2) sesja w toku typu NIGHT → plan całego dnia od `preferred_wake_time`/7:00 (jak cold start); (3) brak sesji w toku → istniejący `lastWakeMs` (koniec ostatniej drzemki dziś / morningWake).
- Indeks okna czuwania i długości drzemki = `napsDone.length` (sesja NAP w toku liczy się do wykonanych po jej przewidywanym końcu).
- `napsDone >= typicalNaps` → łańcuch pusty, zostaje tylko NIGHT z `preferredBedtime` (test na „drzemkę widmo").
- Clamp do `now` gdy wyliczony start w przeszłości; kolizja łańcucha z bedtime (start ostatniej drzemki + długość + WW > bedtime) → `warnings.push(...)`, bedtime bez zmian.
- Pure functions: `now` z `state.now`, zero `new Date()` z zegara (CLAUDE.md pakietu); walidacja `activeSession` na boundary (`validateInput`).
- Invariant w testach: `nextSleepAt?.getTime() === remainingNapsToday[0]?.plannedStart.getTime()` (gdy plan niepusty).

**Notatka wykonawcza:** Implementuj test-first na fixtures scenariuszowych (wzorzec `'Faza 4 Test: scenariusze PDF'` w `tests/recommender.test.ts`) — zachowanie łańcucha jest łatwe do wyspecyfikowania z góry.

**Wzorce do naśladowania:**
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — jawny `now`, helpery `dobForAge`/`hhmm`
- Precedens rozszerzania typu: `nextSleepShiftMinutes` w `packages/sleeper-machine/src/types.ts`

**Scenariusze testowe:**
- [Unit] Krótsza drzemka (30 min zamiast 90) → cały łańcuch przesunięty wcześniej; `nextSleepAt` == pierwszy wpis.
- [Unit] Dłuższa drzemka → łańcuch później; bedtime niezmienny; przy kolizji warning obecny.
- [Unit] Drzemka w toku, `now` < przewidywany koniec → kotwica = przewidywany koniec; `now` > przewidywany koniec (drzemka się przeciąga) → kotwica = `now`.
- [Unit] Noc w toku → plan od preferowanej pobudki; brak wpisów „nocnych" w łańcuchu drzemek.
- [Unit] `napsDone > typicalNaps` → tylko NIGHT (bez drzemki widmo).
- [Unit] Okno czuwania przekroczone (plan w przeszłości) → pierwszy wpis od `now` + warning „ryzyko przemęczenia".
- [Unit] Cold start bez historii i bez preferencji → plan od 7:00 (bez throw).
- [Unit] Galland z `State.activeSession` → ignoruje pole, wynik identyczny jak bez niego (non-breaking).

**Weryfikacja:**
- `pnpm --filter sleeper-machine test` i `pnpm --filter sleeper-machine-kotki test` — PASS
- `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build` — PASS (dist zaktualizowany)

---

- [x] **Unit 2: Web lib — prognoza bilansu dnia (`day-forecast`)**

**Cel:** Czysta funkcja licząca prognozę snu na koniec doby (fakty + plan) i klasyfikującą względem przedziału normy.

**Wymagania:** R5

**Zależności:** Brak (kontrakt wejścia: sesje app + `PlanEntry[]`; można budować równolegle z Unit 1)

**Pliki:**
- Stwórz: `packages/sleeper-web/src/lib/day-forecast.ts`
- Test (unit): `packages/sleeper-web/src/lib/__tests__/day-forecast.test.ts`

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Wejście: sesje (w tym aktywna z `end_at === null`), `PlanEntry[]`, `now`, `birthDate`. Wyjście: `{ actualMs, plannedMs, predictedTotalMs, norm, verdict: 'below' | 'within' | 'above', deltaMs }`.
- Fakty: clamp każdej sesji do `[startOfDayInAppTz(now), now]` (sesja w toku liczona `start_at → now`); plan: clamp do `(now, endOfDayInAppTz(now)]`; NIGHT bez `plannedEnd` → do końca doby. Zero podwójnego liczenia z konstrukcji.
- Delta do najbliższej krawędzi przedziału normy; wewnątrz przedziału `verdict: 'within'`, `deltaMs: 0`.
- Granice doby wyłącznie przez `lib/time.ts` (DST-safe — doba 23/25 h).

**Wzorce do naśladowania:**
- `packages/sleeper-web/src/lib/sleep-aggregation.ts` (`durationWithinWindow`, styl pure + header comment) i jego test `src/lib/__tests__/sleep-aggregation.test.ts`
- `packages/sleeper-web/src/lib/sleep-norms.ts` (`getNormForChild`)

**Scenariusze testowe:**
- [Unit] Poranny ogon nocy (22:00→6:30, cross-midnight) + 1 drzemka + plan 2 drzemek i nocy → suma tylko z części w dobie.
- [Unit] Sesja w toku (drzemka od 13:00, now 13:25) → 25 min w faktach, plan liczony od now.
- [Unit] Noc w toku o 2:00 → fakt 00:00→02:00 + plan do pobudki; verdict bez absurdalnego minusa.
- [Unit] Prognoza w przedziale normy → `within`, delta 0; poniżej min → `below` z deltą do min; powyżej max → `above` z deltą do max.
- [Unit] Dzień zmiany czasu (marzec/październik) → suma i pozycje liczone względem realnej długości doby.
- [Unit] Pusty dzień (cold start) → prognoza = sam plan.

**Weryfikacja:**
- `pnpm --filter sleeper-web test` — PASS (nowy plik testowy zielony)
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów

---

- [x] **Unit 3: Adapter + hook — sesja aktywna do silnika**

**Cel:** `useSleepRecommendation` przekazuje sesję w toku do silnika; rekomendacja (z re-kotwiczonym planem) płynie do istniejących konsumentów bez zmian ich API.

**Wymagania:** R1, R2, R6

**Zależności:** Unit 1 (nowe pole `State.activeSession` w dist)

**Pliki:**
- Modyfikuj: `packages/sleeper-web/src/features/recommendation/adapter.ts` (mapowanie sesji aktywnej: `toLibActiveSession` lub rozszerzenie zwrotki `toLibSessions` — decyzja przy kodzie)
- Modyfikuj: `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts`
- Test (unit): `packages/sleeper-web/src/features/recommendation/__tests__/adapter.test.ts`

**Delegate to:** feature-builder-data

**Skills in play:** supabase-dev-guidelines, security, sentry-integration

**Podejście:**
- Filtr `end_at === null` w `toLibSessions` zostaje (historia = tylko zakończone); sesja aktywna mapowana OSOBNO i podawana jako `state.activeSession`.
- `now` nadal nie wchodzi do queryKey (learned pattern); rekomendacja pozostaje `useMemo` z deps `[child, now, sessionsQuery.data]`.
- Sprawdzić konsumentów semantyki: `smartSessionType()` (`app/(app)/index.tsx:209`) i `ActiveWindowCard` — oczekiwana poprawa spójności, bez zmian kodu (potwierdzić typecheckiem i testami).

**Wzorce do naśladowania:**
- `adapter.ts` header („single boundary where conversion happens"), fail-safe parsowanie
- `__tests__/adapter.test.ts` — factory `baseSession(overrides)`

**Scenariusze testowe:**
- [Unit] Sesja z `end_at === null` → nieobecna w `history`, obecna jako `activeSession` z poprawnym typem NAP/NIGHT.
- [Unit] Brak sesji aktywnej → `activeSession` undefined.
- [Unit] Zły format czasu w profilu → pole pominięte bez throw (regresja istniejącego zachowania).

**Weryfikacja:**
- `pnpm --filter sleeper-web test` — PASS
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów

---

- [x] **Unit 4: Komponent osi 24h (geometria + prezentacja)**

**Cel:** Reużywalny, read-only komponent „rytm dnia": pas doby z blokami faktów (`≤ now`) i predykcji (`> now`), znacznikiem „teraz" i etykietami godzin; geometria w czystym module.

**Wymagania:** R3, R6

**Zależności:** Unit 2 (typy segmentów mogą współdzielić helpery), niezależny od Unit 3 (props-driven)

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/recommendation/day-timeline-segments.ts` (pure: sesje + plan + now → segmenty `{leftPct, widthPct, kind}`)
- Stwórz: `packages/sleeper-web/src/features/recommendation/components/DayTimeline.tsx`
- Test (unit): `packages/sleeper-web/src/features/recommendation/__tests__/day-timeline-segments.test.ts`
- Test (static-invariants): `packages/sleeper-web/src/features/recommendation/__tests__/day-timeline.invariants.test.ts`

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, figma:figma-use, figma:figma-implement-design (figma nieaktywne — `figma_spec: null`)

**Podejście:**
- Pozycja % = `(t − startOfDayInAppTz) / (endOfDayInAppTz − startOfDayInAppTz)` — nigdy `/1440` (DST). Clipping segmentów do `[startOfDay, endOfDay]`; fakty dodatkowo do `now` (defensywnie także `end_at` z przyszłości), predykcje od `now`; NIGHT bez `plannedEnd` → do końca doby.
- Komponent głupi (props: `sessions`, `plan`, `now`; bez hooków danych) — layout wg wzorca `SleepBarChart`: kontener `relative`, segmenty `absolute` z `left/width` w %, kolory klasami NativeWind (`bg-navy`/`bg-purple` fakty, kreskowany/półprzezroczysty wariant dla predykcji, `dark:` warianty), znacznik „teraz" jako osobna warstwa.
- Kolory imperatywne (jeśli potrzebne) tylko przez `useEffectiveTheme()`.
- Etykiety godzin sparse (0/6/12/18/24) + krótka legenda; a11y: `accessibilityLabel` z tekstowym podsumowaniem planu.

**Wzorce do naśladowania:**
- `packages/sleeper-web/src/features/stats/components/SleepBarChart.tsx` (warstwy absolute, skala, NativeWind dark)
- `src/app/(app)/__tests__/sleep-fullscreen.invariants.test.ts` (styl grep-asercji)

**Scenariusze testowe:**
- [Unit] Noc 22:00→6:30 → segment 0:00–6:30 (clip do doby); ta sama noc na osi „wczoraj" nie wycieka (tylko dzisiejsza część).
- [Unit] Sesja w toku od 13:00, now 13:25 → segment faktu kończy się dokładnie na pozycji `now`.
- [Unit] Plan z NIGHT bez `plannedEnd` → segment do 100%.
- [Unit] Wpis planu zaczynający się przed `now` (clamp z silnika) → nie nachodzi na fakty (start ≥ now).
- [Unit] Dzień DST (23 h/25 h) → segmenty sumują się do 100% względem realnej doby.
- [Static] Brak `setHours`/`new Date(y,m,d`/`86400000`/raw `useColorScheme` w nowych plikach; cleanup nie dotyczy (bez timerów — oś dostaje `now` propem).

**Weryfikacja:**
- `pnpm --filter sleeper-web test` — PASS
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów
- `pnpm --filter sleeper-web lint` — 0 błędów

---

- [x] **Unit 5: Integracja karty — przełącznik widoku, prognoza, changelog**

**Cel:** Karta rekomendacji z przełącznikiem lista ↔ oś (persystowany, default oś), prognozą bilansu w widoku osi i notą o domyślnej pobudce; wpis changelog + bump wersji (zmiana user-facing).

**Wymagania:** R3, R4, R5, R6

**Zależności:** Unit 1–4

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/recommendation/useRecommendationViewStore.ts`
- Modyfikuj: `packages/sleeper-web/src/features/recommendation/RecommendationCard.tsx` (jeśli zbliża się do 300 linii — wyodrębnij widoki do podkomponentów)
- Modyfikuj: `packages/sleeper-web/src/app/(app)/index.tsx` (przekazanie sesji/`now` do karty, jeśli potrzebne)
- Modyfikuj: `packages/sleeper-web/public/changelog.json`, `packages/sleeper-web/app.json`, `packages/sleeper-web/package.json` (wpis „co nowego" + spójny bump wersji — minor)
- Test (unit/static): `packages/sleeper-web/src/features/recommendation/__tests__/recommendation-card.invariants.test.ts`

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines, figma:figma-use, figma:figma-implement-design (figma nieaktywne — `figma_spec: null`)

**Podejście:**
- Store: kopia `useThemeStore` 1:1 (`name: 'recommendation-view'`, wartości `'timeline' | 'list'`, default `'timeline'`, synchroniczny localStorage na web); wyłącznie już zmapowane subpathy zustand.
- Przełącznik: istniejący `SegmentedControl` w nagłówku karty; widok listy = obecny render (bez zmian); widok osi = `DayTimeline` + linia prognozy (`day-forecast`) + warunkowa nota „przyjęto pobudkę 07:00" gdy kotwica = default.
- Stan ładowania: rozstrzygnąć skeleton vs same fakty (odroczone; obecna karta zwraca `null` przy braku rekomendacji).
- Changelog: wpis po polsku z perspektywy usera; wersja minor; sync trzech miejsc (pilnuje `version-sync.test.ts`). Hook `commit-msg` zablokuje commit `feat(web)` bez changelog — zmiana wchodzi w tym samym commicie.
- Build z `--clear` przy lokalnej walidacji wersji (Metro cache'uje `app.json` — pułapka z roadmapy).

**Wzorce do naśladowania:**
- `packages/sleeper-web/src/features/settings/useThemeStore.ts` (persist + web localStorage)
- Użycie `SegmentedControl` w `app/(app)/stats.tsx` (zakres 7/14/30)
- Format wpisów w `public/changelog.json` (istniejące wpisy)

**Scenariusze testowe:**
- [Unit] Store: default `'timeline'`, `setView('list')` → `'list'` (test na czystym storze).
- [Static] `RecommendationCard`/nowe pliki: brak inline `new Date()` w deps/queryKey, brak raw `useColorScheme`, store używany selektorem.
- [Manual] Safari + Chrome (PWA): przełącznik zmienia widok, wybór przeżywa reload; oś pokazuje fakty/plan/teraz spójnie z „Następny sen"; prognoza reaguje na START/STOP; drzemka w toku rośnie do „teraz" i plan się przesuwa; po deployu banner „co nowego" pokazuje wpis.
- [Manual] Noc: o 2:00 (trwający sen nocny) oś pokazuje ogon nocy od 00:00, bilans bez absurdalnego minusa.

**Weryfikacja:**
- `pnpm web:build:check` — PASS (tsc + lint + test + invariants + build, w tym `version-sync.test.ts`)
- Widok osi: `[ ]` scenariusze [Manual] powyżej — manual test (Safari/Chrome, patrz Operator checklist)

**Operator checklist:**
- [ ] Manual smoke na zainstalowanym PWA po deployu (przełącznik, oś, prognoza, banner „co nowego") — user na urządzeniu

## Wpływ systemowy

- **Graf interakcji:** zmiana semantyki `remainingNapsToday` dotyka: `RecommendationCard` (render planu), `smartSessionType()` na home (wybór typu sesji dla BigActionButton), `ActiveWindowCard` (badge „Drzemka za"). Wszystkie trzy chcą wersji spójnej z `nextSleepAt` — zweryfikować w IU3/IU5 testami i manualnie.
- **Propagacja błędów:** silnik rzuca na inwalidne wejście (walidacja boundary) — adapter pozostaje fail-safe (złe pole profilu → pominięte). `day-forecast` czysty, bez I/O.
- **Ryzyka cyklu życia stanu:** tick 30 s re-renderuje sekcję — geometria segmentów liczona w `useMemo`/pure module; bez nowych timerów i bez wpływu `now` na queryKey.
- **Parytet surface API:** `State.activeSession` opcjonalne — Galland (wciąż w dist jako fallback typu `algorithm`) ignoruje pole; zero zmian dla istniejących konsumentów typów.
- **Pokrycie integracyjne:** spójność `nextSleepAt` ↔ `remainingNapsToday[0]` (unit w kotki) + manualny scenariusz START/STOP na home (przeliczenie osi i prognozy).

## Ryzyka i zależności

- **Kolejność buildów pakietów** — typecheck web na starym `dist/` da mylące błędy; walidacja zawsze po buildzie obu machine packages.
- **Kolizja z hookiem changelog** — commity `feat(web)` w IU3–IU4 (niewidoczne dla usera) commitować jako `refactor(web)`/`chore(web)` albo z `[no-changelog]` zgodnie z regułą; właściwy `feat(web)` + changelog w IU5.
- **Device-tz w pakiecie kotki** — known limitation (zob. Granice scope'u); nie mieszać konwencji w nowym kodzie web.
- **Wzrost `RecommendationCard`** — limit 300 linii/plik; ekstrakcja podkomponentów zamiast komplikowania.

## Dokumentacja / Notatki operacyjne

- Wpis `docs/commits/` per commit (obowiązkowa procedura repo).
- Po zakończeniu: kandydat do `/dev-compound` (wzorzec „oś czasu jako View %" + „sesja aktywna w silniku rekomendacji").

## Źródła i referencje

- **Dokument źródłowy:** `docs/dev-brainstorms/2026-07-10-plan-dnia-os-24h-requirements.md`
- Ideacja: `docs/ideation/2026-07-09-5-kluczowych-featurow-ideation.md` (pomysł #3)
- Wizualizacja wariantów: artefakt „Sleeper — oś 24h: 3 warianty umiejscowienia" (wybrany A + przełącznik)
- Kod: `packages/sleeper-machine-kotki/src/recommender.ts`, `packages/sleeper-web/src/features/recommendation/`, `packages/sleeper-web/src/lib/{sleep-aggregation,sleep-norms,time}.ts`, `packages/sleeper-web/src/features/stats/components/SleepBarChart.tsx`, `packages/sleeper-web/src/features/settings/useThemeStore.ts`
