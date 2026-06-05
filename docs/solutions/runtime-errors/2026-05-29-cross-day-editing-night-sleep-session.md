---
title: "Cross-day editing sesji nocnej — end_at na N+1"
date: 2026-05-29
category: runtime-errors
severity: high
stack:
  - React Native
  - TypeScript
  - Expo
  - date-fns-tz
tags:
  - timezone
  - night-sleep
  - date-handling
  - form-validation
  - BackdatedSessionModal
status: verified
last_verified: 2026-05-29
---

# Cross-day editing sesji nocnej — end_at na N+1

## Symptomy

- Sesja nocna 22:00–06:30 zapisywała się z `end_at` na tym samym dniu co `start_at` (N), zamiast na N+1
- Wynik: sesja trwała `start 22:00 → end 06:30` w obrębie tej samej doby → czas trwania ujemny lub Supabase odrzucał zapis
- Problem dotyczył wyłącznie `night_sleep`; drzemki (`nap`) działały poprawnie, bo `end > start` w obrębie doby
- Formularz `BackdatedSessionModal` zakładał `endDate = date` dla obu typów — nie rozróżniał przekroczenia północy

## Root Cause

`BackdatedSessionModal` używał jednej wartości `date` dla obu `start` i `end` bez wykrywania, że `endTime < startTime` oznacza przekroczenie północy. `parseAppTzInput(date, endTime)` budował timestamp na tym samym dniu (N), co dawało `end_at < start_at`.

Brak walidacji cross-day był nieintuicyjny: formularz nie sygnalizował błędu, zapis był akceptowany po stronie UI, problem ujawniał się dopiero w danych lub przy wyświetlaniu historii.

## Rozwiązanie

Dwa elementy razem:

### 1. Helper `addDaysInAppTz` w `lib/time.ts`

```typescript
// packages/sleeper-app/src/lib/time.ts
export function addDaysInAppTz(dayKey: string, n: number): string {
  const base = fromZonedTime(`${dayKey}T00:00:00`, APP_TIMEZONE);
  return format(toZonedTime(addDays(base, n), APP_TIMEZONE), 'yyyy-MM-dd');
}
```

Używa `addDays` z `date-fns` (TZ-safe, obsługuje 23h/25h dobę przy DST), NIE ręcznego `+ 86_400_000 ms`.

### 2. Logika cross-day w `BackdatedSessionModal.handleSubmit`

```typescript
// Pomocnicza: minuty od północy dla "HH:MM", bez tworzenia obiektów Date
function parseTimeMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(':').map(Number);
  return (hh ?? 0) * 60 + (mm ?? 0);
}

// W handleSubmit:
const endDate =
  type === 'night_sleep' && parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)
    ? addDaysInAppTz(date, 1)
    : date;
const end = parseAppTzInput(endDate, endTime);
```

Warunek `<=` (nie `<`) obsługuje też edge case 00:00 jako „następna północ".

### 3. UX improvements

- `handleTypeChange` ustawia defaults per typ: `night_sleep` → `19:30/06:30`, `nap` → `09:00/10:30`
- Hint cross-day (`"Koniec sesji: następny dzień"`) wyświetlany tylko gdy `type === 'night_sleep'`

## Komendy diagnostyczne

```bash
# Sprawdź czy sesja nocna ma end_at > start_at w bazie
# (Supabase Studio lub CLI):
SELECT id, type, start_at, end_at,
       EXTRACT(EPOCH FROM (end_at - start_at))/3600 AS duration_h
FROM sessions
WHERE type = 'night_sleep'
ORDER BY start_at DESC LIMIT 10;

# Typecheck po zmianach:
pnpm --filter sleeper-app exec tsc --noEmit
```

## Zapobieganie

- Każdy formularz z osobnymi polami czasu start/end dla `night_sleep` MUSI wykrywać przekroczenie północy przez porównanie minut od północy (`parseTimeMinutes`), nie przez tworzenie `Date` obiektów
- Do przesunięcia dnia używaj wyłącznie `addDaysInAppTz(dayKey, n)` — nigdy `+86_400_000 * n`
- Reguła ogólna: sprawdzaj czy `endTime <= startTime` dla sesji nocnych; jeśli tak, `endDate = startDate + 1`

## Powiązane

- `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md` — ogólny wzorzec TZ-safe helpers
- `packages/sleeper-app/src/lib/time.ts` — `addDaysInAppTz`, `combineDateAndTimeInAppTz`, `dayKeyInAppTz`

## Kontekst

Naprawione w ramach brancha `feature/fixy-i-kotki-dwa-algorytm`, Faza 1 (fixy), commit `21b5deb`. Problem dotyczył `BackdatedSessionModal` — edycja historii snu z backdatowaniem. Sesje live (start/stop) nie mają tego problemu, bo zawsze `end_at > start_at` z natury.
