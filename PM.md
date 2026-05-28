# Sleeper — Plan dla Product Managera

Aplikacja mobilna (iOS + Android) do trackowania snu i okien aktywności małego dziecka. Dwoje rodziców synchronizuje dane między swoimi telefonami od pierwszego dnia.

**Cel MVP:** używać apki codziennie z partnerem przez 5+ dni z rzędu bez ręcznego debugowania.

**Timeline:** 3–5 tygodni kalendarzowych (1–2h pracy dziennie po dziecku).

---

## Faza 0 — Fundament techniczny ✅ UKOŃCZONE

**Co rodzic zobaczy:** nic użytecznego. Pusty szkielet aplikacji.

**Co się dzieje pod spodem:**
- Apka instaluje się przez Expo Go, otwiera się bez błędów
- Cztery zakładki na dole: "Dzisiaj", "Historia", "Statystyki", "Profil" — wszystkie puste
- Połączenie z bazą danych w chmurze (Supabase) potwierdzone

**Dlaczego to ważne:** bez tego kroku nic nie da się zbudować. To "włączenie prądu".

---

## Faza 1 — Konto i rodzina ✅ UKOŃCZONE (czeka manualny test)

**Co rodzic zobaczy:**
- Ekran logowania (email + hasło) i ekran rejestracji
- Po założeniu konta — przekierowanie do głównego widoku
- W zakładce "Profil" sekcja "Rodzina" z imieniem (na razie generyczne "Rodzina") i listą członków
- Pole "Zaproś partnera" — wpisuje email partnera, klika "Zaproś"
- Po sign-up partnera tym samym emailem — partner widzi pomarańczowy baner "Masz zaproszenie" na głównym ekranie z przyciskiem "Dołącz". Klika i wchodzi do rodziny.
- Przycisk "Wyloguj"

**Co się dzieje pod spodem:**
- Bezpieczna autoryzacja (Supabase Auth)
- Model rodziny: każdy user należy do jednej rodziny. Schemat w bazie wspiera kilku członków, ale UI MVP zakłada dwóch (mama + tata).
- **Świadoma zgoda na dołączenie do rodziny:** partner nie zostaje "wciągnięty" automatycznie po sign-up — musi sam kliknąć "Dołącz". To chroni przed sytuacją w której ktoś podszywa się pod cudzy email i przejmuje dane.
- Izolacja danych między rodzinami (Row Level Security w bazie) — User z rodziny A NIGDY nie zobaczy danych rodziny B.

**Status Fazy 1:** kod gotowy, przeszedł podwójny review (security, performance, architektura, testy, manual checklist). Naprawiono 3 problemy krytyczne i 13 ważnych. Czeka tylko na manual test dwóch kont na Expo Go.

**Dlaczego to ważne:** bez tego dwoje ludzi nie mogłoby pracować na wspólnych danych. To główna feature value-prop ("ja zaczynam drzemkę, partner widzi to na swoim telefonie").

---

## Faza 2 — Tracking snu (rdzeń MVP) ⏳ NASTĘPNA

**Co rodzic zobaczy (główny widok "Dzisiaj"):**
- Onboarding po pierwszym sign-up: "Dodaj dziecko" — imię, data urodzenia, kolor avatara
- Po dodaniu dziecka — widok "Dzisiaj" z mockupów:
  - **Pomarańczowa karta "Okno aktywności"** gdy dziecko nie śpi: odlicza czas od końca ostatniej drzemki + sugerowany czas do kolejnej drzemki (na podstawie wieku)
  - **Granatowa karta "Sen w toku"** gdy dziecko śpi: live timer, button "Pełny ekran" (z trybem keep-awake — telefon nie zgasi ekranu w nocy)
  - **Biała karta agregatów dnia**: ile snu nocnego, ile drzemek, najdłuższe okno aktywności
- **Wielki granatowy przycisk** na środku:
  - "Rozpocznij sen" gdy dziecko nie śpi → tap → karta zmienia kolor na granatowy, timer rusza
  - "Zakończ sen" gdy śpi → tap → zapisuje sesję, karta wraca na pomarańczową
- **Trzy quick actions** pod spodem:
  - "Drzemka teraz" (skrót do startu drzemki)
  - "Sen nocny" (skrót dla snu nocnego)
  - "Dodaj wstecz" (modal: wybierz daty start/end, typ — dla sesji których zapomniało się zatrackować na żywo)
- Pod tym lista sesji z dziś (godzina rozpoczęcia → godzina zakończenia, typ)

