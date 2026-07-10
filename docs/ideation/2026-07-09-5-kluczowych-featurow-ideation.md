---
date: 2026-07-09
topic: 5-kluczowych-featurow
focus: 5 kluczowych featurow / ulepszen dla aplikacji sleeper-web
---

# Ideacja: 5 kluczowych featurów dla sleeper-web (2026-07-09)

> Świeży pełny przebieg `/dev-ideate` (poprzednia ideacja: `2026-06-24-open-ideation.md` —
> większość jej pomysłów zrealizowana: dashboard, tagi, CSV, tryb nocny, quick-undo, changelog banner).
> 4 ramy ideacji (Tech Debt / UX / Performance / Product) × ~8 pomysłów → ~32 surowych →
> deduplikacja (~20) + 3 syntezy cross-cutting → filtrowanie adwersaryjne (2 krytyków:
> wykonalność+uziemienie, wartość+strategia) → **5 ocalałych** (limit z fokusa usera).
>
> **To NIE jest plan.** Wybrany kierunek → `/dev-brainstorm` → `/dev-plan` przed kodem.

## Kontekst codebase (rozpoznanie)

- **Stack:** Expo SDK 54 web-only PWA (`packages/sleeper-web`), React 19, TS 5.9 strict, expo-router, NativeWind v4/Tailwind 3.4, TanStack Query v5, Zustand, Supabase (Postgres/Auth/Realtime), deploy Vercel. Mobile usunięte 2026-06-24.
- **Algorytm:** `kotki_dwa` jest od commita `408cd80` JEDYNYM algorytmem (usunięty przełącznik UI, migracja `0014_default_kotki_dwa.sql` ustawia default) — ale kod Gallanda żyje w ~5 plikach web + pakiet `sleeper-machine` w deps.
- **Ekrany:** home (timer + rekomendacja okna + quick actions), history (14 dni, lista/CSV; kalendarz = placeholder „wkrótce"), stats (słupki 7/14/30, σ bedtime, norma wieku, forma snu, korelacje tagów), sleep-fullscreen (tryb nocny AMOLED + auto-dim + hold-to-confirm), session edit + tagi, family, changelog, settings, profile, auth.
- **Sygnały jakości:** tylko 2 TODO w kodzie (`history.tsx:91` FlatList >100 sesji; `useRealtimeSessions.ts:47` banner partnera). Seria 4 ślepych fixów loadera startowego = kruchość bootstrapu **bez żadnej telemetrii** (zero Sentry, zero ErrorBoundary, zero Zod w repo). Notyfikacje (`lib/notifications.ts`) są w 100% no-op. Cache TanStack Query znika po refreshu (brak persistera); SW celowo pomija Supabase (network-only). Brak jakiejkolwiek Edge Function / crona.

## Pomysły w rankingu

### 1. Observability: Sentry + globalny ErrorBoundary
**Werdykt:** RECOMMENDED
**Opis:** Sentry web SDK + top-level React ErrorBoundary + capture w catchu rejestracji SW. Bez „lekkiego analytics" (wycięty przez krytykę — dla 1–2 znanych rodzin pomiar użycia to teatr).
**Uzasadnienie:** Zero observability przy udokumentowanej serii ślepych fixów loadera (`aa89f1d`, `ae180f0`, `b8061d1`, `d3ff676`). Mnożnik dla każdego innego featura; roadmapa sama warunkuje offline-first od pomiaru. Konsensus obu krytyków: STRONG.
**Wady:** Brak wartości widocznej dla usera; nowa zależność (poinformować przy instalacji — reguła §8).
**Confidence:** 90%
**Złożoność:** Low
**Status:** Unexplored

### 2. Niezawodność offline (zawężony zakres)
**Werdykt:** RECOMMENDED
**Opis:** (a) `persistQueryClient` → IndexedDB, żeby po refreshu/offline user widział ostatnie dane zamiast pustego spinnera (dziś `lib/query-client.ts` bez persistera); (b) kolejka replay z idempotency key **tylko dla START/STOP** (optimistic już jest, ale mutacja offline po prostu faila). Pełna kolejka wszystkich mutacji + conflict resolution — świadomie odcięte jako drogie 20%.
**Uzasadnienie:** Core akcja wykonywana o 3 w nocy w ciemnej sypialni przy słabym Wi-Fi. Failujący STOP = zepsuty timer i zła rekomendacja (silnik liczy z 14 dni). SW już cache'uje shell — luka dotyczy danych i mutacji.
**Wady:** Kolejka z idempotency wymaga starannych testów (double-tap, offline→online); scope-creep w stronę pełnego offline-first to główne ryzyko.
**Confidence:** 80%
**Złożoność:** Medium
**Status:** Unexplored

### 3. Plan całego dnia + oś 24h („rytm dnia")
**Werdykt:** RECOMMENDED
**Opis:** Rozszerzenie rekomendacji z pojedynczego „następne okno" do przewidzianego harmonogramu reszty dnia (łańcuch drzemek + bedtime z kotki_dwa, przeliczany po każdym START/STOP), narysowanego na poziomym timelinie doby (sen vs czuwanie — sygnaturowy widok Huckleberry/Napper) + bilans „dziś −X h vs norma" (sleep debt).
**Uzasadnienie:** Jedyna prawdziwa **ekspansja core value** z całej puli. Rodzic planuje dzień rano („zdążę na spacer/wizytę?"). Dane wejściowe gotowe: `adapter.ts` mapuje `preferredNapsCount`/`preferredBedtime`/`targetWakeTime`; `sleep-aggregation.ts` robi day-split cross-midnight; `react-native-svg` w deps. Synteza wchłania odrzucone: warstwę insightów (#8) i detekcję przejść 3→2→1 (#16) — jedna warstwa inteligencji zamiast trzech kanibalizujących się.
**Wady:** Największy pojedynczy build z listy — łańcuchowanie predykcji to NOWY silnik forecastu, błędy kumulują się w łańcuchu; wymaga zaufania do liczb (→ pomysł #5 jako fundament).
**Confidence:** 75%
**Złożoność:** High
**Status:** Explored

### 4. Instalacja PWA → Web Push o oknie drzemki (łańcuch dwuetapowy)
**Werdykt:** WORTH_EXPLORING
**Opis:** Etap 1 (tani): obsługa `beforeinstallprompt` (Android/Chrome) + delikatna instrukcja „Udostępnij → Do ekranu głównego" na iOS — dziś zero zachęty do instalacji (grep `beforeinstallprompt` = 0), a bez instalacji iOS nie dostanie push. Etap 2: ożywienie no-op `lib/notifications.ts` — Web Push „okno drzemki za ~15 min" przy zamkniętej appce (SW + Edge Function/cron + VAPID).
**Uzasadnienie:** Najwyższy sufit wartości: cała logika okna już liczona (`useSleepRecommendation`), ale wiedza nie wychodzi poza otwarty ekran — push zamienia tracker w asystenta. W `profile.tsx` jest martwy placeholder „Przypomnienia" (ikona Bell). Etap 1 pomaga też niezawodności SW/offline (#2).
**Wady:** Etap 2 = pierwsza infrastruktura server-side w projekcie (dziś brak jakiejkolwiek Edge Function); web push na iOS wymaga zainstalowanej PWA + granted permission i bywa throttlowany. Dlatego dwuetapowo, po #1 (observability) i #2. Krytyk wykonalności: WEAK dla etapu 2 solo — spike weryfikacyjny przed planowaniem.
**Confidence:** 65%
**Złożoność:** High (etap 1: Low)
**Status:** Unexplored

### 5. Utwardzenie zaufania do rekomendacji (Zod na adapterze + testy matematyki snu + sprzątnięcie Gallanda)
**Werdykt:** RECOMMENDED
**Opis:** Pakiet trzech tanich prac chroniących liczby, na których stoi appka: (a) walidacja Zod na granicy adaptera algorytmu (dziś ręczna koercja `row.algorithm` i regex-parser czasu bez walidacji; silnik rzuca na `end ≤ start`), (b) testy vitest dla `sleep-stats.ts` i `sleep-norms.ts` — jedyne nieprzetestowane pure functions matematyki snu (`sleep-aggregation.ts` ma testy, pakiety `sleeper-machine*` mają szerokie), (c) usunięcie martwej gałęzi Gallanda (`useSleepRecommendation.ts:106`, `ActiveWindowCard.tsx:75`, `children/hooks.ts:47`, dep `sleeper-machine`) **po weryfikacji w prod DB**, że żaden wiersz `children` nie ma już `algorithm='galland'` — inaczej to regresja, nie sprzątanie.
**Uzasadnienie:** Cicha regresja w normach/statach = złe porady zdrowotne bez żadnego błędu UI. Poprawność obecnej rekomendacji > jej rozszerzanie; to fundament pod #3. Blanket-Zod na wszystkim (changelog.json itd.) odrzucony jako over-engineering — tylko wąski zakres adaptera.
**Wady:** Niewidoczne dla usera; (c) wymaga data-check w produkcyjnej bazie przed usunięciem kodu.
**Confidence:** 85%
**Złożoność:** Low
**Status:** Unexplored

**Sugerowana kolejność realizacji: 1 → 5 → 2 → 3 → 4** (najpierw widoczność i zaufanie do liczb, potem niezawodność, potem ekspansja wartości, na końcu infra-ciężki push).

## Podsumowanie odrzuceń

| # | Pomysł | Powód odrzucenia |
|---|--------|------------------|
| 1 | Realtime collab UI (toast „partner zmienił", presence, konflikt edycji) | Sync danych już działa po cichu (`useRealtimeSessions`); dla 2 osób w jednym domu presence/conflict-resolution to over-engineering, kolumny `updated_at` nie ma. Sam toast tani — domknąć przy okazji, nie jako kluczowy featur. |
| 2 | Warstwa insightów (recap dnia + NL „insight of the day" + alerty in-app) | Kanibalizuje plan dnia (#3) — dla 2 userów żyjących tymi danymi NL-coaching to nowinka; wchłonięte przez #3 jako jedna warstwa inteligencji. |
| 3 | Detekcja przejść drzemkowych 3→2→1 + regresje wiekowe | Wysoka wartość domenowa, ale wysokie ryzyko false-positive erodującego zaufanie; wymaga danych longitudinalnych. Feed dla #3, nie osobny priorytet. DEFER. |
| 4 | Perf/data-layer tune-up (konsolidacja 4 query na home, granularna inwalidacja, wirtualizacja historii, lazy loading) | Przedwczesna optymalizacja bez pomiaru — TODO sam mówi „przy >100 sesji", kanał realtime już filtruje per-child. Wrócić po #1 (Sentry) jeśli dane pokażą problem. Wyjątek: zakres historii >14 dni to luka funkcjonalna — kandydat na osobną małą iterację. |
| 5 | Onboarding first-run (kreator) | Baza userów to 1–2 znane, już zonboardowane rodziny — ROI ≈ 0. Budowanie pod skalę, której nie ma. |
| 6 | Responsywność desktop/tablet | Primary use-case to noc/jedna ręka/telefon; przebudowa layoutów NativeWind kosztowna przy znikomej wartości. |
| 7 | Tryb bliźniaczy (dwoje dzieci równolegle) | Czysta spekulacja — brak usera z bliźniakami; duża przebudowa modelu active-child. |
| 8 | Widok kalendarza w Historii (dokończenie placeholdera) | Broken window wart domknięcia dla higieny (SegmentedControl już obiecuje „Kalendarz"), ale to „przeglądanie", nie core value — nie mieści się w top 5. |
| 9 | i18n scaffold | Appka po polsku dla polskich userów; retrofit tani dopóki nie ma realnej potrzeby drugiego języka. |
| 10 | Higiena repo (README „# slepper", 2 martwe zadania mobile-only w docs/active/) | Kosmetyka, nie featur — zrobić przy okazji dowolnego commita. |

## Log sesji
- 2026-07-09: Świeża ideacja (fokus: 5 kluczowych featurów) — 4 agenty ideacji (~32 surowych), deduplikacja do ~20 + 3 syntezy, 2 krytyków adwersaryjnych → 5 ocalałych (4 RECOMMENDED, 1 WORTH_EXPLORING), 10 grup odrzuconych z uzasadnieniem. Kolejność realizacji: 1 → 5 → 2 → 3 → 4.
- 2026-07-09: Pomysł #3 (Plan całego dnia + oś 24h) wybrany do realizacji → przekazany do `/dev-brainstorm`.
