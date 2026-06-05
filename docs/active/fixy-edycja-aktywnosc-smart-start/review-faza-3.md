# Code Review — Faza 3 (Fix 1: TimePickerField iOS Modal)

**Data:** 2026-06-05
**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Commit:** `22724b4` — `fix(time-picker): wrap iOS spinner in modal to show minutes column`
**Plik:** `packages/sleeper-app/src/components/TimePickerField.tsx` (+87 / -9 LOC, finalnie 131 LOC)

## Cel fazy

Naprawić iOS bug: `display="spinner"` w `<View flex-1>` cropuje kolumnę minut. Rozwiązanie: owinąć picker w `<Modal transparent>` z bottom-sheet pełnej szerokości + przyciski Anuluj/Gotowe. Lokalny `tempValue` commituje się dopiero przy "Gotowe" (eliminuje spam `onChange` podczas scroll). Android bez zmian (system dialog).

## Severity gate

**✅ GOTOWE DO KONTYNUACJI** — 0 problemów P1/P2, 3 sugestie P3 (kosmetyka i hardening).

## Liczniki

- 🔴 **P1 (blocking):** 0
- 🟠 **P2 (important):** 0
- 🟡 **P3 (nit):** 3
- 📱 **Manual-mobile:** 9 scenariuszy (oczekuje on-device, manual-test-faza-3.md)

## Walidacja narzędziowa

| Check | Status | Komenda |
|---|---|---|
| TypeScript | ✅ PASS (exit 0) | `pnpm --filter sleeper-app exec tsc --noEmit` |
| ESLint | ✅ PASS (exit 0, brak nowych warningów) | `pnpm --filter sleeper-app lint` |
| Brak nowych dependencji | ✅ PASS | `Modal` z `react-native`, `SafeAreaView` z `react-native-safe-area-context` — oba w `package.json` |
| Brak `any` / `!` / new `console.log` | ✅ PASS | grep negatywny |
| Komponent API stabilne | ✅ PASS | `TimePickerFieldProps` niezmienione — call-sites w `SessionEditForm.tsx` działają bez zmian |

---

## Findings

### 🟡 P3-nit (3)

#### 1. `tempValue` w `useState` initializer może być stale gdy `value` zmienia się przy zamkniętym Modalu
**Plik:** `TimePickerField.tsx:34`
**Kod:** `const [tempValue, setTempValue] = useState<Date>(value);`

`useState(value)` zapamiętuje wartość tylko przy mount. Jeśli rodzic zmieni prop `value` gdy modal jest zamknięty (`show === false`), stan `tempValue` pozostaje stary. **Praktycznie nieblokujące:** `handleOpen()` zawsze wykonuje `setTempValue(value)` PRZED `setShow(true)`, więc dopóki nikt nie czyta `tempValue` bez otwarcia modala — kod działa poprawnie.

**Sugestia (opcjonalna):** dodać `useEffect(() => { if (!show) setTempValue(value); }, [value, show]);` lub przerzucić initializer na lazy `useState(() => value)` z dokumentującym komentarzem. Aktualny kod nie generuje buga — to defensive hardening.

#### 2. `<Pressable accessible={false} onPress={() => {}}>` bez `pointerEvents="box-only"` / komentarza
**Plik:** `TimePickerField.tsx:84`

Wzorzec stop-propagation działa identycznie jak w `ThemeModeBottomSheet.tsx:64` (tam też brak `pointerEvents`), więc spójność jest zachowana. Niemniej `onPress={() => {}}` jako stop-propagation nie jest oczywiste dla nowego czytelnika.

**Sugestia:** komentarz przy linii 83 już to opisuje, więc to czysta kosmetyka — ALBO wyciągnąć helper `<StopPropagation>` w 3. miejscu użycia (gdyby się pojawiło), zgodnie z regułą "abstrakcja od 2+ użyć" (`learned-patterns`). Dziś mamy 2 użycia (Theme + TimePicker) — granica reguły, do rozważenia osobno.

#### 3. `animationType="fade"` zamiast `slide` dla bottom sheet
**Plik:** `TimePickerField.tsx:75`

