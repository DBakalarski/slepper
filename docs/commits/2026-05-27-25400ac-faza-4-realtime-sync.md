# 25400ac: feat(mvp-sleep-tracker): realtime sync sesji (Faza 4)

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 4 — Realtime sync

## Co zostalo zrobione

- Dodano migracje SQL `0009_realtime_publication.sql` ktora aktywuje replikacje na `public.sessions` w publikacji `supabase_realtime` (idempotent dzieki `do $$ ... exception when duplicate_object`). Alternatywa manualna w Supabase Studio -> Database -> Replication.
- Utworzono hook `useRealtimeSessions(childId)` w `src/features/sessions/useRealtimeSessions.ts`:
  - Subskrypcja `supabase.channel('sessions:child=${childId}').on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'child_id=eq.X' })`
  - Kazdy event (INSERT/UPDATE/DELETE) -> `queryClient.invalidateQueries({ queryKey: ['sessions'] })`
  - Cleanup przez `supabase.removeChannel(channel)` w useEffect return (coding-rules §13)
- Wpieto hook w `src/app/(app)/_layout.tsx` (subskrypcja na poziomie aktywnego dziecka z Zustand `useActiveChild`).
- Stworzono `manual-test-faza-4.md` z 8 scenariuszami testow manualnych dla two-device sync + offline->online resync.
- Zaktualizowano `mvp-sleep-tracker-zadania.md` (checkboxy implementacji [x], checkboxy "Weryfikacja:" pozostaly [ ] jako manual mobile testing).
- Zaktualizowano `mvp-sleep-tracker-kontekst.md` (log fazy 4).

## Zmienione pliki

- `sleeper-app/supabase/migrations/0009_realtime_publication.sql` — nowa migracja dodajaca `public.sessions` do `supabase_realtime`
- `sleeper-app/src/features/sessions/useRealtimeSessions.ts` — nowy hook, 45 LOC
- `sleeper-app/src/app/(app)/_layout.tsx` — import + wywolanie `useRealtimeSessions(activeChildId)`
- `docs/active/mvp-sleep-tracker/manual-test-faza-4.md` — checklist 8 scenariuszy
- `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-zadania.md` — checkboxy fazy 4 + notatki implementacyjne
- `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-kontekst.md` — log fazy 4

## Powod / kontekst

Faza 4 z planu MVP — drugi telefon musi widziec zmiany sesji w <2s bez recznego refresh. Stack: Supabase Realtime + TanStack Query invalidation. Konwencja "invalidate zamiast patchowania cache" zgodna z CLAUDE.md eliminuje cala klase bugow synchronizacji (out-of-order events, brakujace pola w postgres_changes payload).

Migracja SQL zamiast manual step w Studio — idempotent, reproducible dla nowych srodowisk (local supabase dev). User moze zaaplikowac migracje przez supabase CLI albo zostawic manual toggle w Studio jezeli projekt jest cloud-only bez CLI setup.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` -> 0 bledow)
- lint: PASS (`npm run lint` -> 0 errors, 0 warnings)
- runtime: pending — wymagany manual test two-device sync (Expo Go na 2 telefonach, oba na koncie tej samej rodziny), checklist w `manual-test-faza-4.md`