**Co się dzieje pod spodem:**
- Timer to NIE zapisany licznik w bazie — to wyliczone "ile minęło od start_at". Dzięki temu po wyjściu i powrocie do aplikacji timer dalej działa poprawnie nawet po godzinie.
- Jedna aktywna sesja na dziecko (constraint w bazie — nie da się przypadkiem zacząć drugiego snu nie kończąc pierwszego)
- Optymistyczne aktualizacje — tap "Rozpocznij" daje natychmiastową reakcję UI, baza dogania w tle
- Format polski czasu: "1g 43m", "09:30 → 11:13"

**Co rodzic zyska:** to JEST aplikacja. Wszystko inne to dodatki. Po tej fazie można używać codziennie.

**Effort:** największa faza projektu — 3–5 dni pracy (XL).

---

## Faza 3 — Historia i edycja ⏳

**Co rodzic zobaczy:**
- W "Dzisiaj": sekcja "Sesje dzisiaj" z 5 ostatnimi + link "Pokaż wszystkie"
- Zakładka **"Historia"** wypełniona:
  - Day picker w nagłówku (cofnij się do wczoraj, tygodnia temu, etc.)
  - Lista wszystkich sesji z wybranego dnia
  - Tap w sesję → ekran edycji
- **Ekran edycji sesji:**
  - Time picker dla godziny rozpoczęcia i zakończenia
  - Wybór typu (drzemka / sen nocny)
  - Pole "Notatki" (np. "obudził go pies", "źle spał")
  - Przycisk "Usuń sesję" z confirm dialogiem
  - Po zapisaniu — agregaty w "Dzisiaj" się aktualizują

**Po co:** rodzic w 80% przypadków zacznie tracking dopiero gdy dziecko zaśnie, więc edycja "Dodaj wstecz" + edycja istniejących sesji jest kluczowa. Plus dane bywają błędne (telefon w drugim pokoju, ktoś zapomniał).

**Effort:** średnia — 2 dni.

---

## Faza 4 — Synchronizacja w czasie rzeczywistym ⏳

**Co rodzic zobaczy:** to samo co wcześniej, ale szybciej działa "w dwóch".

**Konkret:**
- Tata startuje drzemkę na swoim telefonie → mama na swoim telefonie widzi aktywną sesję w **mniej niż 2 sekundy** (bez odświeżania)
- Jeśli któryś telefon traci wifi → wykonuje akcję offline → po powrocie internetu synchronizacja w 5 sekund

**Co się dzieje pod spodem:**
- Subskrypcja Supabase Realtime na tabeli `sessions`
- Każdy event INSERT/UPDATE/DELETE z drugiego telefonu → invalidacja cache na pierwszym → automatyczny refresh widoku

**Po co:** bez tego rodzice są "ślepi" na swoje akcje. Z tym — apka staje się prawdziwym narzędziem zespołowym.

**Effort:** mała — 1 dzień. Magia Supabase robi 90% pracy.

---

## Faza 5 — Powiadomienia "drzemka za 15 minut" ⏳

**Co rodzic zobaczy:**
- Po pierwszym dodaniu dziecka — prośba o pozwolenie na powiadomienia
- Po zakończeniu drzemki — system w tle oblicza: kiedy zacznie się następna drzemka? (Tabela referencyjna: 0–3mc dziecko = 75 min okna aktywności, 3–6mc = 105 min, 6–9mc = 150 min, 9–12mc = 180 min, 12mc+ = 240 min)
- Na 15 minut przed sugerowanym końcem okna aktywności — push notification: *"Drzemka {imię} za ~15 min"*
- Jeśli rodzic zacznie nową drzemkę przed czasem (dziecko marudzi) → powiadomienie się anuluje
- Jeśli edytuje czas zakończenia poprzedniej drzemki → powiadomienie się przelicza

**Po co:** to feature który zamienia apkę z "trackera" w "asystenta". Rodzic nie musi pamiętać kiedy spróbować uśpić. Jeden push wystarczy.

**Effort:** średnia — 1–2 dni. Logika obliczeń + integracja z systemowymi powiadomieniami iOS/Android.

---

## Faza 6 — Dopracowanie wizualne ⏳

**Co rodzic zobaczy:** apka wygląda dokładnie jak mockupy, jest miła w użyciu.

**Konkret:**
- Ikona aplikacji + splash screen (animacja przy uruchamianiu)
- Tryb ciemny (Dark mode) — automatyczny wg ustawień systemu
- Haptic feedback (lekka wibracja) przy starcie/końcu snu
- **Development build** zainstalowany bezpośrednio na telefonie — nie trzeba mieć włączonego komputera z Expo Go, apka odpala się jak każda inna
- (Opcjonalnie, jeśli sensowne) TestFlight dla partnera — apka instalowana przez Apple za darmo bez App Store ($99/rok dla developera)

