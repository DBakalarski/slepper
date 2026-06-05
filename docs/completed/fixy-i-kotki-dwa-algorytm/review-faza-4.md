# Review Fazy 4: Algorytm Kotki Dwa — nowy package sleeper-machine-kotki

**Data:** 2026-05-29
**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Commit:** `b37d99e`
**Plików sprawdzonych:** 7 (src/index.ts, src/lookup.ts, src/forwardPass.ts, src/recommender.ts, tests/lookup.test.ts, tests/forwardPass.test.ts, tests/recommender.test.ts)

---

## Wynik severity gate

**CZYSTE** — P1=0, P2=0, P3=5

---

## Perspektywy

### Security

- Zero secrets / API keys w src/.
- Brak I/O, brak `process.env`, brak dynamic execution.
- Walidacja inputu kompletna: `state.now`, `profile.dateOfBirth`, `targetWakeTime`, `preferredBedtime`, `preferredNapsCount`, `SleepSession` — każde pole walidowane ze zrozumiałym throw message.
- Package nie ma runtime dependencies poza `sleeper-machine` (workspace). Brak external network calls.
- **Wynik: brak findings.**

### Performance

- Brak N+1, brak I/O. Czyste tablicowe operacje O(n) gdzie n = history.length.
- `pickBucket` działa na 11 elementach — array scan jest akceptowalny.
- Brak mutable global state. Każde wywołanie `recommendKotkiDwa` tworzy nowe obiekty bez side-effects.
- `new Date(timestamp)` i `new Date(y, m, d, h, min)` w src/ — deterministyczne transformacje wejściowego `state.now`, NIE `new Date()` bez parametrów. Determinizm zachowany.
- **Wynik: brak findings.**

### Architecture & Code Quality

**🟡 [P3-ARCH-01] `recommender.ts:194-203` — test helpers eksportowane z modułu produkcyjnego**

`_buildMorningWakeForTest` i `_computeAgeMonths` są eksportowane z `recommender.ts`, choć nie są używane w żadnym teście (grep po `tests/` — zero hitów). Eksport wewnętrznych helperów przez plik produkcyjny to anty-wzorzec: zwiększa powierzchnię publicznego API, komplikuje przyszłe refaktoryzacje i sugeruje, że testy są zorganizowane niepoprawnie (testy powinny testować zachowanie przez publiczne API, nie implementację).

