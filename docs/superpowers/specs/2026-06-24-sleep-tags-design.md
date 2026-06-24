# Design: Tagi kontekstu snu + korelacje — Faza 2

**Data:** 2026-06-24
**Status:** Zaakceptowany (brainstorming) → implementacja
**Pakiet:** `packages/sleeper-web`
**Roadmap:** `docs/ideation/2026-06-24-roadmap.md` — Faza 2

## Cel

Pozwolić rodzicowi otagować sesję snu kontekstem (ząbkowanie, choroba, …) i
pokazać na dashboardzie korelację: czy sen jest krótszy w dni z danym tagiem.

## Decyzje (brainstorming)

- Zakres: **obie części naraz** — zapis tagów + sekcja korelacji.
- Lista tagów (slug → label PL): `teething`→Ząbkowanie, `illness`→Choroba,
  `growth_spurt`→Skok rozwojowy, `new_location`→Nowa lokalizacja,
  `caregiver_change`→Zmiana opiekuna. Stała w kodzie (zmiana wordingu bez migracji).
- Tagi tylko przez ekran edycji sesji (nie quick-start / backdated). Opcjonalne.

## Model danych

- **Migracja `0013_sessions_tags.sql`:**
  ```sql
  alter table public.sessions
    add column tags text[] not null default '{}';
  alter table public.sessions
    add constraint sessions_tags_max_len
    check (array_length(tags, 1) is null or array_length(tags, 1) <= 10);
  ```
  Wstecznie kompatybilna (istniejące selecty nie referują `tags`; nowa kolumna
  ma default `'{}'`). Walidacja dozwolonych slugów po stronie app (nie CHECK —
  uniknięcie migracji przy zmianie listy).

## Kolejność wdrożenia (KRYTYCZNE)

Kod będzie selektować kolumnę `tags`, więc **musi wdrożyć się PO zaaplikowaniu
migracji**. Sekwencja:
1. Implementacja + commit lokalnie.
2. Użytkownik aplikuje `0013_sessions_tags.sql` w Supabase (dashboard SQL editor
   lub CLI) — bezpieczne w każdej chwili (dodanie nullowalnej kolumny z default).
3. Po potwierdzeniu — push (Vercel deploy).

Reguła: asystent NIE modyfikuje prod DB bezpośrednio.

## Warstwa danych (app)

- `features/sessions/tags.ts` — `interface SessionTag { slug: string; label: string }`,
  `SESSION_TAGS: SessionTag[]`, `isValidTagSlug(slug)`, `tagLabel(slug)`.
- `features/sessions/hooks.ts`:
  - `SleepSession` += `tags: string[]`.
  - `rowToSession`: `tags: row.tags ?? []` (defensywnie — gdyby kolumna była null).
  - Wszystkie literały SELECT (`useSessions`, `useSessionById`, `useActiveSession`,
    `useLastEndedSession`, `useStartSession`, `useEndSession`, `useUpdateSession`)
    dostają `tags`.
  - `UpdateSessionInput.patch` += `tags?: string[]`.
  - START tworzy sesję z `tags: []` (default; quick-start bez tagów).

## UI zapisu

- `SessionEditForm`:
  - `SessionFormState` += `tags: string[]`.
  - Sekcja „Kontekst (opcjonalnie)" — `Chip` per tag, toggle dodaje/usuwa slug
    z `form.tags`. Jednodotykowe, bez wymuszania.
- `app/(app)/session/[id].tsx`: initial form state z `session.tags`; patch zapisu
  zawiera `tags: form.tags`.

## Korelacje (dashboard)

- `lib/sleep-aggregation.ts` += `tagSleepCorrelation(sessions, rangeStart, rangeEnd)`:
  - Atrybucja **dnia**: dzień „ma tag X" jeśli ≥1 sesja zaczynająca się tego dnia
    (app tz) ma slug X.
  - Dla każdego tagu obecnego w danych: śr. dzienny sen (z `dailySleepSeries`,
    dni z danymi) w dni-z-X vs dni-bez-X.
  - Zwraca `TagCorrelation[]`: `{ slug; taggedDays; avgTaggedMs; avgUntaggedMs; deltaMs }`
    tylko dla tagów z `taggedDays ≥ 1` oraz dni-bez ≥ 1 (inaczej brak porównania).
- `features/stats/components/SleepTagCorrelation.tsx` — lista per tag:
  label, „śr. z tagiem vs bez", delta (krócej/dłużej o …), liczba dni.
- `stats.tsx`: Card korelacji — widoczny gdy `tagSleepCorrelation` niepuste; inaczej
  hint „Dodaj tagi do sesji (w szczegółach), aby zobaczyć korelacje".

## Obsługa błędów / edge cases

| Sytuacja | Zachowanie |
|---|---|
| Brak tagów w danych | sekcja korelacji = hint zamiast tabeli |
| Tag tylko w dni bez „dni-bez" (wszystkie dni otagowane) | pomiń ten tag (brak grupy porównawczej) |
| `tags` null z DB (pre-default) | `rowToSession` → `[]` |
| Nieznany slug z DB | label = sam slug (fallback `tagLabel`) |
| >10 tagów | blokowane CHECK w DB; UI ma 5 → nieosiągalne |

## Testy

- **Unit `sleep-aggregation.test.ts`** (rozszerzenie): `tagSleepCorrelation`
  — delta tagged vs untagged, atrybucja po dniu startu, pomijanie tagów bez grupy
  porównawczej, pusta lista gdy brak tagów.
- **Unit `tags.test.ts`:** `isValidTagSlug`, `tagLabel` (znany + fallback).
- **Static-invariants:** `SessionEditForm` renderuje selektor tagów (Chip + form.tags);
  `hooks.ts` SELECT zawiera `tags`.

## Walidacja (Definition of Done)

`pnpm web:build:check` zielony + testy + commit + log w `docs/commits/`.
Migracja zaaplikowana w Supabase PRZED pushem. Changelog bump `v`. Runtime:
manualna weryfikacja po deployu (otaguj sesję → korelacja na dashboardzie).
