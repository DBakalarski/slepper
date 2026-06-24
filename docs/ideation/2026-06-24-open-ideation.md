---
date: 2026-06-24
topic: open-ideation
focus: rozbudowa funkcjonalna aplikacji (po MVP)
---

# Ideacja: Rozbudowa aplikacji Sleeper (post-MVP)

> Lista pomysłów na rozwój aplikacji **po ukończeniu MVP**. Artefakt z workflow `/dev-ideate`:
> 4 ramy ideacji (Product / UX / Performance / Tech Debt) × ~8 pomysłów → ~33 surowych →
> deduplikacja + synteza cross-cutting → filtrowanie adwersaryjne → 7 ocalałych.
>
> **To NIE jest plan ani backlog do realizacji.** Każdy wybrany kierunek przejdź przez
> `/dev-brainstorm` (co dokładnie ma znaczyć) → `/dev-plan` (jak zbudować) zanim dotkniesz kodu.
> Status każdego pomysłu aktualizuj w miejscu (`Unexplored` → `Explored`).

## Kontekst codebase (rozpoznanie)

- **Stack:** Expo SDK 54 web-only PWA + Supabase (Postgres/Auth/Realtime), React 19, TanStack Query v5, Zustand, NativeWind v4 + Tailwind v3.4, deploy Vercel.
- **Istniejące ekrany:** Home (timer + dzisiejsze staty + quick actions START/STOP + karta okna aktywności/rekomendacji + lista sesji dziś), History (14 dni, lista/kalendarz), Profile (dane dziecka + wybór algorytmu), Settings (theme), Sleep Fullscreen, Session Detail (edycja), Child Edit, Family (invite members, pending invitations).
- **Dwa algorytmy rekomendacji:** Galland (EWMA adaptacyjny, `sleeper-machine`) + Kotki Dwa (lookup table per wiek, `sleeper-machine-kotki`), adapter normalizuje oba; wybór per dziecko (`children.algorithm`).
- **Wzorce:** timer = derived state (`SELECT start_at WHERE end_at IS NULL`), realtime sync → `invalidateQueries`, optimistic updates tylko dla START/STOP, czas UTC w bazie / `Europe/Warsaw` w UI.
- **Najwyraźniejsze luki:** `stats.tsx` to placeholder (brak dashboardu trendów); brak agregacji tygodniowej/miesięcznej; brak persystencji offline (poleganie na cache TanStack Query, który znika po refreshu); brak push/in-app alertów; TODO `useRealtimeSessions` banner "edytowane przez partnera"; TODO `history.tsx` FlatList przy >100 sesji; brak eksportu danych.

## Pomysły w rankingu

### 1. Dashboard snu i trendy (zastąpienie placeholdera `stats.tsx`)
**Werdykt:** RECOMMENDED
**Opis:** Realny ekran statystyk: wykresy tygodniowe/miesięczne (suma snu/dobę, liczba i długość drzemek, regularność pór zasypiania = odchylenie standardowe bedtime), porównanie z normą dla wieku, prosty "sleep score / forma snu" liczony z ostatnich 2–3 dni. Re-używa danych `sessions.*` + `children.birth_date` i wartości pośrednich z silnika rekomendacji.
**Uzasadnienie:** To największa jawna luka — plik istnieje jako placeholder ("Faza future"), a wszystkie dane już są w bazie. Najwyższy stosunek wartości do kosztu: brak nowej architektury, czysta wizualizacja istniejących danych. Trendy to dla rodzica główny powód, by wracać do appki po MVP.
**Wady:** Wymaga biblioteki do wykresów kompatybilnej z react-native-web (rozmiar bundle — sprawdzić bundlephobia, ew. lazy-load ekranu). Decyzje o agregacji muszą iść przez `lib/time.ts` (TZ-safe), nie przez surowe `Date`.
**Confidence:** 90%
**Złożoność:** Medium
**Status:** Unexplored

