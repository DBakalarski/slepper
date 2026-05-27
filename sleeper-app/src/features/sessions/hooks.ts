import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  cancelNapNotificationSafe,
  rescheduleAfterDelete,
  rescheduleNapNotification,
} from '@/features/sessions/schedule-nap-side-effects';
import { translateSessionError } from '@/features/sessions/translate-session-error';
import { supabase } from '@/lib/supabase';

export type SessionType = 'nap' | 'night_sleep';

export interface SleepSession {
  id: string;
  child_id: string;
  type: SessionType;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

const sessionsByChildKey = (childId: string) => ['sessions', childId] as const;
const activeSessionKey = (childId: string) => ['sessions', childId, 'active'] as const;

function parseSessionType(value: string): SessionType {
  if (value === 'nap' || value === 'night_sleep') return value;
  throw new Error(`Unexpected session.type from DB: ${value}`);
}

function rowToSession(row: {
  id: string;
  child_id: string;
  type: string;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}): SleepSession {
  return {
    id: row.id,
    child_id: row.child_id,
    type: parseSessionType(row.type),
    start_at: row.start_at,
    end_at: row.end_at,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

// Wszystkie sesje dziecka z danego dnia (filter w UTC, ale dzien wyliczany
// z app tz przez wolajacego).
export function useSessions(
  childId: string | null,
  rangeStart: Date,
  rangeEnd: Date,
): UseQueryResult<SleepSession[]> {
  return useQuery({
    queryKey: [...sessionsByChildKey(childId ?? 'none'), rangeStart.toISOString(), rangeEnd.toISOString()],
    enabled: Boolean(childId),
    queryFn: async (): Promise<SleepSession[]> => {
      if (!childId) return [];
      // Filtr: sesja "pasuje" do okna jesli zaczela sie przed end okna
      // i skonczyla po start okna (lub trwa).
      const { data, error } = await supabase
        .from('sessions')
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .eq('child_id', childId)
        .lt('start_at', rangeEnd.toISOString())
        .or(`end_at.is.null,end_at.gte.${rangeStart.toISOString()}`)
        .order('start_at', { ascending: false });
      if (error) throw error;
      return data.map(rowToSession);
    },
  });
}

// Pojedyncza sesja po id — uzywane przez ekran edycji `session/[id]`.
// Cache key niezalezny od `sessionsByChildKey` aby invalidacja listy nie
// wymuszala refetcha ekranu edycji (otwarty modal/form), ale `useUpdateSession`
// i `useDeleteSession` invalidiuja po childId — dlatego dorzucamy szeroki klucz.
export function useSessionById(
  sessionId: string | null,
): UseQueryResult<SleepSession | null> {
  return useQuery({
    queryKey: ['session', sessionId ?? 'none'] as const,
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SleepSession | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from('sessions')
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .eq('id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToSession(data) : null;
    },
  });
}

// Aktywna sesja = end_at is null. Max jedna per dziecko (partial unique idx).
export function useActiveSession(
  childId: string | null,
): UseQueryResult<SleepSession | null> {
  return useQuery({
    queryKey: activeSessionKey(childId ?? 'none'),
    enabled: Boolean(childId),
    queryFn: async (): Promise<SleepSession | null> => {
      if (!childId) return null;
      const { data, error } = await supabase
        .from('sessions')
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .eq('child_id', childId)
        .is('end_at', null)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToSession(data) : null;
    },
  });
}

// Ostatnia zakonczona sesja — zrodlo "od kiedy trwa okno aktywnosci".
export function useLastEndedSession(
  childId: string | null,
): UseQueryResult<SleepSession | null> {
  return useQuery({
    queryKey: [...sessionsByChildKey(childId ?? 'none'), 'last-ended'],
    enabled: Boolean(childId),
    queryFn: async (): Promise<SleepSession | null> => {
      if (!childId) return null;
      const { data, error } = await supabase
        .from('sessions')
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .eq('child_id', childId)
        .not('end_at', 'is', null)
        .order('end_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToSession(data) : null;
    },
  });
}

function invalidateChildSessions(
  queryClient: ReturnType<typeof useQueryClient>,
  childId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: sessionsByChildKey(childId) });
}

interface StartSessionInput {
  childId: string;
  type: SessionType;
  startAt?: Date; // default: now
}

interface ActiveSessionContext {
  previousActive: SleepSession | null | undefined;
}

export function useStartSession(): UseMutationResult<
  SleepSession,
  Error,
  StartSessionInput,
  ActiveSessionContext
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<SleepSession, Error, StartSessionInput, ActiveSessionContext>({
    mutationFn: async ({ childId, type, startAt }) => {
      if (!user?.id) throw new Error('Brak zalogowanego usera');
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          child_id: childId,
          type,
          start_at: (startAt ?? new Date()).toISOString(),
          created_by: user.id,
        })
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .single();
      // Map 23505 (partial unique idx — race ze startem na drugim telefonie) i
      // inne typowe bledy na PL. Wrzucamy nowy Error zeby UI mogl wyswietlic
      // czysty komunikat bez parsowania PostgrestError po stronie komponentu.
      if (error) throw new Error(translateSessionError(error));
      return rowToSession(data);
    },
    // Po starcie sesji — anuluj pending notyfikacje "Drzemka za 15min".
    // Dziecko juz spi, przypomnienie niepotrzebne (Faza 5).
    onSuccess: ({ child_id }) => {
      void cancelNapNotificationSafe(child_id);
    },
    // Optimistic: pokaz aktywna sesje natychmiast, rollback przy bledzie.
    onMutate: async ({ childId, type, startAt }) => {
      if (!user?.id) return { previousActive: undefined };
      await queryClient.cancelQueries({ queryKey: activeSessionKey(childId) });
      const previousActive = queryClient.getQueryData<SleepSession | null>(
        activeSessionKey(childId),
      );
      const optimistic: SleepSession = {
        id: `optimistic-${Date.now()}`,
        child_id: childId,
        type,
        start_at: (startAt ?? new Date()).toISOString(),
        end_at: null,
        notes: null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<SleepSession | null>(activeSessionKey(childId), optimistic);
      return { previousActive };
    },
    onError: (_err, { childId }, context) => {
      if (context && context.previousActive !== undefined) {
        queryClient.setQueryData(activeSessionKey(childId), context.previousActive);
      }
    },
    onSettled: (_data, _err, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: activeSessionKey(childId) });
      invalidateChildSessions(queryClient, childId);
    },
  });
}

