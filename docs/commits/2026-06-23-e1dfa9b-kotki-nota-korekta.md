# e1dfa9b: feat(sleeper-web): nota o korekcie okna aktywnosci (Kotki Dwa)

**Data:** 2026-06-23
**Branch:** main
**Faza zadania:** n/a (drobny feature UX, follow-up do 0f18eeb)

## Co zostalo zrobione
- W `ActiveWindowCard` (tryb Kotki Dwa) pod dwoma odliczaniami dodana krotka nota:
  "Okno liczone od pobudki — krótsza drzemka przesuwa łóżeczko i sen wcześniej."
- Wyjasnia mechanizm korekty: okna aktywnosci sa stale i liczone od momentu pobudki, wiec realnie krotsza drzemka → wczesniejsza pobudka → wczesniejszy kolejny sen i odlozenie do lozeczka.

## Zmienione pliki
- `packages/sleeper-web/src/components/ActiveWindowCard.tsx` — dodany wiersz `Text` z nota (tylko gala kotki_dwa, w bloku rozbicia okna).

## Powod / kontekst
User: dodac info o korekcie w Kotki Dwa (krotsza drzemka = wczesniej spac), tekst krotki, dane z przewodnika snu.

Zrodlo (przewodnik snu, rozdz. "Jak ustalic harmonogram dnia"):
- "Wybierz stala godzine budzenia (...) codziennie zaczynaj dzien o tej samej porze."
- "Sledz okna aktywnosci z tabelki OD MOMENTU kiedy dziecko sie obudzi do momentu kiedy spi."
- "Odkladaj do lozeczka na sen (...) na 15min przed koncem okna aktywnosci."

## Algorytm — bez zmian
`recommendKotkiDwa` juz kotwiczy okno na realnym koncu ostatniej drzemki:
`lastWakeMs` = max(end realnych drzemek dzis), `nextSleepAt = lastWakeMs + currentWakeWindowDuration` (recommender.ts:138-145). Krotsza drzemka → wczesniejsze `nextSleepAt` automatycznie. Zmiana algorytmu zbedna — korekta jest wbudowana w model "okno od pobudki".

## Walidacja
- typecheck: PASS
- lint: PASS
- test: PASS (161/161 vitest)
- build + invariants: PASS (`pnpm web:build:check` -> Exported: dist)
- runtime: nie weryfikowano on-device (deploy Vercel po push)
