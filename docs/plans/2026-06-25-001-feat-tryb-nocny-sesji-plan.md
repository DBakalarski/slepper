---
title: "feat: Tryb nocny ekranu sesji (true-black + auto-dim + hold-tap + wolny tick)"
type: feat
status: active
date: 2026-06-25
origin: docs/dev-brainstorms/2026-06-25-tryb-nocny-sesji-requirements.md
design_md: null          # docs/DESIGN.md nie istnieje — patrz "Odroczone do implementacji"
figma_spec: null         # brak mockupów; design z głowy w oparciu o istniejące tokeny
figma_screens: {}
---

# feat: Tryb nocny ekranu sesji

## Przegląd

Faza 7 roadmapy ("Tryb nocny / obsługa jedną ręką", user: "faza z dark mode"). Czyni
ekran aktywnej sesji (`sleep-fullscreen.tsx`) bezpiecznym do użycia w nocy w ciemnym
pokoju: true-black tło (AMOLED), automatyczne przyciemnienie po bezczynności, ochronę
przed przypadkowym zakończeniem sesji (hold-tap) oraz oszczędność baterii (wolniejszy
tick timera w tle). Zero zmian w warstwie danych — całość to client-side UI/timing.

## Ujęcie problemu

Rodzic sprawdza telefon w nocy obok śpiącego dziecka. Obecny ekran sesji ma tło
`bg-navy` (#1E1B4B — jasny indygo) z jasnym timerem i trzema CTA, świeci cały czas
(Wake Lock trzyma ekran włączony) i tyka co 1 s przez 6-8 h. To: oślepia rodzica,
ryzykuje obudzenie dziecka, drenuje baterię, a po ciemku łatwo przypadkiem dotknąć
"Zakończ sen" i niechcący zakończyć sesję. (zob. źródło:
`docs/dev-brainstorms/2026-06-25-tryb-nocny-sesji-requirements.md`)

## Śledzenie wymagań

- R1. True-black tło ekranu sesji (#000000), każda sesja (drzemka i noc), bez bramkowania.
- R2. Auto-dim po ~20 s bezczynności — timer/etykieta do ~15% opacity, CTA blakną; tło true-black.
- R3. Wybudzenie dotykiem — pierwszy tap w stanie dimmed tylko rozjaśnia, nie wyzwala akcji.
- R4. Hold-tap ~1 s na "Zakończ sen" z widocznym progresem; puszczenie przed końcem anuluje.
- R5. Wolniejszy tick timera w tle (~30 s gdy `document.hidden`); po powrocie focusu natychmiast dokładny czas.

## Granice scope'u

- Brak osobnego app-wide motywu AMOLED (4. opcja w Ustawieniach) — tryb nocny żyje
  wyłącznie na ekranie sesji. (zob. źródło: Granice scope'u)
- Brak bramkowania po typie sesji / porze dnia.
- Brak sterowania sprzętową jasnością ekranu (Screen Brightness API) — tylko warstwa wizualna.
- Bez haptyki.
- Hold-tap dotyczy tylko "Zakończ sen" na ekranie sesji — nie START/STOP na home.

## Kontekst i research

### Relevantny kod i wzorce

- `src/app/(app)/sleep-fullscreen.tsx` — ekran sesji. Już ma wzorzec web-guard +
  `visibilitychange` + cleanup (Wake Lock `useEffect`, linie ~49-88) — auto-dim i wolny
  tick naśladują dokładnie ten kształt (Platform.OS === 'web', `typeof document`/`navigator`,
  cleanup removeEventListener + clear).
- `src/features/sessions/useSessionTimer.ts` — `setInterval(1000)`, czas = derived z
  `startMs` (Date.parse(start_at)). Tu ląduje R5. Hook używany też przez
  `src/components/SleepInProgressCard.tsx` (home) — zmiana jest współdzielona (patrz Wpływ systemowy).
- `src/components/ui/ProgressRing.tsx` — reanimated (`useSharedValue`/`withTiming`) + svg;
  referencja dla animacji progresu hold-tap (choć dla CTA preferowany fill liniowy, patrz decyzje).
- `src/lib/colors.ts` + `tailwind.config.js` — paleta tokenów. Dla true-black dodać
  `bg-black` (Tailwind built-in `#000` — nie wymaga nowego tokena).
- `src/features/changelog/useChangelogUpdate.ts` — wzorzec hooka z listenerem
  `visibilitychange` + cleanup (do naśladowania w `useIdleDimmer`/R5).

### Wiedza instytucjonalna

- `learned-patterns.md`: `setTimeout`/`setInterval` = ZAWSZE cleanup w `useEffect` return
  (coding-rules §13). Native-only API na web = `Platform.OS` guard. Static-invariants
  testing dla regresji architektury (cleanup, web-guard, brak raw API).
- Czas zawsze derived z timestampu — wolniejszy tick (R5) nie powoduje dryfu, bo
  `elapsedMs = now - startMs` liczy się od `start_at`, nie z akumulowanego licznika.

### Referencje zewnętrzne

- Brak — codebase ma silne lokalne wzorce (Wake Lock useEffect, visibilitychange,
  reanimated ProgressRing). Research zewnętrzny pominięty (sekcja 1.2: solidne wzorce lokalne).

## Kluczowe decyzje techniczne

- **Auto-dim jako wydzielony, testowalny hook `useIdleDimmer`** (mimo 1 użycia): logikę
  timera bezczynności łatwiej pokryć vitest fake timers niż cały ekran; trzyma
  `sleep-fullscreen.tsx` chudy (coding-rules §1). Hook eksportuje `{ isDimmed, wake }`.
- **Wybudzenie dotykiem przez przezroczysty overlay `Pressable`** aktywny tylko gdy
  `isDimmed`: przechwytuje pierwszy tap (`pointerEvents` aktywne), woła `wake()` i nic
  więcej — gwarantuje R3 (pierwszy tap nie kończy sesji). Gdy nie-dimmed overlay nie
  renderuje się / `pointerEvents="none"`.
- **Hold-tap jako reużywalny komponent `HoldToConfirmButton`** (`components/ui/`):
  `Pressable` `onPressIn` startuje `setTimeout(HOLD_MS)` + animację progresu; `onPressOut`
  przed końcem czyści timeout i resetuje progres; dotarcie do końca woła `onConfirm`.
  Wizual: liniowy fill tła przycisku (reanimated `withTiming` na szerokości/opacity) —
  czytelniejszy na pełnej szerokości CTA niż ring. Dokładny wizual = detal implementacji.
- **R5 w `useSessionTimer` przez `visibilitychange`**: `document.hidden` → interval
  `SLOW_TICK_MS` (30 000), `visible` → natychmiastowy `setNow(Date.now())` + `TICK_MS`
  (1000). Web-guard (`Platform.OS === 'web'` / `typeof document`); native zostaje na 1 s.
- **Stałe nazwane**: `IDLE_DIM_MS = 20_000`, `HOLD_MS = 1_000`, `SLOW_TICK_MS = 30_000`
  (coding-rules: zero magic numbers).

## Otwarte pytania

### Rozwiązane podczas planowania

- True-black bez nowego tokena: użyć Tailwind `bg-black`. Rozwiązanie: tak, `#000` built-in.
- Subagent dla całości: brak warstwy danych (zero Supabase/migracji) → wszystkie IU to
  warstwa UI/timing → `feature-builder-ui`.
- Czy R5 dotyka też home card: tak (współdzielony hook) — akceptowane, korzystne wszędzie.

### Odroczone do implementacji

- Dokładne wartości UX (timeout 20 s, poziom 15% opacity, czy CTA znikają całkiem czy
  blakną, animacja przejścia jasny↔dim) — dostroić wizualnie w manualnym teście (R2).
- Testowalność przełączania częstotliwości interwału w `useSessionTimer` przez fake
  timers — czy asercja na liczbie ticków jest stabilna; jeśli krucha, testować zachowanie
  obserwowalne (natychmiastowy recompute po `visible`) zamiast wewnętrznego interwału.
- Czy `HoldToConfirmButton` użyje reanimated czy prostego `Animated` RN — zależy od
  zachowania react-native-web przy cancel mid-animation; rozstrzygnąć przy pierwszym renderze.
- Brak `docs/DESIGN.md` — buildery UI bazują na `ux-ui-guidelines` + tokenach
  `tailwind.config.js`/`lib/colors.ts`. Utworzyć `docs/DESIGN.md` przed kolejnym większym UI feature'em.

## Implementation Units

- [x] **Unit 1: Wolniejszy tick timera w tle (R5)** ✅ (7 testów; wyekstrahowano pure `computeSessionTimer` do testów no-drift)

**Cel:** `useSessionTimer` tyka co ~30 s gdy karta w tle, co 1 s gdy widoczna; po powrocie
focusu natychmiast pokazuje dokładny czas. Oszczędność baterii bez dryfu.

**Wymagania:** R5

**Zależności:** Brak (niezależny — może lądować pierwszy).

**Pliki:**
- Modyfikuj: `packages/sleeper-web/src/features/sessions/useSessionTimer.ts`
- Test (unit): `packages/sleeper-web/src/features/sessions/__tests__/useSessionTimer.test.ts`

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- Dodać stałą `SLOW_TICK_MS = 30_000`. W `useEffect` zależnym od `startMs`: ustalać
  interwał wg `document.hidden` (start) i przełączać na `visibilitychange` — przy
  `visible` wywołać natychmiast `setNow(Date.now())` i przeładować interval na `TICK_MS`,
  przy `hidden` przeładować na `SLOW_TICK_MS`.
- Web-guard: `Platform.OS === 'web' && typeof document !== 'undefined'`; w innym razie
  zachować obecne `setInterval(TICK_MS)` (native parity, brak regresji).
- Cleanup: clearInterval + removeEventListener('visibilitychange') w return (§13).

**Wzorce do naśladowania:**
- `sleep-fullscreen.tsx` Wake Lock `useEffect` (web-guard + visibilitychange + cleanup).
- `features/changelog/useChangelogUpdate.ts` (listener focus/visibility + cleanup).

**Scenariusze testowe:**
- [Unit] `startAt = null` → `{ elapsedMs: 0, display: '00:00:00' }` (bez zmian).
- [Unit] `elapsedMs` zawsze = `now - startMs` (derived) — po symulowanym upływie czasu
  (`vi.setSystemTime` / fake timers) wartość zgodna z timestampem, niezależnie od częstotliwości ticka.
- [Unit] Po `visibilitychange` na `visible` timer natychmiast przelicza (setNow wywołane
  bez czekania na pełny interwał) → display odzwierciedla dokładny czas.
- [Unit] Cleanup: po unmount brak aktywnego interwału i listenera (spy na clearInterval/removeEventListener).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów.
- `pnpm --filter sleeper-web test` — nowy plik testowy zielony, wszystkie assercje przechodzą.
- `grep -n "removeEventListener\|clearInterval" useSessionTimer.ts` — cleanup obecny.

---

- [x] **Unit 2: True-black + auto-dim ekranu sesji (R1, R2, R3)** ✅ (11 testów; pure `createIdleDimmerController` + static-invariants; overlay wybudzania jako ostatnie dziecko SafeAreaView)

**Cel:** Ekran sesji ma tło #000000; po ~20 s bezczynności zawartość przygasa; dotyk
przygaszonego ekranu rozjaśnia bez wyzwalania akcji.

**Wymagania:** R1, R2, R3

**Zależności:** Brak twardej; sekwencjonowany po Unit 1 (oba dotykają obszaru sesji, ale
różne pliki). Wykonać przed Unit 3 (oba modyfikują `sleep-fullscreen.tsx`).

**Pliki:**
- Stwórz: `packages/sleeper-web/src/features/sessions/useIdleDimmer.ts`
- Test (unit): `packages/sleeper-web/src/features/sessions/__tests__/useIdleDimmer.test.ts`
- Modyfikuj: `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx`
- Test (invariants): `packages/sleeper-web/src/app/(app)/__tests__/sleep-fullscreen.invariants.test.ts`

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- `useIdleDimmer(timeoutMs = IDLE_DIM_MS)` → `{ isDimmed, wake }`. Wewnętrznie
  `setTimeout` resetowany przez `wake()`; po timeoutcie `isDimmed = true`. Cleanup
  clearTimeout w `useEffect` return. Stała `IDLE_DIM_MS = 20_000`.
- Ekran: zamienić `bg-navy` → `bg-black` (R1). Na podstawie `isDimmed` sterować
  opacity timera/etykiety (~0.15) i CTA (blakną — np. opacity ~0.1, decyzja wizualna odroczona).
- Detekcja aktywności na web: nasłuch na `pointerdown` (overlay) + ewentualnie globalny
  `wake()` przy każdej interakcji z CTA. Web-guard jak w Unit 1.
- R3: gdy `isDimmed`, renderować przezroczysty pełnoekranowy `Pressable` (overlay, `absolute inset-0`)
  z `onPress={() => wake()}` — przechwytuje pierwszy tap, NIE woła żadnej akcji sesji.
  Gdy nie-dimmed: overlay nie renderowany / `pointerEvents="none"`.

**Wzorce do naśladowania:**
- `sleep-fullscreen.tsx` istniejący web-guard `useEffect`.
- Istniejące hooki w `features/sessions/` (kształt eksportu, JSDoc po polsku).

**Scenariusze testowe:**
- [Unit] `useIdleDimmer`: start `isDimmed === false`; po upływie `timeoutMs` (fake timers) `isDimmed === true`.
- [Unit] `wake()` po przygaszeniu → `isDimmed === false` i licznik bezczynności zresetowany
  (kolejne przygaszenie dopiero po pełnym `timeoutMs`).
- [Unit] Cleanup: unmount czyści timeout (brak setState po unmount).
- [Invariants] `sleep-fullscreen.tsx` zawiera `bg-black` i NIE zawiera `bg-navy` (regex).
- [Invariants] listenery/efekty web mają `Platform.OS === 'web'` guard i cleanup w return.
- [Manual] (Safari/Chrome PWA) Wejdź w aktywną sesję → tło czarne; nie dotykaj ~20 s →
  timer i CTA przygasają; dotknij ekran → rozjaśnia się i sesja NIE zostaje zakończona.

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów.
- `pnpm --filter sleeper-web test` — testy hooka + invariants zielone.
- `grep -n "bg-black" sleep-fullscreen.tsx` zwraca trafienie; `grep -n "bg-navy" sleep-fullscreen.tsx` puste.
- [ ] Manual (PWA): true-black + auto-dim + wybudzenie dotykiem bez akcji — manual test (patrz Operator checklist).

**Operator checklist:**
- [ ] User weryfikuje w Safari/Chrome (zainstalowane PWA) na telefonie: czerń, przygaszenie po ~20 s, tap budzi bez kończenia sesji.

---

- [x] **Unit 3: Hold-tap na "Zakończ sen" (R4)** ✅ (10 testów; `Animated` RN dla fill — natychmiastowy reset przy cancel; pure `createHoldController`; `handleEnd` w useCallback by tick nie anulował holdu)

**Cel:** Zakończenie sesji wymaga przytrzymania ~1 s z widocznym progresem; szybki tap
ani puszczenie przed końcem nie kończy sesji.

**Wymagania:** R4

**Zależności:** Unit 2 (oba modyfikują `sleep-fullscreen.tsx`; wire'owanie po dim, by overlay
wybudzania i hold-button nie kolidowały).

**Pliki:**
- Stwórz: `packages/sleeper-web/src/components/ui/HoldToConfirmButton.tsx`
- Test (unit): `packages/sleeper-web/src/components/ui/__tests__/HoldToConfirmButton.test.ts`
- Modyfikuj: `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx`

**Delegate to:** feature-builder-ui

**Skills in play:** tailwind-react-guidelines, ux-ui-guidelines

**Podejście:**
- `HoldToConfirmButton` props: `{ onConfirm, label, holdingLabel?, disabled?, holdMs? }`
  (default `HOLD_MS = 1_000`). `onPressIn` → start `setTimeout(holdMs)` + animacja
  progresu (fill liniowy tła). `onPressOut`/`disabled` → clearTimeout + reset progresu
  (anuluje). Dotarcie timeoutu → `onConfirm()`. Cleanup timeout w unmount (§13).
- Wizual: liniowy fill (reanimated `withTiming` lub `Animated` RN) — preferowany nad
  ProgressRing dla CTA; cancel mid-animation resetuje do 0. a11y: `accessibilityRole="button"`,
  label opisujący "przytrzymaj aby zakończyć".
- Ekran: zamienić istniejący `Pressable` "Zakończ sen" na `HoldToConfirmButton`
  `onConfirm={handleEnd}`; zachować `disabled={endSession.isPending}` i label "Zapisuje...".

**Wzorce do naśladowania:**
- `components/ui/ProgressRing.tsx` (reanimated useSharedValue/withTiming) — wzorzec animacji.
- Istniejące `components/ui/*` (Snackbar, SegmentedControl) — konwencja props/stylów NativeWind.

**Scenariusze testowe:**
- [Unit] Szybki press (onPressIn → onPressOut < holdMs) → `onConfirm` NIE wywołane.
- [Unit] Pełne przytrzymanie (onPressIn, upływ `holdMs` przez fake timers) → `onConfirm` wywołane raz.
- [Unit] Anulowanie: onPressIn → onPressOut przed `holdMs` → `onConfirm` NIE wywołane, progres zresetowany.
- [Unit] `disabled` → onPressIn nie startuje odliczania.
- [Manual] (PWA) Na ekranie sesji: szybki tap "Zakończ sen" nie kończy; przytrzymanie ~1 s
  pokazuje wypełniający się progres i kończy sesję (powrót do `/`).

**Weryfikacja:**
- `pnpm --filter sleeper-web exec tsc --noEmit` — 0 błędów.
- `pnpm --filter sleeper-web test` — testy komponentu zielone (happy path + cancel + quick-tap).
- `pnpm web:build:check` — pełna walidacja (tsc + lint + test + invariants + build) zielona.
- [ ] Manual (PWA): hold-to-confirm kończy sesję, szybki tap nie — manual test (patrz Operator checklist).

**Operator checklist:**
- [ ] User weryfikuje w PWA: szybki tap nie kończy; ~1 s przytrzymania z progresem kończy sesję.

## Wpływ systemowy

- **Graf interakcji:** R5 modyfikuje `useSessionTimer` używany przez `sleep-fullscreen.tsx`
  ORAZ `SleepInProgressCard.tsx` (home). Wolniejszy tick w tle jest korzystny w obu — brak
  regresji (czas nadal derived). Zweryfikować że home card nadal pokazuje dobry czas po powrocie focusu.
- **Propagacja błędów:** Wake Lock/dim/timer listenery web-only — `Platform.OS` guard zapobiega
  crashom; brak nowych ścieżek błędów do bazy (zero data layer).
- **Ryzyka cyklu życia stanu:** wszystkie nowe `setTimeout`/`setInterval`/listenery muszą mieć
  cleanup (unmount, zmiana sesji) — inaczej setState-po-unmount / wyciek. Pokryte testami cleanup.
- **Parytet surface API:** brak — zmiana wyłącznie web PWA (projekt web-only).
- **Pokrycie integracyjne:** interakcja dim-overlay (Unit 2) z hold-button (Unit 3) — gdy
  dimmed, pierwszy tap budzi (overlay), nie startuje hold. Zweryfikować manualnie w PWA.

## Ryzyka i zależności

- **Testowanie częstotliwości interwału (R5)** może być kruche przez fake timers — fallback:
  testować obserwowalne zachowanie (recompute po `visible`), nie liczbę ticków. (odroczone do impl.)
- **react-native-web cancel animacji hold** — zachowanie withTiming przy szybkim onPressOut
  do zweryfikowania przy implementacji; reset musi być natychmiastowy. (odroczone do impl.)
- Units 2 i 3 modyfikują ten sam plik (`sleep-fullscreen.tsx`) — wykonać sekwencyjnie (2 → 3).

## Dokumentacja / Notatki operacyjne

- Każdy commit → log w `docs/commits/` (CLAUDE.md, obowiązkowe).
- Po deployu z user-facing zmianą: wpis do `public/changelog.json` (inkrement `v` + `version`
  semver minor) + sync `version` w `app.json`/`package.json` (roadmap §"Co nowego" + pułapka cache `--clear`).
- Manual checklist (PWA, zainstalowane) per Operator checklist Unit 2 i 3.

## Źródła i referencje

- **Dokument źródłowy:** [docs/dev-brainstorms/2026-06-25-tryb-nocny-sesji-requirements.md](../dev-brainstorms/2026-06-25-tryb-nocny-sesji-requirements.md)
- Roadmap: `docs/ideation/2026-06-24-roadmap.md` (Faza 7).
- Powiązany kod: `src/app/(app)/sleep-fullscreen.tsx`, `src/features/sessions/useSessionTimer.ts`,
  `src/components/ui/ProgressRing.tsx`, `src/components/SleepInProgressCard.tsx`.
- Wzorce: `learned-patterns.md` (cleanup interwałów, Platform.OS guard, static-invariants).
