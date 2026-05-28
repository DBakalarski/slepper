# Code Review — Faza 5 (Profil redesign)

**Data:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Commit:** `e798dea`
**Reviewer:** dev-docs-review (5 agentów: security / performance / architecture / scenarios / mobile-feature-tester)

---

## Severity gate: ✅ CZYSTE (0 P1, 0 P2, 5 P3)

**Decyzja: GOTOWE DO KONTYNUACJI** — wszystkie 5 findingów to nity / heads-up / design-question do rozważenia w Fazie 6 polish. Faza 5 nie blokuje przejścia do Fazy 6.

### Liczniki
- 🔴 [P1-blocking]: **0**
- 🟠 [P2-important]: **0**
- 🟡 [P3-nit]: **5**

### Typy
- **KOD:** 5 (wszystkie znaleziska dotyczą kodu/UI)
- **TEST:** 0 (brak Jest setupu — kandydaci na unit-testy nadal w backlogu)
- **MANUAL:** mobile-feature-tester wygenerował checklistę — `manual-test-faza-5.md` (5 scenariuszy, non-blocking)

---

## Sprawdzone pliki (8)

| Plik | Status |
|---|---|
| `sleeper-app/src/lib/child-age.ts` | ✅ TZ-safe, polskie liczebniki poprawne |
| `sleeper-app/src/lib/sleep-stats.ts` | ✅ TZ-safe, brak N+1 (1 query) |
| `sleeper-app/src/features/settings/ThemeModeBottomSheet.tsx` | ✅ stop-propagation poprawny, backdrop a11y OK |
| `sleeper-app/src/app/(app)/settings.tsx` | ✅ sign out aktywny, back navigation OK |
| `sleeper-app/src/app/(app)/profile.tsx` | ✅ rewrite zgodny z design.md |
| `sleeper-app/src/app/(app)/_layout.tsx` | ✅ `Tabs.Screen settings href:null` |
| `sleeper-app/src/components/ui/Avatar.tsx` | ✅ `ringClassName` prop reused |
| `sleeper-app/tailwind.config.js` | ✅ wykorzystane istniejące tokeny |

**Walidacja CLI:**
- `npx tsc --noEmit` → **PASS** (0 błędów)
- `npm run lint` → **PASS** (0 błędów)

---

## Szczegółowe findingi

### 🟡 P3-1 [design-question] — `useAvgSleep7d` daysCovered ≠ RANGE_DAYS

**Plik:** `sleeper-app/src/lib/sleep-stats.ts:91-99`

`daysCovered = min(RANGE_DAYS, dailyTotals.size)` = liczba dni z faktycznymi sesjami (nie liczba dni okna). `avgMs = sumMs / daysCovered`, czyli **średnia po dniach aktywnych**, nie po wszystkich 7 dniach okna.

**Implikacja:** Rodzic, który trackował 3 z 7 dni, zobaczy średnią ze swoich 3 trackowanych dni (zawyżoną względem rzeczywistego średniego snu w tygodniu). Procent normy odnosi się tylko do dni aktywnych. UI honestyfikuje to przez label "ostatnie N dni" (adaptywne N), ale design.md mówi **"ostatnie 7 dni · Y% normy"**.

**Klasyfikacja:** P3 [ambiguous-but-justified] — implementacja jest świadoma (label dostosowuje się), ale można argumentować za "average per calendar day in window" (dzieląc przez `RANGE_DAYS=7` zamiast `daysCovered`).

**Akcja:** decyzja produktowa — czy `avgMs = sumMs / 7` (zerowe dni wliczane jako 0h, motywuje codzienny tracking) czy obecne `sumMs / daysCovered` (uczciwe wobec sparse trackera). Rozważyć w Fazie 6 polish lub po manual teście S3.

**Decyzja klasyfikacji per instrukcji:** **P3** (ambiguous-but-justified, NIE P1). Label "ostatnie N dni" jest uczciwy, więc to nie blocker.

