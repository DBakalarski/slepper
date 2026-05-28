---
name: cr
description: Dokładne, projektowe code review dla biblioteki Sleeper Machine. Orkiestruje subagentów purity-and-units-reviewer i galland-validator równolegle, dodaje wymiary których one nie pokrywają (paired tests, determinizm testów, walidacja na boundary, branded units, cold start, alignment z tasks.md), i zwraca jeden uporządkowany raport z blokerami/ostrzeżeniami/sugestiami. Wywołuj zawsze gdy użytkownik prosi o "CR", "code review", "zrecenzuj", "review tych zmian", przed merge nietrywialnej zmiany w src/, lub gdy chce sprawdzić zgodność diff z CLAUDE.md i PLAN.md — nawet jeśli nie użyje słowa "skill". Skill jest specyficzny dla TEGO projektu i ma pierwszeństwo nad generycznymi /review i /code-review.
---

# cr — dokładne code review dla Sleeper Machine

Recenzent merytoryczny, nie autofix. Łączy trzy źródła:

1. **`purity-and-units-reviewer`** (subagent) — czystość funkcji, jednostki Galland (months vs years), safety rails, cold start, walidacja na boundary.
2. **`galland-validator`** (subagent) — numeryczna weryfikacja baseline'u względem Galland 2012 Tabel 2/3.
3. **Twoja własna analiza** — wymiary, których subagenty nie pokrywają (paired tests, determinizm testów, branded units w sygnaturach, alignment z `tasks.md`, anti-patterns).

Cel: **jeden** raport z trzema poziomami — 🔴 Blokery, 🟡 Ostrzeżenia, 🔵 Sugestie — plus krótka sekcja ✅ "co OK" żeby autor wiedział, że dany wymiar był naprawdę sprawdzony.

## Dlaczego subagenty + własna analiza, a nie tylko subagenty

Dwa istniejące subagenty są wyspecjalizowane i wąskie (na ich szczęście — dzięki temu są ostre w swojej dziedzinie). Ale CR ma być **dokładne**, więc skill domyka luki: spójność testów z kodem produkcyjnym, alignment z planem inkrementalnym, sygnatury publiczne. Te rzeczy wymagają kontekstu *całego repo*, nie tylko diffu — dlatego nie delegujemy ich subagentom (które dostają tylko diff).

## Ustalanie scope'u

1. Jeśli wywołanie ma argument (np. `/cr src/baseline.ts` albo `/cr src/`) — to jest scope. Lista plików = ten argument rozwinięty (jeśli katalog → wszystkie `.ts` w środku).
2. W przeciwnym razie:
   - `git status --short` + `git diff --name-only HEAD` → lista zmienionych/dodanych plików.
   - Jeśli pusto → przerwij z: "Brak zmian względem HEAD. Podaj scope jawnie, np. `/cr src/baseline.ts`."
3. Filtruj: tylko `src/**.ts`, `tests/**.ts`, `index.ts` w root. Pliki `.md`, lock files, `dist/`, `coverage/` — pomiń (chyba że zmiana to *tylko* dokumentacja → patrz "Edge cases").
4. Wypisz user-owi 1-liniowo, co idzie do recenzji, *zanim* zaczniesz pracę. To daje 2 sekundy na zawetowanie ("nie, tylko `baseline.ts`"), zanim spalisz tokeny.

## Procedura

### Krok 1 — Dispatch subagentów równolegle

W **jednym** bloku wywołań narzędzia uruchom oba subagenty (lub jeden, zgodnie z regułą poniżej). Równoległość ma znaczenie: szeregowanie podwaja czas oczekiwania.

- **`purity-and-units-reviewer`** — zawsze, gdy w scope są pliki w `src/`. Brief: lista plików + dla każdego cytat z diffu (jeśli plik < 200 linii zmian — wklej; jeśli więcej — każ mu przeczytać plik samodzielnie).
- **`galland-validator`** — **tylko** jeśli scope dotyka `src/baseline.ts`, `src/ageBucket.ts`, `src/profiles.ts` lub `src/math/**`. W przeciwnym razie pomiń — ten subagent uruchamia kod i sondy numeryczne, jego użycie poza zmianami w baseline jest stratą czasu.

### Krok 2 — Własna analiza (równolegle z subagentami)

Subagenty pracują w tle. Nie czekaj — w tym samym czasie sprawdź wymiary, których nie obejmują:

