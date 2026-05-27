# Code Review — Faza 4 (Realtime sync)

**Branch:** `feature/mvp-sleep-tracker`
**Commit przegladu (cykl 1):** `25400ac` (feat: realtime sync sesji Faza 4)
**Commit fix (cykl 1):** `67303b1` (fix: poprawki po review fazy 4 cykl 1)
**Data review cyklu 1:** 2026-05-27
**Data review cyklu 2:** 2026-05-27
**Reviewer:** dev-docs-review (multi-perspective: security, performance, architecture, scenario, mobile-manual)

## Severity gate (cykl 2 — po fix)

✅ **GOTOWE DO KONTYNUACJI** — 0 × P1, 0 × P2, 3 × P3 (backlog, opcjonalne).

Fix z `67303b1` skutecznie zamyka P2 z cyklu 1: dodana `invalidateQueries({ queryKey: ['session'] })` w `useRealtimeSessions:50` (singular), co matchuje queryKey `['session', id]` uzywany przez `useSessionById` (`hooks.ts:91`). Analiza regresji: brak ryzyka overwrite dirty form — useState w `session/[id].tsx:33` inicjalizuje sie raz przez guard `form === null` w useEffect (linia 39), refetch aktualizuje `sessionQuery.data` ale nie nadpisuje lokalnego `form`. Typecheck PASS, lint PASS. Pozostale 3 × P3 to opcjonalny backlog (nit linterowy, observability `.subscribe` callback, dokumentacja offline >5min).

## Severity gate (cykl 1 — historyczne)

⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — 0 × P1, 1 × P2, 3 × P3.

Implementacja jest mala (51 LOC hook + 8 LOC integracji + 25 LOC migracja) i konwencjonalna. Wszystkie reguly z CLAUDE.md (invalidate-not-patch, cleanup w useEffect return, query-key `['sessions']`) sa zachowane. Typecheck PASS, lint PASS. Jedyny P2 to **luka w invalidacji `useSessionById`** — kontynuacja niemozliwa bez decyzji (fix vs konswiadome odlozenie do bannera).

## Liczniki (cykl 2 — po fix)

- 🔴 P1 (blocking): 0
- 🟠 P2 (important): 0 (P2 z cyklu 1 naprawiony w commit `67303b1`)
- 🟡 P3 (nit): 3 (bez zmian — backlog)
- 🌐 mobile manual: 8 scenariuszy + 2 prerequisites — pending operator (two-device test)

## Liczniki (cykl 1 — historyczne)

- 🔴 P1 (blocking): 0
- 🟠 P2 (important): 1
- 🟡 P3 (nit): 3
- 🌐 E2E / mobile manual: 8 scenariuszy w `manual-test-faza-4.md` + 1 prerequisite (publication setup) — pending operator (two-device test)

## Typy findingow

| Severity | KOD | TEST | MOBILE-MANUAL |
|---|---|---|---|
| P1 | 0 | 0 | 0 |
| P2 | 1 | 0 | 0 |
| P3 | 3 | 0 | 0 |

(TEST = 0 — brak setupu testow w projekcie, zgodnie z CLAUDE.md. Faza 4 nie wprowadza nowych checkboxow `Test:`.)

## Pliki zmienione (review scope)

- `sleeper-app/src/features/sessions/useRealtimeSessions.ts` (51 LOC, NEW)
- `sleeper-app/src/app/(app)/_layout.tsx` (+8 LOC)
- `sleeper-app/supabase/migrations/0009_realtime_publication.sql` (25 LOC, NEW)
- `docs/active/mvp-sleep-tracker/manual-test-faza-4.md` (NEW, 8 scenariuszy)
- `docs/active/.../mvp-sleep-tracker-kontekst.md` (notatki Fazy 4)
- `docs/active/.../mvp-sleep-tracker-zadania.md` (checkboxy Fazy 4)

## Odchylenia od planu