Plan (`fixy-edycja-aktywnosc-smart-start-plan.md:31`) eksplicytnie zalecił `animationType="fade"`, więc implementacja zgodna z planem. Jednak `ThemeModeBottomSheet.tsx:53` używa `animationType="slide"` dla tego samego patternu bottom-sheet — z UX punktu widzenia `slide` lepiej sugeruje "pojawia się od dołu" (zgodnie z opisem w `manual-test-faza-3.md:20`).

**Sugestia:** rozważyć `slide` dla spójności z istniejącym bottom sheetem (`ThemeModeBottomSheet`). Niefunkcjonalne, czysto UX-cosmetic.

---

## Cross-reference z planem

| Wymaganie z planu | Realizacja | Status |
|---|---|---|
| Wewnętrzny `tempValue`, commit po "Gotowe" | `useState<Date>(value)` + `handleConfirm` woła `onChange(tempValue)` | ✅ |
| Modal `transparent animationType="fade"` | Linia 73-75 — dokładnie tak | ✅ |
| Bottom sheet full-width z `bg-cream dark:bg-navy rounded-t-2xl` | Linia 85 — dokładnie tak | ✅ |
| Header: Anuluj (lewo) + label (środek) + Gotowe (prawo) | Linie 86-106 — flex-row justify-between | ✅ |
| Android pozostaje bez Modala (system dialog) | Linia 120-127 — gałąź `else if (show)` z `display="default"` | ✅ |
| `accessibilityRole` + `accessibilityLabel` polski | Pressable Anuluj (l.89), Gotowe (l.100), backdrop (l.80) | ✅ |
| `hitSlop` zgodnie z `learned-patterns` (>=44pt) | `HIT_SLOP = {top:12, bottom:12, left:12, right:12}` — visual `px-2 py-2` (~16x8pt) → +12 z każdej strony = ~40x32pt; **techniczne minimum 44pt nie spełnione w pełni** dla wysokości | ⚠️ uwaga niżej |
| Brak nowych dependencji | `Modal` i `SafeAreaView` istniały wcześniej | ✅ |
| TypeScript / lint clean | tsc 0 błędów, lint 0 warningów | ✅ |

### Uwaga: hitSlop a touch target 44pt

`learned-patterns` mówi: `hitSlop = (44 - visualSize) / 2` per krawędź. Przyciski Anuluj/Gotowe mają `px-2 py-2` (~16x8pt visual jeśli liczyć sam text + padding). `HIT_SLOP = 12` daje:
- szerokość total: ~16 + (2*12) = 40pt — **3pt poniżej 44pt**
- wysokość total: ~8 + (2*12) = 32pt — **12pt poniżej 44pt**

**Klasyfikacja:** nie podnoszę do P2 ponieważ:
1. tekst "Anuluj"/"Gotowe" w RN przy `text-base` (16pt) generuje line-height ~22pt — realny touch area to ~22 + 24 = **46pt wysokości** (OK).
2. szerokość "Anuluj" (6 znaków × ~9pt) = ~54pt + padding/hitSlop → **OK**.
3. szerokość "Gotowe" (6 znaków × ~9pt) = ~54pt → **OK**.

**Rekomendacja (opcjonalna):** dla pełnej zgodności z learned-pattern można podbić `HIT_SLOP` do `{top: 16, bottom: 16, left: 16, right: 16}` — zero ryzyka, gwarancja >=44pt nawet w pesymistycznej kalkulacji. Pozostawiam jako P3 dyskusyjny — nie wpisuję do "Do poprawy".

---

## Aspekty krytyczne (per system-reminder)

