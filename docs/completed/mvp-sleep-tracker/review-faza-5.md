# Review Fazy 5 — Powiadomienia

**Data:** 2026-05-27
**Branch:** `feature/mvp-sleep-tracker`
**Commity objete:** `dbae175` (feat), `73c99d5` (docs)
**Zakres:** lokalne powiadomienia `expo-notifications`, `src/lib/notifications.ts`, `schedule-nap-side-effects.ts`, integracja z hookami sesji, `targetWakeWindowMinutes`, `AddChildForm` permission prompt.

## Severity gate

**⚠️ KONTYNUUJ Z ZASTRZEZENIAMI** — 0 × P1 blocking, 2 × P2 important do rozwazenia, 5 × P3 nits. KOD spojny z planem (Faza 5 plan §130-146); MOBILE-MANUAL: 8 scenariuszy wygenerowanych, oczekuja wykonania na urzadzeniu.

## Liczniki

| Kategoria | KOD | TEST | MOBILE-MANUAL |
|---|---|---|---|
| 🔴 P1 — blocking | 0 | 0 | 0 |
| 🟠 P2 — important | 2 | 0 | 0 |
| 🟡 P3 — nit | 5 | 0 | 0 |
| Sciezki manual checklist | n/a | n/a | 8 scenariuszy |

## Sprawdzone pliki

- `sleeper-app/app.json` — plugin `expo-notifications`
- `sleeper-app/package.json` — `expo-notifications@~0.32.17`
- `sleeper-app/src/lib/notifications.ts` (142 LOC)
- `sleeper-app/src/lib/time.ts` (160 LOC, dodano `targetWakeWindowMinutes`)
- `sleeper-app/src/features/sessions/schedule-nap-side-effects.ts` (94 LOC)
- `sleeper-app/src/features/sessions/hooks.ts` (integracja 4 mutacji)
- `sleeper-app/src/features/children/components/AddChildForm.tsx` (permission prompt)
- `sleeper-app/src/app/_layout.tsx` (`configureNotificationHandler` na starcie)

## Walidacja CLI

- `npx tsc --noEmit` → **PASS** (exit 0)
- `npm run lint` (expo lint) → **PASS** (exit 0)

## Cross-reference z planem (`mvp-sleep-tracker-plan.md` §130-146)

| Wymaganie planu | Status |
|---|---|
| Request permissions przy onboardingu | ✅ `AddChildForm.onSuccess` |
| Tabela `targetWakeWindowMinutes(birthDate)` | ✅ `lib/time.ts` (5 zakresow) |
| `scheduleNapNotification(childId, lastSleepEndAt, birthDate)` | ✅ `lib/notifications.ts` (input obj zamiast 3 argow — OK, lepiej dla 4+ pol) |
| AsyncStorage `nap-notif-${childId}` | ✅ `STORAGE_KEY_PREFIX` |
| Po INSERT/UPDATE sesji → cancel + reschedule | ✅ `rescheduleNapNotification`, `cancelNapNotificationSafe` |
| Po DELETE ostatniej sesji → cancel/recalc | ✅ `rescheduleAfterDelete` (query last ended) |

Zadne odchylenie strukturalne. Implementacja przekracza plan w jednym punkcie: **`useStartSession.onSuccess` jawnie anuluje** pending notyfikacje (plan nie wymienial — sensowne, dziecko spi).

## Findings — P2 (important)

### 🟠 P2-1 — `useUpdateSession` schedule wzgledem edytowanej sesji, nie ostatniej

**Pliki:** `sleeper-app/src/features/sessions/hooks.ts:314-329`

`useUpdateSession.onSuccess` woluje `rescheduleNapNotification(data.child_id, data.end_at)` bezposrednio na podstawie edytowanej sesji. Jesli user edytuje **starsza** zakonczona sesje (nie ostatnia), notyfikacja zostanie ustawiona na zly target — wzgledem starszej, nie aktualnej "ostatniej zakonczonej sesji". `useDeleteSession` ma `rescheduleAfterDelete` z query, ale `useUpdateSession` — nie.

