import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

// Faza 4: realtime sync.
//
// Subskrybuje zmiany w `public.sessions` filtrowane po `child_id` i przy
// kazdym evencie (INSERT/UPDATE/DELETE) invaliduje wszystkie zapytania
// klucza `['sessions']`. Konwencja z CLAUDE.md: NIE patchujemy cache recznie —
// pozwalamy TanStack Query zrobic refetch, co eliminuje cala klase bugow
// synchronizacji (out-of-order events, missing fields w payloadzie).
//
// Cleanup w useEffect return jest obowiazkowy (coding-rules §13) — bez tego
// po remount komponentu zostaje wiszacy kanal i duplikujemy event handlery.
export function useRealtimeSessions(childId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!childId) return;

    // Channel name musi byc unikalny per subskrypcje — zawieramy child_id,
    // zeby przy szybkim przelaczeniu dziecka stary kanal byl usuwany niezaleznie.
    const channel = supabase
      .channel(`sessions:child=${childId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          // Inwalidacja calego prefixu ['sessions'] — pokrywa:
          //  - useSessions(childId, range) -> ['sessions', childId, startISO, endISO]
          //  - useActiveSession(childId) -> ['sessions', childId, 'active']
          //  - useLastEndedSession -> ['sessions', childId, 'last-ended']
          // TanStack zrobi refetch tylko dla aktywnych observerow.
          void queryClient.invalidateQueries({ queryKey: ['sessions'] });
          // useSessionById uzywa prefixu ['session', id] (singular) — wymaga
          // osobnej inwalidacji, inaczej ekran edycji session/[id].tsx nie
          // dostaje swiezych danych po zmianie od partnera (P2 review faza 4).
          // Bezpieczne dla otwartego formularza: stan `form` w session/[id].tsx
          // jest useState inicjalizowany RAZ (`form === null` guard w useEffect),
          // refetch nie nadpisze edytowanych pol.
          // TODO (Faza 5/6): banner "Sesja byla edytowana przez partnera" gdy
          // refetch zmieni dane przy dirty form — wymaga porownania updated_at
          // (kolumna do dodania) i detekcji dirty state.
          void queryClient.invalidateQueries({ queryKey: ['session'] });
        },
      )
      .subscribe();

    return () => {
      // removeChannel zamyka WS subskrypcje i czysci listenery — bez tego
      // przy remount/odswiezeniu rosnie liczba aktywnych kanalow.
      void supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);
}
