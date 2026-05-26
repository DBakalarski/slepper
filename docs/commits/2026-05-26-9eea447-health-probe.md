# 9eea447: feat(setup): add Supabase health probe on Today screen

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 0 — Setup projektu

## Co zostalo zrobione
- Dodano `useEffect` w `src/app/(app)/index.tsx` ktory wykonuje `supabase.from('_health').select('*').limit(1)` z `AbortController`
- Klasyfikacja wyniku:
  - `error` undefined LUB `error.code` w `['PGRST205', '42P01']` (relation does not exist) -> status `ok`
  - `error.message` zawiera `jwt`/`unauthorized` -> status `unauthorized` (czerwony badge)
  - inne -> status `error` z kodem i wiadomoscia
- Wizualizacja: biala karta z `text-purple` (OK) lub `text-orange` (blad)
- Discriminated union `HealthStatus = 'checking' | 'ok' | 'unauthorized' | 'error'`

## Zmienione pliki
- `sleeper-app/src/app/(app)/index.tsx` — health probe (z 13 linii do ~80)

## Powod / kontekst
Plan Fazy 0 wymaga weryfikacji: `supabase.from('_health').select()` musi zwracac odpowiedz bez 401. Wbudowane w UI zeby user mogl wizualnie potwierdzic w Expo Go zamiast czytac terminal log.

Brak tabeli `_health` w Supabase jest oczekiwany (nie tworzymy jej) — PGRST205/42P01 to dowod ze klient sie polaczyl i auth dziala.

## Walidacja
- typecheck: PASS
- test: n/a
- runtime: weryfikacja w Expo Go zaplanowana po wpisaniu kluczy `.env` przez usera