**Wplyw:** edge case (user typowo edytuje ostatnia sesje), ale prowadzi do bledu cichego: po edycji starszej sesji w lockscreen pojawia sie notyfikacja z czasem nieadekwatnym do biezacego okna aktywnosci. User zinterpretuje to jako bug.

**Rekomendacja:** symetria z `useDeleteSession` — uzyj `rescheduleAfterDelete(childId)` (zmienic nazwe na `rescheduleFromLastEnded`) zamiast bezposredniego `rescheduleNapNotification`. Notatka w kodzie sygnalizuje akceptacje uproszczenia ("ignorowany w MVP") — to swiadoma decyzja, ale wymaga aktualizacji severity gate jesli decyzja jest "ship as is".

**Akceptowalne dla MVP** jesli zapis w kontekscie i znany trade-off.

### 🟠 P2-2 — `useEndSession.onSuccess` uzywa `data.end_at` bez null-safe path dla typu

**Pliki:** `sleeper-app/src/features/sessions/hooks.ts:278-281`

```ts
onSuccess: (data) => {
  const endAt = data.end_at ? new Date(data.end_at) : null;
  void rescheduleNapNotification(data.child_id, endAt);
},
```

Po pomyslnej `update + select`, `end_at` jest zawsze ustawione (mutacja ustawila `end_at`). Jednak `data.end_at` typowo `string | null`. Konstrukcja `endAt ? new Date(...) : null` przekazuje **null** do `rescheduleNapNotification`, ktora wywola `cancelNapNotification(childId)` — czyli zamiast schedule, anulowanie. Edge case (server zwrocil row gdzie `end_at` zostalo nadpisane na null gdzies indziej w race condition), ale logika nie jest fail-loud.

**Rekomendacja:** jesli `data.end_at` jest null po endSession, to anomalia danych — `console.warn` zamiast cichego cancela. Nie blokuje, ale wzmocni diagnostyke.

## Findings — P3 (nits)

### 🟡 P3-1 — Komentarz w `notifications.ts:70` mowi "default channel" — myli ID z nazwa

`setNotificationChannelAsync('default', { name: 'Drzemki', ... })` — argument `id='default'` (generic, dziela go wszystkie kanaly bez explicit channelId), `name='Drzemki'` (label widoczny w settings). Komentarz "default channel" sugeruje, ze to system default — w istocie jest custom channel z generic ID. Sugestia: `setNotificationChannelAsync('nap-reminders', { name: 'Drzemki', ... })` + `content.channelId: 'nap-reminders'` w `scheduleNotificationAsync`. Wtedy izolujemy nasz kanal od innych potencjalnych w przyszlosci.

**Pliki:** `sleeper-app/src/lib/notifications.ts:70-74`

### 🟡 P3-2 — `targetWakeWindowMinutes` uzywa `30 days = 1 miesiac` (ms calc)

Aproksymacja 30 dni/miesiac da 5–10% dryf vs kalendarz dla dziecka 12mc+ (12 × 30 = 360 dni vs 365). Wartosci progow (3, 6, 9, 12 mc) sa "miekkie" w domenie (poradniki snu), wiec nie krytyczne — ale `date-fns` ma `differenceInMonths` ktorego mozna uzyc dla precyzji bez wzrostu LOC.

**Pliki:** `sleeper-app/src/lib/time.ts:150-159`

### 🟡 P3-3 — Brak channel z explicit `id` w `scheduleNotificationAsync.content`

Trigger z `SchedulableTriggerInputTypes.DATE` na Android domyslnie hit channel `default`. Hardcoded coupling. P3-1 spina ten problem.

### 🟡 P3-4 — `AddChildForm.onSuccess` woluje `requestPermissions` po **kazdym** dodaniu dziecka

`AddChildForm` jest renderowany tylko dla `children.length === 0`, wiec w praktyce idempotent — ale gdyby formularz pojawil sie tez przy 2gim dziecku (Faza 6 polish?), permission prompt zaspamowal by usera (a raczej nie — sam `requestPermissions` jest idempotent). Komentarz w kodzie wyjasnia. P3, bo to defensywne pytanie.