| Plan (PLAN.md / zadania.md) | Implementacja | Ocena |
|---|---|---|
| `useRealtimeSessions(familyId)` (z `mvp-sleep-tracker-plan.md` §Faza 4) | `useRealtimeSessions(childId)` (z `zadania.md`) | ✅ Lepiej: filtr na poziomie replication, mniejsza powierzchnia eventow, RLS-friendly. Doc w `mvp-sleep-tracker-kontekst.md` `Notatki implementacyjne Fazy 4`. |
| Migracja jako osobny plik (`0009_realtime_publication.sql`) | Migracja jest, plus alternatywa manualnie w Supabase Studio | ✅ Idempotentna przez `do $$ ... exception duplicate_object`. Sanity check `pg_publication_tables` w manual checklist. |

Brak innych odchylen. Plan techniczny dla tej fazy nie wymagal `Files:` / `Test scenarios:` / `Patterns to follow:` (faza opisana w wysokopoziomowym `mvp-sleep-tracker-plan.md`, brak `dev-plan` Implementation Unit z polem `Delegate to:` — legacy).

---

## Findings — Szczegoly

### 🟠 [P2-scenario] **hooks.ts:87 + useRealtimeSessions.ts:40** — `useSessionById` nie odswieza sie na realtime event

**Lokalizacja:**

- `sleeper-app/src/features/sessions/hooks.ts:91` — `queryKey: ['session', sessionId ?? 'none']` (singular `'session'`).
- `sleeper-app/src/features/sessions/useRealtimeSessions.ts:40` — `invalidateQueries({ queryKey: ['sessions'] })` (plural `'sessions'`).

**Problem:**

Klucz `useSessionById` jest `['session', id]` (singular), a invalidacja realtime celuje w `['sessions']` (plural). Z perspektywy TanStack to **dwa odrebne prefixy** — invalidate nie matchuje. W konsekwencji:

- User A otwiera `session/[id]` na telefonie 1.
- User B (lub user A z drugiego urzadzenia) edytuje te sama sesje.
- Telefon 1 dostaje event WS, invaliduje `['sessions']`, refetchuje liste sesji — ale **nie** refetchuje `['session', id]`. Form pozostaje ze starymi wartosciami az do recznego refresh/back-forward.
- Po zapisaniu na telefonie 1 → last-write-wins, zmiana usera B przepadnie.

**Kontekst:**

Faza 3 P3 backlog jawnie odlozyl ten case do Fazy 4: *"session/[id].tsx:59-68 — form nie odswieza sie po refetch (last-write-wins bez ostrzezenia). Po Fazie 4 (realtime) dodac banner 'Sesja byla edytowana, odswiez'"*. Faza 4 wprowadza realtime, ale **nie dodaje obslugi tego case'u** — ani invalidacji, ani bannera, ani konfliktow.

**Rekomendacja (do wyboru):**

1. **Minimal fix:** w `useRealtimeSessions` dodac drugi invalidate na siorlu `['session']` (singular). Jednolinijkowy:
   ```ts
   void queryClient.invalidateQueries({ queryKey: ['sessions'] });
   void queryClient.invalidateQueries({ queryKey: ['session'] });
   ```
   Plus: silent refetch przeglada form i overwriteuje state (problem z `useState` formularzem) — trzeba albo `enabled: false` w trybie edycji, albo banner "Dane zostaly zaktualizowane, odswiez".
2. **Banner (z Faza 3 P3):** detect dirty form + invalidate cache + pokaz banner "Inna osoba edytowala te sesje, kliknij aby odswiezyc". Wymaga porownania `updated_at` (brak tej kolumny w `sessions` na ten moment — sprawdzic schema).
3. **Swiadome odlozenie:** zaktualizowac komentarz w `useRealtimeSessions` ("invalidacja `['sessions']` nie pokrywa `useSessionById` — last-write-wins akceptowane w MVP"), dodac do Fazy 5/6 backlogu.

