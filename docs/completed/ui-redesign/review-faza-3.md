# Code Review — Faza 3 (Dzisiaj redesign)

**Commit:** `2220c5d feat(ui-redesign): faza 3 — dzisiaj redesign`
**Branch:** `feature/ui-redesign`
**Data:** 2026-05-28
**Reviewer:** dev-docs-review pipeline (5 agentów + konsolidacja)
**Severity gate:** ✅ **CZYSTE** (0 P1, 0 P2, 5 P3)

---

## Statystyki

- **Plików sprawdzonych:** 9
  - Nowe: `HomeHeader.tsx`, `useNotificationDot.ts` (2)
  - Restyle: `ActiveWindowCard.tsx`, `TodayStatsCard.tsx`, `BigActionButton.tsx`, `QuickActions.tsx` (4)
  - Updated entry: `index.tsx` (1)
  - Pominięty zgodnie z planem: `SessionListItem.tsx` (rewrite w Fazie 4)
- 🔴 P1 [blocking]: **0**
- 🟠 P2 [important]: **0**
- 🟡 P3 [nit]: **5**
- 🌐 E2E: **n/a** (mobile manual — Agent 5 wygenerował checklist)

---

## Zakres fazy (cross-reference z planem)

**Plan zadań — checkboxy fazy 3 wszystkie `[x]`:**
- ✅ HomeHeader (Avatar + greeting per godzina + ChevronDown visual + Bell IconButton z dot)
- ✅ ActiveWindowCard (bg-orange-soft, kropka+label, timer text-6xl tabular, ProgressBar tinted orange, footer Pobudka o + Badge "Drzemka za")
- ✅ TodayStatsCard (label DZISIAJ, wartość Xg Ym + ProgressRing %, "z 13g zalecanych", ProgressBarStacked purple/orange/success, 3 mini-stat)
- ✅ BigActionButton (Moon ikona dla start+night_sleep, default sessionType='nap')
- ✅ QuickActions (3 białe karty z chipami Sun orange-soft / Moon purple-soft / Plus cream)
- ✅ index.tsx (HomeHeader na górze, "Pokaż wszystkie" jako Pressable z router.push('/history'))
- ✅ useNotificationDot mock=true
- ✅ SessionListItem nietknięty (świadoma decyzja, plan eksplicytnie pozwala — rewrite w Fazie 4)
- ✅ Walidacja: `npx tsc --noEmit` PASS, `npm run lint` PASS (re-run podczas review)

**Odchyleń od planu: BRAK.** Wszystkie scope-item zaadresowane; decyzje fazy odnotowane w `ui-redesign-kontekst.md` § Faza 3.

---

## Agent 1 — Security Review

**Findings: 0**

Faza UI-only. Brak zmian w:
- Auth flow / sesji / tokenach (`AuthProvider` nietknięty)
- RLS policies / Supabase migracjach (zero plików migracji)
- Walidacji inputów (brak nowych formularzy / mutacji)
- Routingu chronionych ścieżek (`(app)` group bez zmian)
- API key exposure (brak nowych env vars, brak nowych endpointów)

`router.push('/history')` w `index.tsx:220` — wewnętrzna nawigacja expo-router, nie deep link, brak source niezaufanego. **Bezpieczne.**

`useNotificationDot()` — czysta funkcja `() => true`, nie czyta storage, nie wysyła requestów. **Bezpieczne.**

Brak nowych dependency. `lucide-react-native` z Fazy 0 już zaakceptowany.

---

## Agent 2 — Performance Review

**Findings: 0 (samowystarczalne micro-perf trade-offs udokumentowane jako P3 below)**

**Analiza:**

