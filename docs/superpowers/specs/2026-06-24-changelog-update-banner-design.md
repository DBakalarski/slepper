# Design: „Co nowego" po deployu + wymuszony restart

**Data:** 2026-06-24
**Status:** Zaakceptowany (brainstorming) → do planu implementacji
**Pakiet:** `packages/sleeper-web`

## Cel

Po każdym deployu (push na `main` → Vercel) pokazać użytkownikowi krótki komunikat
co się zmieniło, z przyciskiem wymuszającym restart aplikacji (reload). Jeśli
użytkownik wchodzi po 2+ deployach których nie widział — pokazać **scalony**
komunikat (wszystkie niewidziane zmiany razem).

## Kontekst / istniejący stan

- PWA Expo SDK 54 web-only, deploy Vercel. Service Worker (`public/sw.js`) robi
  `skipWaiting()` (install) + `clients.claim()` (activate) — nowy SW przejmuje
  agresywnie, ale **załadowany bundle JS nie podmieni się bez reloadu strony**.
  Dlatego „wymuś restart" = `window.location.reload()` (po reloadzie network-first
  navigation serwuje świeży `index.html` → świeży hash bundla).
- `sw.js` fetch handler: `/changelog.json` przechodzi przez `caches.match` (zawsze
  miss — ścieżka nie jest na liście cache'owanych `/_expo/`,`/icons/`,…) → leci do
  sieci i **nie jest cache'owany**. Czyli efektywnie network-only przez SW.
  **`sw.js` NIE wymaga zmian.**

## Decyzje (z brainstormingu)

1. **Źródło treści:** kurowany `public/changelog.json` — krótkie, polskie,
   user-facing wpisy per deploy (mogą scalać kilka commitów). NIE auto-generacja
   z commitów.
2. **Wykrywanie:** przy otwarciu aplikacji + przy powrocie karty do focusu
   (`visibilitychange`). Bez interwału w tle.
3. **Przycisk:** „Zrestartuj teraz" (główny) + „Później"/X (odkłada, NIE oznacza
   jako przeczytane). Banner nie jest twardo blokujący — reload bezpieczny w trakcie
   aktywnej sesji (timer = derived state z bazy).
4. **Pozycja:** dół ekranu (spójnie ze Snackbarem).
5. **Cap punktów:** 6, potem „i N innych".

## Architektura / przepływ

```
public/changelog.json  ──fetch(no-store) on open + focus──▶  useChangelogUpdate()
   (kurowany, per deploy)                                          │
                                                                   ├─ parseChangelog (walidacja + sort desc)
localStorage: sleeper:lastSeenChangelogVersion ◀───────────────────┤  selectUnseen(max(v) vs lastSeen)
                                                                   ▼
                                                          ChangelogBanner (overlay w (app)/_layout)
                                                           [Zrestartuj teraz]  [Później/X]
```

**Brak pieczenia wersji buildu w bundlu.** Porównanie `max(v) z changelog.json`
vs `lastSeen z localStorage` samo obsługuje:
- pojedynczy deploy → 1 niewidziany wpis,
- 2+ deploye → scalone niewidziane wpisy.

`restart()` zapisuje `lastSeen = latest` **przed** reloadem (inaczej banner wróci
po reloadzie w pętli).

## Komponenty (jednostki, granice, testy)

### 1. `public/changelog.json`
Format:
```json
[
  { "v": 1, "date": "2026-06-24", "items": ["Cofanie zakończenia snu (Przywróć)"] }
]
```
- `v`: rosnący integer; najnowszy = najwyższy `v`.
- Utrzymywany ręcznie: przy deployu z user-facing zmianą dopisuję jeden wpis
  (inkrement `v`), spięte z dyscypliną logowania commitów.
- Wpis startowy `v:1` ląduje razem z tym featurem (opis quick-undo z Fazy 0).

### 2. `src/features/changelog/changelog.ts` — czysta logika (unit-tested)
- `interface ChangelogEntry { v: number; date: string; items: string[] }`
- `parseChangelog(raw: unknown): ChangelogEntry[]`
  - type guard: tablica obiektów z `v:number`, `date:string`, `items:string[]`.
  - odfiltrowuje wpisy nie spełniające kształtu; przy nie-tablicy → `[]`.
  - sortuje malejąco po `v`.
- `interface UnseenChangelog { items: string[]; latestVersion: number; extraCount: number }`
- `selectUnseen(entries: ChangelogEntry[], lastSeen: number): UnseenChangelog`
  - bierze wpisy `v > lastSeen`, spłaszcza `items` (najnowsze first).
  - `latestVersion` = max `v` ze WSZYSTKICH wpisów (nie tylko niewidzianych).
  - cap 6 punktów; `extraCount` = liczba ponad cap.
  - brak niewidzianych → `items: []`.
- Bez `Date.now()`/`Math.random()`/I/O.

### 3. `src/features/changelog/useChangelogUpdate.ts` — hook
Stała: `CHANGELOG_URL = '/changelog.json'`, `STORAGE_KEY = 'sleeper:lastSeenChangelogVersion'`.
- Stan: `{ items: string[]; extraCount: number; visible: boolean }`, ref na `latestVersion`.
- `useEffect` (mount): `check()`; rejestruje listener `visibilitychange`
  (gdy `document.visibilityState === 'visible'` → `check()`); cleanup usuwa listener.
- `check()`:
  1. `fetch(CHANGELOG_URL, { cache: 'no-store' })` → JSON → `parseChangelog`.
  2. `lastSeen = readLastSeen()`.
  3. Jeśli `lastSeen === null` (pierwszy run) → `writeLastSeen(latestVersion)`, brak
     bannera (silent catch-up; nowy/istniejący user nie dostaje ściany historii).
  4. `selectUnseen` → jeśli `items.length > 0` → `setVisible(true)` + zapamiętaj `latestVersion`/items/extra.
  5. Błąd fetcha/parse → swallow (log w dev), brak bannera.
- `restart()`: `writeLastSeen(latestVersion)` → `window.location.reload()`.
- `dismiss()`: `setVisible(false)` (NIE zapisuje lastSeen → wróci przy następnym focusie/otwarciu).
- Guard SSR/braku API: `typeof window`/`typeof document`/`localStorage` osłonięte
  (parytet z `registerSW.ts`).
- Storage helpery (inline lub `lastSeen.ts`): `readLastSeen(): number | null`,
  `writeLastSeen(v: number): void` — try/catch wokół `localStorage` (Safari private mode).

### 4. `src/components/ChangelogBanner.tsx` — prezentacyjny
Propsy: `{ items: string[]; extraCount: number; onRestart: () => void; onDismiss: () => void }`.
- Overlay `absolute inset-x-0 bottom-0`, safe-area (`useSafeAreaInsets`), `pointerEvents="box-none"`.
- Karta: tytuł „Nowości", lista punktów (`•`), „i N innych" gdy `extraCount > 0`.
- Przyciski: **Zrestartuj teraz** (primary), **Później** (secondary / X) z `hitSlop`, a11y labels.
- NativeWind, tokeny zgodne z `Card`/`Badge`/`Snackbar` (`bg-navy`/`dark:bg-dark-surface`, `text-cream`, akcent `orange-soft`).

### 5. Montaż: `src/app/(app)/_layout.tsx`
- Wywołuje `useChangelogUpdate()`, renderuje `<ChangelogBanner>` gdy `visible`.
- Tylko w grupie `(app)` (zalogowany shell), nie na ekranach `(auth)`.

### 6. `vercel.json`
- Dodać header `Cache-Control: no-cache` (lub `no-store`) dla `/changelog.json`
  — świeżość na CDN edge (uzupełnienie do `cache: 'no-store'` po stronie fetcha).

## Edge cases

| Sytuacja | Zachowanie |
|---|---|
| Offline / fetch fail | swallow, brak bannera |
| Uszkodzony JSON | `parseChangelog → []` → brak bannera |
| Pierwszy run (brak lastSeen) | silent catch-up do `latest`, brak bannera |
| 2+ niewidziane deploye | scalone punkty, najnowsze first |
| Wiele zaległych punktów | cap 6 + „i N innych" |
| „Później" | banner znika, wróci przy następnym focus/open |
| Reload w trakcie sesji | bezpieczny (timer derived z bazy) |
| localStorage niedostępny (Safari private) | `readLastSeen → null`, `writeLastSeen` no-op (try/catch). Skutek: każdy check to „pierwszy run" → silent catch-up → banner **nigdy** się nie pokaże. Bez crasha. Akceptowalny trade-off (private mode = rzadkie). |

## Testy

- **Unit (`changelog.test.ts`):**
  - `parseChangelog`: poprawny payload (sort desc), malformed (nie-tablica → `[]`,
    wpis bez `items` odfiltrowany), mieszany.
  - `selectUnseen`: 1 niewidziany wpis; scalone 2+; brak niewidzianych (`items:[]`);
    cap 6 + `extraCount`; `latestVersion` z pełnej listy.
- **Static-invariants (`useChangelogUpdate.test.ts`):** `visibilitychange` listener
  + cleanup (`removeEventListener`), `cache: 'no-store'`, guard `window`/`localStorage`,
  `window.location.reload` w `restart`.
- **Static-invariants (`ChangelogBanner.test.ts`):** oba przyciski obecne, brak
  native-only API, a11y role.

## Out of scope (YAGNI)

- Interwał pollingu w tle.
- Twardy modal blokujący bez „Później".
- Auto-generacja changelogu z gita / `docs/commits/`.
- Pieczenie wersji buildu w JS / osobny `/version.json`.
- i18n (treść po polsku, jak reszta UI).

## Walidacja (Definition of Done)

`pnpm web:build:check` zielony + nowy kod ma testy + commit + log w `docs/commits/`.
Czas/daty (gdyby trzeba) przez `lib/time.ts`. Runtime: manualna weryfikacja —
bump `v`, deploy, sprawdź banner + restart na zainstalowanym PWA.