#### a) Paired tests
Dla każdego zmodyfikowanego lub nowego `src/<x>.ts`:
- czy istnieje `tests/<x>.test.ts` (z zachowaniem podkatalogów, np. `src/math/ewma.ts` ↔ `tests/math/ewma.test.ts`)?
- czy test ma realną treść, czy to stub (`expect(true).toBe(true)`, sam `it.todo`)?

Brak paired testu dla nowego modułu = 🔴 bloker. Stub-only = 🟡 ostrzeżenie.

#### b) Determinizm w testach
W zmienionych `tests/**`:
- czy `now` jest zmienną zadeklarowaną na początku testu (`const now = new Date('2026-01-15T12:00:00Z')`), a nie obliczaną przez `new Date()` w środku `expect`?
- czy nie ma `Date.now()`, `Math.random()`, `await sleep(...)`?

Tests używające czasu rzeczywistego = 🔴 bloker (CLAUDE.md: "now w testach zawsze jawne, nigdy z prawdziwego zegara").

#### c) Walidacja na boundary
Jeśli scope dotyka `index.ts` lub eksportowanej funkcji `recommend()`:
- czy input jest walidowany na granicy (np. `SleepSession.end >= start`, `dateOfBirth` w sensownym zakresie)?
- czy wewnętrzne moduły **nie** walidują redundantnie? (zgodnie z CLAUDE.md: walidacja tylko na boundary)

#### d) Branded units w sygnaturach publicznych
Nowe funkcje eksportowane z `src/` używające `number` zamiast `Minutes`/`Hours`/`AgeMonths`/`AgeYears` dla wartości, które *są* czasem lub wiekiem → 🟡 ostrzeżenie z konkretną sugestią.

#### e) Cold start
Jeśli scope dotyka logiki publicznej (`index.ts`, `profiles.ts`, orchestrator wyższego poziomu):
- czy `state.history.length === 0` daje sensowny `Recommendation` zamiast throwa?
- czy brak `targetWakeTime` zwraca `nextSleepAt: null` + warning, a nie hardkoduje 7:00 lub innej godziny?

#### f) Anti-patterns z CLAUDE.md
Szybki grep po diffie:
- tabela "wake windows by age" jako referencyjna struktura danych → 🔴 (CLAUDE.md zakazuje wprost),
- liczbowy wall-clock anchor (`7`, `19`, `'07:00'`) w gałęzi cold-start → 🔴,
- import `tensorflow`, `onnx`, `brain.js`, neural network libs → 🔴.

#### g) Alignment z `tasks.md`
Wczytaj `tasks.md`. Ustal, która Phase jest *aktualnie* w realizacji (pierwsza z nieukończonymi checkboxami). Czy diff wpisuje się w tę Phase, czy „przeskakuje" do Phase, której prerequisites nie są spełnione? Np. dodawanie warstwy adaptacyjnej (Phase 4) zanim baseline (Phase 3) ma komplet testów = 🟡 z konkretnym wskazaniem.

To nie jest twarda reguła — czasem przeskoki są intencjonalne. Sygnalizuj, nie blokuj.

### Krok 3 — Synteza

Gdy oba subagenty zwrócą raporty, połącz:

