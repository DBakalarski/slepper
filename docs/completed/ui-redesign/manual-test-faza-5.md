# Manual Test Checklist — Faza 5 (Profil redesign)

**Branch:** `feature/ui-redesign`
**Faza:** 5 — Profil redesign
**Device:** iOS + Android via Expo Go
**Status:** non-blocking (do wykonania przez usera na fizycznym urządzeniu)

> Wygenerowane przez `mobile-feature-tester` w ramach dev-docs-review Fazy 5.
> Każdy scenariusz to user-perspective walidacja po `npx expo start`.

---

## S1 — Norma snu dla różnych wieków

**Goal:** zweryfikować że `getNormForChild(birth_date)` produkuje różne wartości w karcie Profilu zależnie od wieku dziecka.

**Steps:**
1. Otwórz aplikację → tab Profil.
2. Zaobserwuj wartość w polu "NORMA SNU DLA WIEKU" dla aktywnego dziecka.
3. Jeśli masz w bazie dwoje dzieci (różne `birth_date`), przełącz active child (z Dzisiaj tab → tap avatar / przez `useActiveChild` flow).

**Expected:**
- 0-3m → "14-17g/dobe"
- 4-12m → "12-16g/dobe"
- 1-2y → "11-14g/dobe"
- 3-5y → "10-13g/dobe"
- `formatChildAge` pod imieniem zgodne ("X miesiecy" / "Y lat") + "ur. DD MMM YYYY"

**Pass criteria:** wartość zgodna z WHO+AAP tabelą (decyzja Fazy 0). Polski liczebnik poprawny ("21 miesiecy", nie "21 miesiac").

- [ ] iOS
- [ ] Android

---

## S2 — Średnia 7d "Średnio Xg Ym ostatnie N dni · Y% normy"

**Goal:** zweryfikować że `useAvgSleep7d` produkuje sensowne wartości po dodaniu sesji w bazie.

**Steps:**
1. W bazie/aplikacji dodaj 3-5 sesji snu w ciągu ostatnich 7 dni (np. po jednej dziennie 8-10g każda).
2. Otwórz tab Profil.
3. Zaobserwuj tekst pod ProgressBar w karcie dziecka.

**Expected:**
- Format: "Srednio 9g 30m ostatnie 5 dni · 67% normy" (przykład).
- Jeśli brak sesji w ostatnich 7 dniach: "Brak danych z ostatnich 7 dni · 0% normy".
- Tint ProgressBar: success (zielony) jeśli ≥85% normy, orange poniżej. Tekst procentu w tym samym kolorze.
- **Decyzja produktowa do potwierdzenia:** `daysCovered` = liczba dni z trackowanymi sesjami (nie liczba dni okna). Jeśli trackowałeś 3 z 7 dni — średnia liczy się tylko z 3 dni, label "ostatnie 3 dni" (uczciwy).

**Pass criteria:** wartość pasuje do ręcznego sumowania sesji / liczby trackowanych dni. Cross-midnight sesja (np. 22:00 → 06:00) liczona proporcjonalnie do obu dni.

- [ ] iOS
- [ ] Android

---

## S3 — Toggle Tryb ciemny przez bottom sheet

**Goal:** zweryfikować że tri-state bottom sheet (System/Jasny/Ciemny) działa i persistuje wybór.

**Steps:**
1. Profil → tap "Tryb ciemny" row.
2. Bottom sheet wysuwa się od dołu, pokazuje 3 opcje (Smartphone "Zgodnie z systemem", Sun "Jasny", Moon "Ciemny") z `Check` przy aktywnej.
3. Tap "Jasny" → sheet zamyka się, aplikacja przełącza na jasny tryb (nawet jeśli iOS systemowy jest dark).
4. Tap "Tryb ciemny" → wybierz "Ciemny" → cała apka przełącza się natychmiast (tab bar, karty, ProgressBar).
5. Tap "Tryb ciemny" → wybierz "Zgodnie z systemem" → apka idzie za systemowym ustawieniem.
6. **Persist test:** wybierz "Ciemny" → zamknij appkę (force quit) → otwórz ponownie → powinna być w ciemnym trybie od pierwszego paint.
7. **Backdrop close:** otwórz sheet → tap na ciemne tło NAD sheetem → sheet zamyka się bez zmiany trybu.
8. **VoiceOver/TalkBack (a11y):** włącz VoiceOver → otwórz sheet → swipe przez opcje → screen reader powinien anonsować "Jasny, przycisk, zaznaczony" dla aktywnej opcji.

**Expected:**
- Przełącznik działa instantaneous (bez flash poprzedniego trybu).
- Persist między restartami: ✅.
- Backdrop tap zamyka.
- VoiceOver poprawnie anonsuje `accessibilityState: { selected: true }`.

**Pass criteria:** wszystkie 3 opcje przełączają, persist działa, backdrop close OK, a11y label poprawny.

