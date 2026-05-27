# Manual test checklist — Faza 2 (Children + sesje)

**Cel:** zweryfikować na fizycznym urządzeniu (Expo Go) scenariusze które wymagają interakcji UI / device-state.

**Wymagania:**
- Konto Supabase z migracjami 0001–0007 zaaplikowanymi.
- 2 telefony (lub telefon + emulator) zalogowane do tej samej rodziny — dla sync scenariuszy (Faza 4 → na razie nie wymagane, ale przygotuj).
- Sign-in jako user który ma minimum 1 dziecko dodane (jeśli brak — onboarding pokaże AddChildForm; dodaj).

---

## Scenariusz 1: Tap „Rozpocznij sen" → karta zmienia kolor

**Plan zadania:** `Weryfikacja: tap „Rozpocznij sen" → karta zmienia kolor i nagłówek`

### Kroki

1. Otwórz app w Expo Go, ekran "Dzisiaj".
2. Sprawdź że widoczna jest **pomarańczowa karta** „Okno aktywności" z czasem od końca ostatniej sesji (lub „Nowy dzień" jeśli brak historii).
3. Tap przycisk „Rozpocznij sen" (granatowy, na dole).

### Oczekiwane

- [ ] Pomarańczowa karta znika.
- [ ] Pojawia się **granatowa karta** „Drzemka w toku" z timerem `00:00:01` rosnącym co sekundę.
- [ ] Przycisk zmienia label na „Zakończ sen" (granatowy).
- [ ] QuickActions („Drzemka teraz", „Sen nocny", „Dodaj wstecz") są wyszarzone (disabled).
- [ ] Brak błędu w czerwonej linii pod CTA.

### Edge cases

- [ ] Tap „Drzemka teraz" (quick action) zamiast głównego CTA → ten sam efekt (typ = nap).
- [ ] Tap „Sen nocny" → granatowa karta pokazuje „Sen nocny w toku".

---

## Scenariusz 2: Zamknij i otwórz app → timer kontynuuje

**Plan zadania:** `Weryfikacja: zamknij i otwórz app → timer kontynuuje z poprawnym czasem`

### Kroki

1. Wystartuj sesję (z Scenariusza 1). Zanotuj czas timera (np. `00:00:42`).
2. Wyjdź z Expo Go całkowicie (swipe up + zabij z app switchera).
3. Odczekaj minimum 30 sekund.
4. Otwórz Expo Go ponownie, kliknij w projekt (lub last-used).

### Oczekiwane

- [ ] App otwiera się od razu na ekranie „Dzisiaj" (bez sign-in flow — sesja Supabase persists).
- [ ] Granatowa karta „Drzemka/Sen nocny w toku" pokazana.
- [ ] Timer pokazuje czas zgodny z (wyjście + odczekanie + bundler reload) ≈ original + 30s + nawigacja.
- [ ] Po sekundzie timer tika dalej.

### Edge cases

- [ ] Pełny restart telefonu z aktywną sesją → po starcie i sign-in (jeśli wymagany) timer dalej liczy z `start_at`.
- [ ] Tap „Pełny ekran" na granatowej karcie → routing do `/sleep-fullscreen`, duży timer, ekran nie gaśnie (keep-awake).
- [ ] W sleep-fullscreen tap „Wróć" → wraca do „Dzisiaj", timer fontu mały, dalej liczy.
- [ ] W sleep-fullscreen tap „Zakończ sen" → routing wraca do „Dzisiaj", aktywna karta znika, pojawia się pomarańczowa „Okno aktywności" z 0m.

---

## Scenariusz 3: „Dodaj wstecz" tworzy sesję w przeszłości

**Plan zadania:** `Weryfikacja: „Dodaj wstecz" tworzy sesję w przeszłości i pojawia się w agregatach „Dzisiaj"`

### Kroki

1. Otwórz „Dzisiaj" (brak aktywnej sesji — jeśli jest, zakończ).
2. Zanotuj wartości w karcie „Dzisiaj": `Sen nocny`, `Drzemki (N)`, `Najdł. aktywność`.
3. Tap „Dodaj wstecz" (3. quick action).
4. Modal się otwiera. Sprawdź pola:
   - Data: dzisiejsza `YYYY-MM-DD`
   - Typ: „Drzemka" (selected)
   - Start: `09:00`
   - Koniec: `10:30`
5. Tap „Zapisz sesję".

### Oczekiwane

- [ ] Modal zamyka się po success.
- [ ] Karta „Dzisiaj" pokazuje:
  - Drzemki: previous + 1g 30m, (N+1)
  - Najdł. aktywność: pozostaje lub rośnie (zależy od reszty dnia)
- [ ] W liście „Sesje dzisiaj" pojawia się nowy wiersz „Drzemka 09:00 → 10:30 1g 30m".

### Edge cases — walidacja

- [ ] Wprowadź Start `10:30` i Koniec `09:00` → po tap „Zapisz sesję" widoczny błąd „Koniec musi byc po starcie", modal nie zamyka się.
- [ ] Wprowadź datę `2099-01-01` (przyszłość) → błąd „Sesja nie moze byc w przyszlosci".
- [ ] Wprowadź datę `2025-13-45` (invalid format pattern OK, ale invalid date) → błąd „Sprawdz format daty i godzin".
- [ ] Wprowadź Start `25:99` → błąd format.
- [ ] Tap „Anuluj" → modal zamyka się, brak nowej sesji w liście.

### Edge cases — typ

- [ ] Wybierz „Sen nocny" przed zapisem → sesja pojawia się w agregacie „Sen nocny" zamiast „Drzemki".

---

## Scenariusz 4: Agregat sumy snu = suma sesji dziś

**Plan zadania:** `Weryfikacja: agregat „13g 35m" = suma wszystkich sesji z dziś (sprawdzić manualnie)`

### Kroki

1. Dodaj wstecz 3 sesje typu „Drzemka":
   - `08:00 → 09:30` (1g 30m)
   - `12:00 → 13:15` (1g 15m)
   - `16:00 → 17:00` (1g 0m)
2. Dodaj wstecz 1 sesję typu „Sen nocny":
   - `21:00 → 23:00` (2g 0m) — uwaga: jeśli aktualnie godzina < 21:00, ta sesja będzie z przyszłości — zmień na inny zakres minus godzina od now.
3. Sprawdź kartę „Dzisiaj".

### Oczekiwane

- [ ] Sen nocny: suma wszystkich `night_sleep` z dziś
- [ ] Drzemki: `3g 45m (3)` — suma trzech drzemek
- [ ] Najdł. aktywność: największa luka między sesjami (np. `2h 30m` między 09:30 → 12:00) lub od ostatniego endu do `now`.

### Walidacja matematyczna

Policz w głowie/kalkulatorze:
- [ ] Suma drzemki = 90 + 75 + 60 = 225 min = 3g 45m ✓
- [ ] Najdłuższa luka = max(`08:00 - startOfDay`, `12:00 - 09:30`, `16:00 - 13:15`, `21:00 - 17:00`, `now - 23:00`) → jeśli now > 23:00 to ostatnia, inaczej `21:00 - 17:00 = 4g`.

### Edge cases

- [ ] Dodaj sesję która zaczyna się wczoraj 23:00 a kończy dziś 06:00 → na karcie „Dzisiaj" tylko fragment od `00:00` do `06:00` = 6g 0m powinien być w Sen nocny.
- [ ] Aktywna sesja (w trakcie) jest doliczana do agregatu do `now`. Tikuje co 30s.

---

## Dodatkowe (nice-to-have, post-MVP polish)

- [ ] Test na drugim telefonie zalogowanym do tej samej rodziny: dodaj sesję na phone A → po pull-to-refresh / focus na phone B sesja widoczna (Faza 4 doda realtime).
- [ ] AddChildForm: dodaj dziecko z imieniem 50+ znaków → CHECK constraint `length(trim(name)) between 1 and 50` powinien zwrócić error.
- [ ] AddChildForm: dodaj dziecko z avatar_color spoza palety (manual via Supabase Studio insert) → regex CHECK `^#[0-9A-Fa-f]{6}$` powinien blokować.
- [ ] Wyloguj się → zaloguj jako inny user (innej rodziny) → nie widzisz dzieci/sesji obcej rodziny (RLS).

---

## Raportowanie

Po wykonaniu manualnym, zaznacz checkboxy w tym pliku oraz w `mvp-sleep-tracker-zadania.md` (sekcja Faza 2 — checkboxy `Weryfikacja:`).

Jeśli któryś scenariusz zawiódł — dodaj wpis w sekcji „Do poprawy po review fazy 2" w pliku zadań i wróć do dev-docs-execute.
