---
date: 2026-07-10
topic: plan-dnia-os-24h
---

# Plan całego dnia + oś 24h („rytm dnia")

Źródło: pomysł #3 z `docs/ideation/2026-07-09-5-kluczowych-featurow-ideation.md`. Wizualizacja wariantów: artefakt „Sleeper — oś 24h: 3 warianty umiejscowienia" (wybrany wariant A + przełącznik).

## Problem

Rodzic widzi dziś tylko „następny sen" + tekstową listę idealnego planu. Dwie luki:

1. **Zgrzyt danych na jednej karcie:** „Następny sen" jest kotwiczony na realnym końcu ostatniej drzemki, ale „Plan reszty dnia" pochodzi z idealnego planu liczonego od pobudki (`forwardPass`). Po krótszej/dłuższej drzemce obie informacje sobie przeczą.
2. **Brak obrazu całego dnia:** nie widać rytmu doby (co było + co przewidziane) w jednym rzucie oka, ani czy dziecko zmierza do normy snu dla wieku. Rodzic planuje dzień rano — pojedyncze „następne okno" na to nie odpowiada.

## Wymagania

- **R1. Re-kotwiczony plan reszty dnia:** każda przyszła drzemka liczona łańcuchowo od *realnego* końca ostatniego snu (ta sama kotwica co `nextSleepAt`), z okien czuwania i długości drzemek wg wieku (kotki_dwa). **Sen nocny trzyma się preferowanej godziny** (`preferred_bedtime`); gdy łańcuch drzemek mocno koliduje z bedtime, pokazujemy ostrzeżenie (mechanizm `warnings` już istnieje), nie przesuwamy bedtime.
- **R2. Plan przeliczany po każdym START/STOP/edycji sesji** — bez ręcznego odświeżania (naturalna konsekwencja: plan liczony z aktualnych sesji, jak dzisiejsza rekomendacja).
- **R3. Oś 24h w karcie rekomendacji na home (wariant A):** pozioma oś doby (0–24) pokazująca: sen nocny (fakt), drzemki (fakt), sesję w toku (blok rosnący do „teraz"), przewidziane drzemki i przewidziany sen nocny (odróżnione wizualnie od faktów), znacznik „teraz".
- **R4. Przełącznik widoku u góry karty rekomendacji:** „stara" wersja (obecna tekstowa lista planu) ↔ „nowa" (oś 24h). Wybór zapamiętany między sesjami; obie wersje pokazują ten sam, re-kotwiczony plan (R1).
- **R5. Prognoza bilansu snu pod osią:** fakty do teraz + przewidziany plan reszty dnia vs norma snu dla wieku, w formie „prognoza: −X min / +X min vs norma (Y h)". Granica dnia = dzień kalendarzowy w strefie aplikacji (spójnie z istniejącymi statystykami).
- **R6. Stany brzegowe:** kotki_dwa **zawsze** zwraca plan (kaskada kotwicy: realna pobudka → `preferred_wake_time` → default 7:00 — stan „brak kotwicy" dotyczył usuniętego Gallanda i nie występuje); gdy użyty default 7:00, plan opatrzony subtelną notą o przyjętej pobudce. Sesja w toku jest częścią obrazu: drzemka w toku → kotwica łańcucha = max(„teraz", start + długość drzemki wg wieku); trwający sen nocny → fakt liczony do „teraz", planowany koniec = preferowana pobudka. Cold start (brak sesji w dniu) → oś z samym planem od pobudki.

## Kryteria sukcesu

- Po zakończeniu drzemki o nietypowej porze/długości godziny na liście planu i na osi są spójne z „Następny sen" (zgrzyt z Problemu #1 znika).
- Rodzic odpowiada na „kiedy dziś drzemki i o której noc?" oraz „czy dziś wyrobimy normę?" jednym spojrzeniem na home, bez liczenia w głowie.
- Wskaźniki liczbowe (prognoza vs norma) zgadzają się z matematyką `sleep-aggregation`/`sleep-norms` (te same funkcje, nie równoległa implementacja).
- `pnpm web:build:check` zielony; nowa logika planu i prognozy pokryta testami jednostkowymi (w tym: krótka drzemka → przesunięty łańcuch, kolizja z bedtime → warning, cold start).

## Granice scope'u

- **Bez stats:** żadnej sekcji na dashboardzie statystyk ani przeglądania poprzednich dni (wariant C świadomie odłożony — możliwa przyszła iteracja re-używająca komponentu osi).
- **Bez alertów/powiadomień** o odchyleniach od planu (osobny pomysł #5→push z ideacji).
- **Bez zmiany filozofii kotki_dwa:** lookup table bez adaptacji/EWMA (twarda zasada pakietu); re-kotwiczenie to zmiana kotwicy łańcucha, nie adaptacja do historii.
- **Bez interakcji na osi** (tap w blok → szczegóły sesji itd.) — oś jest w tej iteracji tylko do odczytu.

## Kluczowe decyzje

- **Umiejscowienie — wariant A z przełącznikiem:** oś żyje w karcie rekomendacji na home; przełącznik u góry karty pozwala wrócić do tekstowej listy. Uzasadnienie: rytm dnia w miejscu decyzji, najmniejszy zakres, a przełącznik zdejmuje ryzyko „nowy widok mi nie leży".
- **Re-kotwiczenie: łańcuch od realności, bedtime stały.** Wierność realnym oknom czuwania + przewidywalny wieczór (ważne przy planowaniu z partnerem). Kolizja → warning, nie przesunięcie.
- **Bilans = prognoza końca dnia** (fakty + plan vs norma), nie „fakty do teraz" — odpowiada na pytanie do działania; sama suma do-teraz w połowie dnia zawsze wygląda źle.
- **Domyślny widok po wdrożeniu: oś 24h** (nowa wartość ma być widoczna); użytkownik może przełączyć i wybór zostaje zapamiętany.

## Zależności / Założenia

- `forwardPass`/`recommendKotkiDwa` już liczą pełny plan dnia i `remainingNapsToday` — R1 to rozszerzenie istniejącego silnika o re-kotwiczony wariant łańcucha, nie nowy silnik.
- Normy (`getNormForChild`) i agregacje dzienne (`dailySleepTotalsMs`, cross-midnight) istnieją w `sleeper-web/src/lib` — R5 jest kompozycją.
- Pure-function zasady pakietu kotki (brak `new Date()` w src, walidacja na boundary) obowiązują przy rozszerzaniu.

## Otwarte pytania

### Do rozwiązania przed planowaniem
(brak)

### Odroczone do planowania
- [Dotyczy R1][Techniczne] Gdzie żyje re-kotwiczony łańcuch: rozszerzenie API pakietu `sleeper-machine-kotki` (np. plan liczony od podanej kotwicy) vs kompozycja w adapterze web. Preferencja: w pakiecie (testowalne w izolacji, blisko lookup table).
- [Dotyczy R3][Techniczne] Rendering osi: czyste `View` z pozycjonowaniem procentowym (precedens: `SleepBarChart` bez biblioteki) vs `react-native-svg`. Preferencja: `View` — zero nowych zależności.
- [Dotyczy R3][Techniczne] Jak oś prezentuje sen nocny przekraczający północ (ogon porannej nocy z wczoraj + wieczorny start dzisiejszej) — spójnie z `durationWithinWindow`.
- [Dotyczy R4][Techniczne] Persystencja wyboru widoku: istniejący store Zustand persist (wzorzec z theme) — potwierdzić przy planowaniu.
- [Dotyczy R5][Techniczne] Dokładna definicja „prognozy" gdy sesja w toku (przewidywany koniec sesji w toku = planowany koniec z planu? min. do „teraz"?) — rozstrzygnąć na fixtures w testach.

## Następne kroki
→ `/dev-plan` do planowania technicznego implementacji
