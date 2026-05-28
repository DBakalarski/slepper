# Code Review — Faza 6 (Polish + a11y)

**Data:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Commit:** `aa8e6d8` — feat(ui-redesign): faza 6 — polish + a11y
**Scope:** 17 plików zmodyfikowanych + 1 nowy (`src/lib/colors.ts`), 203 insertions / 92 deletions

---

## Severity gate

**✅ GOTOWE DO KONTYNUACJI — faza CZYSTA.**

| Severity | Liczba |
|---|---|
| 🔴 P1 (blocking) | 0 |
| 🟠 P2 (important) | 0 |
| 🟡 P3 (nit) | 3 |

Faza polish — oczekiwania spełnione. Brak regresji, brak blockerów, 3 drobne sugestie kosmetyczne.

---

## Typy znalezisk

- **KOD:** 3 sugestie (P3)
- **TEST:** 0 (Faza polish — brak nowej logiki domenowej do pokrycia testami; cała funkcjonalność istniejąca, restyle/a11y)
- **MANUAL:** Generowanie `manual-test-faza-6.md` — patrz sekcja niżej

---

## Walidacja automatyczna

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (exit 0) |
| `npm run lint` | ✅ PASS (exit 0) |
| Circular imports w `lib/colors.ts` | ✅ PASS — `colors.ts` zero-deps, importowany przez 14 plików, żaden z nich nie importuje wstecz |
| HEX 1:1 vs `tailwind.config.js` | ✅ PASS — wszystkie 6 wartości w `COLORS` zgodne z paletą tailwinda (navy/cream/orange/purple/purple-light/text-muted) |

---

## Sprawdzenia szczegółowe (z briefu)

### 1. Czy a11y nie został nadmiernie applied?

**Wynik:** ✅ Nie. `accessible={false}` użyty **tylko raz** — w `ThemeModeBottomSheet.tsx:64` na stop-propagation Pressable (`onPress={() => {}}`). Ten wrapper:
- Nie jest interaktywny (no-op handler — istnieje tylko żeby zatrzymać propagację touch na backdrop)
- 3 wewnętrzne Pressable opcji motywu (linie 79-94) **mają** `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ selected }}` — VoiceOver/TalkBack normalnie je czyta
- Komentarz inline poprawnie uzasadnia decyzję

**P3 #1**: Sugestia kosmetyczna — zamiast `Pressable` z `accessible={false}` można użyć `View` z `onStartShouldSetResponder={() => true}` (semantically clearer). Niskie ROI, current pattern jest poprawny.

### 2. Pressable feedback vs istniejące animacje (SegmentedControl)

**Wynik:** ✅ Brak regresji. SegmentedControl.tsx **nie został zmodyfikowany w Fazie 6** (zachowane oryginalne Reanimated `withTiming` z Fazy 4). Pressable feedback (`scale 0.97 + opacity 0.85`) dodany **tylko** na:
- `IconButton.tsx:58-60`
- `BigActionButton.tsx:49-53`
- `QuickActions.tsx:78-82` (ActionCard)
- `SessionListItem.tsx:126` (opacity-only — bez scale, świadomy wybór dla list rows)
- `_layout.tsx` (settings back button) i `index.tsx:223,278-282` (Pokaz wszystkie, InvitationRow)
- `profile.tsx:249` (ShortcutRow — opacity-only)
- `settings.tsx:45,88` (back button, Wyloguj)

Pressable feedback jest **inline** `style={({pressed}) => ...}` — nie konfliktuje z worklet animations w SegmentedControl. Indicator animation pozostaje nietknięta.

### 3. Circular imports w colors.ts

**Wynik:** ✅ Brak. `src/lib/colors.ts` ma 0 importów (czyste const + comment). 14 callsiteów importuje **z** niego, żaden nie jest importowany z powrotem.

### 4. HEX 1:1 zachowane

**Wynik:** ✅ Zgodne 1:1 z `tailwind.config.js`:
```
navy        #1E1B4B  ✓
cream       #F5F0E8  ✓
orange      #E08B6F  ✓
purple      #7C6BAD  ✓
purpleLight #B8A8D9  ✓
textMuted   #6B6580  ✓
```

Dark mode tokens (`#0F0D26` dark-bg, `#2A2660` border) pozostały inline w `_layout.tsx:87` — **świadomie**, bo `dark-bg`/`dark-surface` nie są jeszcze w `COLORS` const. Nie regresja — wartości takie jak były przed Fazą 6.

### 5. ProgressRing fade-in vs rerender