### 2. Persystencja offline-first (kolejka mutacji + cache historii)
**Werdykt:** RECOMMENDED
**Opis:** Trwały lokalny journal (IndexedDB) dla operacji START/STOP/EDIT wykonanych offline + replay po powrocie sieci z idempotency key (ochrona przed podwójną sesją przy retry). Plus cache historii w IndexedDB jako fallback zamiast pustego spinnera offline. Synteza: Offline Queue + IndexedDB Cache + Session Deduplication.
**Uzasadnienie:** Aplikacja jest używana w nocy (2–4 nad ranem), często przy słabej/zerwanej sieci. Dziś tap "STOP" offline może zniknąć (cache TanStack Query znika po refreshu), a retry przy jitterze może utworzyć duplikat. Dla PWA do nocnego trackingu to fundament niezawodności, nie dodatek.
**Wady:** Najcięższy technicznie pomysł — zmienia warstwę persystencji, wymaga conflict resolution (last-write-wins minimum) i testów. Ryzyko nad-inżynierii, jeśli realny odsetek użyć offline jest niski — warto najpierw zmierzyć (np. przez monitoring) zanim budować pełną kolejkę.
**Confidence:** 78%
**Złożoność:** High
**Status:** Unexplored

### 3. Współpraca w czasie rzeczywistym (zmiany partnera + obecność + konflikt edycji)
**Werdykt:** RECOMMENDED
**Opis:** Dokończenie wartości multi-device: banner/toast "Sesja zmieniona przez partnera" (istniejący TODO w `useRealtimeSessions`), wskaźnik obecności partnera (online / offline od X), oraz detekcja konfliktu gdy dwa urządzenia edytują tę samą sesję (field-level merge zamiast cichego last-write-wins) z mini-diffem.
**Uzasadnienie:** Sync między rodzicami to core value-prop ("ja zaczynam drzemkę, partner widzi"). Realtime listener i `family_members` już istnieją — brakuje warstwy UI feedbacku i obsługi konfliktu. Niska bariera architektoniczna (event już płynie), wysoka wartość dla rodzin z 2 opiekunami.
**Wady:** Merge na poziomie pól dodaje złożoność; trzeba uważać, by nie nadpisać pola, które user właśnie edytuje. Wskaźnik obecności wymaga lekkiego presence channel (Supabase Realtime presence).
**Confidence:** 76%
**Złożoność:** Medium
**Status:** Unexplored

