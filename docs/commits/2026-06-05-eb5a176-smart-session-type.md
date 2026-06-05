# eb5a176: feat(start-sleep): derive session type from sleep recommendation

**Data:** 2026-06-05
**Branch:** feature/fixy-edycja-aktywnosc-smart-start
**Faza zadania:** Faza 2 — Fix 3: smart start sleep (typ z rekomendacji)

## Co zostalo zrobione
- Dodano helper `smartSessionType(): 'nap' | 'night_sleep'` w `ActiveChildSection` (po `handleStart`/`handleStop`). Logika:
  - `recommendation?.remainingNapsToday[0]?.type === 'NIGHT'` -> `'night_sleep'`
  - `... === 'NAP'` -> `'nap'`
  - `recommendation !== null` z pustym planem (wszystkie drzemki dnia zrobione) -> `'night_sleep'`
  - `recommendation === null` (cold start, brak `targetWakeTime` / loading) -> fallback `'nap'` (zachowuje stare zachowanie, brak regresji).
- Podmieniono props `BigActionButton`:
  - `sessionType={activeSession?.type ?? 'nap'}` -> `sessionType={activeSession?.type ?? smartSessionType()}`
  - `onPress={... : () => handleStart('nap')}` -> `onPress={... : () => handleStart(smartSessionType())}`
- `QuickActions` BEZ ZMIAN — explicit "Drzemka" / "Sen nocny" jako jawny override smart logic.
- Faza 2b N/A — `BigActionButton` JUZ przyjmuje optional `sessionType?: SessionType` (sprawdzone w `src/components/BigActionButton.tsx:16`). Komponent juz uzywa go do warunku `showMoonIcon = mode === 'start' && sessionType === 'night_sleep'`. Zero zmian w komponencie.

## Zmienione pliki
- `packages/sleeper-app/src/app/(app)/index.tsx` — dodano helper `smartSessionType` (+12 LOC z komentarzem), podmieniono 2 props w `BigActionButton`.

## Powod / kontekst
User zglosil, ze glowny przycisk "Rozpocznij sen" zawsze startuje `nap`, ignorujac rekomendacje. Po `preferred_bedtime` powinien startowac `night_sleep` (z ikona Moon na BigActionButton). `useSleepRecommendation` juz zwracal `recommendation.remainingNapsToday[]: PlanEntry[]` z polem `type: 'NIGHT' | 'NAP'` — wystarczylo z niego skorzystac. Brak nowych zaleznosci, brak refaktorow w hookach/komponentach. Override przez QuickActions zachowany.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 bledow)
- lint: PASS (`pnpm --filter sleeper-app lint` — 0 warningow)
- test: n/a (zmiana czysto runtime logic + prop wiring, brak unit testow dla `ActiveChildSection`; manualny test on-device pending)
- runtime: manual on-device test pending (Expo Go iOS + Android — 7 scenariuszy w `*-zadania.md` Faza 2: morning nap, evening night, cold start fallback, all naps done -> night, QuickActions override, label/ikona BigActionButton zmienia sie, brak crashu gdy recommendation === null)