**Severity uzasadnienie:** P2 (important), nie P1 (blocking) — to nie data corruption (last write zostaje atomic na DB), tylko UX silent overwrite. MVP single-user-edits-at-a-time jest rzadki, ale **realtime jest zaprojektowany wlasnie dla multi-device** i ten gap obniza wartosc fazy.

---

### 🟡 [P3-arch] **useRealtimeSessions.ts:50** — `queryClient` w dep array jest redundantne

`useQueryClient` zwraca **stabilny referencyjnie** klient (memoizowany przez `QueryClientProvider`). Dodanie do dep array nie wprowadza bugow, ale jest semantycznie niepotrzebne i moze sugerowac czytelnikowi, ze klient moze sie zmienic. ESLint `react-hooks/exhaustive-deps` wymaga go po wykryciu uzycia w callbacku, wiec **zostaw dla spokoju lintera** — ale rozwaz komentarz `// queryClient stable from provider`.

**Rekomendacja:** opcjonalna, nit. Nie wymaga akcji.

---

### 🟡 [P3-observability] **useRealtimeSessions.ts:43** — `.subscribe()` nie obsluguje bledu polaczenia

`channel.subscribe()` zwraca channel, ale **akceptuje callback** ze statusem (`SUBSCRIBED` / `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`). Obecnie:

- Gdy WS faila na mount (np. brak sieci) — cisza, brak log.
- Gdy Realtime reconnectuje po offline → online — cisza, ale TanStack invalidate odpali sie i tak na pierwszym evencie po reconnect.

**Rekomendacja:** opcjonalnie dodac `.subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[realtime] channel error', status); })`. Sentry dochodzi w Fazie 5/6, do tego czasu `console.warn` wystarczy do debugowania. Nit — niepilne.

---

### 🟡 [P3-scenario] **manual-test-faza-4.md:42-48 (scenariusz 5)** — brak deadline'u dla offline backlog

Scenariusz "telefon A offline → akcja → online" zaklada `<5s`, ale **nie precyzuje co sie dzieje gdy A jest offline wiele minut**. Supabase Realtime na reconnect dostarcza **tylko nowe eventy** od momentu reconnectu, **nie replay missed events** (z perspektywy WS). TanStack na refocus refetchuje query — co pokrywa missed events, ale tylko jezeli `useSessions/useActiveSession` ma `refetchOnWindowFocus: true` (default true od Fazy 1 P2 — sprawdzono `focusManager` + `AppState` w `_layout.tsx`).

**Rekomendacja:** dodac do checklisty scenariusz "offline >5 min, dluzsze odlaczenie, weryfikacja ze refocus refetchuje pelny stan" — albo udokumentowac w `Notatki implementacyjne Fazy 4` ze pokrycie offline > kilka sek opiera sie na refocus refetch, nie na replay WS. Nit (dokumentacyjne).

---

## Manual mobile verification (Agent 5)

Plik `manual-test-faza-4.md` juz istnieje (commit `25400ac`), 8 scenariuszy + 1 prerequisite:

| # | Scenariusz | Status |
|---|---|---|
| pre-1 | Wlaczenie replikacji (migracja LUB Studio) | ⚪ pending operator (one-time setup) |
| pre-2 | Sanity check `pg_publication_tables` zwraca `public.sessions` | ⚪ pending operator |
| 1 | INSERT — A startuje sen, B widzi w <2s | ⚪ pending operator |
| 2 | UPDATE — A konczy sen, B widzi natychmiast | ⚪ pending operator |
| 3 | UPDATE notes — A edytuje, B widzi propagacje | ⚪ pending operator |
| 4 | DELETE — usuniecie na A znika na B | ⚪ pending operator |
| 5 | Offline → online — B reconnect <5s | ⚪ pending operator |
| 6 | Bilateralnosc — B startuje, A widzi <2s | ⚪ pending operator |
| 7 | Cleanup subskrypcji (sign out / kill app) | ⚪ pending operator |
| 8 | Przelaczenie dziecka (opcjonalne multi-child) | ⚪ pending operator (MVP single-child) |