### 4. Tagi kontekstu snu + korelacje
**Werdykt:** WORTH_EXPLORING
**Opis:** Opcjonalne tagi przy końcu sesji z predefiniowanej listy (np. "ząbkowanie", "choroba", "nowa lokalizacja", "hałas", "zmiana opieki") zapisywane w `sessions.tags` (JSON). W dashboardzie: filtr/porównanie średniej długości snu z tagiem vs bez ("krótszy sen przy tagu nowa lokalizacja?").
**Uzasadnienie:** Rodzic intuicyjnie zauważa korelacje, ale nigdzie ich nie zapisuje. Niski koszt (rozszerzenie istniejącego modalu edycji o selektor tagów + kolumna JSON), a daje narzędzie do generowania hipotez i zasila dashboard (#1) realnym wglądem.
**Wady:** Wartość analityczna rośnie dopiero przy zebranych danych (zimny start = pusto). Trzeba pilnować, by nie zamienić szybkiego logowania w formularz — tagi muszą zostać w pełni opcjonalne i jednodotykowe.
**Confidence:** 75%
**Złożoność:** Low–Medium
**Status:** Unexplored

### 5. Proaktywne alerty (regresja snu / "przemęczenie")
**Werdykt:** WORTH_EXPLORING
**Opis:** Supabase Edge Function (cron) lub logika in-app wykrywa heurystycznie: regresja (średni sen tygodnia −20% vs poprzedni), niespójne pory zasypiania (σ > 60 min), zbyt długi czas od ostatniego snu → "okno przemęczenia". Alert in-app (+ web push gdy dostępny) z konkretną akcją ("priorytet drzemka w ciągu 1h").
**Uzasadnienie:** Przesuwa aplikację z biernego trackera w stronę prewencji. Heurystyki proste (regresja/MAD na istniejących danych), bez ML. Rekomendacja już liczy średnie — to nadbudowa.
**Wady:** Wymaga infrastruktury powiadomień (web push na PWA jest ograniczony, zwłaszcza iOS Safari — zweryfikować przed planowaniem). Ryzyko alarmów fałszywych i "obwiniania" zmęczonego rodzica — progi i ton komunikatów wymagają ostrożności. Zależy częściowo od #1.
**Confidence:** 64%
**Złożoność:** High
**Status:** Unexplored

### 6. Eksport / raport dla pediatry
**Werdykt:** WORTH_EXPLORING
**Opis:** Eksport sesji do CSV (data, długość, typ, notatki, tagi) + generowany raport (PDF lub udostępnialny widok) z agregatami 2-tyg/miesiąc i trendami, do pokazania pediatrze. Eksport CSV trywialny (znormalizowany schemat), raport może iść przez Edge Function.
**Uzasadnienie:** Konkretna, namacalna wartość zewnętrzna (wizyta u lekarza, backup danych przez usera). Niska–średnia złożoność dla samego CSV; raport to nadbudowa nad dashboardem (#1).
**Wady:** Generowanie PDF dokłada zależność/Edge Function. Sam CSV może wystarczyć na start — pełny raport medyczny to osobna iteracja. (Integracja z Apple Health / Google Sheets odrzucona — patrz tabela.)
**Confidence:** 70%
**Złożoność:** Medium
**Status:** Unexplored

### 7. Tryb nocny / obsługa jedną ręką
**Werdykt:** WORTH_EXPLORING
**Opis:** Dedykowany tryb pod realne użycie nocne: bardzo ciemny UI (AMOLED-friendly) z przyciemnianiem Sleep Fullscreen w czasie, większy tekst, hold-tap (~1s) na krytycznych akcjach by uniknąć przypadkowych kliknięć, wolniejszy tick timera (oszczędność baterii przy telefonie leżącym 6–8h), oraz quick-undo (toast "Przywróć" przez 3s) po przypadkowym "Zakończ sen".
**Uzasadnienie:** Najczęstszy kontekst użycia to noc, jedna ręka, po ciemku, zmęczenie. Każdy element redukuje frykcję/błędy w tym konkretnym kontekście; quick-undo i adaptacyjny timer mają niezależną wartość.
**Wady:** Klaster kilku zmian UX — łatwo się rozrosnąć; lepiej pociąć na mniejsze, niezależne usprawnienia (np. samo quick-undo najpierw). Część (haptyka) nie ma sensu na web — pominięta. Ambient-light sensor niedostępny na webie — opieramy się na ustawieniu/harmonogramie.
**Confidence:** 66%
**Złożoność:** Medium
**Status:** Unexplored

## Podsumowanie odrzuceń

| # | Pomysł | Powód odrzucenia |
|---|--------|------------------|
| 1 | Streaki / gamifikacja (badge, milestone) | Słabe dopasowanie do domeny — sen niemowlaka zależy od dziecka, nie od "wysiłku" rodzica; ryzyko obwiniania zmęczonego rodzica. DEFER, nie teraz. |
| 2 | Multi-child carousel + family dashboard (skalowanie) | Wartość zależy od odsetka rodzin z 2+ dzieci; obecnie jest selektor active child. DEFER do czasu realnego zapotrzebowania. |
| 3 | Pełna personalizacja/tuning algorytmu (custom wagi, szablony) | Profil już ma `preferred_naps_per_day`/bedtime/wake_time; pełny tuning to złożoność i ryzyko podważenia spójności obu algorytmów. DEFER. |
| 4 | Hierarchia ról opiekunów + audit log sesji | Nakłada się z #3 (współpraca); audit trail ciężki jak na małą solo appkę. DEFER. |
| 5 | Haptyczny feedback | Web-only — Vibration API zawodne/niedostępne (iOS Safari). Poza scope WEB ONLY. |
| 6 | Integracja Apple Health | Native-only; projekt jest web-only (CLAUDE.md §Scope). Odrzucone. |
| 7 | Sync do Google Sheets (auth + cron) | Nad-inżynieria względem wartości — eksport CSV (#6) pokrywa potrzebę przenoszenia danych. |
| 8 | Algorithm dev tooling (harness porównawczy, property tests 1000 profili, Zod fallback, branded duration types, snapshot versioning, debug dashboard, shared metrics lib, migration guide) | Wartościowe dla jakości/utrzymania algorytmów, ale to dług/DX, nie "rozbudowa funkcjonalna aplikacji" o którą prosił user. Zebrane jako osobny bucket — DEFER do dedykowanej sesji nad pakietami `sleeper-machine*`. Zustand/Zod walidacja na boundary (`adapter.ts`) to najmocniejszy pojedynczy kandydat z tej grupy, gdyby wrócić. |

## Log sesji
- 2026-06-24: Początkowa ideacja (pełny projekt, post-MVP) — ~33 surowych kandydatów z 4 ram (Product/UX/Performance/Tech), po deduplikacji i syntezie cross-cutting → 7 ocalałych (3 RECOMMENDED, 4 WORTH_EXPLORING), 8 grup odrzuconych z uzasadnieniem.