**Pliki:** `sleeper-app/src/features/children/components/AddChildForm.tsx:55-62`

### 🟡 P3-5 — Brak deep-link handlera dla tappow w notyfikacje

Tap na notyfikacji "Drzemka za ~15 min" otwiera app na ostatnim ekranie — brak nawigacji do dziecka, brak action button. Akceptowalne dla MVP (plan §130-146 nie wymienia), ale notatka dla Fazy 6 polish.

## Findings — Security (Agent 1)

Brak findings. Lokalne notyfikacje nie odsylaja danych poza urzadzenie. AsyncStorage trzyma tylko ID notyfikacji (nieidentyfikujace). `childId` w storage key — UUID supabase, OK do localnego storage. Brak ekspozycji PII w body notyfikacji (imie dziecka w title — to user wybor, lokalnie tylko).

## Findings — Performance (Agent 2)

Brak findings P1/P2. Komentarze w kodzie:
- `fetchChildMeta` woluje 1 query per mutacja sesji — akceptowalne (nie w render loop, nie N+1).
- `rescheduleAfterDelete` to 1 query (ostatnia zakonczona sesja, `limit 1`) — OK.
- Side-effects fire-and-forget przez `void` — nie blokuja UI.
- `configureNotificationHandler` wolany modulowo, raz — guard `handlerConfigured`.

## Findings — Architecture (Agent 3)

Pochwaly:
- **Separation of concerns:** `schedule-nap-side-effects.ts` izoluje I/O od mutacji.
- **Idempotency:** `requestPermissions`, `cancelNapNotification`, `configureNotificationHandler` — wszystkie safe to call wielokrotnie.
- **Fire-and-forget z logiem:** warningi nie blokuja mutacji.

P2/P3 wymienione wyzej. Type safety: zero `any`, zero `!`, strict mode trzyma — OK.

## Findings — Scenarios (Agent 4)

- ✅ Happy path: end → schedule, start → cancel, update → reschedule, delete → recalc.
- ✅ Boundary: target w przeszlosci → `msUntilTarget <= 0` zwraca null bez schedule.
- ✅ Empty: brak zakonczonej sesji → `rescheduleAfterDelete` cancel.
- ✅ Concurrent: `cancelNapNotification` przed `schedule` (atomic w obrebie wywolania).
- ⚠️ Edge: edycja **starszej** sesji (P2-1).
- ⚠️ Edge: `data.end_at` null po update (P2-2).
- ⚠️ Concurrent: dwa rownolegle `scheduleNapNotification` na ten sam childId — read-modify-write w AsyncStorage moze zostawic osierocony ID. Praktycznie nie wystepuje w UX (mutacje serializowane przez TanStack Query).

Test coverage: brak setupu testow (CLAUDE.md) — TEST kubelek = 0.

## Mobile manual checklist (Agent 5)

Plik `manual-test-faza-5.md` istnieje (178 linii, 8 scenariuszy):

| # | Scenariusz | Status |
|---|---|---|
| 1 | Permission granted po dodaniu 1szego dziecka | ⏳ pending operator |
| 2 | Permission denied — app dziala normalnie | ⏳ pending |
| 3 | Notyfikacja schedulowana po endSession | ⏳ pending |
| 4 | Start nowej sesji anuluje pending notyfikacje | ⏳ pending |
| 5 | Edycja end_at aktualizuje czas notyfikacji | ⏳ pending |
| 6 | Delete ostatniej sesji recalcule | ⏳ pending |
| 7 | Wake window calculation per wiek | ⏳ pending |
| 8 | App foreground/background/killed | ⏳ pending |

Format zgodny ze standardem manual-test-faza-* z poprzednich faz. Prerekwizyty czytelne, pass criteria w postaci checkboxow.

## Bookkeeping checkboxow `Weryfikacja:`

