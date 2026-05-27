# Code Review — Faza 6: Polish dla siebie

**Data:** 2026-05-27
**Branch:** `feature/mvp-sleep-tracker`
**Commit:** `bca818c` — feat(mvp-sleep-tracker): faza 6 — dark mode + haptics + eas.json
**Reviewer:** /dev-docs-review (multi-agent consolidation)

---

## Severity gate

⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — 0 × P1, 3 × P2, 6 × P3.

Implementacja zgodna z planem (haptics + dark mode + eas.json). Brak P1 blokerow. Glowny temat P2 to **niepelne dark variants** — wiekszosc kart (`bg-white`), inputow, etykiet drugorzednych i empty-state textow nie ma odpowiednikow `dark:*`. Wybor "selective variants" byl jawny w decyzji implementacyjnej, ale rezultat = wizualnie niespojny dark mode (`text-navy` na `dark-bg` w empty states = niski kontrast) plus niespojnosc UX (jasne karty bg-white pojawiaja sie obok dark surfaces).

Quality gate: ✅ `npx tsc --noEmit` PASS, ✅ `npm run lint` PASS.

---

## Liczniki

| Kategoria | Liczba |
|---|---|
| 🔴 P1-blocking | 0 |
| 🟠 P2-important | 3 |
| 🟡 P3-nit | 6 |
| KOD findings | 9 |
| TEST findings | 0 (brak setupu testow — zgodnie z CLAUDE.md, nie liczone jako gap) |
| MOBILE-MANUAL | 7 scenariuszy (manual-test-faza-6.md) — pending operator |

---

## P2 — Important (3)

### 🟠 P2-correctness: dark mode kontrast tekstu na `dark-bg`

**Pliki:**
- `src/app/(app)/session/[id].tsx:53` — `<Text className="text-base text-navy">Brak ID sesji.</Text>` na rodzicu `bg-cream dark:bg-dark-bg`
- `src/app/(app)/session/[id].tsx:73` — `<Text className="text-base text-navy">Nie udalo sie zaladowac sesji.</Text>` (error state, na dark-bg)
- `src/app/(app)/session/[id].tsx:157` — `<Text className="text-2xl font-semibold text-navy">Edytuj sesje</Text>` (glowny tytul ekranu na dark-bg)
- `src/app/(app)/history.tsx:85,96,139,184` — empty/error states `text-navy` na `dark-bg`
- `src/app/(app)/index.tsx:236` — `text-navy` w `NoFamilyBanner` (`bg-orange/15` na `dark-bg` — `orange/15` z 15% alpha = niemal przezroczyste, czyli efektywnie `dark-bg`)

**Konsekwencja:** w dark mode `text-navy` (`#1E1B4B`) na `dark-bg` (`#0F0D26`) → kontrast ~1.4:1, daleko ponizej WCAG AA 4.5:1. Tekst praktycznie nieczytelny.

**Rekomendacja:** dodac `dark:text-cream` (lub `dark:text-cream/70` dla subtitle) na wszystkich textach na top-level surfaces. To kontynuacja wzorca juz zastosowanego w nagłowkach H1.

### 🟠 P2-arch: niespojnosc kart w dark mode (bg-white bez dark variant)

**Pliki:**
- `src/components/TodayStatsCard.tsx:107` — `bg-white`
- `src/components/SessionListItem.tsx:26` — `bg-white`
- `src/components/QuickActions.tsx:38` — `bg-white`
- `src/features/children/components/AddChildForm.tsx:67` — `bg-white`
- `src/features/family/components/InviteMemberForm.tsx`, `FamilyMembersList.tsx`, `PendingInvitationsList.tsx` — `bg-cream` na `dark-bg` (5% kontrast)
- `src/features/sessions/components/SessionEditForm.tsx:57` — `bg-white` (cala karta formularza edycji sesji)
- `src/features/sessions/components/BackdatedSessionModal.tsx:100,112` — `bg-cream` outer + `bg-white` inner
- `src/app/(app)/history.tsx:123` — `ModeChip` ma `bg-white` w stanie nieaktywnym
- `src/app/(app)/index.tsx:257` — `InvitationRow` `bg-white`
- `src/app/(app)/profile.tsx:29` — sekcja "Rodzina" `bg-white`

