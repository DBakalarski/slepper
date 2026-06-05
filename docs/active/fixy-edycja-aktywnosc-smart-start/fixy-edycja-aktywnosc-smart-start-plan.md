# Plan: 3 fixy UX — edycja godziny, czas aktywności w historii dnia, smart start sleep

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Ostatnia aktualizacja:** 2026-06-05

## Źródła

- Requirements doc: brak (zadanie zgłoszone bezpośrednio przez usera, plan napisany od ręki)
- Plan techniczny: brak (`docs/plans/` nie istnieje — ten plik jest planem)

## Kontekst

User zgłosił trzy regresje/braki UX na home screen + ekranie edycji sesji:

1. **Edycja sesji — brak kolumny minut w wheel pickerze.** Screenshot pokazuje natywny iOS spinner z `@react-native-community/datetimepicker` v8.4.4 renderowany w widoku `flex-1` (≈połowa szerokości ekranu). Spinner UIDatePicker potrzebuje pełnej szerokości, żeby pokazać dwie kolumny (HH + MM); w wąskim kontenerze cropuje minuty. Dane są zapisywane poprawnie (pole wyświetla "12:37"/"13:59") — problem jest czysto UI.
2. **Home — brak czasu aktywności w "Sesje dzisiaj".** Helper `computeGapsBetweenSessions` (`src/lib/session-gaps.ts`) istnieje i jest używany na ekranie Historia (`src/app/(app)/history.tsx:256` — pokazuje "aktywność Xg Ym" między sesjami), ale home screen (`src/app/(app)/index.tsx:234`) renderuje `<SessionListItem>` bez propa `gapBeforeMs`. Wystarczy zmemoizować mapę gapów z całego `todaySessions` i przekazać per item.
3. **Przycisk Rozpocznij sen — hardcoded `'nap'`.** `src/app/(app)/index.tsx:194` zawsze woła `handleStart('nap')`. Algorytm Galland/Kotki Dwa zwraca już `recommendation.remainingNapsToday[]: PlanEntry[]` z polem `type: 'NAP' | 'NIGHT'` — pierwszy element to typ następnego planowanego snu. Wystarczy z niego korzystać.

Cel: trzy minimalne fixy, każdy w jednym/dwóch plikach, bez refaktorów. Wszystkie do tej samej feature-branch (`feature/fixy-i-kotki-dwa-algorytm` lub follow-up).

## Fix 1 — wheel picker minut (TimePickerField)

**Plik:** `packages/sleeper-app/src/components/TimePickerField.tsx`

**Diagnoza:** iOS `display="spinner"` w `@react-native-community/datetimepicker@8.4.4` renderowany inline w `<View className="flex-1">` (połowa ekranu) cropuje kolumnę minut. Brak `width` na samym `<DateTimePicker>` nic nie zmienia — natywny UIDatePicker dziedziczy szerokość rodzica.

**Rozwiązanie:** owinąć picker w `<Modal transparent animationType="fade">` z bottom-sheet kontenerem o pełnej szerokości i przyciskiem "Gotowe". To standardowy iOS pattern dla picker bottom sheet i zachowuje obecną semantykę spinner UX.

Zmiany w `TimePickerField.tsx`:
- Wewnętrzny stan `tempValue` (commit dopiero po "Gotowe", żeby uniknąć spamu `onChange` podczas scroll na iOS).
- Modal z `<View>` full-width na dnie, w środku `<DateTimePicker>` z `display="spinner"`, na górze "Anuluj" + "Gotowe".
- Android pozostaje bez Modala (system dialog) — gałąź `Platform.OS === 'android'` jak teraz.

**Akceptacja:** w edycji sesji oba pola "Godz. start" / "Godz. koniec" otwierają picker pokazujący OBIE kolumny (godziny + minuty), wybór zapisuje się po "Gotowe".

## Fix 2 — gap aktywności w "Sesje dzisiaj" (home)

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`

**Zmiana** w `ActiveChildSection` (linia ~233):
- Dodać `const gapMap = useMemo(() => computeGapsBetweenSessions(todaySessions), [todaySessions]);` koło istniejących `useMemo`.
- W mapowaniu `todaySessions.slice(0, 5).map((session) => (...))` przekazać `gapBeforeMs={gapMap.get(session.id)}`.
- Import: `import { computeGapsBetweenSessions } from '@/lib/session-gaps';` (helper już istnieje).

**Uwaga ordering:** `useSessions` zwraca DESC (latest first). `computeGapsBetweenSessions` sortuje wewnętrznie ASC po `start_at` i zwraca `Map<id, ms>` — lookup działa niezależnie od kolejności renderowania, więc `.slice(0, 5)` na DESC zostaje bez zmian.

**Akceptacja:** w sekcji "Sesje dzisiaj" nad każdą sesją (poza pierwszą chronologicznie w dniu) widoczne "aktywność Xg Ym" w kolorze orange — identycznie jak na ekranie Historia.

## Fix 3 — smart start sleep (typ z rekomendacji)

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx`

