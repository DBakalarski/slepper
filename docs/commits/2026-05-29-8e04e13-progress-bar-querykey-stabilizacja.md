# 8e04e13: fix(fixy-i-kotki-dwa-algorytm): stabilizacja queryKey progress bar — brak refetch loop

**Data:** 2026-05-29
**Branch:** feature/fixy-i-kotki-dwa-algorytm
**Faza zadania:** Faza 2 — Progress bar flicker — stabilizacja queryKey

## Co zostało zrobione

- `useSleepRecommendation.ts`: `dayKey` memoizowany raz na mount (`useMemo` z pustą tablicą deps). `rangeStart` i `rangeEnd` wyliczane z stabilnego `dayKey`, nie z tykającego `now`. Dodano `useFocusEffect` do invalidacji `['sessions']` gdy ekran wróci do fokusu nowego dnia (cross-midnight refresh).
- `hooks.ts` (sessions): `queryKey` w `useSessions` używa teraz `dayKeyInAppTz(rangeStart)` i `dayKeyInAppTz(rangeEnd)` zamiast `.toISOString()`. Filtr Supabase (wewnątrz `queryFn`) nadal używa `.toISOString()` — poprawnie.
- `ActiveWindowCard.tsx`: wrapper `<View className="mt-4 h-2">` wokół `ProgressBar` trzyma stałą wysokość 8pt niezależnie od `progressValue`. Brak layout shift gdy rekomendacja ładuje się lub jest `null`.

## Zmienione pliki

- `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts` — stabilizacja dayKey + useFocusEffect cross-midnight
- `packages/sleeper-app/src/features/sessions/hooks.ts` — queryKey: dayKeyInAppTz zamiast toISOString
- `packages/sleeper-app/src/components/ActiveWindowCard.tsx` — wrapper h-2 dla progress baru

## Powód / kontekst

`useNow(30000)` tykał co 30s, nowe `now` → nowe `rangeStart` → nowe `.toISOString()` w queryKey → TanStack Query traktował to jako nowy query → refetch → chwilowo `recommendation === null` → conditional unmount ProgressBar → layout shift ~24px. Fix zgodny z wzorcem udokumentowanym w `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md`.

## Walidacja

- typecheck: PASS (0 błędów)
- test: n/a (brak testów unit dla tej fazy — logika UI/hooks)
- runtime: do weryfikacji manualnej w Expo Go (Weryfikacja fazy 2)