---

### 🟡 P3-2 [a11y-nit] — Inner Pressable w bottom sheet stop-propagation

**Plik:** `sleeper-app/src/features/settings/ThemeModeBottomSheet.tsx:61`

`<Pressable onPress={() => {}}>` jako stop-propagation dla backdrop. Działa w RN, ale VoiceOver/TalkBack może zaanonsować całą zawartość sheeta jako "przycisk" (focus accidentally trapped on container).

**Akcja:** dodać `accessible={false}` do inner Pressable lub zamienić na `<View pointerEvents="box-only">` z handler-ami na konkretnych opcjach. Niska szkodliwość — manual test S4 (VoiceOver) zweryfikuje czy realny problem.

---

### 🟡 P3-3 [nit] — HEX literals w `ThemeModeBottomSheet` + `profile.tsx`

**Pliki:** `ThemeModeBottomSheet.tsx:44-46`, `profile.tsx:56,80,99,108`

Dodatkowe wystąpienia `#F5F0E8`/`#1E1B4B`/`#B8A8D9`/`#6B6580`/`#E08B6F`/`#7C6BAD` — łącznie >12 wystąpień przez fazy 0-5. Spójne z heads-up z Faza 3 P3-1 ("HEX literals przekroczyły próg 3+ duplikacji"). Batch-fix w Fazie 6: wyciągnąć do `src/lib/colors.ts` (`PALETTE = { navy, cream, ... } as const`).

---

### 🟡 P3-4 [nit] — `ShortcutRow` mutuje `useEffectiveTheme()` per row

**Plik:** `sleeper-app/src/app/(app)/profile.tsx:232`

`useEffectiveTheme()` wywołane wewnątrz `ShortcutRow` (2 instancje) → 2 dodatkowe subskrypcje useColorScheme + useThemeStore. Koszt znikomy (komponent renderuje się 1× per ekran), ale pattern niespójny — `gearIconColor` w rodzicu liczone raz i przekazane jako prop. Akcja: przekazać `chevronColor` jako prop z rodzica (analogia do `gearIconColor`). Faza 6 batch.

---

### 🟡 P3-5 [nit] — `formatChildAge` parsuje datę przez `new Date(string)`

**Plik:** `sleeper-app/src/lib/child-age.ts:31-35`

`new Date('2024-08-12')` parsuje jako UTC midnight, ale dla zdarzeń "data urodzenia" intencja to data lokalna (Warsaw). W praktyce różnica = max 2h dla user w PL (DST), więc data wieku (`days`) jest poprawna, ale w skrajnych godzinach rendering mógłby pokazać "11 sie" zamiast "12 sie" gdyby user był w innym TZ. Wzorzec spójny z `learned-patterns.md` (`toZonedTime` na renderingu), ale parsowanie `birthDate` jako "lokalna data" mogłoby użyć `parseAppTzDateTime`. Niska szkodliwość (MVP single-tz). Faza 6 jeśli rozszerzenie geograficzne.

---

## Szczegółowe odpowiedzi na pytania kontekstu

### 1. Czy sign out działa po przeniesieniu do `settings.tsx`?

**TAK, w pełni zachowany.** `supabase.auth.signOut()` wywoływane z `handleSignOut` (linia 30). `AuthProvider` subskrybuje `supabase.auth.onAuthStateChange` (`AuthProvider.tsx:40`), które po sign out emituje event → `setStatus('signed_out')` → `(app)/_layout.tsx:71-73` rendera `<Redirect href="/sign-in" />`. Pojedynczy entry point (nie zduplikowane w `profile.tsx`) — KISS. **0 zmian w mechanice sign out, tylko przeniesienie miejsca w UI.**

### 2. Czy `useAvgSleep7d` TZ-safe?