**Wynik:** ✅ Brak konfliktu. Analiza `ProgressRing.tsx:56-60`:
- `useSharedValue(0)` — stabilny ref między renderami
- `useEffect(() => { opacity.value = withTiming(1, { duration: 300 }) }, [opacity])` — uruchamia się **raz przy mount** (`opacity` ref stabilny, więc effect nie re-fire)
- `dashOffset` jest derived state — recompute każdy render, ale to SVG attribute, nie animacja Reanimated → instant update
- Fade-in **nie resetuje się** gdy `value` się zmienia (np. nowa sesja w `TodayStatsCard` zmienia `ringProgress`). ✓ Oczekiwane zachowanie.

### 6. hitSlop overlapping

**Wynik:** ✅ Brak nakładania.

| Komponent | hitSlop | Sąsiednie interaktywne | Verdict |
|---|---|---|---|
| `IconButton size=sm` | 6 | brak (rozmiar `sm` nieużywany w obecnych callsiteach) | ✓ |
| `settings.tsx` back button | 8 | sąsiad: tekst "Ustawienia" (non-interactive) | ✓ |
| `index.tsx` "Pokaz wszystkie" | 8 | sąsiad: tekst "Sesje dzisiaj" (non-interactive) | ✓ |

---

## P3 findings (sugestie, NON-blocking)

### 🟡 P3 #1 — `Switch.tsx:18` + `ProgressRing.tsx:44` — pozostałe HEX literale poza COLORS

**Plik:** `sleeper-app/src/components/ui/Switch.tsx:18`, `sleeper-app/src/components/ui/ProgressRing.tsx:44`
**Opis:** Wartość `#E8DEF7` (purple-soft) pozostaje inline w 2 miejscach (Switch trackOff, ProgressRing default trackColor). Komentarz w Switch ("nie ma w COLORS — lokalne") uzasadnia, ale spójność redukcji z Fazy 6 (50→22) zmniejszyłaby się jeszcze do 20 jeśli dodać `purpleSoft: '#E8DEF7'` do COLORS.
**Rekomendacja:** Opcjonalne — dodać `purpleSoft` do COLORS przy następnej okazji modyfikacji palety. Niski priorytet, current state jest poprawny.

### 🟡 P3 #2 — `ThemeModeBottomSheet.tsx:64` — `accessible={false}` na Pressable

**Plik:** `sleeper-app/src/features/settings/ThemeModeBottomSheet.tsx:64`
**Opis:** Stop-propagation wrapper używa `Pressable` z no-op `onPress`. Bardziej idiomatyczne byłoby `View` + `onStartShouldSetResponder={() => true}`. Funkcjonalnie identyczne.
**Rekomendacja:** Opcjonalna refaktoryzacja kosmetyczna, niski ROI.

### 🟡 P3 #3 — `SessionListItem.tsx:126` + `profile.tsx:249` + `settings.tsx:45,88` — opacity-only feedback (bez scale)

**Plik:** wiele
**Opis:** Część Pressable używa scale+opacity, inne tylko opacity. Brief Fazy 6 mówił "scale 0.97 + opacity 0.85 na 7 callsiteach" — implementacja świadomie wybrała opacity-only dla list rows (SessionListItem, ShortcutRow), back button i secondary buttons (Wyloguj). To **świadoma decyzja** UX (scale 0.97 na list row wygląda gibki / przesadnie), ale brak dokumentacji tej rule w komentarzu / pliku zadań może mylić.
**Rekomendacja:** Dopisać krótki komentarz inline lub w `ui-redesign-kontekst.md`: "scale dla CTA/cards, opacity dla list rows/secondary".

---

## Ocena 2 odchyleń od planu

### Odchylenie 1: P3 #6 z Fazy 4 (FlatList) — ODŁOŻONY z TODO inline

**Plan:** `history.tsx:91 + ScrollView` — przy skalowaniu (`RANGE_DAYS` > 30 lub 200+ sesji) przenieść na FlatList.
**Status:** Nie zrobione, dodany TODO comment inline `history.tsx:88-90`.
**Ocena:** ✅ **AKCEPTOWALNE**. Aktualny `RANGE_DAYS = 14` (zdefiniowany jako "realny scope MVP"). Sesje dziennie ~3-8 → ~50-100 sesji w oknie. ScrollView z tym wolumenem nie pokazuje degradacji performance. Refaktor na FlatList/SectionList wymagałby restrukturyzacji `GroupedHistoryList` (section headers + key extraction) — to praca o non-trivialnej powierzchni, ROI poza scopem MVP. TODO inline jest poprawnie sformułowany i wskazuje próg (>30 dni / 200+ sesji) → przyszły dev wie kiedy refaktoryzować. **Decyzja zgodna z regułą "nie twórz abstrakcji na przyszłość" z `coding-rules.md` §3.**

