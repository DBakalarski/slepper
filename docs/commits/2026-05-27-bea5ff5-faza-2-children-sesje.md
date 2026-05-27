# bea5ff5: feat(mvp-sleep-tracker): Faza 2 — children + sesje (rdzen MVP)

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 2 — Children + sesje (rdzen MVP)

## Co zostalo zrobione
- Migracja `0007_children_sessions.sql`: tabele `children` i `sessions` z partial unique index `sessions_one_active_per_child where end_at is null`, index `sessions(child_id, start_at desc)`, RLS przez `is_family_member()`, CHECK `end_at >= start_at`.
- Database types rozszerzone o `children` i `sessions` (recznie, bez supabase gen — brak remote login).
- Feature `children/`: `useChildren`, `useCreateChild` z auto-select dziecka, `useActiveChildStore` (Zustand persist AsyncStorage), `AddChildForm` (onboarding).
- Feature `sessions/`: `useSessions` (okno czasu), `useActiveSession`, `useLastEndedSession`, `useStartSession`+`useEndSession` z optimistic, `useUpdateSession`, `useDeleteSession`, `useInsertBackdatedSession` (bez optimistic), `useSessionTimer` (tick 1s, derived state), `BackdatedSessionModal` (text input HH:MM).
- `src/lib/time.ts`: `formatDuration`, `formatTimer`, `formatTime`, `formatRange`, `pluralizePL`, `startOfDayInAppTz`, `APP_TIMEZONE = 'Europe/Warsaw'`.
- Komponenty UI: `ActiveWindowCard`, `SleepInProgressCard`, `TodayStatsCard` (agregaty: night sleep, naps z count, najdluzsze okno aktywnosci), `BigActionButton`, `QuickActions`, `SessionListItem`.
- Ekran `app/(app)/sleep-fullscreen.tsx` z `activateKeepAwakeAsync` i auto-redirect na `/` gdy sesja znika.
- Refaktor `app/(app)/index.tsx` — kompozycja sekcji: header + NoFamily banner + incoming invitations + AddChildForm (gdy `children.length === 0`) + `ActiveChildSection` (Active/Window card + TodayStats + BigAction + QuickActions + lista 5 ostatnich sesji + modal backdated).
- `(app)/_layout.tsx`: `sleep-fullscreen` ukryty z tab bara przez `href: null`.

## Zmienione pliki
- `sleeper-app/supabase/migrations/0007_children_sessions.sql` — nowa migracja (children, sessions, RLS, indexy)
- `sleeper-app/src/lib/database.types.ts` — dodane `children` i `sessions` w `public.Tables`
- `sleeper-app/src/lib/time.ts` — nowy modul formaterow PL
- `sleeper-app/src/features/children/hooks.ts` — `useChildren`, `useCreateChild`, typ `Child`
- `sleeper-app/src/features/children/useActiveChild.ts` — Zustand persist
- `sleeper-app/src/features/children/components/AddChildForm.tsx` — onboarding
- `sleeper-app/src/features/sessions/hooks.ts` — pelen zestaw queries i mutations
- `sleeper-app/src/features/sessions/useSessionTimer.ts` — derived state timer
- `sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — modal sesji wstecz
- `sleeper-app/src/components/ActiveWindowCard.tsx`, `SleepInProgressCard.tsx`, `TodayStatsCard.tsx`, `BigActionButton.tsx`, `QuickActions.tsx`, `SessionListItem.tsx` — komponenty prezentacyjne
- `sleeper-app/src/app/(app)/sleep-fullscreen.tsx` — ekran pelnoekranowy
- `sleeper-app/src/app/(app)/index.tsx` — kompozycja ekranu Dzisiaj
- `sleeper-app/src/app/(app)/_layout.tsx` — `sleep-fullscreen` poza tab bar

## Powod / kontekst
Rdzen MVP — bez tego apka nie ma wartosci uzytkowej. Zgodnie z planem `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-plan.md` Faza 2 (Effort: XL).

### Odchylenia od planu
- Numer migracji `0007` (nie `0002` z planu) — utrzymuje chronologie po fixach Fazy 1 (`0005`, `0006`).
- Modal „Dodaj wstecz" uzywa TextInput `HH:MM` zamiast `@react-native-community/datetimepicker`. Powod: coding-rules §8 — nowa zaleznosc wymaga zgody usera, plan Fazy 2 jej nie wymienia. DateTimePicker dochodzi w Fazie 3 razem z day pickerem historii.
- `database.types.ts` recznie — brak supabase CLI dowiazanego do remote project.
- Brak testow jednostkowych — Faza 2 nie ma checkboxow `Test:`, CLAUDE.md wskazuje ze setup testow dochodzi gdy bedzie potrzebny.

## Walidacja
- typecheck: PASS (0 bledow)
- lint: PASS (0 errors, 0 warnings — naprawiono 2 warningi `react-hooks/exhaustive-deps` przez `useMemo`)
- test: n/a (brak setupu Jest/Vitest, plan nie wymaga)
- runtime: pending — manual mobile testing po Fazie 1 (tj. Faza 1 + 2 razem)
