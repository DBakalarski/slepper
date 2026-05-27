# Manual test — Faza 5: Powiadomienia

**Branch:** `feature/mvp-sleep-tracker`
**Data utworzenia:** 2026-05-27

Wszystkie scenariusze wymagaja fizycznego urzadzenia (iOS lub Android). Symulator iOS dziala dla notyfikacji, ale nie odda real-world zachowan (delivery delay, background killing). Expo Go wystarczy do dev — nie wymaga development build.

## Prerekwizyty

- [ ] Aplikacja zainstalowana w Expo Go (lub development build).
- [ ] Konto uzytkownika utworzone, rodzina i przynajmniej jedno dziecko dodane.
- [ ] Wyczyszczone scheduled notifications: w iOS Settings → Notifications → sleeper-app, w Android → Settings → Apps → sleeper-app → Notifications.
- [ ] (Opcjonalnie do scenariusza 3) Zmodyfikuj tymczasowo `WAKE_WINDOW_0_3M_MIN` w `src/lib/time.ts` na np. `5` (5 min zamiast 75) — pozwoli zobaczyc notyfikacje w realnym czasie testu. PRZYWROC po tescie.

---

## Scenariusz 1 — Permission request po dodaniu pierwszego dziecka (granted)

**Cel:** Sprawdzic ze permission prompt pokazuje sie raz, po dodaniu pierwszego dziecka.

1. **Odinstaluj i zainstaluj** aplikacje (lub Settings → Reset → wyczysc dane sleeper-app). Wazne aby system reset permission status.
2. Otworz aplikacje, sign-up nowego usera.
3. Pojawia sie ekran "Dodaj dziecko". Wypelnij dane i kliknij "Dodaj dziecko".
4. **Spodziewane:** w ciagu 1–2s pokazuje sie system prompt "sleeper-app would like to send you notifications" (iOS) lub "Allow sleeper-app to send you notifications?" (Android).
5. Kliknij **Allow**.
6. Glowny ekran "Dzisiaj" pojawia sie normalnie.

**Pass criteria:**
- [ ] Prompt pojawil sie dokladnie raz, po dodaniu dziecka.
- [ ] Aplikacja nie crashuje po Allow ani po Deny.

---

## Scenariusz 2 — Permission denied: app dziala normalnie, ale bez notyfikacji

**Cel:** App nie blokuje sie gdy user odmowi.

1. Powtorz Scenariusz 1, ale w kroku 5 kliknij **Don't Allow** (iOS) / **Block** (Android).
2. Aplikacja pokazuje glowny ekran "Dzisiaj".
3. Rozpocznij i zakoncz drzemke.

**Pass criteria:**
- [ ] App nie crashuje, ekran "Dzisiaj" jest interaktywny.
- [ ] Brak crashy w consoli `npx expo start` (ew. `[notifications] reschedule failed:` warning jest OK — fire-and-forget).
- [ ] Notyfikacja NIE pojawia sie (oczekiwane — permissions denied).

---

## Scenariusz 3 — Notyfikacja schedulowana po zakonczeniu sesji (granted)

**Cel:** Po `useEndSession` notyfikacja jest faktycznie zaplanowana.

**Setup:** Permission granted (Scenariusz 1 zakonczony "Allow").

**Wariant A — sprawdzenie schedule bez czekania:**

1. Rozpocznij drzemke (BigActionButton "Rozpocznij sen" lub QuickAction "Drzemka teraz").
2. Po 1–2 sekundach zakoncz sesje ("Zakoncz sen").
3. Otworz **iOS Settings → Notifications → sleeper-app → Show Previews** lub uzyj polecenia w terminalu (z prerekwizytami z Expo doc).
4. Alternatywnie dodaj **tymczasowo** w `app/(app)/index.tsx` debug button `Notifications.getAllScheduledNotificationsAsync().then(console.log)` aby zobaczyc liste w consoli.

**Wariant B — pokazanie real-time (po edycji tabeli wake window na 5 min):**

1. Zmien w `src/lib/time.ts`: `WAKE_WINDOW_0_3M_MIN = 5`.
2. Restart Expo bundler (`npx expo start --clear`).
3. Rozpocznij i natychmiast zakoncz drzemke.
4. Czekaj ~5 min. Notyfikacja `Drzemka {imie} za ~15 min` powinna pojawic sie.
5. **Wazne — przywroc:** `WAKE_WINDOW_0_3M_MIN = 75` po tescie.

**Pass criteria:**
- [ ] `getAllScheduledNotificationsAsync()` zwraca 1 notyfikacje z `content.title = "Drzemka {imie} za ~15 min"`.
- [ ] `trigger.date` jest w przyblizeniu `endAt + targetWakeWindow - 15min`.
- [ ] (Wariant B) Notyfikacja faktycznie sie pojawila w lockscreen / banner.

---

## Scenariusz 4 — Start nowej sesji anuluje pending notyfikacje

**Cel:** Sprawdzic ze `useStartSession.onSuccess` woluje `cancelNapNotificationSafe`.

1. Zakoncz drzemke (jak w Scenariuszu 3) — notyfikacja zaplanowana.
2. Rozpocznij nowa drzemke ("Rozpocznij sen").
3. Sprawdz `getAllScheduledNotificationsAsync()` (debug button albo Expo logs).

**Pass criteria:**
- [ ] Lista scheduled notifications jest pusta.
- [ ] AsyncStorage klucz `nap-notif-${childId}` zostal usuniety (sprawdz w Expo dev menu lub w consoli debug log).

