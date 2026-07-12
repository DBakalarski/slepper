# d6034b6: feat(push): klient liczy nap_schedule po mutacjach sesji

**Data:** 2026-07-12
**Branch:** feature/web-push-notifications
**Faza zadania:** web-push-notifications Task 2

## Co zostalo zrobione
- Nowy `nap-schedule.ts`: `computeNextSleepAt` (pure: rows + child + now -> Date|null; sesja w toku => null; throw algorytmu => null fail-safe) i `recomputeNapSchedule` (fetch 14 dni sesji + profil dziecka z bazy, upsert `nap_schedule`).
- `schedule-nap-side-effects.ts`: no-opy wypelnione — `rescheduleNapNotification` / `cancelNapNotificationSafe` / `rescheduleFromLastEnded` deleguja do wspolnego `recomputeSafe` (przeliczenie z bazy to scisle mocniejsza wersja kazdej z dawnych semantyk). Sygnatury bez zmian, `hooks.ts` nietkniety.
- Testy: `nap-schedule.test.ts` (5 casow, mock pakietow machine przez `vi.hoisted`), rewrite `schedule-nap-side-effects.test.ts` (delegacja + fail-safe + invariant brak expo-notifications). Stare testy no-op zastapione bo testowana funkcjonalnosc (no-op) celowo przestala istniec.

## Zmienione pliki
- `packages/sleeper-web/src/features/sessions/nap-schedule.ts` — nowy modul
- `packages/sleeper-web/src/features/sessions/__tests__/nap-schedule.test.ts` — nowe testy
- `packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` — rewrite z no-op na delegacje
- `packages/sleeper-web/src/features/sessions/__tests__/schedule-nap-side-effects.test.ts` — rewrite testow

## Powod / kontekst
Podejscie A ze specu: klient (urzadzenie mutujace sesje) liczy `nextSleepAt` bo ma kod algorytmu i swieze dane; serwer tylko wysyla. Mapping historii inline (bez `toLibSessions`) zeby przyjac waskie rows z selecta bez castow; `toLibProfile` reuzyty z adaptera.

## Walidacja
- typecheck: PASS
- test: PASS (54/54 w features/sessions)
- runtime: n/a (efekt widoczny dopiero z edge function + UI; manual smoke w Task 6/deploy)
