# Manual Test Checklist: Integracja sleeper-machine-kotki + toggle algorytmu

**Faza/IU:** 5
**Data:** 2026-05-29
**Tester:** dawid (solo dev)
**Urządzenia:** iPhone X (iOS 17) — primary

---

## Setup

- [ ] `pnpm app:dev` z roota — start metro bundler
- [ ] Otwórz Expo Go na iPhone → skanuj QR
- [ ] Zweryfikuj brak czerwonego screena (app ładuje się poprawnie)
- [ ] Upewnij się, że masz w bazie dziecko w wieku ~9 miesięcy (do testu toggle)

---

## Happy Path — Toggle algorytmu

### Scenariusz 1: Switch na Kotki Dwa

- [ ] **Krok 1:** Na ekranie "Dzisiaj" — zapamiętaj aktualną wartość okna czuwania ("Drzemka za Xm" lub brak)
  - **Oczekiwany:** Wartość pochodzi z algorytmu Galland (adaptywna, ~2.5–4h w zależności od historii)
- [ ] **Krok 2:** Przejdź do edycji dziecka (np. przez profil lub ustawienia)
  - **Oczekiwany:** Otwiera się EditChildForm z widoczną sekcją "Algorytm rekomendacji"
- [ ] **Krok 3:** Sprawdź stan początkowy sekcji "Algorytm rekomendacji"
  - **Oczekiwany:** Chip "Naukowy (Galland)" podświetlony (navy bg, cream text), "Kotki Dwa" nieaktywny
- [ ] **Krok 4:** Tap w chip "Kotki Dwa"
  - **Oczekiwany:** Chip "Kotki Dwa" zmienia się na aktywny (navy bg), "Naukowy (Galland)" nieaktywny — zmiana widoczna natychmiast w UI (local state)
- [ ] **Krok 5:** Tap "Zapisz"
  - **Oczekiwany:** Spinner ActivityIndicator podczas zapisu, następnie zamknięcie/powrót; brak komunikatu błędu
- [ ] **Krok 6:** Wróć na ekran "Dzisiaj"
  - **Oczekiwany:** Wartość okna czuwania zmieniła się — Kotki Dwa = fixed lookup table (np. 9m = ~3h fixed), Galland = adapted z historii. Różnica zauważalna szczególnie gdy historia snu odbiegała od normy.
  - **Verify:** Wartość `currentWakeWindowDuration` w karcie aktywnego okna powinna być stała/różna od poprzedniej

### Scenariusz 2: Switch z powrotem na Galland

- [ ] **Krok 1:** Wróć do EditChildForm dla tego samego dziecka
  - **Oczekiwany:** Chip "Kotki Dwa" jest podświetlony (persist z poprzedniego zapisu)
- [ ] **Krok 2:** Tap w chip "Naukowy (Galland)"
  - **Oczekiwany:** "Naukowy (Galland)" staje się aktywny
- [ ] **Krok 3:** Tap "Zapisz"
  - **Oczekiwany:** Zapis bez błędu
- [ ] **Krok 4:** Wróć na "Dzisiaj"
  - **Oczekiwany:** Wartości okna czuwania wróciły do wartości Galland z Scenariusza 1 (lub zbliżonych)

### Scenariusz 3: Persist w bazie (po refresh app)

- [ ] **Krok 1:** Ustaw dziecko na algorytm "Kotki Dwa" i zapisz (jak wyżej)
- [ ] **Krok 2:** Kill app (swipe up w multitasking) → otwórz ponownie
  - **Oczekiwany:** App ładuje się normalnie, sesja zachowana (AsyncStorage)
- [ ] **Krok 3:** Przejdź do EditChildForm dla tego dziecka
  - **Oczekiwany:** Chip "Kotki Dwa" nadal podświetlony (wartość persist w bazie i odczytana przy fetchu)
- [ ] **Krok 4:** Verify ekran "Dzisiaj" — rekomendacje z Kotki Dwa aktywne
  - **Verify:** Supabase Studio → `children` table → wiersz dziecka → kolumna `algorithm` = `'kotki_dwa'`

---

## Edge Cases

### Pending state

- [ ] Tap "Kotki Dwa" → tap "Zapisz" → PODCZAS zapisu (spinner widoczny):
  - **Oczekiwany:** Wszystkie chipy i inputy są `disabled` (niepressable, szary wygląd przycisku Zapisz)
  - **Oczekiwany:** Brak możliwości wysłania duplikatowego requestu

### Error state

- [ ] Wyłącz WiFi/sieć → zmień algorytm → tap "Zapisz"
  - **Oczekiwany:** Brak spinnera po timeout lub komunikat błędu: "Blad zapisu: [opis]"
  - **Oczekiwany:** Formularz pozostaje otwarty z wybranym algorytmem (local state zachowany)
- [ ] Włącz sieć z powrotem → tap "Zapisz" ponownie
  - **Oczekiwany:** Zapis działa normalnie

### Wiele dzieci

- [ ] Jeśli jest >1 dziecko: zmień algorytm dla dziecka A na "Kotki Dwa", dziecko B pozostaw "Galland"
  - **Oczekiwany:** Po przełączeniu aktywnego dziecka (przez HomeHeader selektor), każde dziecko pokazuje swój algorytm niezależnie
  - **Verify:** Supabase Studio → dwa wiersze w `children` z różnymi wartościami `algorithm`

---

## Dark mode

- [ ] iPhone Settings → Display → Dark Mode → wróć do EditChildForm
  - **Oczekiwany:** Chipy algorytmu czytelne w dark mode:
    - Aktywny chip: navy bg + cream text ✓
    - Nieaktywny chip: transparent bg + border + cream text (z `dark:text-cream`) ✓
  - **Oczekiwany:** Opis algorytmu (`text-purple`) widoczny (sprawdź kontrast — komentarz z review)

---

## Accessibility (VoiceOver)

- [ ] iPhone Settings → Accessibility → VoiceOver → ON
- [ ] Nawiguj do sekcji "Algorytm rekomendacji" w EditChildForm
  - **Oczekiwany:** VoiceOver czyta "Algorytm Naukowy Galland, przycisk" / "Algorytm Kotki Dwa, przycisk"
  - **UWAGA:** Chipy NIE mają `accessibilityState={{ selected }}` — VoiceOver nie informuje o stanie zaznaczenia. To znany P3-nit (patrz review-faza-5.md). Workaround: nazwa labela zawiera kontekst.

---

## Supabase verification

- [ ] Supabase Studio → Table Editor → `children` → sprawdź kolumna `algorithm`
  - **Oczekiwany:** Wartość = `'galland'` lub `'kotki_dwa'` (nie null, nie inny string — CHECK constraint)
- [ ] Supabase Studio → Logs: brak unhandled errors przy UPDATE children

---

## Po teście

- [ ] Issue found? Stwórz wpis w `docs/active/fixy-i-kotki-dwa-algorytm/issues-faza-5.md`
- [ ] Jeśli wszystko PASS — odznacz checkboxy Weryfikacja: w zadania.md
