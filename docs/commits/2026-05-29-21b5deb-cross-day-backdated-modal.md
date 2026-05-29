# 21b5deb: fix(fixy-i-kotki-dwa-algorytm): cross-day editing sesji nocnej w BackdatedSessionModal

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 1 — Cross-day editing — BackdatedSessionModal

## Co zostało zrobione

- Dodano helper `addDaysInAppTz(dayKey: string, n: number): string` w `lib/time.ts` — TZ-safe przesunięcie dnia YYYY-MM-DD o n dni (przez `addDays` z date-fns + `fromZonedTime`/`toZonedTime`; poprawnie obsługuje DST).
- `BackdatedSessionModal`: prywatny helper `parseTimeMinutes(hhmm)` do porównania godzin (np. "22:00" → 1320) bez tworzenia obiektów Date.
- W `handleSubmit` dla `type==='night_sleep'`: jeśli `endTime <= startTime` (godzinowo), `endDate = addDaysInAppTz(date, 1)` — sesja 22:00→06:30 zapisuje się jako start=N 22:00, end=N+1 06:30.
- `handleTypeChange` zamiast inline `setType` — przy switchu na `night_sleep` ustawia defaults `19:30`/`06:30`, przy powrocie do `nap` resetuje na `09:00`/`10:30`.
- Hint cross-day: `"Jesli koniec ≤ start, zapis na nastepny dzien (np. 22:00 → 06:30)"` — widoczny tylko gdy `type === 'night_sleep'`.

## Zmienione pliki

- `packages/sleeper-app/src/lib/time.ts` — nowy eksport `addDaysInAppTz`
- `packages/sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — cross-day logika, defaults night_sleep, hint UI

## Powód / kontekst

Bug: sesja nocna 22:00→06:30 failowała walidacją "Koniec musi być po starcie" bo obie daty używały tej samej daty bazowej. Fix automatycznie wykrywa cross-day dla `night_sleep` i przesuwa `endDate` o 1 dzień gdy `endTime <= startTime`.

## Walidacja

- typecheck: PASS (0 błędów)
- test: n/a (brak checkboxów Test: w Fazie 1)
- lint: PASS
- runtime: manual test w Expo Go (checkboxy Weryfikacja: — do review)