Kontekst (docs/kontekst): "Export `_buildMorningWakeForTest` i `_computeAgeMonths` z recommender.ts — pomocnicze dla ewentualnych przyszłych testów." — over-specification (anty-wzorzec AI #1 z coding-rules.md §5). Skoro żaden test ich nie używa, nie powinny być eksportowane.

**Opcja fix:** usunąć oba eksporty z `recommender.ts`. Jeśli testy kiedykolwiek ich potrzebują — mogą importować bezpośrednio z `../src/recommender.js` (tak jak robią `forwardPass` i `lookup`).

---

**🟡 [P3-ARCH-02] `recommender.ts:177-182` — dead code: warning "długość drzemki przekracza maksimum" nigdy nie triggeruje**

```ts
const napLengthHours =
  bucket.typicalNaps > 0
    ? Math.min(bucket.maxNapHours, bucket.maxTotalDayNapHours / bucket.typicalNaps)
    : 0;
// ...
if (napLengthHours > 0 && napLengthHours > bucket.maxNapHours) {  // L178 — dead code
```

`napLengthHours = min(maxNapHours, ...)` — z definicji nie może przekroczyć `maxNapHours`. Kondycja L178 jest matematycznie niemożliwa. Weryfikacja dla wszystkich bucketów potwierdza zero przypadków gdzie `napLen > maxNapHours`.

**Fix:** usunąć blok L178-182. Jeśli intencja to ochrona przed niepoprawnym inputem — warunek powinien być w `validateInput` lub z inną zmienną.

---

**🟡 [P3-ARCH-03] `sameCalendarDay` operuje na device timezone (lokalna)**

`sameCalendarDay` i `buildMorningWake` używają `getFullYear/getMonth/getDate/new Date(y,m,d,h,m,s)` — to jest device-local timezone, nie `Europe/Warsaw`. Identycznie robi `sleeper-machine/src/planner.ts` (wzorzec z projektu). Zgodnie z planem: "morningWake = dzisiejsza data + wakeTime (TZ-safe, użyj setHours w czystym Date)".

Jednak `learned-patterns.md` mówi: "TZ-safe time: zawsze przez `lib/time.ts` helpers, nigdy `setHours`/`new Date(y,m,d,h,m)` na surowym Date". Ta reguła dotyczy `sleeper-app` (warstwy UI), nie biblioteki algorytmu. Biblioteka `sleeper-machine` robi to samo. `state.now` jest przekazywany przez consumer w device-local time, więc spójność jest zachowana. Brak ryzyka dla deploymentu PL-only.

**Ocena:** nit, nie P2. Zgodny z precedensem z `sleeper-machine`. Warto dodać komentarz dokumentujący decyzję.

---

### Test Coverage — Scenario Exploration

**🟡 [P3-TEST-01] `lookup.test.ts:110-116` — osłabiona asercja w teście fallback**

Test "preferredNaps bez pasującego bucketa → zwraca domyślny dla wieku" sprawdza tylko `toBeDefined()` i zakresowe `minMonths`/`maxMonths`. Brakuje asercji na konkretne `typicalNaps` (oczekiwane: 2 dla 9m fallback). Coding-rules.md §2: "Nie osłabiaj asercji (np. `toBe(429)` na `toBeDefined()`)".

Oczekiwana asercja: `expect(b.id).toBe('9m')` lub `expect(b.typicalNaps).toBe(2)`.

---

**🟡 [P3-TEST-02] Brakujący test dla warning "preferowana godzina nocnego snu daje niezdrową długość nocy"**

Kod w `recommender.ts:163-174` generuje warning gdy `preferredBedtime` + `targetWakeTime` dają noc poza `nightHoursRange ± 0.5h`. Brak testu pokrywającego ten scenariusz (grep po `recommender.test.ts` — zero hitów dla tej gałęzi). Coding-rules.md §2: każda nowa logika = minimum 1 happy path + 1 error case.

Przykładowy scenariusz do dodania:
```ts
// 9m, bedtime=23:00, wake=07:00 → nightH = 8h < (10h - 0.5h) → warning
```

---

### Mobile Manual Tests

Faza 4 to biblioteka algorytmu — brak komponentów mobile UI. Brak checkboxów `Weryfikacja:` oznaczonych jako mobile/device/Expo Go. Nie dotyczy.

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): 3
- Mobile manual: 0
- Operator: 0
- Niejasne: 0
- Failujące: 0

### Szczegóły

- [x] CLI: `pnpm install` w roocie — workspace zarejestrowany → PASS (`pnpm list -r --depth=0` pokazuje `sleeper-machine-kotki@0.1.0`)
- [x] CLI: `pnpm --filter sleeper-machine-kotki test` — 43/43 PASS → PASS
- [x] CLI: `pnpm --filter sleeper-machine-kotki build` — `dist/index.js` + `dist/index.d.ts` wyemitowane → PASS

---

## Podsumowanie

Implementacja Fazy 4 jest solidna:
- Czyste funkcje, zero I/O, pełen determinizm (brak `new Date()` / `Date.now()` bez parametrów).
- Typy re-eksportowane z `sleeper-machine` (bez duplikacji).
- Właściwa separacja odpowiedzialności: lookup / forwardPass / recommender / index.
- 43 testy zielone, build bez błędów, workspace zarejestrowany.
- CLAUDE.md packagu kompletny i zgodny z zasadami projektu.

Wszystkie 5 findings to P3 (nity):
- 2 architektoniczne (dead code, unused test helpers)
- 1 TZ-consistency note (zgodna z precedensem sleeper-machine)
- 2 test coverage gaps (osłabiona asercja, brakujący warning test)

Brak P1 i P2 — faza gotowa do kontynuacji.