**Po co:** to jest moment "wreszcie używamy tego jak prawdziwą apkę". Bez tego pozostaje "prototyp na fizycznym telefonie".

**Effort:** mała — 1 dzień. Dużo małych rzeczy, każda krótka.

---

## Co JEST poza zakresem MVP

Te funkcje na pewno wartościowe, ale **nie będą zrobione przed datą release**:

- **Wykresy statystyczne długoterminowe** (trend snu w tygodniach/miesiącach) — zakładka "Statystyki" pozostaje placeholder
- **Multi-child dropdown w UI** — schema bazy obsługuje wiele dzieci, ale interfejs MVP zakłada jedno dziecko (drugie dziecko = osobne konto rodziny lub czekanie na update)
- **Publikacja w App Store / Google Play** — wymaga $99 Apple Developer + $25 Google + screenshots + privacy policy + content review (kilkanaście godzin pracy poza programowaniem)
- **Logowanie przez Google / Apple** — tylko email/hasło w MVP
- **Subskrypcja / monetyzacja** — apka jest do osobistego użytku
- **Pełne wsparcie offline** (Local-first sync) — wymaga osobnej biblioteki (Powersync / Legend-State), ~1 tydzień pracy
- **Error tracking / analityka** (Sentry, Mixpanel) — debug w MVP przez ręczne sprawdzanie

---

## Mierniki sukcesu MVP

1. **Codzienne użycie:** używam appki min. 5 dni z rzędu bez muszenia ręcznie debugować
2. **Multi-device:** partner aktualizuje sesję z drugiego telefonu i widzę to bez restartu apki
3. **Powiadomienia:** dostaję push "drzemka za ~15 min" co najmniej raz dziennie
4. **Brak utraty danych:** zero sesji zniknęło z historii po refresh / restart telefonu

---

## Estymata czasowa

| Faza | Co rodzic dostaje | Dni pracy | Status |
|------|-------------------|-----------|--------|
| 0 | Pusty szkielet | 1–2 | ✅ |
| 1 | Konto + rodzina + zaproszenia | 1–2 | ✅ (czeka manual test) |
| 2 | Tracking snu — JEDZ MIĘSO MVP | 3–5 | ⏳ następna |
| 3 | Historia + edycja sesji | 2 | ⏳ |
| 4 | Synchronizacja dwóch telefonów real-time | 1 | ⏳ |
| 5 | Powiadomienia "drzemka za 15 min" | 1–2 | ⏳ |
| 6 | Polish — ikona, dark mode, haptics, dev build | 1 | ⏳ |
| **Suma MVP** | | **10–15 dni** | |

Kalendarzowo (1–2h dziennie): **3–5 tygodni**.

---

## Ryzyka biznesowe

| Ryzyko | Prawdop. | Wpływ | Co robimy |
|--------|----------|-------|-----------|
| iOS nie odpala powiadomień w tle | Średnia | Wysoki | Test wcześnie w Fazie 5; fallback: powiadomienia tylko gdy apka otwarta |
| Wyciek danych innej rodziny (bug w autoryzacji) | Niska | Krytyczny | Podwójny review security w Fazie 1 + manual test z dwoma kontami przed Fazą 2 |
| Synchronizacja zrywa połączenie po nieaktywności | Średnia | Średni | Apka automatycznie odświeża dane przy powrocie z tła |
| Skok złożoności React Native (pierwsza apka mobilna autora) | Średnia | Średni | Konsultacja docs Expo przy każdym nowym komponencie; bazowa nawigacja zrobiona w Fazie 0 jako warm-up |

---

## Kontekst techniczny (jeden akapit dla PM)

Aplikacja jest budowana w **Expo + React Native** (jeden kod dla iOS i Android), z bazą danych w chmurze **Supabase** (PostgreSQL + auth + realtime). Synchronizacja real-time, autoryzacja oraz polityki bezpieczeństwa danych (RLS) są wbudowane w Supabase — to oszczędza ~tydzień pracy w porównaniu do własnego backendu. Apka działa "z chmury", więc nie ma serwera do utrzymania. Koszt MVP: ~0 zł (Supabase free tier, Expo Go za darmo). Koszt produkcyjnej publikacji: $99/rok Apple Developer + $25 jednorazowo Google Play (poza MVP).