- [ ] iOS toggle
- [ ] iOS persist
- [ ] iOS backdrop
- [ ] iOS VoiceOver (opcjonalne, jeśli a11y testing setupowany)
- [ ] Android toggle
- [ ] Android persist
- [ ] Android backdrop
- [ ] Android TalkBack (opcjonalne)

---

## S4 — Dark mode parity Profilu

**Goal:** zweryfikować że karta dziecka, sekcja SKROTY, bottom sheet wyglądają OK w dark mode (WCAG AA kontrast tekstu).

**Steps:**
1. Włącz Tryb ciemny → Profil.
2. Obserwuj kartę dziecka: w light mode `bg-purple-light`, w dark mode `bg-dark-surface`.
3. Tekst imienia + wiek powinien być czytelny (text-cream w dark).
4. Norma snu (zagnieżdżona biała karta → dark `bg-dark-card`) — kontrast value `text-2xl bold` OK.
5. ProgressBar — tint success/orange widoczny.
6. Sekcja SKROTY: karta `bg-dark-card`, ikony Bell/Moon w okrągłym chipem (`bg-orange/20`, `bg-purple/30` dark variants) — czytelne.
7. ChevronRight `text-muted` / `text-cream/60` — widoczny ale subtle.
8. Bottom sheet w dark mode: tło sheeta `bg-dark-card`, ikony Smartphone/Sun/Moon + Check w `cream` — kontrast OK.

**Expected:** wszystkie ekrany przechodzą WCAG AA (eye-test). Brak "obco" wyglądających elementów (zwłaszcza ProgressBar tint — Faza 3 review zauważyło że `bg-orange-soft` ActiveWindowCard nie ma dark variant; tu ProgressBar `bg-success`/`bg-orange` jest solid kolor i wygląda dobrze w obu trybach).

**Pass criteria:** żaden element nie wymaga zmiany dark variantu (lub jeśli wymaga — zalogować jako P3 do Fazy 6).

- [ ] iOS dark parity
- [ ] Android dark parity

---

## S5 — Back navigation `/settings`

**Goal:** zweryfikować że przejście Profil → /settings → powrót (back button + iOS swipe-back) działa bez resetu state.

**Steps:**
1. Profil → tap gear icon (Settings).
2. Otwiera się ekran `/settings` z headerem "Ustawienia" + ChevronLeft button po lewej.
3. **Sekcja Rodzina** widoczna (FamilyMembersList, InviteMemberForm, PendingInvitationsList lub NoFamilyFallback gdy brak rodziny).
4. **Przycisk "Wyloguj"** na dole karty Rodzina.
5. Tap ChevronLeft → wraca do Profil tab (nie wychodzi z aplikacji).
6. **iOS swipe-back:** otwórz /settings ponownie → swipe od lewej krawędzi → powinien wrócić do Profil (jeśli expo-router Tabs z `href:null` wspiera gesture).
7. **Sign out test:** Profil → gear → tap "Wyloguj" → aplikacja przekierowuje do `/sign-in` (status `signed_out` → `Redirect` w `(app)/_layout.tsx`).

**Expected:**
- Back navigation działa (ChevronLeft + iOS swipe).
- Sign out wylogowuje i przekierowuje do sign-in.
- Sekcja Rodzina pełna parity z poprzednim Profile (FamilyMembersList, InviteMemberForm itd.).

**Pass criteria:** flow Profile→Settings→Profile bezawaryjny, sign out działa, full feature parity z poprzednim Profile.

- [ ] iOS back button
- [ ] iOS swipe-back
- [ ] iOS sign out flow
- [ ] Android back button (hardware/gesture)
- [ ] Android sign out flow

---

## Notatki dla testera

- **Two-device sync** (regression z Fazy 7): NIE w scope tej fazy, oddzielny scenariusz w `manual-test-faza-7` lub final Faza 7.
- **Dot bell** (mock=true) — visible w Profilu? NIE — w Fazie 5 nie ma Bell `IconButton` w headerze Profilu (Bell jest tylko w `HomeHeader` Faza 3). Sekcja SKROTY → row "Przypomnienia" pokazuje tylko ikonę Bell wewnątrz chipa, bez kropki stanu.
- **Norm threshold 85%** (decyzja Fazy 5): jeśli `percentOfNorm >= 85` → success tint; `< 85` → orange. Edge case na S2: dziecko 6m z średnią 13g/dobę i normą 12-16g (max=16) → 13/16 = 81% → orange. Sprawdzić wizualnie.

---

## Status

- Wszystkie scenariusze: **`[ ]`** (czekają na wykonanie przez usera on-device).
- Po wykonaniu: odznaczyć `[x]` w tym pliku **oraz** w `ui-redesign-zadania.md` (sekcja "Walidacja" Fazy 5).
- Failujący scenariusz: zalogować jako P2 w `review-faza-5.md` lub utworzyć follow-up issue.