---

## Scenariusz 5 — Edycja end_at sesji aktualizuje czas notyfikacji

**Cel:** Po `useUpdateSession` notyfikacja jest reschedulowana.

1. Zakoncz drzemke. Notyfikacja zaplanowana na `endAt + window - 15min`.
2. Otworz ekran edycji sesji (tap na sesje w liscie "Sesje dzisiaj").
3. Zmien `Koniec snu` na +30 min poznzniej. Kliknij "Zapisz".
4. Sprawdz scheduled notifications.

**Pass criteria:**
- [ ] Stara notyfikacja zostala anulowana, nowa zaplanowana z `trigger.date` przesunietym o +30 min.
- [ ] Lista ma dokladnie 1 notyfikacje (nie dwie).

---

## Scenariusz 6 — Delete ostatniej zakonczonej sesji recalcule

**Cel:** Po `useDeleteSession` system znajduje nowa "ostatnia sesje" i przeplanowuje.

**Setup:** Dodaj 2 zakonczone sesje (np. backdated 09:00–10:00 i 12:00–13:00). Notyfikacja jest zaplanowana wzgledem 12:00–13:00.

1. Otworz edycje sesji 12:00–13:00 i usun ja.
2. Sprawdz scheduled notifications.

**Pass criteria:**
- [ ] Nowa notyfikacja jest zaplanowana wzgledem sesji 09:00–10:00 (`endAt = 10:00`).
- [ ] Jesli `endAt + window - 15min < now` (sesja za dawna), notyfikacja NIE jest planowana (logika `msUntilTarget <= 0`).

**Wariant edge case:** usun WSZYSTKIE zakonczone sesje.
- [ ] Zadna notyfikacja nie jest zaplanowana, AsyncStorage `nap-notif-${childId}` pusty.

---

## Scenariusz 7 — Wake window calculation per wiek

**Cel:** Sprawdzic ze `targetWakeWindowMinutes` zwraca poprawna wartosc dla danej daty urodzenia.

**Setup:** brak setupu testow w MVP — wykonaj recznie w REPL:

```ts
// W konsoli Expo (debug menu → console) lub przez tymczasowy debug button:
import { targetWakeWindowMinutes } from '@/lib/time';

const today = new Date();
console.log('1 miesiac:', targetWakeWindowMinutes(new Date(today.getTime() - 30 * 86400000))); // expected 75
console.log('5 miesiecy:', targetWakeWindowMinutes(new Date(today.getTime() - 5 * 30 * 86400000))); // 105
console.log('8 miesiecy:', targetWakeWindowMinutes(new Date(today.getTime() - 8 * 30 * 86400000))); // 150
console.log('10 miesiecy:', targetWakeWindowMinutes(new Date(today.getTime() - 10 * 30 * 86400000))); // 180
console.log('18 miesiecy:', targetWakeWindowMinutes(new Date(today.getTime() - 18 * 30 * 86400000))); // 240
```

**Pass criteria:**
- [ ] Wszystkie wartosci zgodne z tabela: 0–3m=75, 3–6m=105, 6–9m=150, 9–12m=180, 12m+=240.

---

## Scenariusz 8 — App w foreground vs background

**Cel:** Sprawdzic ze notyfikacja pokazuje sie poprawnie w obu trybach.

**Wariant A — foreground:** App otwarta gdy nadchodzi notyfikacja.
- [ ] Pokazuje sie banner u gory ekranu (dzieki `shouldShowBanner: true`).
- [ ] Dzwiek odtwarzany.

**Wariant B — background:** App zminimalizowana albo zamknieta (system action).
- [ ] Notyfikacja pojawia sie w lockscreen / notification tray.

**Wariant C — app force-killed:** App zamknieta z app switchera.
- [ ] Notyfikacja nadal sie pokazuje (scheduled = system handle, nie wymaga aktywnego process).

---

## Notatki dla operatora

- **Permission re-grant:** Jesli user odmowil "Don't ask again", system nie pokaze ponownie promptu. Trzeba isc do Settings recznie. App nie ma fallbacka — informacja w profilu ze "powiadomienia wylaczone" dochodzi w Fazie 6 (polish).
- **AsyncStorage inspection:** w Expo Dev menu jest opcja "Show AsyncStorage". Klucze: `nap-notif-${childId}` (string ID notyfikacji) + ustawienia Supabase.
- **Reset Expo Go permissions:** odinstalowanie Expo Go i reinstall resetuje wszystkie permissions wszystkich apek dev. iOS Settings nie pozwala zresetowac per-experiment.
- **Channel "default" (Android):** widoczny w Settings → Apps → sleeper-app → Notifications → Drzemki. Mozna recznie zmienic prioryt / dzwiek tam.
- **Console warnings:** `[notifications] reschedule failed:` lub `cancel failed:` to fire-and-forget warnings — nie krytyczne, nie blokuja mutacji. Loguj do Sentry w Fazie 6.

## Test environment matrix

| Platform | Tryb | Wymagane |
|---|---|---|
| iOS 17+ na fizycznym urzadzeniu | Foreground + lockscreen | Expo Go lub dev build |
| Android 13+ (POST_NOTIFICATIONS) | Foreground + tray | Expo Go lub dev build |
| iOS Symulator | Foreground only | Sufficient dla dev — push delivery z systemem moze byc opozniona |
| Android Emulator | Foreground + tray | OK, Google Play Services musi byc zainstalowane (dla niektorych zalozen) |