**Konsekwencja:** dark mode aktywny → ekrany maja ciemne tlo, ale karty pozostaja jasne (bg-white = `#FFFFFF`). To jest legalne wizualnie ale dziwne — uzytkownik widzi wyspy bialej powierzchni na ciemnym tle. Decyzja Fazy 6 ("selective variants") byla swiadoma, ale komentarz w kontekscie ("karty kolorowe zachowuja palete z mockupow") odnosi sie do `bg-orange`/`bg-navy` — nie do `bg-white`, ktore powinno isc na `dark-card` lub `dark-surface`.

**Rekomendacja (do decyzji userpracownik):** albo (a) dodac `dark:bg-dark-card` na wszystkich `bg-white` zachowujac tekst (`text-navy` na `dark-card` `#1E1B4B` = wystarczajacy kontrast jesli zmienimy tekst na cream w dark, ale lepiej zmienic karte), albo (b) zaakceptowac niespojnosc jako MVP polish "dla siebie" — w obu trybach dziala, kontrast WCAG AA spelniony. Wybor zalezy od subiektywnej oceny po manual test scenariusza 3/4 (iOS/Android dark mode).

### 🟠 P2-correctness: inputs z `text-navy` w dark mode

**Pliki:**
- `src/app/(auth)/sign-in.tsx:68,82` — TextInput `bg-white text-navy`
- `src/app/(auth)/sign-up.tsx:98,115` — TextInput `bg-white text-navy`
- `src/features/sessions/components/SessionEditForm.tsx:145` — textarea `text-navy`
- `src/features/sessions/components/BackdatedSessionModal.tsx:139,156,171` — inputy `text-navy`

**Konsekwencja:** wpisany tekst w inputach bedzie `text-navy` (`#1E1B4B`). Na `bg-white` w dark mode pozostaje czytelny (kontrast OK), ale wizualnie inputy wygladaja jak "wyspy light mode" na dark scenie. Dodatkowo placeholder (`placeholder-purple/...`?) i selectionColor moga wymagac platform tweak.

**Rekomendacja:** spojnie z P2-arch — albo dodac `dark:bg-dark-card dark:text-cream` na inputach, albo zaakceptowac obecny stan.

---

## P3 — Nit (6)

### 🟡 P3-arch: BigActionButton handlePress nie respektuje błędu w onPress

**Plik:** `src/components/BigActionButton.tsx:22-29`

`handlePress` woluje `Haptics.impactAsync(...)` przed `onPress()`. Jezeli `onPress` rzuca synchronicznie — haptic juz sie odpalil. W praktyce `useStartSession.mutate` jest non-throwing (mutate signature), wiec to teoretyczne. Akceptowalne dla MVP.

### 🟡 P3-perf: useColorScheme w (app)/_layout.tsx wymusza re-render calego Tabs przy zmianie systemu

**Plik:** `src/app/(app)/_layout.tsx:10-11`

Hook `useColorScheme()` z `react-native` zwraca string ('light' | 'dark' | null) i triggeruje re-render przy zmianie. Tabs sa drogim komponentem; expo-router obsluguje to natywnie. W praktyce zmiana mode = rzadka akcja usera, ale warto bylo wydzielic `tabBarStyle` do useMemo zeby uniknac alokacji obiektu w kazdym renderze (gdy parent ma re-render z innego powodu — np. activeChildId).

### 🟡 P3-arch: tabBarInactiveTintColor identyczny w obu trybach

**Plik:** `src/app/(app)/_layout.tsx:35`

```ts
tabBarInactiveTintColor: isDark ? '#7C6BAD' : '#7C6BAD',
```

Wartosc identyczna — moze byc inline `'#7C6BAD'`. Conditional bez sensu (no-op).

### 🟡 P3-arch: eas.json `cli.version >= 16.0.0` bez kontroli wzgledem zainstalowanej wersji

