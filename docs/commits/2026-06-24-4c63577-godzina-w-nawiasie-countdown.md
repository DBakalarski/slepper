# 4c63577: feat(kotki): pokaz konkretna godzine w nawiasie obok 'za ~X' dla do lozeczka i drzemki

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** n/a

## Co zostalo zrobione
- W karcie okna aktywnosci do wzglednego czasu "za ~X" dodana konkretna godzina zdarzenia w nawiasie:
  - **Do lozeczka** (Kotki Dwa) → `za ~1h 5min (14:30)` — godzina = `nextSleepAt − 15 min`
  - **Drzemka / Sen nocny** (Kotki Dwa) → `za ~1h 20min (14:45)` — godzina = `nextSleepAt`
  - **Drzemka za** (Galland) → `Drzemka za ~1h 20min (14:45)`
- Godzina pokazywana w obu stanach `CountdownRow`: przyszlym (`za ~X (HH:MM)`) i przeszlym (`~X temu (HH:MM)`).

## Zmienione pliki
- `packages/sleeper-web/src/components/ActiveWindowCard.tsx` — `CountdownRow` dostal prop `targetAt: Date` formatowany przez `formatTime`; dodane non-nullowe `nextSleepAt`/`cribAt` (zamiast inline optional chaining), zeby przekazac `Date` bez non-null assertion; badge Galland dostal godzine z `new Date(nowMs + remainingMs)`.

## Powod / kontekst
Prosba usera: obok wzglednego "za ~X" pokazac tez konkretna godzine, zeby rodzic widzial od razu o ktorej polozyc/uspic dziecko bez liczenia w glowie. Godzina formatowana TZ-safe przez `formatTime` (`Europe/Warsaw`, `HH:mm`).

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- lint: PASS (`expo lint`)
- test: n/a (zmiana czysto prezentacyjna w komponencie)
- runtime: do weryfikacji przez usera w Safari/Chrome
