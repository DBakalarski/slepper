# Manual test checklist — Faza 3 (Fix 1: wheel picker minut, iOS Modal)

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Commit:** `22724b4` — `fix(time-picker): wrap iOS spinner in modal to show minutes column`
**Środowisko:** Expo Go (iOS — krytyczny, Android — sanity)
**Plik testowany:** `packages/sleeper-app/src/components/TimePickerField.tsx` (Modal iOS + lokalny `tempValue`)

## Pre-warunki

- Dziecko z co najmniej jedną zakończoną sesją (do edycji).
- Otwórz `Historia` → tap na sesję → ekran edycji (`session/[id]`) z dwoma `TimePickerField` ("Godz. start" / "Godz. koniec").
- Tester: użytkownik (Dawid) na fizycznym iPhone'ie i Pixelu w Expo Go.

---

## Scenariusze iOS (krytyczne)

### 1. Otwarcie Modala — dwie kolumny HH + MM

- [ ] Edycja sesji → tap "Godz. start" → Modal pojawia się od dołu (animacja `fade`).
- [ ] **Oczekiwane:** bottom sheet z headerem `Anuluj | Godz. start | Gotowe` + spinner z **dwoma widocznymi kolumnami** (HH + MM, separator `:`).
- [ ] Backdrop półprzezroczysty czarny (`bg-black/50`), kontent home widać przyciemniony pod spodem.

### 2. Scroll minut — `tempValue` reaguje

- [ ] Scroll kolumny minut palcem (np. ustaw 47).
- [ ] **Oczekiwane:** spinner pokazuje wybraną wartość, ale pole "Godz. start" pod modalem **nie zmienia się jeszcze** (brak commit'u przed "Gotowe").

### 3. Tap "Gotowe" — commit

- [ ] Po wybraniu np. `13:47` tap "Gotowe" (prawa strona headera).
- [ ] **Oczekiwane:** Modal zamyka się (`fade out`), pole "Godz. start" pokazuje `13:47`.
- [ ] Forma SessionEditForm wykrywa zmianę — przycisk "Zapisz" aktywny.

### 4. Tap "Anuluj" — brak commitu

- [ ] Otwórz ponownie picker, scrolluj minuty na inną wartość (np. 22).
- [ ] Tap "Anuluj" (lewa strona headera).
- [ ] **Oczekiwane:** Modal zamyka się, pole nadal pokazuje STARY czas (`13:47` z scenariusza 3, nie nowo wybrany `22`).

### 5. Tap backdrop — traktowany jako Anuluj

- [ ] Otwórz picker, scrolluj na inną wartość.
- [ ] Tap poza bottom sheet (na ciemny obszar backdropu — np. środek ekranu wyżej).
- [ ] **Oczekiwane:** Modal zamyka się, pole pokazuje stary czas (bez commitu — backdrop = `handleClose`).

### 6. Powtórzenie dla "Godz. koniec"

- [ ] Scenariusze 1–5 powtórzone dla drugiego `TimePickerField` ("Godz. koniec").
- [ ] **Oczekiwane:** identyczne zachowanie — modal niezależny per pole, `tempValue` nie wycieka między polami.

### 7. Dark mode — kontrast bottom sheet

- [ ] Ustawienia → Tryb ciemny → Dark.
- [ ] Otwórz picker.
- [ ] **Oczekiwane:** bottom sheet ma tło `bg-navy` (#1E1B4B), tekst label biały-cream, przyciski purple czytelne. Spinner natywny iOS — sam zmienia tryb (system-driven, ale czyta `userInterfaceStyle="automatic"` z `app.json`).

---

## Scenariusze Android (sanity check — regresja)

### 8. System picker dialog (BEZ Modala)

- [ ] Edycja sesji → tap "Godz. start" → **natywny Android TimePicker dialog** (centered, Material design), BEZ bottom sheet.
- [ ] **Oczekiwane:** dialog systemowy z OK / Anuluj, brak custom Modala (gałąź `Platform.OS === 'android'`).
- [ ] **Oczekiwane:** spinner / clock-style picker (zgodnie z domyślem Androida).

### 9. Wybór i commit po OK

- [ ] Wybierz godzinę → OK.
- [ ] **Oczekiwane:** dialog zamyka się, pole pokazuje nową godzinę (Android commituje od razu w `handleAndroidChange`).

---

## Cross-device

- [ ] iOS Expo Go: scenariusze 1–7.
- [ ] Android Expo Go: scenariusze 8–9.

---

## Edge cases (opcjonalne)

- [ ] **Reopen po Anuluj** — `tempValue` re-inicjalizuje się z `value` przy `handleOpen` (nie pokazuje resztek po anulowanym scrollu).
- [ ] **Sesja cross-day** — godziny 23:55 → 00:10 (poprzedni helper `addDaysInAppTz` w formularzu): Modal pozwala wybrać 00:10, save działa (logika cross-day w formularzu, nie w picker'ze).
- [ ] **Disabled** — gdy `disabled={true}` (np. podczas zapisu), tap na pole nie otwiera Modala (`onPress={handleOpen}` jest blokowane przez `disabled` na `Pressable`).
- [ ] **A11y VoiceOver iOS** — naciągnij przyciski Anuluj/Gotowe palcem VoiceOver — czyta polskie labele.
- [ ] **Spinner pełna szerokość** — kolumna minut pokazuje 60 wartości (00–59) bez crop'u na iPhone SE (najmniejszy ekran 4.7" w supportowanej palecie Expo Go).