**Plik:** `sleeper-app/eas.json:3`

`cli.version: ">= 16.0.0"` — wymaga manualnego upgradu eas-cli. Nie zainstalowano lokalnie (manual-test pokazuje `npx eas-cli@latest`). Pragmatyczne, ale post-faza mogloby warto dodac eas-cli do devDependencies dla reproducibility (np. `eas-cli@^16.0.0`). Dla MVP "polish dla siebie" — OK.

### 🟡 P3-arch: kolor `dark-surface` zdefiniowany, nigdy uzywany

**Plik:** `sleeper-app/tailwind.config.js:21`

`'dark-surface': '#2A2660'` dodany do palety, ale grep przez codebase nie znajduje uzycia. Pozostal po pierwotnym planie dark mode (bardziej rozbudowanym) — dead code w config. Albo dodac jako tło elementów drugorzędnych (P2-arch alternatywne rozwiazanie), albo usunac.

### 🟡 P3-perf: `useColorScheme` przy każdym render w wielu komponentach (potencjalnie)

NativeWind v4 czyta `Appearance` API natywnie — wewnetrzny mechanizm subscribe per komponent. Dla aplikacji z 10+ komponentów `dark:*` może to być koszt subscribers. W praktyce neglible (Appearance API tani). Nota informacyjna.

---

## Odchylenia od planu

- `eas init` pominiete autonomicznie — **ZAMIERZONE** (manual step, dokumentowane w `manual-test-faza-6.md` scenariusz 6). Nie liczone jako finding.
- `eas build` na dev — **ZAMIERZONE** (manual, wymaga loginu + Apple Developer dla iOS).
- App icon + splash zachowane z template Expo — **ZAMIERZONE** (zakres "polish dla siebie", custom design = post-MVP).
- TestFlight build — **ZAMIERZONE** (opcjonalne, plan oznacza jako "(Opcjonalnie)").
- Plan punkt §2 "Dark mode (NativeWind dark variant)" zrealizowany **częściowo** — top-level surfaces tak, karty bg-white i inputy nie. To główne źródło P2 findings.

---

## Stan mobile-manual

Plik `manual-test-faza-6.md` zawiera 7 scenariuszy:

| Scenariusz | Priorytet | Status |
|---|---|---|
| 1 — Haptic start (P1 core UX) | P1 | pending operator |
| 2 — Haptic stop (P1 core UX) | P1 | pending operator |
| 3 — Dark mode iOS | P2 polish | pending operator |
| 4 — Dark mode Android | P2 polish | pending operator |
| 5 — Visual mockup parity | P2 polish | pending operator |
| 6 — EAS dev build | P3 manual | pending operator |
| 7 — TestFlight (opcjonalne) | P3 manual | pending operator |

Nie blokuje severity gate (manual scenariusze sa orthogonalne do code review). Wymaga fizycznego urzadzenia + Expo Go lub dev build.

---

## Kluczowe wnioski

1. **Dark mode = częściowy.** Decyzja świadoma ("selective variants"), ale praktyczny rezultat to **3 P2** wokół spójności wizualnej i kontrastu. Decyzja userowa: czy zaakceptować "wyspy light mode" w dark mode jako MVP polish, czy uzupelnic karty/inputy.
2. **Krytyczne P2 (kontrast)**: `text-navy` na `dark-bg` w empty states i tytułach drugorzędnych — WCAG AA failuje. Łatwy fix (dodać `dark:text-cream`).
3. **Haptics implementacja czysta.** Fire-and-forget, gracefully obsługuje brak Haptic Engine. Bez problemów.
4. **eas.json struktura poprawna** dla 3 profili. Reszta to manual step (eas login + init).
5. **Type safety, lint, architektura** — bez zarzutów. Brak `any`, brak `!`, czyste przepływy.

---

## Bookkeeping checkboxów Weryfikacja:

Z fazy 6 niezaznaczone checkboxy `Weryfikacja:` (przed bookkeeping):