- Odznaczone automatycznie (CLI/grep): **0** (wszystkie checkboxy Weryfikacja: w Fazie 5 sa mobile-manual)
- Pozostawione dla operatora (Mobile manual): **4**
- Niejasne (P3): **0**
- Failujace (P2): **0**

### Szczegoly

- [ ] Manual: "zakoncz drzemke → sprawdz zaplanowane notyfikacje" — manual test (patrz `manual-test-faza-5.md`)
- [ ] Manual: "edycja `end_at` sesji aktualizuje czas notyfikacji" — manual test
- [ ] Manual: "start nowej sesji anuluje zaplanowana notyfikacje" — manual test
- [ ] Manual: "notyfikacja faktycznie wyswietla sie" — manual test

Checkboxy w `mvp-sleep-tracker-zadania.md` Faza 5 maja juz suffix `— manual test (patrz manual-test-faza-5.md)` — bookkeeping krok 3 nie wymaga zmian.

## Decyzja severity gate (po ponownym przeliczeniu)

**⚠️ KONTYNUUJ Z ZASTRZEZENIAMI** — 2 × P2 do swiadomej decyzji (poprawic w cyklu 2 albo zaakceptowac z notatka), 0 × P1.

Rekomendacja: P2-1 warto naprawic (symetria z delete, niski koszt). P2-2 — zaakceptowac lub dodac warning.

---

## Re-review po cyklu fix 1 (2026-05-27)

**Commit objety:** `90dba65` (fix: poprawki po review fazy 5 — cykl 1)

### Status P2 z cyklu 1

| ID | Opis | Status fix | Weryfikacja |
|---|---|---|---|
| P2-1 | `useUpdateSession` schedule wzgledem edytowanej sesji, nie ostatniej | ✅ Naprawione | Rename `rescheduleAfterDelete` → `rescheduleFromLastEnded` w `schedule-nap-side-effects.ts:81`. Uzyty w `useUpdateSession.onSuccess:334` i `useDeleteSession.onSuccess:359` (symetria). Brak stale references do starej nazwy (grep). |
| P2-2 | `useEndSession.onSuccess` cicho cancel gdy `data.end_at === null` | ✅ Naprawione | Dodano `console.warn(...)` przed cancellem w `hooks.ts:278-289`. Branch null-safe wyodrebniony explicite. |

### Walidacja CLI (re-run)

- `npx tsc --noEmit` → **PASS** (exit 0)
- `npm run lint` (expo lint) → **PASS** (exit 0)
- `grep rescheduleAfterDelete src/` → 0 hits (rename czysty)
- `grep rescheduleFromLastEnded src/` → 3 hits (definicja + 2 uzycia)

### Liczniki po cyklu 1

| Kategoria | KOD | TEST | MOBILE-MANUAL |
|---|---|---|---|
| 🔴 P1 — blocking | 0 | 0 | 0 |
| 🟠 P2 — important | **0** (cykl 1 zamknal P2-1, P2-2) | 0 | 0 |
| 🟡 P3 — nit | 5 (backlog, nie blokuje) | 0 | 0 |

TEST kubelek pozostaje 0 — brak setupu testow (CLAUDE.md). MOBILE-MANUAL: 8 scenariuszy w `manual-test-faza-5.md` pending operator (nie blokuje gate).

### Severity gate (po cyklu 1)

✅ **GOTOWE DO KONTYNUACJI** — 0 × P1, 0 × P2, 5 × P3 backlog. Faza 5 KOD czysty. Mobile-manual pending operator (nie blokuje przejscia do Fazy 6, bo to manual on-device test).

### Notatka

- P3 backlog (5 sugestii) pozostaje w `mvp-sleep-tracker-zadania.md` Faza 5 sekcja "P3 — Nits". Adresowane opcjonalnie w Fazie 6 polish lub jako tech debt.
- Mobile-manual scenariusze (Scenariusze 1–8) wykonuje user na fizycznym urzadzeniu z Expo Go — checkboxy zostaja `[ ]` z suffix manual.