Wszystkie 8 scenariuszy zostaja **`[ ]` az do wykonania na fizycznych urzadzeniach**. Agent 5 nie ma sposobu na auto-weryfikacje (brak DOM, brak browser, dwa fizyczne telefony wymagane). User musi wykonac manualnie i sam odznaczyc.

**Status mobile-manual:** 0/10 wykonanych (8 scenariuszy + 2 prerequisites). Brak findingow MOBILE-MANUAL ze strony reviewera — checklist jest kompletny i pokrywa krytyczne sciezki.

---

## Bookkeeping checkboxow Weryfikacja:

Wszystkie 2 checkboxy `Weryfikacja:` w Fazie 4 (`zadania.md:207-208`) sa typu **mobile manual** (two-device, fizyczne urzadzenia):

- `Weryfikacja: telefon A startuje sen → telefon B widzi aktywną sesję w <2s` — manual test (patrz `manual-test-faza-4.md`)
- `Weryfikacja: telefon A wyłącza wifi → wykonuje akcję → włącza wifi → telefon B dostaje update w <5s` — manual test (patrz `manual-test-faza-4.md`)

Oba juz maja suffix `— manual test (patrz manual-test-faza-4.md)` (dopisane przy commit Fazy 4). Zostaja `[ ]`, oczekuja na operatora.

### Statystyki bookkeeping

- Odznaczone automatycznie (CLI/grep): 0
- Odznaczone na podstawie Agent 5: 0
- Pozostawione dla operatora (Mobile manual): 2
- Niejasne (P3): 0
- Failujace (P2): 0

### Szczegoly

- [ ] Mobile manual: `telefon A startuje sen → telefon B widzi aktywną sesję w <2s` — manual test, suffix juz obecny
- [ ] Mobile manual: `telefon A wyłącza wifi → wykonuje akcję → włącza wifi → telefon B dostaje update w <5s` — manual test, suffix juz obecny

---

## Quality gate

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 bledow) |
| `npm run lint` (expo lint) | ✅ PASS |
| Pliki > 300 LOC | ✅ None (max: `useRealtimeSessions.ts` = 51 LOC) |
| Funkcje > 50 LOC | ✅ None |
| `any` types | ✅ None |
| Non-null assertions (`!`) | ✅ None |
| Type assertions (`as`) poza testami | ✅ None |
| Cleanup useEffect (coding-rules §13) | ✅ `supabase.removeChannel(channel)` w return |
| Import grouping | ✅ stdlib → third-party → local |
| Migracja idempotentna | ✅ `do $$ ... exception when duplicate_object` |

---

## Wnioski koncowe

Faza 4 to czysty, prosty kawalek kodu (1 hook + 1 wpiecie + 1 migracja) zgodny z konwencjami projektu. Glowny finding (**P2-scenario**: `useSessionById` nie invaliduje sie na realtime) nie blokuje merge'u, ale **wymaga decyzji** przed Faza 5: czy dodajemy linijke invalidate `['session']`, banner konfliktow, czy swiadomie odkladamy. Pozostale 3 findingi P3 sa nit (linterowe / observability / dokumentacyjne).

Manual test checklist jest kompletny i pokrywa wszystkie krytyczne sciezki (INSERT/UPDATE/DELETE, offline reconnect, cleanup, bilateralnosc, child filter). User musi wykonac two-device test przed Faza 5.

**Rekomendacja severity gate (cykl 1):** ⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — adresuj P2, P3 do backlogu.

---

## Cykl 2 — Re-review po fix (2026-05-27, commit `67303b1`)

### Zmienione pliki w fixe

- `sleeper-app/src/features/sessions/useRealtimeSessions.ts` (+10 linii, +1 invalidate, +9 komentarz)
- `docs/active/mvp-sleep-tracker/mvp-sleep-tracker-zadania.md` (sekcja "Do poprawy" oznaczona jako naprawione)

### Weryfikacja fix P2-scenario