- [ ] EAS init: `npx eas-cli init` — **pominięte autonomicznie** (wymaga `eas login`). Manual instructions w `manual-test-faza-6.md` scenariusz 6.
- [ ] Build dev na własny telefon: `eas build --profile development --platform ios|android` — manual step (user)
- [ ] (Opcjonalnie) Konto Apple Developer → TestFlight build dla partnera — manual step (user)
- [ ] Weryfikacja: apka działa standalone bez bundlera (development build zainstalowany) — manual test
- [ ] Weryfikacja: porównanie z mockupami — paleta, fonty, spacing zgodne — manual test

Klasyfikacja:
- Mobile/manual (z explicit "manual step (user)" lub "manual test"): **5** — pozostaja `[ ]` z dotychczasowymi suffixami (juz oznaczone).
- CLI: 0 — brak komend do uruchomienia (wszystkie wymagaja loginu).
- Niejasne: 0.
- Failujace: 0.

**Brak zmian w zadania.md od strony checkboxów weryfikacji** — wszystkie sa juz prawidlowo oznaczone jako manual.

### Szczegóły

- [ ] Manual: `EAS init: npx eas-cli init` — wymaga operatora (interaktywny login, manual-test-faza-6.md §6)
- [ ] Manual: `Build dev na wlasny telefon` — wymaga operatora (eas build cloud, ~10-15 min)
- [ ] Manual: `Konto Apple Developer → TestFlight` — wymaga operatora ($99 + manual setup)
- [ ] Manual: `apka dziala standalone` — manual test on-device (patrz manual-test-faza-6.md)
- [ ] Manual: `porownanie z mockupami` — manual test on-device (scenariusz 5)

---

## Re-evaluacja severity gate po bookkeeping

Bookkeeping nie wprowadzil nowych P2/P3. Decyzja koncowa:

⚠️ **KONTYNUUJ Z ZASTRZEZENIAMI** — 0 × P1, 3 × P2, 6 × P3.

Decyzja użytkownika:
- **Naprawa P2 (rekomendowana)**: ~30-60 min dodania `dark:*` wariantow na kartach + inputach + empty states. Daje pelny, spojny dark mode + WCAG AA pewne.
- **Akceptacja P2 jako "polish dla siebie"**: zaznaczyc jako swiadomie odlozone, przejsc do manual testing fazy 6.

P3 to backlog (nity) — nie wymagaja akcji.

---

## Re-review po fix cyklu 1 (2026-05-27, commit `90c3446`)

**Severity gate: ✅ CZYSTE (perspektywa KOD)** — 0 × P1, 0 × P2, 5 × P3 (bonus: P3 `dark-surface` dead code zamkniete).

### Liczniki po re-review

| Kategoria | Cykl 1 | Cykl 2 (po fix) |
|---|---|---|
| 🔴 P1-blocking | 0 | 0 |
| 🟠 P2-important | 3 | **0** |
| 🟡 P3-nit | 6 | 5 |
| KOD findings | 9 | 5 |
| TEST findings | 0 (brak setupu, CLAUDE.md) | 0 |
| MOBILE-MANUAL | 7 (pending operator) | 7 (pending operator) |

### Weryfikacja naprawy 3 × P2

#### ✅ P2-correctness (kontrast WCAG AA) — NAPRAWIONE

Wzorzec: `text-navy` → `text-navy dark:text-cream` na top-level surfaces.

Sprawdzone lokalizacje (grep PASS):
- `src/app/(app)/session/[id].tsx:53,73,157` — empty/error/header dostaly `dark:text-cream`
- `src/app/(app)/history.tsx:60,85,86,96,124,139,184` — empty states + ModeChip text + tytul "Historia"
- `src/app/(app)/index.tsx:236,257` — NoFamilyBanner + InvitationRow

Kontrast: `#F5F0E8` (cream) na `#0F0D26` (dark-bg) ~ 13:1 PASS (WCAG AA wymaga 4.5:1).

#### ✅ P2-arch (karty bez dark variant) — NAPRAWIONE

