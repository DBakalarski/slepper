# Manual test checklist — Faza 4 (Historia redesign)

**Generator:** `mobile-feature-tester` (skill `expo-rn-testing`)
**Data:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Tryb:** Expo Go na fizycznym urzadzeniu (iOS + Android)
**Status:** non-blocking — wykonanie po Fazie 5 lub przed Faza 7 (full sweep)

## Setup

1. `cd sleeper-app && npx expo start` → QR → Expo Go iOS + Android.
2. Zaloguj sie do rodziny z minimum 1 dzieckiem.
3. Upewnij sie, ze w bazie sa sesje z ostatnich 14 dni (jesli brak — dodaj 3 sesje przez Backdated modal: dzis 09:00-10:30, dzis 13:00-14:30, wczoraj 21:00-06:30).

## Scenariusze

### S1 — Gap "aktywnosc" miedzy sesjami same-day

**Setup:** dwie sesje typu nap w tym samym dniu:
- Sesja A: 09:00 → 10:30 (drzemka, 1g 30m)
- Sesja B: 13:00 → 14:30 (drzemka, 1g 30m)

**Kroki:**
1. Wejdz w tab Historia.
2. Znajdz grupe "Dzisiaj".
3. Sprawdz, czy:
   - Sesja A jest u gory (najwczesniejsza), Sesja B pod nia.
   - Nad sesja B widoczna linia "aktywnosc 2g 30m" (gap 10:30 → 13:00).
   - Nad sesja A NIE ma linii aktywnosci (brak poprzednika).

**Expected:**
- [ ] Gap liczony jako `prev.end_at` → `next.start_at` (`14:30 - 13:00` NIE, ma byc `13:00 - 10:30 = 2g 30m`).
- [ ] Aktywnosc renderowana NAD sesja B (na lewej krawedzi pionowa kreska orange/40).
- [ ] Agregat dnia: "3g · 2 sesje".

### S2 — Tap na sesje otwiera `/session/[id]`

**Kroki:**
1. W zakladce Historia tapnij sesje w grupie "Dzisiaj".
2. Sprawdz, czy:
   - Otwiera sie ekran edycji sesji.
   - URL/route to `/session/[id]` z poprawnym id.
   - Powrot (back) wraca do Historia (nie do Dzisiaj).

**Expected:**
- [ ] Tap navige do detal sesji.
- [ ] Tap WYSOKO na rowie (chip ikona) tez navige (caly row pressable).
- [ ] VoiceOver/TalkBack czyta "Otworz sesje Drzemka 09:00 — 10:30" przed tap.

### S3 — Segment "Kalendarz" pokazuje placeholder

**Kroki:**
1. Wejdz w tab Historia.
2. Tapnij segment "Kalendarz" (ikona Calendar).
3. Sprawdz, czy:
   - Lista znika.
   - Wyswietla sie Card z ikona Calendar 36px + tekst "Widok kalendarza wkrótce".
   - Tap "Lista" wraca do listy z wszystkimi grupami.

**Expected:**
- [ ] Animacja przelaczania segmentu (200ms `withTiming` z Reanimated, decyzja Fazy 0).
- [ ] Placeholder jest pojedyncza Card (nie pelnoekranowa) — Header "Historia" + SegmentedControl zostaja widoczne.
- [ ] Tap "Lista" przywraca dane, brak refetcha (TanStack Query cache).

### S4 — Dark mode parity

**Kroki:**
1. Wejdz w Profil → toggle Tryb ciemny (jezeli juz dostepny po Fazie 5) LUB zmien system dark mode.
2. Wroc do Historia.
3. Sprawdz w dark mode:
   - Tlo `dark:bg-dark-bg` (ciemny navy).
   - Header "Historia" `dark:text-cream`.
   - Subtitle "Wszystkie sesje snu" `dark:text-cream/70`.
   - SegmentedControl tlo i ikony czytelne.
   - Card grupy dnia: `dark:bg-dark-card`, separator wewnatrz Card `dark:border-dark-surface`.
   - Chip Sun: `dark:bg-orange/30`, Moon: `dark:bg-purple/30`.
   - Tekst zakresu "HH:MM — HH:MM" `dark:text-cream`, subtitle `dark:text-cream/70`.
   - Gap "aktywnosc" `text-orange` (bez dark variantu — orange brand color, design intent).
   - ChevronRight kolor `#B8A8D9` (purple-light).

**Expected:**
- [ ] WCAG AA kontrast na obu trybach (uzyj contrast checkera w devtools jesli watpliwosci).
- [ ] Brak FOWT (flash of wrong theme) przy switch (Faza 1 zapewnia ThemeProvider).
- [ ] Parity iOS vs Android (chipy ikon w obu trybach renderuja sie tak samo).

## Edge cases (opcjonalne, jezeli czas)

### S5 — Pusta historia

**Setup:** Dziecko bez sesji.

**Expected:** Card "Brak sesji w historii." (nie pelny crash, nie pusty ekran).

### S6 — Sesja w toku (start_at set, end_at=null)

**Setup:** Rozpocznij sesje na ekranie Dzisiaj, wroc do Historia.

**Expected:**
- [ ] Sesja widoczna w grupie "Dzisiaj" jako "HH:MM — trwa" / "Drzemka · trwa".
- [ ] Status dot orange (lub purple dla night) bez zmiany koloru.
- [ ] Brak gap nad ta sesja jezeli jest pierwsza w dniu; jezeli jest po innej zakonczonej — gap renderowany normalnie.

### S7 — Cross-midnight session (P3-5 z review)

**Setup:** Dodaj backdated sesje 23:30 (wczoraj) → 01:30 (dzis).

**Expected:**
- [ ] Sesja pokazuje sie w grupie "Wczoraj" (sortowanie po `start_at`).
- [ ] Zakres "23:30 — 01:30" widoczny (UX clarity: czas konca jest *nastepnego* dnia, ale nie jest to oznaczone na UI — to swiadomy compromise MVP).
- [ ] Sesje nastepujace po niej w `dzis` (np. 09:00) NIE maja gap line (cross-day pomijany w `computeGapsBetweenSessions`).

## Raportowanie

Po wykonaniu wszystkich scenariuszy odznacz checkboxy w `ui-redesign-zadania.md` §Faza 4 — Walidacja. Failed scenarios → otworz osobne issue / dopisz P2 do `Do poprawy po review fazy 4`.

## Two-device sync (opcjonalne, Faza 7)

- [ ] Telefon A: dodaj sesje przez Backdated modal.
- [ ] Telefon B: w Historia widzi nowa sesje po max 2s (Realtime invalidacja `['sessions']`).
- [ ] Agregat dnia + gapy przekalkulowane poprawnie.