interface EndSessionInput {
  sessionId: string;
  childId: string;
  endAt?: Date;
}

export function useEndSession(): UseMutationResult<
  SleepSession,
  Error,
  EndSessionInput,
  ActiveSessionContext
> {
  const queryClient = useQueryClient();

  return useMutation<SleepSession, Error, EndSessionInput, ActiveSessionContext>({
    mutationFn: async ({ sessionId, endAt }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ end_at: (endAt ?? new Date()).toISOString() })
        .eq('id', sessionId)
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .single();
      if (error) throw error;
      return rowToSession(data);
    },
    onMutate: async ({ childId }) => {
      await queryClient.cancelQueries({ queryKey: activeSessionKey(childId) });
      const previousActive = queryClient.getQueryData<SleepSession | null>(
        activeSessionKey(childId),
      );
      // Optimistic: aktywna sesja znika.
      queryClient.setQueryData<SleepSession | null>(activeSessionKey(childId), null);
      return { previousActive };
    },
    onError: (_err, { childId }, context) => {
      if (context && context.previousActive !== undefined) {
        queryClient.setQueryData(activeSessionKey(childId), context.previousActive);
      }
    },
    // Po zakonczeniu sesji — schedule notyfikacja na targetEnd - 15min.
    // Fire-and-forget; powiadomienia to nie-krytyczny boczny efekt (Faza 5).
    onSuccess: (data) => {
      const endAt = data.end_at ? new Date(data.end_at) : null;
      void rescheduleNapNotification(data.child_id, endAt);
    },
    onSettled: (_data, _err, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: activeSessionKey(childId) });
      invalidateChildSessions(queryClient, childId);
    },
  });
}

interface UpdateSessionInput {
  sessionId: string;
  childId: string;
  patch: {
    type?: SessionType;
    start_at?: string;
    end_at?: string | null;
    notes?: string | null;
  };
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, patch }: UpdateSessionInput) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(patch)
        .eq('id', sessionId)
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .single();
      if (error) throw error;
      return rowToSession(data);
    },
    onSuccess: (data, { childId }) => {
      void queryClient.invalidateQueries({ queryKey: activeSessionKey(childId) });
      void queryClient.invalidateQueries({ queryKey: ['session', data.id] });
      invalidateChildSessions(queryClient, childId);
      // Edycja sesji moze zmienic end_at -> przeplanuj notyfikacje. Dla aktywnej
      // sesji (end_at === null) anulujemy (dziecko nadal spi). Dla zakonczonej —
      // ustawiamy nowy target na podstawie nowego end_at (Faza 5).
      //
      // Uwaga: edytujemy mozliwie nie-ostatnia sesje, ale w MVP zawsze
      // rescheduluje sie wzgledem TEJ sesji — uproszczenie zaakceptowane,
      // bo ostatnia zakonczona sesja jest faktycznym zrodlem prawdy "od kiedy
      // okno aktywnosci". Korner-case (edycja starej sesji) ignorowany w MVP.
      const endAt = data.end_at ? new Date(data.end_at) : null;
      void rescheduleNapNotification(data.child_id, endAt);
    },
  });
}

interface DeleteSessionInput {
  sessionId: string;
  childId: string;
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: DeleteSessionInput) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_data, { childId, sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: activeSessionKey(childId) });
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      invalidateChildSessions(queryClient, childId);
      // Delete moze zmienic ktora sesja jest "ostatnia zakonczona". Helper
      // pobiera aktualnie ostatnia sesje z bazy i (re)schedule notyfikacje.
      // Jesli nie ma juz zadnej zakonczonej sesji -> cancel (Faza 5).
      void rescheduleAfterDelete(childId);
    },
  });
}

interface InsertBackdatedSessionInput {
  childId: string;
  type: SessionType;
  startAt: Date;
  endAt: Date;
  notes?: string;
}

// Wstawienie sesji w przeszlosci — nie optimistic, bo formularz zawsze
// wymaga potwierdzenia walidacji (start < end, oba w przeszlosci).
export function useInsertBackdatedSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      childId,
      type,
      startAt,
      endAt,
      notes,
    }: InsertBackdatedSessionInput) => {
      if (!user?.id) throw new Error('Brak zalogowanego usera');
      if (endAt <= startAt) throw new Error('Koniec musi byc po starcie');
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          child_id: childId,
          type,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          notes: notes?.trim() ? notes.trim() : null,
          created_by: user.id,
        })
        .select('id, child_id, type, start_at, end_at, notes, created_by, created_at')
        .single();
      if (error) throw error;
      return rowToSession(data);
    },
    onSuccess: (session) => {
      invalidateChildSessions(queryClient, session.child_id);
    },
  });
}
