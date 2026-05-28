---
title: "TZ-safe time helpers: zawsze UTC w bazie, Europe/Warsaw w UI przez fromZonedTime/toZonedTime"
date: 2026-05-27
category: runtime-errors
severity: high
stack:
  - React Native
  - Expo SDK 54
  - TypeScript
  - date-fns
  - date-fns-tz
  - Supabase (timestamptz)
tags:
  - timezone
  - dst
  - date-handling
  - silent-bug
status: verified
last_verified: 2026-05-27
---

# TZ-safe time helpers: zawsze UTC w bazie, Europe/Warsaw w UI

## Symptomy

- Aplikacja działa lokalnie w PL — testy ręczne nie wykrywają błędu.
- Użytkownik z urządzeniem ustawionym na inną strefę (UTC, US/Pacific, lot zagraniczny) widzi:
  - sesje wpisywane "na dziś" przeskakują na poprzedni/następny dzień w liście historii,
  - backdated modal po wpisaniu "21:30" zapisuje godzinę przesuniętą o offset device tz,
  - grupowanie listy historii po dniu (`day key`) miesza wpisy z dwóch dni,
  - filtr "dzisiaj" gubi sesje w okolicy północy.
- Dwa razy w roku (DST): "koniec dnia = start + 24h" daje przesunięcie 1h.
- Brak błędu runtime — bug jest cichy, manifestuje się złym wynikiem.

## Root Cause

`Date` w JS reprezentuje instant w UTC, ale akcesory `getHours()/getDate()/setHours()` operują w **lokalnej strefie urządzenia**. Konstrukcje typu `new Date(year, month, day, h, m)` albo `date.setHours(h, m)` produkują instant zależny od tz urządzenia. Dla aplikacji, która operuje w jednej domenowej strefie (`Europe/Warsaw`) i synchronizuje dane między urządzeniami przez Supabase (`timestamptz` w UTC), oznacza to, że ten sam input usera daje różne zapisy w zależności od tego, gdzie jest telefon.

Drugi root cause: arytmetyka godzin "+ 24h" łamie się przy DST, bo doba ma 23 lub 25 godzin dwa razy do roku.

## Rozwiązanie

Wszystkie konwersje między reprezentacją domenową (Europe/Warsaw) a UTC idą przez `fromZonedTime`/`toZonedTime` z `date-fns-tz`. Operacje na dniach idą przez `addDays` z `date-fns`, nigdy nie przez milisekundy.

Centralny moduł `sleeper-app/src/lib/time.ts` udostępnia helpery — ekrany **nie** wołają `setHours`, `new Date(y,m,d,h,m)` ani nie liczą offsetów ręcznie.

```typescript
// sleeper-app/src/lib/time.ts
import { addDays, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'Europe/Warsaw';

// Formatowanie: instant UTC -> string w app tz
export function formatTime(date: Date): string {
  return format(toZonedTime(date, APP_TIMEZONE), 'HH:mm');
}

// Stabilny grouping key niezalezny od device tz
export function dayKeyInAppTz(date: Date): string {
  return format(toZonedTime(date, APP_TIMEZONE), 'yyyy-MM-dd');
}

// Wycina date do poczatku dnia (00:00) w strefie aplikacji.
// format() zwraca string w app tz; fromZonedTime konwertuje na UTC instant.
export function startOfDayInAppTz(date: Date): Date {
  const dayKey = format(toZonedTime(date, APP_TIMEZONE), 'yyyy-MM-dd');
  return fromZonedTime(`${dayKey}T00:00:00`, APP_TIMEZONE);
}

// Koniec dnia = start NASTEPNEGO dnia w app tz. addDays obsluguje DST poprawnie
// (24h arithmetic by zlamalo sie 2 razy/rok).
export function endOfDayInAppTz(date: Date): Date {
  return startOfDayInAppTz(addDays(date, 1));
}

// Parsuje user input "YYYY-MM-DD" + "HH:MM" jako moment w app tz, NIE device tz.
export function parseAppTzDateTime(dateStr: string, timeStr: string): Date | null {
  const iso = `${dateStr}T${timeStr}:00`;
  const parsed = fromZonedTime(iso, APP_TIMEZONE);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// Laczy date + time z dwoch Date w jeden instant w app tz.
// Pattern: wytnij YYYY-MM-DD z jednego, HH:mm z drugiego, zloz, fromZonedTime.
// NIE uzywaj setHours na surowym Date — to operuje na device tz.
export function combineDateAndTimeInAppTz(datePart: Date, timePart: Date): Date {
  const dayKey = format(toZonedTime(datePart, APP_TIMEZONE), 'yyyy-MM-dd');
  const timeKey = format(toZonedTime(timePart, APP_TIMEZONE), 'HH:mm');
  return fromZonedTime(`${dayKey}T${timeKey}:00`, APP_TIMEZONE);
}
```

