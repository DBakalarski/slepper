# UI Redesign — Manual Test Master Checklist

**Branch:** `feature/ui-redesign`
**Cel:** Skonsolidowana checklista on-device dla usera. Pokrywa Faza 7 (manual test) z `ui-redesign-zadania.md` + indeks scenariuszy per-fazowych.
**Wykonanie:** Expo Go (iOS + Android), dwa fizyczne urządzenia dla regression sync.

> CLI walidacja (`tsc --noEmit` + `expo lint`) — PASS dla wszystkich faz 0-6 (2026-05-28). Manual scenariusze poniżej nie były wykonane on-device — wymagają usera.

---

## Indeks per-fazowych checklist

| Faza | Plik | Scenariusze | Zakres |
|---|---|---|---|
| 0 | [manual-test-faza-0.md](./manual-test-faza-0.md) | Walidacja tokenów + primitives | Eye-dropper kolorów, shadow iOS/Android, primitives w izolacji |
| 1 | [manual-test-faza-1.md](./manual-test-faza-1.md) | S1-S5 dark mode | Toggle 3 trybów, persist po restarcie, parity ekranów, edge cases, two-device sync |
| 2 | [manual-test-faza-2.md](./manual-test-faza-2.md) | S1-S4 tab bar | Ikony light/dark, focus chip, tap area ≥44pt, iOS+Android parity |
| 3 | [manual-test-faza-3.md](./manual-test-faza-3.md) | S1-S6 Dzisiaj | HomeHeader, ActiveWindowCard, TodayStatsCard, BigActionButton+QuickActions, "Pokaż wszystkie" router.push, dark mode parity |
| 4 | [manual-test-faza-4.md](./manual-test-faza-4.md) | S1-S4 (+S5-S7 edge) Historia | Gap calc same-day, tap session detail, calendar placeholder, dark mode parity, cross-midnight |
| 5 | [manual-test-faza-5.md](./manual-test-faza-5.md) | S1-S5 Profil | Norma snu różny wiek, średnia 7d, tri-state toggle + persist + backdrop, dark mode parity, /settings + sign out |
| 6 | [manual-test-faza-6.md](./manual-test-faza-6.md) | S1-S8 polish + a11y | VoiceOver/TalkBack, touch targets, tabular nums, pressable feedback, ProgressRing fade-in, WCAG AA, SegmentedControl regression, Realtime sync |

---

## Faza 7 — Regression checklist (skompresowana z `ui-redesign-zadania.md`)

### Dzisiaj
- [ ] Avatar z poprawnym kolorem dziecka (patrz manual-test-faza-3.md S1)
- [ ] Greeting zmienia się o porze dnia (Dzień dobry/Dobre popołudnie/Dobry wieczór/Dobranoc) (patrz manual-test-faza-3.md S1)
- [ ] Timer aktywnej sesji odlicza w real-time (patrz manual-test-faza-3.md S2)
- [ ] Ring 98% rośnie po zakończeniu sesji (patrz manual-test-faza-3.md S3, manual-test-faza-6.md S5)
- [ ] BigActionButton z Moon ikoną dla night start (patrz manual-test-faza-3.md S4)
- [ ] QuickActions z 3 ikonowymi chipami (patrz manual-test-faza-3.md S4)

### Historia
- [ ] Grupowanie po dniach (Dzisiaj/Wczoraj/data DD.MM) (patrz manual-test-faza-4.md S1)
- [ ] "aktywność Xg Ym" liczona prawidłowo między sesjami (patrz manual-test-faza-4.md S1)
- [ ] Agregat sekcji "Xg Ym · N sesji" zgodny z danymi (patrz manual-test-faza-4.md S1)
- [ ] Tap na sesję otwiera `/session/[id]` (patrz manual-test-faza-4.md S2)
- [ ] Segment "Kalendarz" pokazuje placeholder (patrz manual-test-faza-4.md S3)
- [ ] Ikony sun/moon w chipach (patrz manual-test-faza-4.md S4)

### Profil
- [ ] Norma snu zgodna z wiekiem (6m vs 24m różna) (patrz manual-test-faza-5.md S1)
- [ ] "Średnio Xg Ym" z ostatnich 7 dni poprawne (patrz manual-test-faza-5.md S2)
- [ ] Toggle Tryb ciemny zmienia całą apkę natychmiast (patrz manual-test-faza-5.md S3, manual-test-faza-1.md S1)
- [ ] Persist między restartami (patrz manual-test-faza-1.md S2, manual-test-faza-5.md S3)
- [ ] Gear icon → `/settings` (placeholder) (patrz manual-test-faza-5.md S5)
- [ ] Karta dziecka z solid bg-purple-light (patrz manual-test-faza-5.md S1)

### Tab bar
- [ ] Wszystkie 4 ikony renderują (Home/Calendar/BarChart3/User) (patrz manual-test-faza-2.md S1)
- [ ] Active state widoczny w light + dark (patrz manual-test-faza-2.md S2)

### Dark mode
- [ ] Każdy ekran ma czytelny kontrast WCAG AA (DevTools accessibility inspector) (patrz manual-test-faza-6.md S6)
- [ ] System mode → app śledzi systemowe ustawienie (patrz manual-test-faza-1.md S1, S4)
- [ ] Light/Dark override → app ignoruje system (patrz manual-test-faza-1.md S1, S4)

### Regression (sync)
- [ ] Dwa telefony — zmiana sesji na A propaguje na B przez Realtime (patrz manual-test-faza-1.md S5, manual-test-faza-6.md S8)
- [ ] START/STOP nadal działa (patrz manual-test-faza-6.md S8)
- [ ] Edycja historii nadal działa (patrz manual-test-faza-6.md S8)

### Final
- [ ] Wszystkie testy PASS
- [ ] Brak crashy w Expo Go (sprawdzić console.error)
- [ ] Commit log finalny w `docs/commits/`
- [ ] Wywołać `/dev-docs-complete` → archiwizacja w `docs/completed/ui-redesign/`
- [ ] Wywołać `/dev-compound` → nauki do `docs/solutions/`

---

## Notatki dla testera

- **Dwa urządzenia**: dla regression sync potrzebne dwa fizyczne phony zalogowane na ten sam family account.
- **Eye-dropper**: dla S1 manual-test-faza-0.md użyj DevTools / native screenshot inspector — kolory `purple-light: #B8A8D9`, `purple-soft: #E8DEF7`, `success: #5A8B6F`, itd.
- **WCAG AA**: użyj iOS Accessibility Inspector lub Android Accessibility Scanner. Próg ≥4.5:1 dla normal text, ≥3.0:1 dla large.
- **VoiceOver/TalkBack**: każdy `IconButton` musi mieć `accessibilityLabel` (Faza 6 S1).
- **Tabular nums**: timer w `ActiveWindowCard`/`SleepInProgressCard` ma zachowywać szerokość przy zmianie cyfr (Faza 6 S3).