Wzorzec: `bg-white` → `bg-white dark:bg-dark-card`; `bg-cream` zagniezdzone w `dark-card` → `dark:bg-dark-surface`.

Komponenty z dodanym `dark:bg-dark-card`:
- `src/components/TodayStatsCard.tsx:107`
- `src/components/SessionListItem.tsx:26`
- `src/components/QuickActions.tsx:38`
- `src/features/children/components/AddChildForm.tsx:67`
- `src/features/sessions/components/SessionEditForm.tsx:57`
- `src/features/sessions/components/BackdatedSessionModal.tsx:112` (inner card)
- `src/app/(app)/index.tsx:257` (InvitationRow)
- `src/app/(app)/profile.tsx:29` (sekcja Rodzina)
- `src/components/Chip.tsx:21` (chip inactive state)
- `src/app/(app)/history.tsx:123` (ModeChip inactive)

Komponenty z `dark:bg-dark-surface` (karta w karcie):
- `src/features/family/components/FamilyMembersList.tsx:30`
- `src/features/family/components/PendingInvitationsList.tsx:44`
- `src/features/family/components/InviteMemberForm.tsx:56` (input cream nested in dark-card profile section)
- `src/components/Chip.tsx:21` (selected state)
- `src/app/(app)/history.tsx:123` (ModeChip selected)

Weryfikacja: `grep -rn "bg-white" src/ | grep -v "dark:bg-dark"` → 0 wynikow (brak `bg-white` bez dark variant).

#### ✅ P2-correctness (inputs `text-navy` w dark mode) — NAPRAWIONE

Wzorzec: TextInput `bg-white text-navy` → `bg-white text-navy dark:bg-dark-card dark:text-cream`.

Naprawione inputy:
- `src/app/(auth)/sign-in.tsx:68,82` — email + password
- `src/app/(auth)/sign-up.tsx:98,115` — email + password
- `src/features/sessions/components/SessionEditForm.tsx:145` — uwagi textarea
- `src/features/sessions/components/BackdatedSessionModal.tsx:139,156,171` — date + start + end inputs
- `src/components/DatePickerField.tsx`, `src/components/TimePickerField.tsx` — wsparcie dark mode na shared pickerach

Placeholdery `#7C6BAD` / `#9d97b5` pozostaja statyczne — kontrast ≥3:1 na obu tlach (PASS dla large text/placeholder per WCAG).

### Bonus: P3-arch `dark-surface` dead code → ZAMKNIETE

W cyklu 1 `'dark-surface': '#2A2660'` byl zdefiniowany ale nieuzywany. Po fixie uzywany w 5 miejscach (FamilyMembersList, PendingInvitationsList, InviteMemberForm, Chip selected, history ModeChip selected). Dead code wyeliminowany jako naturalna konsekwencja P2-arch fix.

### Pozostale P3 (5, backlog)

Bez zmian — wszystkie z cyklu 1 (poza `dark-surface`) zostaja jako nity:
1. `BigActionButton.tsx:22-29` — haptic przed `onPress()` (teoretyczne)
2. `(app)/_layout.tsx:36-38` — `tabBarStyle` bez `useMemo`
3. `(app)/_layout.tsx:35` — `isDark ? '#7C6BAD' : '#7C6BAD'` no-op conditional
4. `eas.json:3` — brak `eas-cli` w devDependencies (pragmatyczne MVP)
5. NativeWind v4 subscriber cost per `useColorScheme` — neglible nota

### Walidacja po fix

- `npx tsc --noEmit` → exit 0 ✅
- `npm run lint` → exit 0 ✅
- Brak nowych warningow.

### Stan mobile-manual

Bez zmian — 7 scenariuszy w `manual-test-faza-6.md` pozostaje `[ ]` pending operator. Re-review nie zmienia statusu manual testing (orthogonalny do code review).

### Decyzja koncowa po re-review

✅ **GOTOWE DO KONTYNUACJI** — KOD CZYSTE (0 × P1, 0 × P2, 5 × P3 backlog non-blocking). Faza 6 jako kod zamknieta. Pozostaje wylacznie mobile-manual testing (operator).
