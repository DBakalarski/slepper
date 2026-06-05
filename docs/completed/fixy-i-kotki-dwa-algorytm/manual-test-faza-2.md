# Manual Test Checklist: Faza 2 — Progress bar flicker fix

**Faza:** 2 (stabilizacja queryKey)
**Data:** 2026-05-29
**Tester:** dawid (solo dev)
**Commit:** `8e04e13`
**Urządzenie:** iPhone (Expo Go) — primary

---

## Setup

- [ ] `pnpm app:dev` z roota (lub `pnpm --filter sleeper-app start`) → QR code
- [ ] Otwórz Expo Go na iPhone → skanuj QR
- [ ] Zweryfikuj brak czerwonego error screena przy ładowaniu
- [ ] Zaloguj się (lub kontynuuj zalogowaną sesję)
- [ ] Przejdź na ekran "Dzisiaj" — upewnij się że istnieje co najmniej 1 dziecko z historią sesji

---

## Happy Path: ProgressBar stabilny przez 5 minut

> Cel: weryfikacja że fix queryKey eliminuje refetch loop i layout shift

- [ ] Otwórz ekran "Dzisiaj" z dzieckiem z przynajmniej 1 zakończoną sesją w historii
  - **Oczekiwany:** `ActiveWindowCard` widoczna z paskiem postępu (pomarańczowy) pod licznikiem
- [ ] Pozostaw ekran otwarty przez 5 minut (app na foreground, ekran nie wygasa)
  - **Oczekiwany:** Progress bar NIE skacze, nie znika i nie pojawia się ponownie
  - **Oczekiwany:** Licznik czasu okna aktywności rośnie płynnie
- [ ] Sprawdź czy nie ma nagłego layout shift (przerwy ~24px pod licznikiem)
  - **Oczekiwany:** Przestrzeń dla progress bara (h-2 = 8pt) widoczna zawsze, nawet gdy brak rekomendacji
  - **Weryfikacja:** Możesz wejść w stan "brak rekomendacji" — wyjmij kartę SIM / wyłącz internet → app pokazuje placeholder, wrapper utrzymuje wysokość

---

## Weryfikacja braku refetch loop (DevTools Network)

> Dostępne tylko w Expo Dev Client lub przez Metro bundler network inspector

- [ ] Włącz Metro DevTools — w terminalu `pnpm app:dev` sprawdź URL (zwykle http://localhost:8081)
- [ ] Opcjonalnie: Flip device → "Network" (jeśli Expo DevTools dostępne)
- [ ] Obserwuj requesty do Supabase przez 2-3 minuty w spoczynku (brak interakcji)
  - **Oczekiwany:** NIE ma powtarzającego się żądania `GET /rest/v1/sessions?...` co 30s
  - **Oczekiwany:** Sesje fetchwane TYLKO raz przy wejściu + po focusie ekranu (nie co tick timera)
  - **Akceptowalne:** 1-2 requesty przy powrocie na ekran (useFocusEffect cross-midnight check)

---

## Edge Cases: brak historii sesji

- [ ] Przetestuj z dzieckiem które NIE ma żadnej zakończonej sesji (nowe dziecko)
  - **Oczekiwany:** `ActiveWindowCard` pokazuje "Nowy dzień" zamiast licznika i progress bara
  - **Oczekiwany:** Brak błędu, brak pustego layout shift

---

## Edge Case: App lifecycle (background → foreground)

- [ ] Wejdź na ekran "Dzisiaj" z widocznym progress barem
- [ ] Przełącz app na background na 2 minuty (przycisk Home iPhone)
- [ ] Wróć na foreground
  - **Oczekiwany:** Progress bar nadal widoczny, licznik zaktualizowany
  - **Oczekiwany:** Brak layout shift przy powrocie (wrapper h-2 trzyma przestrzeń)
  - **Oczekiwany:** Brak "migania" (unmount/remount progress bara)

---

## Edge Case (opcjonalny): Cross-midnight test

> Wymaga zmiany TZ urządzenia — opcjonalne, wykona się przy naturalnym przekroczeniu północy

- [ ] Zmień TZ urządzenia na strefę ~23:55 (np. GMT+0 gdy jest ~21:55 Warsaw)
  - iPhone: Ustawienia → Ogólne → Data i godzina → wyłącz "Ustaw automatycznie" → zmień TZ
- [ ] Poczekaj aż zegarek systemowy przejdzie przez 00:00
- [ ] Wróć do app (foreground)
  - **Oczekiwany:** `useFocusEffect` wykrywa zmianę `dayKey` i invaliduje `['sessions']`
  - **Oczekiwany:** Sesje przeładowują się JEDEN raz (nie co tick timera)
  - **Oczekiwany:** Licznik "okno aktywności" resetuje się do sesji nowego dnia
- [ ] Przywróć TZ na "Ustaw automatycznie"

---

## Po teście

- [ ] Jeśli PASS — odznacz odpowiednie checkboxy w `fixy-i-kotki-dwa-algorytm-zadania.md` sekcja Faza 2
- [ ] Jeśli FAIL — utwórz wpis w `docs/active/fixy-i-kotki-dwa-algorytm/issues-faza-2.md` z opisem reprodukcji
