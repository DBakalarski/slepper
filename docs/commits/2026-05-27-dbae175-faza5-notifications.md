# dbae175: feat(mvp-sleep-tracker): faza 5 — lokalne powiadomienia "Drzemka za ~15min"

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 5 — Powiadomienia

## Co zostalo zrobione

- Instalacja `expo-notifications@~0.32.17` przez `npx expo install` (kompatybilnosc SDK 54).
- Plugin `expo-notifications` dodany do `app.json` w sekcji `plugins`.
- Nowy modul `src/lib/notifications.ts`:
  - `configureNotificationHandler()` — wywolany modulowo w `app/_layout.tsx`, ustawia `setNotificationHandler` z `shouldShowBanner/List/Sound: true` (in-app notifications widoczne w foreground).
  - `requestPermissions()` — idempotent, najpierw `getPermissionsAsync`, prompt tylko gdy `canAskAgain && !granted`. Po grant na Androidzie tworzy channel "Drzemki" (`AndroidImportance.HIGH`).
  - `scheduleNapNotification({ childId, childName, birthDate, lastSleepEndAt })` — anuluje poprzednia, oblicza `targetEnd = lastSleepEndAt + targetWakeWindow - 15min`, jesli w przyszlosci → `scheduleNotificationAsync` (typ DATE) + persist ID w AsyncStorage `nap-notif-${childId}`.
  - `cancelNapNotification(childId)` — czyta ID z AsyncStorage, woluje `cancelScheduledNotificationAsync`, usuwa klucz. Cichy fallback przy bledzie (notyfikacja moze byc juz triggered).
- Nowa funkcja w `src/lib/time.ts`: `targetWakeWindowMinutes(birthDate: Date, now?: Date): number`. Tabela: 0–3mc=75, 3–6mc=105, 6–9mc=150, 9–12mc=180, 12mc+=240. Granice w pelnych miesiacach (1 miesiac = 30 dni dla uproszczenia).
- Nowy modul `src/features/sessions/schedule-nap-side-effects.ts`:
  - `rescheduleNapNotification(childId, lastSleepEndAt | null)` — jesli null → cancel; inaczej fetch `children` (name + birth_date) i schedule. Fire-and-forget z `console.warn` na bledy.
  - `cancelNapNotificationSafe(childId)` — try/catch wrapper na cancel.
  - `rescheduleAfterDelete(childId)` — query `sessions ... order by end_at desc limit 1` aby znalezc nowa "ostatnia zakonczona sesje", potem `rescheduleNapNotification`.
- Integracja w `src/features/sessions/hooks.ts`:
  - `useStartSession.onSuccess` → `cancelNapNotificationSafe(child_id)`.
  - `useEndSession.onSuccess` → `rescheduleNapNotification(child_id, endAt)`.
  - `useUpdateSession.onSuccess` → `rescheduleNapNotification(child_id, endAt|null)`.
  - `useDeleteSession.onSuccess` → `rescheduleAfterDelete(childId)`.
- `src/features/children/components/AddChildForm.tsx`: `createChild.mutate(..., { onSuccess: () => requestPermissions() })` — permission prompt po dodaniu pierwszego dziecka (idempotent dla kolejnych).
- `src/app/_layout.tsx`: `configureNotificationHandler()` wolany modulowo (raz, przed pierwszym renderem).

## Zmienione pliki

- `sleeper-app/app.json` — dodany `"expo-notifications"` do `plugins`.
- `sleeper-app/package.json` — dodana `expo-notifications: "~0.32.17"`.
- `sleeper-app/package-lock.json` — lock update.
- `sleeper-app/src/lib/notifications.ts` — nowy modul (137 LOC).
- `sleeper-app/src/lib/time.ts` — dodana `targetWakeWindowMinutes` + 5 stalych WAKE_WINDOW_*.
- `sleeper-app/src/features/sessions/schedule-nap-side-effects.ts` — nowy modul (80 LOC).
- `sleeper-app/src/features/sessions/hooks.ts` — 4 hooki wzbogacone o side-effecty powiadomien (+12 LOC, +1 import).
- `sleeper-app/src/features/children/components/AddChildForm.tsx` — `onSuccess` callback w `mutate`.
- `sleeper-app/src/app/_layout.tsx` — modulowe `configureNotificationHandler()`.

## Powod / kontekst

Faza 5 z planu MVP — lokalne powiadomienia jako ostatni feature do daily-usable apki. Architektura wybrana wedlug pipeline'u: side-effects scentralizowane w hookach (nie w UI), fire-and-forget z `console.warn` aby nie blokowac sukcesu mutacji gdy permissions denied lub network down. Permission request idempotent i opozniony do "po pierwszym dziecku" — lepszy UX (user widzi kontekst gdy system pyta).

Brak odchylen od planu. `useUpdateSession.onSuccess` przeplanowuje wzgledem TEJ edytowanej sesji (nie sprawdza czy to ostatnia) — uproszczenie MVP, do dopracowania w Fazie 6 jesli edge case okaze sie czesty.

## Walidacja

- `npx tsc --noEmit` → PASS (0 bledow)
- `npm run lint` → PASS (0 errors, 0 warnings)
- Manual mobile testing: pending — 8 scenariuszy w `docs/active/mvp-sleep-tracker/manual-test-faza-5.md`.
- Brak unit testow `targetWakeWindowMinutes` — projekt nie ma setupu testow (zgodnie z CLAUDE.md). Scenariusz 7 manual-test pokrywa weryfikacje przez REPL.
