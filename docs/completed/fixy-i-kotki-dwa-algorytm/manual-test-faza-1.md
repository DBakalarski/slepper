# Manual Test Checklist: Cross-day editing — BackdatedSessionModal

**Faza/IU:** Faza 1
**Data:** 2026-05-29
**Tester:** dawid (solo dev)
**Urządzenia:** iPhone (iOS) — Expo Go

## Setup

- [ ] `pnpm app:dev` w roocie — sprawdź QR code
- [ ] Otwórz Expo Go na iPhone → skanuj QR
- [ ] Verify app załadowała się bez czerwonego screena

---

## Happy Path: Sesja nocna cross-day

- [ ] Na ekranie "Dzisiaj" naciśnij "Dodaj sesję wstecz" (lub odpowiednik w UI)
  - **Oczekiwany:** Otwiera się BackdatedSessionModal
- [ ] Wybierz chip "Sen nocny"
  - **Oczekiwany:** Pola automatycznie ustawiają się na Start=19:30, Koniec=06:30
  - **Oczekiwany:** Pod polami czasów pojawia się hint: "Jesli koniec ≤ start, zapis na nastepny dzien (np. 22:00 → 06:30)"
- [ ] Zmień Start na 22:00, Koniec zostaw 06:30
  - **Oczekiwany:** Pole Data pokazuje dzisiejszą datę (YYYY-MM-DD format)
- [ ] Naciśnij "Zapisz sesję"
  - **Oczekiwany:** Modal zamknięty, powrót do ekranu głównego
  - **Verify:** Supabase Studio → tabela `sessions` → nowy rekord z `start_at` = dziś 22:00 Warsaw (UTC: 20:00) i `end_at` = jutro 06:30 Warsaw (UTC: 04:30 następnego dnia)
  - **Verify:** W UI sesja widoczna od 22:00 do 06:30 (cross-day)

## Edge Case: nocna 22:00 → 06:30 (różne godziny, standardowe)

- [ ] Otwórz modal ponownie → chip "Sen nocny"
- [ ] Data: data sprzed 2 dni, Start: 22:00, Koniec: 06:30
  - **Oczekiwany:** Zapis powiedzie się; end_at = data sprzed 1 dnia 06:30

## Edge Case: nocna graniczna 23:59 → 00:01

- [ ] Sen nocny, Start: 23:59, Koniec: 00:01
  - **Oczekiwany:** Zapis powiedzie się (cross-day); sesja trwa 2 minuty

## Happy Path: Drzemka same-day (regresja)

- [ ] Otwórz modal → chip "Drzemka"
  - **Oczekiwany:** Pola ustawiają się na Start=09:00, Koniec=10:30
  - **Oczekiwany:** Hint cross-day NIE jest widoczny
- [ ] Zostaw wartości domyślne (lub wpisz 09:00 / 10:30) → "Zapisz sesję"
  - **Oczekiwany:** Zapis powiedzie się; start_at i end_at tego samego dnia
  - **Verify:** Supabase Studio: `start_at` i `end_at` w ramach tej samej doby

## Edge Case: drzemka — błędna kolejność (09:00 → 08:30)

- [ ] Chip "Drzemka", Start: 09:00, Koniec: 08:30 → "Zapisz sesję"
  - **Oczekiwany:** Błąd walidacji "Koniec musi byc po starcie" (NIE cross-day, bo typ = nap)

## Edge Case: Sen nocny — oba czasy identyczne (22:00 → 22:00)

- [ ] Sen nocny, Start: 22:00, Koniec: 22:00 → "Zapisz sesję"
  - **Oczekiwany:** Zapis powiedzie się; sesja 24h (start N 22:00, end N+1 22:00). Akceptowalne edge case.

## Edge Case: Switch chip Drzemka → Sen nocny → Drzemka

- [ ] Otwórz modal, wybierz "Sen nocny" → zweryfikuj 19:30/06:30 + hint
- [ ] Wybierz "Drzemka" → zweryfikuj 09:00/10:30 + brak hintu
- [ ] Wybierz "Sen nocny" ponownie → zweryfikuj powrót do 19:30/06:30 + hint

## Validation UI

- [ ] Data: wpisz niepoprawny format (np. "2026/05/29") → "Zapisz sesję"
  - **Oczekiwany:** Błąd "Sprawdz format daty i godzin (YYYY-MM-DD, HH:MM)"
- [ ] Godzina: wpisz "9:00" (bez zera) → "Zapisz sesję"
  - **Oczekiwany:** Błąd formatu
- [ ] Data w przyszłości (jutro) → "Zapisz sesję"
  - **Oczekiwany:** Błąd "Sesja nie moze byc w przyszlosci"

## Dark mode

- [ ] iPhone Settings → Display → Dark Mode → wróć do app → otwórz modal
  - **Oczekiwany:** Tło modalu ciemne (`dark-card`), tekst i pola czytelne, hint text widoczny

## Keyboard

- [ ] Tap w pole "Data" — klawiatura numeryczna otwiera się
  - **Oczekiwany:** `KeyboardAvoidingView` przesuwa formularz — przycisk "Zapisz sesję" widoczny

## Po teście

- [ ] Wszystko PASS → odznacz checkboxy Weryfikacja: w zadaniach-faza-1 (linie 53-54)
- [ ] Znaleziono problemy? Opisz w sekcji poniżej lub w issues-faza-1.md

---

## Wyniki testu

_Wypełnij po wykonaniu:_

| Scenariusz | Status | Uwagi |
|---|---|---|
| Sesja nocna cross-day 22:00→06:30 | | |
| Drzemka same-day regresja | | |
| Edge case 23:59→00:01 | | |
| Switch chip nocna/drzemka | | |
| Dark mode modal | | |
