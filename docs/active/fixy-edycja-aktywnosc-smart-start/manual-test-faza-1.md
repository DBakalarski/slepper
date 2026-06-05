# Manual Test Checklist — Faza 1 (Fix 2: gap aktywności na home)

**Branch:** `feature/fixy-edycja-aktywnosc-smart-start`
**Komit:** `951f3bb`
**Pliki:** `packages/sleeper-app/src/app/(app)/index.tsx`
**Platforma:** Expo Go (iOS + Android — testuj na obu jeśli możliwe; cross-device sync nie jest wymagane)

## Setup

1. Uruchom dev server: `pnpm app:dev` z roota projektu.
2. Zeskanuj QR kod w Expo Go na fizycznym urządzeniu.
3. Zaloguj się do testowego konta z dzieckiem mającym ≥2 zakończone sesje w dniu dzisiejszym.
   - Jeśli nie ma takich sesji: dodaj 2 backdated nap przez "Dodaj wstecz" (np. 09:00–10:00 i 13:00–14:30).

## Scenariusze

### Scenariusz 1 — Happy path: gap renderuje się między sesjami

**Kroki:**
1. Otwórz home (ekran "Dzisiaj").
2. Przewiń do sekcji "Sesje dzisiaj".

**Oczekiwane:**
- [ ] Nad drugą (i każdą kolejną) sesją chronologicznie widoczny tekst `aktywność Xg Ym` w kolorze **orange** z cienką pionową linią orange/40 po lewej.
- [ ] Format duration zgodny z resztą aplikacji (`1g 30m`, `45m`, `2g 5m`).
- [ ] Visually identyczne z ekranem **Historia** (porównaj side-by-side).

**Status:** [ ] PASS [ ] FAIL — opis: ___

---

### Scenariusz 2 — Pierwsza sesja BEZ gap

**Kroki:**
1. Na ekranie "Dzisiaj" znajdź najwcześniejszą chronologicznie sesję dnia (uwaga: sortowanie w UI jest DESC — najwcześniejsza jest na dole listy).

**Oczekiwane:**
- [ ] Nad najwcześniejszą sesją dnia **NIE MA** linii "aktywność" (brak poprzednika → brak gapu).

**Status:** [ ] PASS [ ] FAIL — opis: ___

---

### Scenariusz 3 — Porównanie wizualne z Historią

**Kroki:**
1. Otwórz ekran Historia (tab "Historia").
2. Znajdź dzisiejszą grupę dnia.
3. Wróć na ekran "Dzisiaj".

**Oczekiwane:**
- [ ] Te same wartości `aktywność Xg Ym` co na Historii (te same sesje, ten sam helper, identyczne liczby).
- [ ] Te same kolory, ten sam font size, ten sam offset (pl-14).

**Status:** [ ] PASS [ ] FAIL — opis: ___

---

### Scenariusz 4 — Regression: brak sesji dziś

**Kroki:**
1. Przełącz na dziecko bez sesji dziś (lub usuń sesje testowe).
2. Otwórz home.

**Oczekiwane:**
- [ ] Sekcja "Sesje dzisiaj" w ogóle się NIE renderuje (gate `todaySessions.length > 0` linia 227).
- [ ] Brak crashy, brak pustego nagłówka, brak warningów w konsoli Expo.

**Status:** [ ] PASS [ ] FAIL — opis: ___

---

## Edge cases (opcjonalne, jeśli masz odpowiednie dane)

### Scenariusz 5 — Aktywna sesja jako poprzednik (`end_at = null`)

**Setup:** dziecko ma 1 zakończoną sesję rano + 1 trwającą teraz.

**Oczekiwane:**
- [ ] Trwająca sesja NIE ma gap (kod skipuje pary gdzie `prev.end_at === null`).
- [ ] Inne sesje renderują się normalnie.

**Status:** [ ] PASS [ ] FAIL [ ] N/A — opis: ___

### Scenariusz 6 — Cross-day session (sen nocny pn-wt)

**Setup:** sesja nocna z `start_at` 22:00 wczoraj, `end_at` 06:00 dziś + drzemka 09:00–10:30 dziś.

**Oczekiwane:**
- [ ] Drzemka dziś NIE ma gap od nocnego snu (cross-day pair filtrowana przez `dayKeyInAppTz`).
- [ ] Drzemka jeśli ma później następczynię tego samego dnia — pokazuje gap normalnie.

**Status:** [ ] PASS [ ] FAIL [ ] N/A — opis: ___

---

## Raportowanie wyników

Po wykonaniu odznacz checkboxy w pliku `fixy-edycja-aktywnosc-smart-start-zadania.md` w sekcji "Faza 1 — Test (manual, Expo Go)". Jeśli któryś scenariusz FAIL — dopisz notatkę w pliku `fixy-edycja-aktywnosc-smart-start-kontekst.md` w sekcji "Postep / Faza 1" i zgłoś jako finding do Fazy 4 (sanity check).