- `useRealtimeSessions.ts:50` dodaje `void queryClient.invalidateQueries({ queryKey: ['session'] })` — prefix matchuje `['session', id]` z `hooks.ts:91`. ✅
- Komentarz w hooku wyjasnia rationale + bezpieczenstwo (form === null guard) + TODO do Fazy 5/6 (banner konfliktow przy dirty form). ✅
- `session/[id].tsx:33-47` — `useState<SessionFormState | null>(null)` + useEffect z guardem `form === null` zapewnia ze refetch sessionQuery.data NIE nadpisuje lokalnego stanu formularza. Race condition mozliwa tylko w wąskim oknie: user otwiera ekran, dane sie laduja, ale form jest jeszcze null (loading state pokazuje ActivityIndicator) — wtedy realtime event invaliduje query, fetch ponowny, ale to wlasciwe zachowanie (najnowsze dane przed inicjalizacja form). ✅

### Regresje (multi-perspective)

- **Security:** brak — fix to additional invalidate na tym samym kliencie. Brak nowych powierzchni ataku. ✅
- **Performance:** koszt = +1 wywolanie `invalidateQueries` per realtime event. TanStack invalidate jest O(observers) i refetchuje tylko aktywne queries (`useSessionById` ma observera tylko gdy ekran edycji jest otwarty). Pomijalne. ✅
- **Architecture:** queryKey split `['session']` (singular) vs `['sessions']` (plural) pozostaje smell jezykowym, ale jest udokumentowany w komentarzu. Nie pogorszone, do refaktoru przy 3-cim observerze. ✅
- **Type safety:** brak nowych `any`, `!`, `as`. ✅
- **Scenarios:** silent overwrite przy dirty form pozostaje znany trade-off (last-write-wins), z TODO bannera. To deferral, nie regresja. ✅

### Quality gate (cykl 2)

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 bledow) |
| `npm run lint` | ✅ PASS |
| Regresje funkcjonalne (kod review) | ✅ None |
| Form overwrite ryzyko | ✅ Mitigated (form === null guard) |
| Komentarz wyjasniajacy fix | ✅ Obecny (linie 41-49) |

### Rekomendacja severity gate (cykl 2)

✅ **GOTOWE DO KONTYNUACJI** — P2 z cyklu 1 zamkniety. Pozostale 3 × P3 sa opcjonalnym backlogiem (nit linterowy, observability, dokumentacja edge case offline). Mobile-manual checkboxy (2 × `Weryfikacja:` + 10 scenariuszy w `manual-test-faza-4.md`) pozostaja `[ ]` dla operatora — two-device test wymagany przed deployem.

### Status checkboxow mobile-manual

| # | Scenariusz | Status |
|---|---|---|
| pre-1 | Wlaczenie replikacji | ⚪ pending operator |
| pre-2 | Sanity check pg_publication_tables | ⚪ pending operator |
| 1 | INSERT — A startuje, B widzi <2s | ⚪ pending operator |
| 2 | UPDATE — A konczy, B widzi natychmiast | ⚪ pending operator |
| 3 | UPDATE notes — A edytuje, B widzi propagacje | ⚪ pending operator |
| 4 | DELETE — A usuwa, znika na B | ⚪ pending operator |
| 5 | Offline → online reconnect <5s | ⚪ pending operator |
| 6 | Bilateralnosc — B startuje, A widzi <2s | ⚪ pending operator |
| 7 | Cleanup subskrypcji | ⚪ pending operator |
| 8 | Przelaczenie dziecka (multi-child) | ⚪ pending operator |

**Dodatkowo (rekomendowane po fix):** rozszerzenie scenariusza 3 o weryfikacje ekranu edycji — operator otwiera `session/[id]` na telefonie A, telefon B edytuje notes/start_at te samej sesji, na A `sessionQuery.data` aktualizuje sie (widoczne np. przy zamknieciu i ponownym otwarciu ekranu) bez crashu i bez nadpisania ewentualnych dirty pol formularza. Sugerowane do dopisania w `manual-test-faza-4.md` przy nastepnym update.