1. **Deduplikuj.** Jeśli subagent zgłosił to samo co Twoja analiza, podaj raz, z lepszą diagnozą.
2. **Klasyfikuj.** Każdy punkt do jednej z trzech kategorii (definicje niżej).
3. **Cytuj.** Każdy punkt: `file:line — opis problemu. Dlaczego: <reguła z CLAUDE.md/PLAN.md/Galland>. Jak poprawić: <konkretna propozycja>`.
4. **Krótka sekcja ✅.** 3-5 punktów potwierdzających, że Twoja analiza naprawdę objęła te wymiary (np. „brak `Date.now()` w diffie", „paired test istnieje i ma 4 case'y", „cold start zachowuje `nextSleepAt: null`").

#### Definicje poziomów

- **🔴 Bloker** — łamie wprost regułę z `CLAUDE.md` ("Zasady kodowania" / "Anti-patterns") **lub** błąd merytoryczny (Galland months/years confusion, safety rail bezpośrednio złamany, cold-start throwuje). Bez naprawienia nie powinno trafić do `main`.
- **🟡 Ostrzeżenie** — pachnie problemem, defensywne. Np. brak safety rail tam, gdzie wynik *teoretycznie* mógłby przekroczyć [0.7×, 1.3×]; brak testu dla edge case'u który łatwo wyobrazić; przeskok Phase.
- **🔵 Sugestia** — czytelność, nazewnictwo, dodatkowy test, lepszy komentarz cytujący Galland.

### Krok 4 — Format raportu

```
# CR — <YYYY-MM-DD> — <krótki tytuł zmiany>

**Scope**: src/baseline.ts, tests/baseline.test.ts
**Phase (tasks.md)**: Phase 3 — Baseline (in progress) — zmiana spójna z Phase
**Subagents**: purity-and-units-reviewer ✓, galland-validator ✓

## 🔴 Blokery (2)
- `src/baseline.ts:34` — `Math.log(ageMonths)` w równaniu total sleep duration. Galland używa **lat** dla TS, nie miesięcy. Popraw na `Math.log(monthsToYears(ageMonths))` lub osobna funkcja `totalSleepHours(age: AgeYears)`. Referencja: CLAUDE.md "Anti-patterns" + PLAN.md sekcja Galland eq.

- `tests/baseline.test.ts:12` — `const now = new Date()` w `beforeEach`. Łamie determinizm. Popraw na konkretną datę, np. `new Date('2026-01-15T12:00:00Z')`. Referencja: CLAUDE.md "Zasady testowania".

## 🟡 Ostrzeżenia (1)
- `src/baseline.ts:58` — `adapted` wraca bez clampa do [0.7×, 1.3×] baseline. Dla niemowląt z bardzo nieregularną historią może wyjść poza zakres. Owin w `clamp(adapted, 0.7*baseline, 1.3*baseline)`.

## 🔵 Sugestie (1)
- `src/baseline.ts:42` — komentarz nad równaniem cytuje "Galland 2012 Fig. 4" — dorzuć numer równania (np. eq. 1) dla łatwiejszego sanity-check.

## ✅ Co sprawdziłem i jest OK
- Brak `Date.now()` / `Math.random()` / `process.env` w diffie.
- Paired test `tests/baseline.test.ts` istnieje, ma 6 case'ów, brak stuba.
- Branded units użyte w sygnaturach (`AgeMonths`, `Hours`).
- Cold start: `state.history.length === 0` w `recommend()` nadal nie throwuje.
- Walidacja `SleepSession.end >= start` w `index.ts:21` — nie ruszone, nadal działa.
```

## Edge cases

- **Repo bez historii git** (`git init` bez commitów) — `git diff HEAD` zawiedzie. Zapytaj usera o explicit scope. Jeśli nie odpowie, recenzuj całe `src/`.
- **Zmiana tylko w `*.md`** — nie wywołuj subagentów. Sprawdź sam spójność: czy nowy README opisuje funkcje, które istnieją w `src/`? Czy `PLAN.md` zmienił coś, czego implementacja w `src/` nie odzwierciedla?
- **Zmiana tylko w `tests/`** — pomiń obu subagentów (ich scope to `src/`). Zrób tylko własną analizę punktów (a) — czy nie powstał test bez paired src — i (b) — determinizm w samym testach.
- **Bardzo duża zmiana (>500 linii diff)** — zanim ruszysz: zaproponuj user-owi rozbicie na CR pod-zakresów (np. najpierw `src/math/`, potem `src/baseline.ts`). Duże CR powodują, że subagenty gubią detale i raport staje się zlepkiem nie syntezą.

## Czego skill nie robi

- **Nie modyfikuje kodu.** Recenzent, nie autofix. Jeśli user chce, żebyś naprawił bloker — to osobna prośba.
- **Nie powtarza raportów subagentów verbatim.** Synteza > konkatenacja. Jeśli oba zgłosiły to samo, jeden punkt z lepszą diagnozą.
- **Nie wymyśla reguł.** Każdy 🔴 musi mieć referencję do `CLAUDE.md`, `PLAN.md` albo cytowanej publikacji (Galland 2012, Iglowstein, Paruthi, Spencer). Reguły bez kotwicy → 🔵 sugestia, nie bloker.
- **Nie blokuje na rzeczach poza scope'em.** Jeśli widzisz coś niepokojącego w pliku, którego diff *nie* tknął — wspomnij w 🔵 jako "out-of-scope notice", nie eskaluj.