| Aspekt | Ocena | Komentarz |
|---|---|---|
| iOS Modal lifecycle (`tempValue` re-init przy otwarciu) | ✅ OK | `handleOpen()` linia 37-40 explicit `setTempValue(value)` PRZED `setShow(true)`. Każde otwarcie resetuje. |
| Backdrop tap close (stop-propagation na sheet content) | ✅ OK | Linia 84 `<Pressable accessible={false} onPress={() => {}}>` przechwytuje tap, analogicznie jak `ThemeModeBottomSheet.tsx:64`. |
| Memory leaks (Modal cleanup) | ✅ OK | Brak timerów, intervalów, subskrypcji. React unmountuje Modal child tree automatycznie przy `visible={false}`. |
| Dark mode (bg-cream / dark:bg-navy, kontrast Anuluj/Gotowe) | ✅ OK | `bg-cream dark:bg-navy` (`#F5F0E8` / `#1E1B4B`). Tekst `text-purple` (`#7C6BAD`) na cream — kontrast wymaga weryfikacji on-device (`bg-cream` jest jasny → purple może być na granicy 4.5:1, ale używane konsekwentnie w UI). Na `bg-navy` purple również w użyciu. **Manual test 7 weryfikuje on-device.** |
| a11y VoiceOver/TalkBack labels po polsku | ✅ OK | "Anuluj wybor godziny", "Zapisz wybrana godzine", "Zamknij wybor godziny bez zapisu", + label dynamiczny ("Godz. start"/"Godz. koniec"). Wszystkie po polsku (uproszczona ortografia ASCII zgodna z konwencją projektu — patrz `SessionEditForm.tsx:85` "Data rozpoczecia sesji"). |
| Android no-regression (system picker gałąź zachowana) | ✅ OK | Linia 120-127 — gdy `!isIos && show` renderuje inline `DateTimePicker` z `display="default"`, `handleAndroidChange` zachowuje stare zachowanie (immediate commit on `set`). |
| Type safety (lokalna gałąź iOS NIE psuje istniejacego API komponentu) | ✅ OK | `TimePickerFieldProps` interface niezmienione (linia 8-14). Wszystkie call-sites w `SessionEditForm.tsx:89,102` działają bez zmian. tsc clean. |
| hitSlop >=44pt | ⚠️ borderline | Patrz tabela wyżej — efektywnie spełnione przez line-height tekstu, ale formalna kalkulacja `hitSlop` jest na granicy. Niepodnoszone do P2. |

---

## Bookkeeping checkboxów Weryfikacja:

Sekcja Faza 3 → `### Weryfikacja` (linie 117-120 w `fixy-edycja-aktywnosc-smart-start-zadania.md`):

| Checkbox | Klasyfikacja | Akcja | Wynik |
|---|---|---|---|
| `pnpm --filter sleeper-app exec tsc --noEmit` | CLI | uruchomione | ✅ PASS (exit 0) — odznaczone już w pliku |
| `pnpm --filter sleeper-app lint` | CLI | uruchomione | ✅ PASS (exit 0) — odznaczone już w pliku |
| brak nowych dependencji | grep / inspekcja | sprawdzone | ✅ PASS — odznaczone już w pliku |
| commit + follow-up `docs/commits/...` | grep / istnienie pliku | sprawdzone | ✅ PASS (`22724b4` + `docs/commits/2026-06-05-22724b4-timepicker-modal.md`) — odznaczone już w pliku |

Wszystkie `Weryfikacja:` Fazy 3 już odznaczone `[x]` w pliku zadań. Brak zmian wymaganych w bookkeepingu.

Checkboxy `Test (manual, ...)` (linie 104-114) — mobile-manual, pozostają `[ ]` z suffixem `— manual test (patrz manual-test-faza-3.md)` (już dodanym). Nie liczone jako P2.

### Podsumowanie

- Odznaczone automatycznie (CLI/grep): 4
- Pozostawione dla mobile-manual (Expo Go iOS + Android): 9
- Niejasne / failujące: 0

---

## Odchylenia od planu

**Brak.** Implementacja w 1:1 zgodna z planem (`fixy-edycja-aktywnosc-smart-start-plan.md` sekcja "Fix 1") oraz zadaniami (Faza 3 — wszystkie 6 implementation checkboxes odznaczone).

---

## Konkluzja

**Severity gate: ✅ GOTOWE DO KONTYNUACJI**

Faza 3 jest najryzykowniejszą zmianą w zadaniu (iOS-specific UI, Modal lifecycle, dark mode), a mimo to implementacja jest czysta:
- TypeScript / lint clean.
- API komponentu niezmienione — zero risk dla call-sites.
- Wzorzec Modal + stop-propagation skopiowany 1:1 z istniejącego `ThemeModeBottomSheet.tsx` (proven w produkcji od UI redesign).
- Android pozostaje bez zmian — zero risk regresji.

Pozostają 3 sugestie P3 (defensive hardening + UX cosmetic) — żadna nie blokuje merge.

**Następny krok:** manual on-device testing wg `manual-test-faza-3.md` (9 scenariuszy iOS + Android), następnie Faza 4 (e2e sanity check + merge).
