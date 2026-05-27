# 027b735: fix(mvp-sleep-tracker): poprawne wyswietlanie PostgrestError w UI

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 2 — Children + sesje (post-cykl-2-review fix)

## Co zostalo zrobione

Naprawione wyswietlanie bledow z Supabase w UI. Wczesniej kazdy realny
blad backendowy (PGRST205, RLS, 23505) byl maskowany jako `'unknown'`,
co utrudnialo manual testing — uzytkownik nie mial sposobu zeby
rozroznic "brak migracji w bazie" od "RLS odrzucil insert" od "siec".

Helper `extractErrorMessage(unknown): string` w `src/lib/`:
- `error instanceof Error` -> `.message`
- plain object z `.code/.message/.details` (Supabase PostgrestError shape)
  -> `[CODE] message (details)`
- cokolwiek innego -> `'unknown'`

Uzycia podmienione:
- `AddChildForm` — Blad zapisu dziecka
- `index.tsx` — Blad startu / Blad zakonczenia sesji (2 miejsca)
- `BackdatedSessionModal` — Blad zapisu sesji wstecz

Zostawione bez zmian (semantyka inna niz "pokaz blad userowi"):
- `translate-family-error.ts`, `translate-session-error.ts` — klasyfikacja
  errora przez code-matching, fallback na pusty string
- `sign-in.tsx`, `sign-up.tsx` — `translateAuthError(.message)` z null
  fallback (null = "brak bledu", nie "unknown")

## Zmienione pliki

- `sleeper-app/src/lib/extract-error-message.ts` — nowy helper
- `sleeper-app/src/app/(app)/index.tsx` — start/end session error display
- `sleeper-app/src/features/children/components/AddChildForm.tsx` — create child error
- `sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — backdated insert error

## Powod / kontekst

Manual testowanie Fazy 2 (kontynuacja po review cyklu 2): user proboje
dodac dziecko, dostaje `"Blad zapisu: unknown"`. Diagnoza wymaga otwarcia
debug remote JS w Expo Go, co jest niewygodne. Naprawa drugiej zmiany w
UI helpera odkryla ze realny blad to `[PGRST205] Could not find the table
'public.children' in the schema cache` — czyli migracje 0007+0008 nie sa
w Supabase Cloud (wgrane recznie przez SQL Editor po tym fixie).

Realny bug w kodzie cyklu 1 fix Fazy 2 — review pominal to bo wzorzec
`instanceof Error ? .message : 'unknown'` jest spojny z Faza 1
(`profile.tsx`) i zostal scopnowany jako akceptowalny. Tutaj dopiero
PostgrestError objawil sie jako shape != Error.

## Walidacja

- typecheck: PASS
- lint: PASS
- runtime: user przeklikal na fizycznym iPhone (Expo Go) — komunikat
  `[PGRST205] Could not find the table 'public.children' in the schema cache`
  poprawnie wyswietlony, diagnoza prosta
