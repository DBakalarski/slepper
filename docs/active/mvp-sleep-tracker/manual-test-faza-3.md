# Manual Test — Faza 3 (Historia + edycja)

**Branch:** `feature/mvp-sleep-tracker`
**Data:** 2026-05-27
**Środowisko:** Expo Go na fizycznym urządzeniu (iOS/Android)

## Setup

1. Zaloguj się jako user z istniejącą rodziną i co najmniej jednym dzieckiem.
2. Upewnij się, że masz w historii kilka sesji z różnych dni (jeśli nie — użyj "Dodaj wstecz" na ekranie Dzisiaj, dodaj 2-3 sesje z wczoraj i jedną z dziś).

## Scenariusze

### 1. Link „Pokaż wszystkie" + nawigacja do historii

- [ ] Na ekranie Dzisiaj (z min. 1 sesją dziś) widać sekcję „Sesje dzisiaj" z linkiem „Pokaz wszystkie" po prawej.
- [ ] Tap linku → przejście na ekran „Historia".

### 2. History — day picker

- [ ] Na ekranie Historia domyślnie aktywny chip „Wybierz dzien" + pole „Dzien" z dzisiejszą datą.
- [ ] Tap pola „Dzien" → otwiera się natywny date picker (iOS inline / Android modal).
- [ ] Wybierz wczoraj → lista sesji pokazuje TYLKO sesje z wczoraj.
- [ ] Wybierz datę bez sesji → pojawia się komunikat „Brak sesji tego dnia."
- [ ] Próba wybrania dnia w przyszłości jest zablokowana (maximumDate).

### 3. History — tryb „Ostatnie 14 dni"

- [ ] Tap chipa „Ostatnie 14 dni" → tryb się przełącza, day picker znika.
- [ ] Lista pokazuje sesje pogrupowane po dniu (nagłówek sekcji „DD.MM").
- [ ] Najnowszy dzień jest pierwszy (sortowanie desc).
- [ ] Sesje w obrębie dnia posortowane desc po start_at.

### 4. SessionListItem → ekran edycji

- [ ] Tap pojedynczej sesji (z dowolnej listy) → przejście do ekranu „Edytuj sesje".
- [ ] Formularz prefilled wartościami sesji: typ, data startu, godziny start/koniec, notatki (jeśli były).
- [ ] Anuluj → powrót do poprzedniego ekranu, bez zmian w bazie.

### 5. Edycja sesji + odzwierciedlenie w agregatach

- [ ] Otwórz sesję z dziś o czasie trwania ~1h.
- [ ] Zmień godzinę startu na taką, aby trwanie wzrosło do ~2h.
- [ ] Tap „Zapisz zmiany" → powrót na poprzedni ekran.
- [ ] Wróć na ekran Dzisiaj → karta „Dzisiaj" (`TodayStatsCard`) pokazuje wyższą sumę o tę godzinę.
- [ ] Sesja na liście „Sesje dzisiaj" pokazuje nowe czasy.

### 6. Walidacja formularza edycji

- [ ] Ustaw koniec WCZEŚNIEJ niż start → tap Zapisz → pokazuje się komunikat „Koniec sesji musi byc po starcie."
- [ ] Ustaw start w przyszłości → komunikat „Start sesji nie moze byc w przyszlosci." (jeśli da się wybrać; maximumDate blokuje na dacie, ale picker godziny tego nie sprawdza).

### 7. Edycja typu sesji

- [ ] Otwórz sesję typu „Drzemka" → przełącz chip na „Sen nocny" → Zapisz.
- [ ] Wróć na Dzisiaj → suma „Drzemki" spadła, „Sen nocny" wzrosła.

### 8. Notatki

- [ ] Otwórz sesję bez notatki → wpisz tekst „Lekko niespokojny sen" → Zapisz.
- [ ] Otwórz tę samą sesję ponownie → pole notatki zawiera wpisany tekst.
- [ ] Wyczyść tekst i Zapisz → notatka znika (null w bazie).

### 9. Aktywna sesja (end_at = null)

- [ ] Rozpocznij sesję (Big Action Button „Rozpocznij sen") na ekranie Dzisiaj.
- [ ] Otwórz tę aktywną sesję na liście (jeśli widoczna) lub przez Historia → otwórz ostatnią sesję.
- [ ] Widać banner „Sesja w toku" i nie ma pól „Godz. koniec" / „Data konca".
- [ ] Można zmienić typ i start, ale nie koniec.
- [ ] Zapisz → wraca na poprzedni ekran, sesja nadal aktywna (czerwony badge „trwa" na liście).

### 10. Usuwanie sesji

- [ ] Otwórz dowolną zakończoną sesję → tap „Usun sesje".
- [ ] Pojawia się natywny dialog (`Alert.alert`) z pytaniem „Usunac sesje?" i przyciskami Anuluj / Usun.
- [ ] Tap „Anuluj" → dialog znika, sesja nadal istnieje.
- [ ] Tap „Usun" → sesja usunięta, powrót na poprzedni ekran.
- [ ] Sesja znika z listy „Sesje dzisiaj" oraz z historii.
- [ ] Agregaty „Dzisiaj" zaktualizowane (suma spadła).

### 11. Multi-device (jeśli masz drugi telefon)

- [ ] Na telefonie B otwórz tę samą sesję, którą edytujesz na telefonie A.
- [ ] Zapisz na A → na B (po pull-to-refresh lub powrocie do listy) widać aktualne wartości.
- [ ] (Faza 4 doda realtime → instant update bez refetch.)

## Wynik

- [ ] Wszystkie scenariusze PASS → zatwierdzić Fazę 3 do mergea.
- [ ] FAIL: opisać poniżej.

### Notatki z testów

(wypełnić podczas testowania)
