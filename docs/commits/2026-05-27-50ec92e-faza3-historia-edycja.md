# 50ec92e: feat(mvp-sleep-tracker): historia + edycja sesji (Faza 3)

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 3 — Historia + edycja

## Co zostalo zrobione
- Ekran `history.tsx` z dwoma trybami:
  - „Wybierz dzien" — natywny date picker (max = today), FlatList sesji wybranego dnia
  - „Ostatnie 14 dni" — SectionList z grupowaniem po dniu (`dayKeyInAppTz`)
- Ekran `session/[id].tsx`:
  - Formularz edycji (`useState`): typ (chipy), data startu, godz. start/koniec, notatki
  - Walidacja: start ≤ now, end ≤ now, end > start
  - `Alert.alert` z confirm na usuwanie (przyciski Anuluj / Usun destructive)
  - Banner „Sesja w toku" dla aktywnej sesji (end_at = null) — pola end ukryte, update nie wysyla `end_at`
- `useSessionById(id)` — nowy hook (queryKey `['session', id]`) dla fetch jednej sesji
- `useUpdateSession` / `useDeleteSession` invalidiuja klucz `['session', id]` dodatkowo do listy
- Komponenty `DatePickerField` / `TimePickerField` — wrappery `@react-native-community/datetimepicker` (iOS inline / Android modal, kontrolowane wartoscia)
- `SessionListItem` klikalny przez `Link asChild + Pressable` → `/session/[id]`, opcja `disableNavigation` na przyszly read-only kontekst
- Helpery `time.ts`: `formatDateShort`, `formatDateNoYear`, `dayKeyInAppTz` (TZ-safe przez `toZonedTime`)
- Link „Pokaz wszystkie" w sekcji „Sesje dzisiaj" na `index.tsx` → `/history`
- `(app)/_layout.tsx`: `session/[id]` ukryta z tab bara (`href: null`)

## Zmienione pliki
- `sleeper-app/package.json` + `package-lock.json` — `@react-native-community/datetimepicker@8.4.4` (przez `npx expo install`)
- `sleeper-app/src/app/(app)/_layout.tsx` — rejestracja `session/[id]` jako hidden tab
- `sleeper-app/src/app/(app)/history.tsx` — przepisany z placeholdera na pelnoprawny ekran
- `sleeper-app/src/app/(app)/index.tsx` — dodany link „Pokaz wszystkie"
- `sleeper-app/src/app/(app)/session/[id].tsx` — nowy ekran edycji
- `sleeper-app/src/components/DatePickerField.tsx` — nowy
- `sleeper-app/src/components/TimePickerField.tsx` — nowy
- `sleeper-app/src/components/SessionListItem.tsx` — klikalny (Link + Pressable)
- `sleeper-app/src/features/sessions/hooks.ts` — `useSessionById` + invalidacja `['session', id]` w mutacjach
- `sleeper-app/src/lib/time.ts` — `formatDateShort`, `formatDateNoYear`, `dayKeyInAppTz`

## Powod / kontekst
Faza 3 z planu MVP — historia sesji + edycja pojedynczej sesji. Spelnia kryteria akceptacji planu:
- Edycja sesji aktualizuje agregaty „Dzisiaj" (invalidacja `sessionsByChildKey` + `activeSessionKey`).
- Day picker pozwala przejsc do wczoraj / 14 dni wstecz (`useSessions` z parametryzowanym oknem).
- Usuniecie sesji potwierdzane confirmem (`Alert.alert` destructive).

Implementacja zgodna z konwencjami fazy 2: TZ-safe (`toZonedTime`/`fromZonedTime`), bez `as`/`!`/`any`, parser DB → domain (`rowToSession`), invalidacja query keys (nie reczne patche cache).

Odchylenia od planu:
- `SectionList` zamiast `FlatList` dla trybu „wszystkie" — natywne grupowanie po dniu.
- `useState` zamiast `react-hook-form` — jeden formularz, brak walidacji w realtime, brak nowej dependency.
- Day picker z `maximumDate={today}` — domyslnie nie da sie wybrac przyszlego dnia.

## Walidacja
- typecheck: PASS (`npx tsc --noEmit` — 0 bledow)
- lint: PASS (`npm run lint` — 0 errors, 0 warnings)
- test: n/a (Faza 3 nie ma checkboxow `Test:`, brak setupu testow zgodnie z CLAUDE.md)
- runtime: pending — manual test checklist w `docs/active/mvp-sleep-tracker/manual-test-faza-3.md` (11 scenariuszy, Expo Go on-device)