**TAK.** Używa `dayKeyInAppTz`, `startOfDayInAppTz`, `endOfDayInAppTz` z `lib/time.ts` (wszystkie idą przez `toZonedTime`/`fromZonedTime` w `APP_TIMEZONE='Europe/Warsaw'`). `addDays` z `date-fns` (calendar-aware) opakowane w `startOfDayInAppTz` → DST-safe. Zgodne z `learned-patterns.md` TZ-safe time pattern.

### 3. Czy `formatChildAge` poprawnie obsługuje polskie liczebniki?

**TAK** — przetestowane manualnie reguły:
- `1 miesiac` ✓, `2 miesiace` ✓, `5 miesiecy` ✓, `12 miesiecy` ✓, `22 miesiace` ✓, `25 miesiecy` ✓
- `1 rok` ✓, `2 lata` ✓, `5 lat` ✓, `12 lat` ✓, `22 lata` ✓
- `1 tydzien` ✓, `2 tygodnie` ✓, `5 tygodni` ✓, `12 tygodni` ✓
- Edge: 11/13/14 → `miesiecy`/`lat`/`tygodni` (zasada "lastTwo 12-14") ✓

### 4. Czy `bg-purple-light` ma kontrast WCAG AA?

**Navy text (#1E1B4B) na purple-light (#B8A8D9) ≈ 7.0:1** → przekracza próg 4.5:1 dla normalnego tekstu **PASS AA**. `navy/70` (text-2xl wiek) → przy 70% opacity efektywnie ~5.0:1 — wciąż przechodzi (large text próg 3.0:1). Zagnieżdżona biała karta `bg-white` daje 2 nakładające się tła (purple-light → white) — separation wizualna OK. **Dark mode `dark:bg-dark-surface` z text-cream — manual S4 verify.**

### 5. Czy `ThemeModeBottomSheet` backdrop-press zamyka modal?

**TAK** — `<Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">` na zewnątrz sheeta. Wewnętrzny `<Pressable onPress={() => {}}>` blokuje propagację. **A11y nit (P3-2):** inner Pressable może być widoczny dla VoiceOver — manual S4 (VoiceOver/TalkBack tap-backdrop scenario) zweryfikuje.

### 6. Czy `(app)/settings.tsx` reachable z back navigation?

**TAK** dla flow Profile → /settings (jest history). `router.back()` (linia 42 settings.tsx) bezpieczny. Pattern z `sleep-fullscreen` / `session/[id]` (Tabs.Screen `href:null`). **iOS swipe-back na Tabs z `href:null`** — manual test on-device potrzebny (S5). Manual checklist obejmuje.

### 7. Czy `useAvgSleep7d` NIE powoduje N+1?

**NIE.** `useSessions(childId, rangeStart, rangeEnd)` to **jeden Supabase SELECT** z filtrem `start_at < rangeEnd AND (end_at is null OR end_at >= rangeStart)` (`hooks.ts:71-83`). Cała agregacja `aggregateByDayInAppTz` (split cross-midnight, sumowanie per dzień) odbywa się client-side z pełnej listy sesji już pobranej. `useMemo([todayKey])` stabilizuje queryKey w obrębie doby → brak refetch petli. **1 query na 7 dni, nie 7.** ✅

---

## Ocena 3 odchyleń (per request kontekst)

### A. Switch vs tri-state bottom sheet
**Decyzja Fazy 0 wykonana.** Tri-state (System/Light/Dark) implementowany przez RN Modal+slide, KISS, **bez nowych zależności** (`@gorhom/bottom-sheet` byłby narzutem). Cross-platform: Modal działa na iOS+Android. **OK — żaden P-finding.**

### B. `useAvgSleep7d` range 7 dni WSTECZ BEZ dzisiaj
**Wykonano per kontekst.** `rangeEnd = todayStart` (exclusive), `rangeStart = todayStart - 7d`. Dzisiaj wykluczony bo "niepełny dzień" (sesja w toku obciążona naturalnie zaniżonym czasem aktywnym, nocna sesja jeszcze niezakończona). Trade-off: label design.md "ostatnie 7 dni" vs implementacja "N dni wstecz BEZ dzisiaj". **Klasyfikacja P3 [ambiguous-but-justified]** — label "ostatnie N dni" w UI dostosowuje N do daysCovered, więc user nie jest wprowadzony w błąd (`P3-1` powyżej).

### C. `computeAggregates` non-reuse
`computeAggregates` (z Fazy 3 `TodayStatsCard`) liczy agregat dla **pojedynczego dnia z podziałem typ-sesji (nap/night/activity)**. `useAvgSleep7d` liczy **sumę snu (nap+night) per dzień × 7 + średnia**. Inny output, inna granularność — **reuse niemożliwy bez refaktoru contractu `computeAggregates`** (musiałby zwracać `Map<dayKey, ...>` zamiast pojedynczego rekordu). Zasada §3 coding-rules "abstrakcja od 2+ użyć" — póki tylko 2 call-sitey z różnymi shapeami, duplication > complexity. **OK — żaden P-finding.** Heads-up dla Fazy 6: jeśli pojawi się trzeci agregator (np. stats screen), wynieść `aggregateByDayInAppTz` do `lib/sleep-aggregation.ts` jako wspólny helper.

---

## Agenci review — podsumowanie

| Agent | Wynik |
|---|---|
| **1. Security** | ✅ Brak P1/P2. Sign out flow zachowany, brak data exposure, RLS niezmieniony |
| **2. Performance** | ✅ Brak P1/P2. 1 query na 7 dni (NIE N+1), `useMemo` zapobiega refetch loop, brak useEffect cleanup needed (hook bez side-effects) |
| **3. Architecture** | ✅ Brak P1/P2. SOLID OK, single-responsibility OK, type safety OK (0 any, 0 `!`), import organization OK. 5 P3 nity |
| **4. Scenarios** | ✅ Edge cases obsłużone: brak rodziny → `NoActiveChildCard`, daysCovered=0 → "Brak danych z ostatnich 7 dni", maxHours<=0 guard w `avgSleepProgressRatio`, sesja end<=start guarded. Boundary `daysCovered` semantic flagged jako P3-1 |
| **5. Mobile Manual** | ✅ checklist_generated → `manual-test-faza-5.md` (5 scenariuszy on-device) |

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI/grep): **2**
- Pozostawione dla operatora (Manual mobile): **5**
- Niejasne (P3): **0**
- Failujące (P2): **0**