**Logika:** wykorzystać `recommendation.remainingNapsToday[0].type` z `useSleepRecommendation(child, now)` (już używane w `ActiveChildSection`, hook zwrócił `recommendation` na linii 164). `PlanEntry.type` to `'NIGHT' | 'NAP'` z `sleeper-machine` (`packages/sleeper-machine/src/types.ts:22, 48-52`).

**Zmiana** w `ActiveChildSection`:
- Nowa funkcja w środku komponentu, zaraz po `handleStart`:
  ```ts
  function smartSessionType(): 'nap' | 'night_sleep' {
    const next = recommendation?.remainingNapsToday[0];
    if (next) return next.type === 'NIGHT' ? 'night_sleep' : 'nap';
    // recommendation zwrócona, plan pusty = wszystkie drzemki dnia zrobione → night
    if (recommendation) return 'night_sleep';
    // null = brak kotwicy/loading → bezpieczny fallback (zachowuje obecne UX)
    return 'nap';
  }
  ```
- Linia 194: `onPress={activeSession ? handleStop : () => handleStart(smartSessionType())}`.
- `BigActionButton` (linia 191-196) dostaje również `sessionType={activeSession?.type ?? smartSessionType()}` — żeby label/ikona przycisku odpowiadała typowi który zostanie utworzony.

**Edge cases:**
- Cold start (brak historii + brak `targetWakeTime`) → `recommendation === null` → fallback `'nap'` (zachowane stare zachowanie, brak regresji).
- Wszystkie drzemki dnia wykonane → `remainingNapsToday.length === 0` ale `recommendation !== null` → `'night_sleep'`.
- Wcześnie rano przed pierwszą drzemką → `remainingNapsToday[0].type === 'NAP'` → `'nap'`.
- Wieczór po wszystkich drzemkach → `remainingNapsToday[0].type === 'NIGHT'` lub plan pusty → `'night_sleep'`.

**Bez nowych zależności**, bez refaktoringu `useSleepRecommendation` ani komponentu `BigActionButton`.

**Akceptacja:** kliknięcie "Rozpocznij" rano startuje nap, wieczorem (po `preferred_bedtime` lub gdy plan wskazuje NIGHT) startuje `night_sleep`. `QuickActions` (drzemka/sen nocny ręcznie) pozostaje bez zmian — daje override gdy user nie zgadza się z rekomendacją.

## Pliki do modyfikacji (podsumowanie)

| Plik | Fix | Charakter zmiany |
|---|---|---|
| `packages/sleeper-app/src/components/TimePickerField.tsx` | 1 | wrap picker w Modal + przyciski Anuluj/Gotowe |
| `packages/sleeper-app/src/app/(app)/index.tsx` | 2 + 3 | `useMemo` gapMap, prop `gapBeforeMs`, helper `smartSessionType()`, podmiana 2 callbacków |

Brak zmian w: schema bazy, migrations, `sleeper-machine*`, hooks, `RecommendationCard`, `ActiveWindowCard`, `SessionListItem`.

## Weryfikacja

1. `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów.
2. `pnpm --filter sleeper-app lint` — bez nowych warningów.
3. Runtime na Expo Go (iOS — to platforma z bugiem picker'a):
   - **Fix 1:** otwórz "Edytuj sesję" → tap "Godz. start" → picker pokazuje DWIE kolumny (HH + MM) → scroll minuty → "Gotowe" → pole pokazuje nowy czas. Powtórz dla "Godz. koniec".
   - **Fix 2:** na home, dziecko z ≥2 zakończonymi sesjami dziś → sekcja "Sesje dzisiaj" → nad sesjami (poza najwcześniejszą chronologicznie) widoczne "aktywność Xg Ym".
   - **Fix 3:** rano (przed planowaną drzemką) kliknij "Rozpocznij sen" → nowa sesja typu `nap` (orange ikona Sun w SessionListItem). Po `preferred_bedtime` → typ `night_sleep` (fioletowa Moon).
4. Android (Expo Go drugi telefon): fix 1 nie dotyczy (system picker), fix 2 i 3 — sanity check że nic się nie regresowało.

## Commit logging

Każdy fix = osobny commit + follow-up `docs/commits/YYYY-MM-DD-<hash>-<slug>.md`. Sugerowane wiadomości:
- `fix(time-picker): wrap iOS spinner in modal to show minutes column`
- `fix(home): render wake gap "aktywność Xg Ym" between today's sessions`
- `feat(start-sleep): derive session type from sleep recommendation`