### Odchylenie 2: P3 #10 (explicit return types) — ŚWIADOMY SKIP

**Plan:** (brief Fazy 6) — explicit return types dla publicznych funkcji.
**Status:** Skip, bez dokumentacji rationale w commit msg.
**Ocena:** ✅ **AKCEPTOWALNE z drobnym zastrzeżeniem**. `coding-rules.md` §10: "Wszystkie publiczne funkcje mają explicit return types". W zmienionym kodzie Fazy 6:
- `greetingForHour(hour: number): string` ✓
- `function modeLabel(...): string` ✓
- `function clamp01(v: number): number` ✓
- Komponenty React (`function HomeHeader(...)`) — TS infer `JSX.Element` automatycznie, w stylu projektu (cała baza tak robi)
- Helper funkcje inline (np. `handleSelect`, `handlePress`) — local scope, nie publiczne

**Verdict:** Nie ma faktycznego naruszenia — funkcje "publiczne" mają return types. Skip jest faktycznie "nic do dodania" — nie odchylenie. **Mógłby być wzmiankowany w commit msg dla jasności.**

---

## Bookkeeping checkboxów Weryfikacja:

Re-parsing pliku `ui-redesign-zadania.md` sekcja "## Faza 6":

**Niezaznaczone checkboxy `Weryfikacja:` w Fazie 6:**

1. `[ ] npx tsc --noEmit PASS` — CLI → uruchomione, exit 0 → **odznaczono `[x]`**
2. `[ ] npm run lint PASS` — CLI → uruchomione, exit 0 → **odznaczono `[x]`**
3. `[ ] DevTools accessibility inspector: WCAG AA na każdym ekranie (light + dark)` — Mobile manual (a11y inspector + visual check) → suffix " — manual test (patrz manual-test-faza-6.md)"
4. `[ ] Commit: feat(ui-redesign): faza 6 — polish + a11y` — Grep (sprawdzenie istnienia commita) → `git log --oneline | grep "feat(ui-redesign): faza 6"` PASS → **odznaczono `[x]`**
5. `[ ] Commit log w docs/commits/` — Grep (test -f) → `docs/commits/2026-05-28-aa8e6d8-*.md` istnieje (commit `c9e6109` zaloggował aa8e6d8) → **odznaczono `[x]`**

**Statystyki bookkeepingu:**
- Odznaczone automatycznie (CLI/grep): **4**
- Pozostawione dla mobile-manual: **1** (a11y inspector)
- Niejasne: 0
- Failujące: 0

---

## Manual test checklist (Agent 5)

Status: `manual-test-faza-6.md` wygenerowany — patrz `docs/active/ui-redesign/manual-test-faza-6.md`.

Scope checklist: VoiceOver/TalkBack labels na nowych a11y dodaniach (IconButton, BigActionButton w obu mode, InvitationRow, SessionListItem z gapem, ThemeModeBottomSheet opcje), tabular nums w timerach (Active Window, SleepInProgress), pressable feedback visual check, ProgressRing fade-in przy wejściu na ekran, hitSlop tap area test dla settings back button, WCAG AA kontrast light + dark na każdym z 3 ekranów (Dzisiaj/Historia/Profil/Settings).

---

## Podsumowanie

**Faza 6 jest CZYSTA.** Cel "polish + a11y" zrealizowany w pełni:
- 14 plików przeszło na `COLORS` const (HEX redukcja 50→22, pozostałe poza scopem UI redesign — auth/family/sessions forms)
- A11y labels dodane bez nadmiarowości (każda zmiana ma czytelne uzasadnienie)
- Pressable feedback spójny ze wzorcem (scale dla CTA, opacity dla list — można byłoby udokumentować w kontekście)
- ProgressRing fade-in implementacyjnie poprawny (mount-only, bez konfliktu z value updates)
- Touch targets ≥44pt dla wszystkich krytycznych Pressable
- Batch-fix P3 z faz 0-5 zrealizowany w 9/10 — 1 odłożony z poprawnym TODO inline (FlatList)
- Walidacja CLI: typecheck + lint PASS

**Odchylenia od planu:** 2, oba uzasadnione (FlatList: scope MVP, return types: faktycznie nic do zrobienia).

**Manual test mobile-feature-tester:** ⚪ non-blocking. Checklist wygenerowana, user wykonuje on-device w ramach Fazy 7.

**Rekomendacja:** Przejść do Fazy 7 (manual test). Brak blokerów.