### Szczegóły

**CLI (auto-checked):**
- [x] `npx tsc --noEmit` w `sleeper-app/` → PASS
- [x] `npm run lint` w `sleeper-app/` → PASS

**Manual mobile (pozostają `[ ]` z suffixem):**
- [ ] Norma snu poprawnie wyliczona dla różnych wieków → manual test (patrz `manual-test-faza-5.md` S1)
- [ ] Srednia 7d zgodna z `useSessions` → manual test (S2)
- [ ] Toggle Tryb ciemny zmienia całą apkę natychmiast → manual test (S3)
- [ ] Persist między restartami → manual test (S3)
- [ ] Dark mode parity → manual test (S4)

---

## Rekomendacja

**Kontynuować do Fazy 6 (Polish + a11y).** Wszystkie 5 P3 findingów to batch-fix kandydaci w Fazie 6:
1. P3-1: decyzja produktowa daysCovered semantic — wymaga decyzji user (rozważyć podczas manual S2).
2. P3-2: a11y nit ThemeModeBottomSheet inner Pressable.
3. P3-3: HEX literals → `src/lib/colors.ts` (skumulowane przez fazy 0-5).
4. P3-4: ShortcutRow `useEffectiveTheme()` → prop drilling.
5. P3-5: `new Date(birthDate)` → `parseAppTzDateTime` (jeśli rozszerzenie geograficzne).

Sign out flow potwierdzony jako działający (single entry point z `settings.tsx`, `onAuthStateChange` → Redirect).