- **Re-render scope HomeHeader:** komponent re-renderuje na zmianę `effectiveTheme` (rzadko, tylko manual toggle) i `dotVisible` (mock-stała). Avatar i IconButton stabilne. `referenceNow = now ?? new Date()` tworzy `new Date()` na każdym renderze, ale używane TYLKO do `.getHours()` — zero kosztu zauważalnego, zgodne z patternem "derived state" projektu.
- **ActiveWindowCard tick:** `setInterval(MINUTE_MS)` (60 000 ms) zamiast sekund — świadomy trade-off (timer okna aktywności nie wymaga sekund). Cleanup w `useEffect` poprawny. Brak race / leak.
- **TodayStatsCard.computeAggregates:** O(n) po sesjach z sort `n log n`. Dla MVP n < 20 sesji/dzień — pomijalne. `useMemo` BRAK — funkcja jest pure, ale wywoływana bezpośrednio w renderze. Dla aktualnej skali (<20 sesji × tick co 30s) koszt CPU<1ms; memoization nie warta dodatkowej złożoności. (zgodne z `kontekst:128`).
- **ProgressRing SVG:** świeży obiekt circumference/dashOffset per render, ale tylko 2 `<Circle>` — render budget pomijalny.
- **QuickActions:** `ActionCard` × 3, każda Pressable. Brak `React.memo` (3 instancje, props zmieniają się rzadko — niewart kosztu mental).
- **Bundle size:** zero nowych dependency. `lucide-react-native` named imports tree-shake (Bell, ChevronDown, Moon, Plus, Sun — 5 ikon × ~600B SVG = ~3KB do bundle'a — ✓ w budżecie z planu Fazy 0).

**N+1 / leak / cleanup:** wszystkie `useEffect` z `setInterval` mają `clearInterval` w cleanup. Zgodne z §13.

---

## Agent 3 — Architecture & Code Quality

**Findings: 5 × 🟡 P3 (wszystkie kosmetyczne / spójność z fazami 0-2)**

### Pozytywne

- **SOLID — Single Responsibility:** każdy komponent ma jedno zadanie (HomeHeader = header, ActiveWindowCard = okno aktywności). Brak `god component`.
- **Prop interfaces:** explicit, dobrze udokumentowane. Opcjonalne props z defaultami (`recommendedHours=13`, `sessionType='nap'`, `targetWindowMinutes=105`) — sensowne, zachowują backward-compat.
- **Reuse primitives:** `Avatar`, `Card-style` (przez className), `Badge`, `IconButton`, `ProgressBar`, `ProgressBarStacked`, `ProgressRing` wszystkie z Fazy 0. Zero duplikacji logiki primitive.
- **Type safety:** zero `any`, zero `!` non-null. `SessionType` import z `@/features/sessions/hooks` (single source of truth). `LucideIcon` typ stosowany konsekwentnie.
- **Naming:** `greetingForHour`, `useNotificationDot`, `MiniStat`, `ActionCard` — wszystkie spełniają 5-sekundową regułę nazewnictwa.
- **Import organization:** `lucide-react-native` ➜ `react-native` ➜ `@/...` aliasy. Sortowane alfabetycznie. ✓ §3.
- **`computeAggregates()` zachowany 1:1** — TodayStatsCard restyle, nie rewrite. Zgodne z planem.

### Findingi

#### 🟡 P3-nit-1: HEX literals duplikacja przekroczyła próg "3+ duplikacji"

**Pliki:**
- `HomeHeader.tsx:37,39` — `#F5F0E8`, `#1E1B4B`
- `BigActionButton.tsx:51,54` — `#F5F0E8`
- `IconButton.tsx:41` (Faza 0) — `#1E1B4B` jako default `iconColor`
- `(app)/_layout.tsx:15,16` (Faza 2) — `#1E1B4B`, `#F5F0E8`
- `QuickActions.tsx:25,33,41` — `#E08B6F`, `#7C6BAD`, `#6B6580`
- `ProgressRing.tsx:36-37` (Faza 0) — `#E8DEF7`, `#7C6BAD`
- `Switch.tsx` (Faza 0) — paleta

**Status:** Faza 0 review odnotował: "wyciągnąć do `src/lib/colors.ts` przy 3+ duplikacjach". Po Fazie 3 mamy **9+ wystąpień** tych samych 4 HEX-ów (`navy #1E1B4B`, `cream #F5F0E8`, `purple #7C6BAD`, `text-muted #6B6580`).

**Rekomendacja:** **Faza 6 polish** — wyciągnąć do `src/lib/colors.ts` jako `PALETTE = { navy, cream, purple, ... } as const`. Pojedynczy refactor < 20 LOC. NIE blokuje Fazy 4.

#### 🟡 P3-nit-2: `MS_PER_DAY` aliased lokalnie jako `dayMs`

**Plik:** `TodayStatsCard.tsx:122`

```ts
const dayMs = MS_PER_DAY;
const segments = [
  { value: agg.nightSleepMs / dayMs, ... },
  ...
];
```

`dayMs` to local re-alias stałej modułowej — niepotrzebny. Można użyć `MS_PER_DAY` bezpośrednio w `segments`.

**Rekomendacja:** kosmetyczne, usuń przy najbliższej edycji pliku. Nie wymaga oddzielnego commita.

#### 🟡 P3-nit-3: `ActiveWindowCard` `dark:text-navy` na timerze — duplikacja klasy

**Plik:** `ActiveWindowCard.tsx:50,59`

```tsx
className="mt-3 font-display text-6xl font-semibold text-navy dark:text-navy"
```

`dark:text-navy` === `text-navy` (sama klasa = brak override). Świadomy zabieg, bo tło karty `bg-orange-soft` NIE ma dark-mode variantu — w dark mode karta zostaje pomarańczowa, więc navy text jest celowo zachowany. To **decyzja designerska**, nie bug, ale klasa redundantna.

**Rekomendacja:** usunąć `dark:text-navy` (Tailwind cascade już to zapewni) **LUB** dodać `dark:bg-orange-soft` explicite (jeśli istniał plan zmiany tła w dark mode — patrz P3-nit-4). Faza 6 polish / przy decyzji w Fazie 6.

#### 🟡 P3-nit-4: `ActiveWindowCard` bez dark mode variant tła

**Plik:** `ActiveWindowCard.tsx:38`

```tsx
<View className="rounded-card bg-orange-soft p-5">
```

Brak `dark:bg-*`. Tło `#FBE8DD` (bardzo jasne pomarańczowe) renderuje się tak samo w light i dark mode. Zgodne z aktualnym designem (`design.md` screen #1 — karta okno aktywności jako "soft orange"), ale to **świadoma decyzja vs niedopatrzenie?**

Pattern w innych kartach: `TodayStatsCard:130` = `bg-white dark:bg-dark-card`, `QuickActions:76` = `bg-white dark:bg-dark-card`. ActiveWindowCard jest **wyjątkiem**.

**Rekomendacja:** Manual test w Fazie 7 (dark mode parity scenariusz) sprawdzi czy ta karta wizualnie OK obok pozostałych w dark mode. Jeśli wygląda obco — dodać `dark:bg-orange/20` lub podobny soft variant. **NIE blokuje Fazy 4.** Zaadresowane w manual-test-faza-3 (Scenariusz S2: Dark mode parity).

#### 🟡 P3-nit-5: Brak explicit return types na komponentach Fazy 3

**Pliki:** `HomeHeader.tsx`, `useNotificationDot.ts` (ma `: boolean`!), `MiniStat`, `ActionCard`.

Spójne z odchyłką formalną §10 odnotowaną w Fazie 0/1/2 P3 (komponenty React mają inferred return type — konwencja Expo/React, akceptowalne). **Batch-fix w Fazie 6.** `useNotificationDot` ma explicit `: boolean` — wzorzec do naśladowania w pure helperach.

---

## Agent 4 — Scenario Exploration & Test Coverage

**Findings: 0 P1/P2, 0 nowych P3 (poza note dla manual-test).**

### Happy path

- ✅ `activeChild` istnieje → `HomeHeader` renderuje z avatarem, greeting per godzina, Bell z dot
- ✅ Brak aktywnej sesji → `ActiveWindowCard` z licznikiem od `lastSleepEndAt`
- ✅ Aktywna sesja → `SleepInProgressCard` zamiast ActiveWindow (no change w tym aspekcie)
- ✅ TodayStatsCard z agregatami nightSleep + naps + longest awake
- ✅ BigActionButton mode='start'+'nap' (default), Moon ukryty
- ✅ QuickActions z 3 akcjami, disabled podczas pending lub gdy active session

### Boundary conditions

- ✅ `activeChild === null` (brak rodziny / brak dziecka) → fallback do legacy heading "Dzisiaj" + email (`index.tsx:74-81`). HomeHeader NIE crashuje przez `child.name` — guarded przez warunek.
- ✅ `lastSleepEndAt === null` → ActiveWindowCard pokazuje "Nowy dzień" + "Brak sesji w historii"
- ✅ Pusta lista sesji `todaySessions === []` → sekcja "Sesje dzisiaj" NIE renderuje (warunek `length > 0`)
- ✅ `recommendedHours = 0` → `recommendedMs = 0`, ringProgress = 0 (NIE NaN, sprawdzone `recommendedMs > 0 ? ... : 0`)
- ✅ Greeting na granicach: 4:59 → "Dobranoc", 5:00 → "Dzień dobry", 11:59 → "Dzień dobry", 12:00 → "Dobre popołudnie", 17:59 → "Dobre popołudnie", 18:00 → "Dobry wieczór", 22:59 → "Dobry wieczór", 23:00 → "Dobranoc". **Spójne z planem.**
- ✅ Greeting używa `getHours()` w device tz — **świadomy trade-off** udokumentowany w komentarzu (`HomeHeader.tsx:17-20`), zgodny z `learned-patterns.md` (uwaga: dla MVP single-PL user OK; przy ekspansji wyciągnąć do `lib/time.ts`).

### Concurrent / race

- ✅ Tick interval w `ActiveChildSection` (30s) + tick interval w `ActiveWindowCard` (60s) — niezależne, brak race
- ✅ Cleanup `clearInterval` w obu — brak leak
- ✅ `useStartSession`/`useEndSession` optimistic updates istniały przed fazą — niezmienione

### Scale

- ✅ TodayStatsCard `sort` w `computeAggregates` — dla MVP n < 30 sesji/dzień, no concern
- ✅ ScrollView nie używa FlatList — `todaySessions.slice(0, 5)` ogranicza render do 5 SessionListItem (faza 4 zmieni na FlatList? — out of scope)

### Test coverage

**Plan techniczny:** projekt SDK 54 / Expo MVP — **brak Jest setupu** (zgodnie z `CLAUDE.md` § Walidacja: "testy: brak setupu (Vitest/Jest dojdzie kiedy będzie potrzebny)"). Faza 3 NIE wprowadza unit testów ani nie definiuje plików testowych w planie. **Zero brakujących testów względem planu.**

**Pure functions / test-future kandydaci** (do testów gdy Jest dojdzie):
- `greetingForHour(hour)` — 8 boundary cases (4:59, 5:00, 11:59, 12:00, 17:59, 18:00, 22:59, 23:00) ➜ idealne dla TDD
- `computeAggregates(sessions, activeSession, now, startOfDay)` — pure, deterministic, ma edge cases (active session already in array, DST boundary, longest awake tail)

---

## Agent 5 — Mobile Manual Test Checklist Generator

**Status:** ✅ **checklist_generated**

Niezaznaczone checkboxy `Weryfikacja:` z fazy 3 dotyczące mobile UI / device:
- `Porównanie wizualne ze screenem #1` → ✅ checklist_generated (Scenariusz S1)
- `Dark mode parity` → ✅ checklist_generated (Scenariusz S2)
- `Test on-device iOS + Android` → ✅ checklist_generated (Scenariusz S3)

CLI checkboxy (`tsc --noEmit + lint`) i commit/log już oznaczone `[x]` — pominięte w manual.

**Wygenerowany plik:** `docs/active/ui-redesign/manual-test-faza-3.md` (6 scenariuszy: avatar+greeting, ActiveWindowCard, TodayStatsCard, BigActionButton+QuickActions, "Pokaż wszystkie" link, dark mode parity + iOS/Android).

---

## Konsolidacja: Severity gate decision

**Decyzja: ✅ GOTOWE DO KONTYNUACJI** — 0 P1, 0 P2, 5 P3 (wszystkie kosmetyczne / batch-fix Faza 6).

**Uzasadnienie:**
- Zero security findings — UI-only restyle, brak data flow modifications
- Zero performance findings — micro-trade-offs udokumentowane i akceptowalne dla MVP
- Architecture: SOLID respected, primitives reused, zero duplikacji logiki
- Type safety: 0 `any`, 0 non-null `!`
- Scenariusze edge'owe pokryte przez kod (null guards, default props, clamp01)
- Wszystkie nity P3 są spójne z poprzednimi fazami i zaadresowane jako batch-fix w Fazie 6 polish

**Kontynuuj do:** Faza 4 — Historia redesign. Manual testing Fazy 3 może lecieć równolegle z implementacją Fazy 4 (file scope rozłączny: `index.tsx` vs `history.tsx`).

---

## Bookkeeping checkboxów `Weryfikacja:`

- Odznaczone automatycznie (CLI/grep): **0** (CLI checkboxy już były `[x]` z executora)
- Odznaczone na podstawie Agent 5 manual checklist: **0** (manual = pozostają `[ ]` z suffixem)
- Pozostawione dla operatora (Manual mobile): **3**
- Niejasne (P3): **0**
- Failujące (P2): **0**

### Szczegóły

- [ ] **Manual mobile:** `Porównanie wizualne ze screenem #1 (delta acceptable: kerning fontów)` — manual test (patrz manual-test-faza-3.md, Scenariusz S1)
- [ ] **Manual mobile:** `Dark mode parity` — manual test (patrz manual-test-faza-3.md, Scenariusz S2)
- [ ] **Manual mobile:** `Test on-device iOS + Android` — manual test (patrz manual-test-faza-3.md, Scenariusz S3)

### Re-walidacja typecheck/lint (re-run w trakcie review)

- [x] `npx tsc --noEmit` w `sleeper-app/` — PASS (0 błędów, exit 0)
- [x] `npm run lint` w `sleeper-app/` — PASS (0 błędów, exit 0)
