---
title: "Nieskończony refetch loop przez `new Date().toISOString()` w TanStack Query queryKey"
date: 2026-05-28
category: performance-issues
severity: high
stack:
  - TanStack Query
  - React Native
  - TypeScript
tags:
  - tanstack-query
  - useMemo
  - query-key
  - refetch-loop
  - referential-equality
status: verified
last_verified: 2026-05-28
---

# Nieskończony refetch loop przez `new Date().toISOString()` w TanStack Query queryKey

## Symptomy

- Hook z TanStack Query refetchuje przy KAŻDYM renderze rodzica
- Network tab: tysiące identycznych requestów do Supabase
- React DevTools Profiler: komponent re-renderuje w pętli
- Battery drain / lag widoczny na fizycznym urządzeniu
- W Supabase logs: nagły spike rate

## Root Cause

TanStack Query identyfikuje query po **referential equality** elementów `queryKey`. `new Date().toISOString()` ewaluowane inline w queryKey przy każdym renderze:

1. Generuje nowy string z aktualnym czasem (różniący się o milisekundy)
2. Query cache traktuje to jako NOWY query
3. Refetch trigger → setState → re-render → nowy ISO → nowy queryKey → refetch → loop

Ten sam problem dotyczy `new Date()`, `Date.now()`, `Math.random()`, inline obiektów/arrayów, wszelkich computed values bez memoizacji.

## Rozwiązanie

Memoizuj klucz dnia (lub inne computed values) i zapinaj je w queryKey:

```typescript
// Zła praktyka — refetch loop
function useAvgSleep7d(childId: string) {
  return useQuery({
    queryKey: ['avg-sleep-7d', childId, new Date().toISOString().slice(0, 10)], // <- nowy string per render
    queryFn: () => fetchSleepStats(childId),
  });
}

// Dobra praktyka — stabilny queryKey
import { useMemo } from 'react';
import { dayKeyInAppTz } from '@/lib/time';

function useAvgSleep7d(childId: string) {
  const dayKey = useMemo(() => dayKeyInAppTz(new Date()), []);
  // ^^^ dayKey computed RAZ na mount; jeśli aplikacja wisi przez północ
  //     i potrzebujesz refresh per dzień, dodaj useFocusEffect z refetch.

  return useQuery({
    queryKey: ['avg-sleep-7d', childId, dayKey],
    queryFn: () => fetchSleepStats(childId, dayKey),
  });
}
```

Dla queries które MUSZĄ refetchować per dzień (cross-midnight scenario), użyj `useFocusEffect`:

```typescript
import { useFocusEffect } from 'expo-router';

useFocusEffect(
  useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['avg-sleep-7d', childId] });
  }, [childId])
);
```

## Komendy diagnostyczne

```bash
# Znajdź podejrzane queryKey patterns
grep -rn "queryKey:" sleeper-app/src/ | grep -E "new Date|Date.now|Math.random"

# Każde wystąpienie = high-risk refetch loop
```

W React Native Debugger / Flipper sprawdź:
- Network tab: czy request leci więcej niż 1x w spoczynku
- React DevTools: czy komponent re-renderuje bez interakcji usera

## Zapobieganie

- Każda computed value w queryKey MUSI być stabilna referencyjnie między renderami: prymityw przez `useMemo`, obiekt/array przez `useMemo`, funkcja przez `useCallback`
- Code review: każde `new Date`/`Date.now`/`Math.random` w queryKey = bug
- Reguła kciuka: jeśli queryKey zawiera coś poza `[stringLiteral, prop, stableId]`, zatrzymaj się i zmemoizuj
- Cross-midnight refresh przez `useFocusEffect` + `invalidateQueries`, nie przez nowy queryKey

## Powiązane

- `docs/completed/ui-redesign/ui-redesign-podsumowanie.md` — wzorzec zaobserwowany podczas implementacji `useAvgSleep7d` (Faza 5)
- TanStack Query docs: [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)

## Kontekst

Zaobserwowane podczas implementacji `useAvgSleep7d` hook na ekranie Profil (Faza 5 UI redesign). Hook czyta sesje z ostatnich 7 dni; pierwsza wersja miała `dayKey` inline w queryKey i powodowała loop. Fix przez `useMemo([], [])` zapinał klucz dnia na czas mount komponentu — wystarczające dla single-session use case (user nie trzyma ekranu profilu otwartego przez północ).
