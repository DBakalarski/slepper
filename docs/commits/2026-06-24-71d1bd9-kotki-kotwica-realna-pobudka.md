# 71d1bd9: fix(kotki): kotwicz okno aktywności na realnej pobudce, nie targetWakeTime

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** n/a (bugfix zgłoszony przez usera — Wojtek 8m)

## Co zostało zrobione
- Algorytm Kotki Dwa kotwiczył okno aktywności na `targetWakeTime` (lub default 07:00), całkowicie ignorując realny koniec snu nocnego. Wojtek wstał 05:45, ale dostawał pierwszą drzemkę o 10:00 (07:00 + 3h okno dla 8m) zamiast 08:45.
- Dodany helper `findRealMorningWake(history, now)` — bierze najpóźniejszy koniec sesji `NIGHT`, która skończyła się dziś rano (`sameCalendarDay(end, now)` i `end <= now`).
- `morningWake` = realna pobudka z **priorytetem** nad `targetWakeTime`; fallback na target/07:00 tylko gdy brak takiej sesji (świeże dziecko, dzień bez zalogowanego snu nocnego).
- Fix naprawia jednocześnie live `nextSleepAt` i cały plan dnia, bo `forwardPass` kotwiczy się na poprawnym `morningWake`. Pora snu nocnego pozostaje naturalną konsekwencją okien czuwania (zgodnie z życzeniem usera — nie sztywna).

## Zmienione pliki
- `packages/sleeper-machine-kotki/src/recommender.ts` — nowy helper `findRealMorningWake()` + użycie go jako kotwicy `morningWake`.
- `packages/sleeper-machine-kotki/tests/recommender.test.ts` — 3 testy regresji: realna pobudka (Wojtek 08:45), priorytet nad targetWakeTime, fallback gdy brak snu nocnego.

## Powód / kontekst
Bug zgłoszony przez usera ze screenshotem: Wojtek (8m, pobudka 05:45) miał rekomendację snu ~10:00 bez jasnej podstawy. Root cause: `napsDoneToday()` filtrowało tylko `NAP`, więc koniec sesji `NIGHT` nigdy nie aktualizował kotwicy okna — algorytm liczył od docelowej/domyślnej 07:00. Efekt po fixie: drzemka 08:45 → 13:37 → sen nocny 18:45 (wszystko od realnej pobudki).

## Walidacja
- typecheck: PASS (`sleeper-web tsc --noEmit` 0 błędów; kotki build PASS)
- test: PASS (kotki 52/52, w tym 3 nowe; web 162/162)
- runtime: zweryfikowane skryptem repro — `nextSleepAt: 08:45` (przed: 10:00)
