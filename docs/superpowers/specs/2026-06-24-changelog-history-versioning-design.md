# Design: Historia zmian w Ustawieniach + wersjonowanie aplikacji

**Data:** 2026-06-24
**Status:** Zaakceptowany (brainstorming) → implementacja
**Pakiet:** `packages/sleeper-web`

## Cel

Dwa powiązane cele:

1. **Wersjonować aplikację** wg semver (pre-1.0 → major `0`). Dziś `app.json`/`package.json`
   stoją na `0.1.0` i nigdy się nie zmieniają, a `changelog.json` ma tylko wewnętrzny
   licznik `v: 1,2,3` (do logiki bannera „co nowego").
2. **Pokazać historię zmian** w Ustawieniach — pełnoekranowy widok z listą wszystkich
   wersji i krótkim opisem co się w której zmieniło.

## Kontekst / istniejący stan

- `public/changelog.json` — kurowana lista wpisów `{ v, date, items[] }`, najnowszy `v` najwyższy.
- `features/changelog/changelog.ts` — czysta logika: `parseChangelog` (type guard + sort desc po `v`),
  `selectUnseen` (logika niewidzianych dla bannera).
- `features/changelog/useChangelogUpdate.ts` — hook bannera (fetch on open+focus, localStorage lastSeen).
- `components/ChangelogBanner.tsx` + montaż w `app/(app)/_layout.tsx` — banner „co nowego" po deployu.
- `app/(app)/settings.tsx` — jeden ekran ze scrollem (Rodzina + Wyloguj), `href: null`, dostępny przez gear z Profilu.
- `expo-constants@~18.0.13` zainstalowany; `Constants.expoConfig?.version` czyta `app.json` `version` (także na web).
- Brak miejsca w UI gdzie wyświetlana jest wersja aplikacji.

## Decyzje (z brainstormingu)

1. **Schemat wersji:** semver z polem `version` w każdym wpisie changelogu. `v` (integer)
   zostaje wewnętrznym licznikiem bannera — bez zmian.
2. **Źródło prawdy wyświetlanej wersji:** `app.json` `version` (przez `Constants.expoConfig?.version`).
   `package.json` `version` trzymany w synchronie. `changelog.json` = historia.
3. **Numerowanie wg wagi zmiany** (semver): patch dla poprawek, minor dla nowych ficzerów.
4. **Umiejscowienie historii:** osobny pełnoekranowy ekran `changelog.tsx` + wiersz w Ustawieniach.
5. **Retrofit istniejących wpisów** (wszystkie trzy to user-facing ficzery → minor):
   - `v1` (quick-undo) → `0.1.0`
   - `v2` (ekran Statystyki) → `0.2.0`
   - `v3` (tagi kontekstu + korelacja) → `0.3.0`
   - `app.json` + `package.json`: `0.1.0` → `0.3.0`.

## Architektura / przepływ

```
app.json version (0.3.0) ──Constants.expoConfig.version──▶ wiersz „Historia zmian" w settings.tsx
                                                              │ router.push('/changelog')
                                                              ▼
public/changelog.json ──fetch(no-store) on mount──▶ useChangelogHistory()
   (kurowany, +version)                                │ parseChangelog (sort desc po v)
                                                        ▼
                                              changelog.tsx (lista kart per wpis)
```

Banner („co nowego") pozostaje nietknięty — używa `useChangelogUpdate` + `selectUnseen` jak dotąd.

## Komponenty (jednostki, granice, testy)

### 1. `public/changelog.json` — dodać pole `version`
Każdy wpis: `{ v, version, date, items[] }`. Retrofit jak w sekcji Decyzje.5.
```json
[
  { "v": 3, "version": "0.3.0", "date": "2026-06-24", "items": ["Tagi…", "Statystyki: Kontekst a sen"] },
  { "v": 2, "version": "0.2.0", "date": "2026-06-24", "items": ["Nowy ekran Statystyki…", …] },
  { "v": 1, "version": "0.1.0", "date": "2026-06-24", "items": ["Cofanie zakończenia snu…"] }
]
```

### 2. `app.json` + `package.json` — bump `version` `0.1.0` → `0.3.0`

### 3. `src/features/changelog/changelog.ts` — rozszerzyć kontrakt
- `ChangelogEntry` zyskuje `version: string`.
- `isChangelogEntry`: dodać wymaganie `typeof version === 'string'`.
- `parseChangelog` — **bez zmian** (sort desc po `v`), zwraca pełną listę dla ekranu historii.
- `selectUnseen` — **bez zmian** (banner nie używa `version`).

### 4. `src/features/changelog/useChangelogHistory.ts` — nowy hook (osobny od bannera)
- Stała `CHANGELOG_URL = '/changelog.json'` (lokalna; świadoma ~duplikacja względem `useChangelogUpdate`).
- Stan: discriminated union `{ status: 'loading' } | { status: 'ready'; entries: ChangelogEntry[] } | { status: 'error' }`.
- `useEffect` (mount): `fetch(CHANGELOG_URL, { cache: 'no-store' })` → JSON → `parseChangelog` → `ready`.
  Błąd/parse fail → `error`. AbortController w cleanup (regula §13).
- Guard SSR: `typeof window` (parytet z `useChangelogUpdate`).
- Bez localStorage, bez listenera focus — inna odpowiedzialność niż banner.

### 5. `src/app/(app)/changelog.tsx` — nowy ekran (wzorzec jak `settings.tsx`)
- `SafeAreaView` + `ScrollView`, header: back button (`ChevronLeft`, `router.back()`) + „Historia zmian".
- `useChangelogHistory()`:
  - `loading` → `ActivityIndicator`.
  - `error` → komunikat błędu (jak `settings` familyQuery.error).
  - `ready` + pusto → empty state („Brak historii zmian").
  - `ready` → lista kart: „Wersja {version} · {data}" + punkty `items` (`•`).
- Data formatowana czytelnie (PL); jeśli trzeba parsować — przez `lib/time.ts`. `date` jest stringiem `YYYY-MM-DD`.
- NativeWind, tokeny jak `settings`/`Card` (`bg-white dark:bg-dark-card`, `text-navy dark:text-cream`).

### 6. `src/app/(app)/settings.tsx` — wiersz „Historia zmian"
- Między kartą Rodzina a przyciskiem Wyloguj.
- `Pressable` (row): label „Historia zmian", po prawej `Constants.expoConfig?.version` → „Wersja {v}" + `ChevronRight`.
- `onPress → router.push('/changelog')`, `hitSlop`, a11y role/label, opacity feedback.

### 7. `src/app/(app)/_layout.tsx` — rejestracja route
- `<Tabs.Screen name="changelog" options={{ href: null }} />` (jak `settings`).

### 8. `docs/ideation/2026-06-24-roadmap.md` — dyscyplina utrzymania
- Uzupełnić istniejący punkt „Utrzymanie": przy deployu z user-facing zmianą bump `version`
  w `app.json` **i** `package.json` do wartości najnowszego wpisu changelogu + inkrement `v`.

## Edge cases

| Sytuacja | Zachowanie |
|---|---|
| Offline / fetch fail | `status: 'error'` → komunikat na ekranie (nie crash) |
| Uszkodzony JSON / wpis bez `version` | odfiltrowany przez `parseChangelog` → reszta renderuje się |
| Pusta lista po parse | empty state |
| `Constants.expoConfig?.version` undefined | wiersz pokazuje „Historia zmian" bez sufiksu wersji (graceful) |

## Testy

- **Unit (`changelog.test.ts`, dorzucić):**
  - `parseChangelog`: wpis bez `version` odfiltrowany; poprawny payload z `version` przechodzi, sort desc po `v`.
- **Static-invariants (`useChangelogHistory.test.ts`):** `cache: 'no-store'`, guard `window`,
  AbortController w cleanup, brak localStorage, brak listenera `visibilitychange`.
- **Static-invariants (`changelog.tsx` test):** brak native-only API, a11y back button, stany loading/error/empty.

## Out of scope (YAGNI)

- Auto-generacja `version` z gita/`docs/commits/`.
- Tooling do bumpowania wersji (robione ręcznie przy deployu, jak changelog).
- Tab/segmenty w Ustawieniach (jeden wiersz → push wystarcza).
- i18n (treść po polsku, jak reszta UI).

## Walidacja (Definition of Done)

`pnpm web:build:check` zielony (tsc + lint + test + invariants + build) + nowy kod ma testy + commit + log w `docs/commits/`.
Daty (gdyby parsowane) przez `lib/time.ts`. Runtime: gear → Ustawienia → Historia zmian → lista wersji.