### Reguły dla call sites

```typescript
// ZLE — setHours operuje na device tz
const merged = new Date(datePart);
merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);

// DOBRZE — centralny helper, app tz
const merged = combineDateAndTimeInAppTz(datePart, timePart);
```

```typescript
// ZLE — toDateString uzywa device tz
const groupKey = session.start_at.toDateString();

// DOBRZE — stabilny key niezalezny od device
const groupKey = dayKeyInAppTz(session.start_at);
```

```typescript
// ZLE — DST psuje arytmetyke
const endOfDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);

// DOBRZE — addDays obsluguje DST
const endOfDay = endOfDayInAppTz(start);
```

## Komendy diagnostyczne

```bash
# Wyszukaj antywzorce w kodzie
grep -rn "setHours\|setMinutes\|setDate\|toDateString\|getDate()\|getHours()" sleeper-app/src/
grep -rn "24 \* 60 \* 60 \* 1000\|86400000" sleeper-app/src/
grep -rn "new Date(.*,.*,.*,.*,.*)" sleeper-app/src/

# Weryfikacja w runtime: ustaw symulator iOS na Pacific Time
# i wykonaj backdated wpis "dzisiaj 21:30" — powinien zapisac sie jako
# 21:30 w Warsaw (czyli 19:30 UTC), nie 21:30 w Pacific.
```

## Zapobieganie

- Każda funkcja przyjmująca/zwracająca czas domenowy idzie przez `lib/time.ts`. Nie duplikuj logiki konwersji w komponentach.
- Jeśli widzisz `setHours`/`new Date(y,m,d,h,m)` w PR — to red flag, prawie zawsze powinien być helper `*InAppTz`.
- Baza trzyma `timestamptz` (UTC). Nigdy nie zapisuj "naked" stringów typu "2026-05-27 21:30" bez offsetu.
- DST checklist: każda operacja "dzień/tydzień" musi używać `addDays`/`addWeeks` z `date-fns`, nigdy mnożenia milisekund.
- Test ręczny przed mergem dużej funkcji time-related: zmień strefę symulatora na UTC albo US/Pacific i powtórz happy path.

## Powiązane

- `sleeper-app/src/lib/time.ts` — implementacja helperów.
- `sleeper-app/src/features/sessions/components/BackdatedSessionModal.tsx` — call site `parseAppTzDateTime`.
- `docs/completed/mvp-sleep-tracker/review-faza-3.md` (P2-2 TZ-safety) — pierwsze wykrycie problemu w `combineDateAndTime` użytym lokalnie na ekranie sesji.
- `docs/completed/mvp-sleep-tracker/mvp-sleep-tracker-podsumowanie.md` — wzorzec #1 w sekcji wniosków.
- `CLAUDE.md` § "Konwencje specyficzne dla domeny": "zawsze UTC w bazie, zawsze Europe/Warsaw przy formatowaniu".

## Kontekst

Wykryte podczas Fazy 3 MVP (edycja sesji, ekran `session/[id]`) — lokalny `combineDateAndTime` używał `setHours` i przeszedł code review dwukrotnie, bo na urządzeniu testowym (PL tz) wynik był poprawny. Bug zidentyfikowany przez review-fazy-3 (P2-2), naprawiony przez ekstrakcję `combineDateAndTimeInAppTz` do `lib/time.ts` i usunięcie lokalnej kopii. Po refaktorze wszystkie call sites korzystają z centralnego helpera; brak `setHours` w `sleeper-app/src/features/`.

Stack: Expo SDK 54 + date-fns 4.x + date-fns-tz 3.x + Supabase `timestamptz`. Aplikacja synchronizuje dane między dwoma telefonami (mama/tata), więc nawet jeśli oboje są w PL, pattern musi być deterministyczny — inaczej realtime sync może wprowadzić niespójności po podróży lub błędnej konfiguracji telefonu.
