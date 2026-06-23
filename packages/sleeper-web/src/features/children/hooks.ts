import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useActiveChild } from '@/features/children/useActiveChild';
import type { TablesUpdate } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export interface Child {
  id: string;
  family_id: string;
  name: string;
  birth_date: string; // ISO date 'YYYY-MM-DD'
  avatar_color: string;
  // Preferencje algorytmu (migracja 0010). null = algorytm decyduje sam.
  preferred_naps_per_day: number | null;
  preferred_bedtime: string | null; // Postgres time 'HH:MM:SS' lub null
  // Preferowana godzina pobudki (migracja 0012). null = Kotki Dwa uzywa 07:00.
  preferred_wake_time: string | null; // Postgres time 'HH:MM:SS' lub null
  // Wybor algorytmu rekomendacji (migracja 0011). Domyslnie 'galland'.
  algorithm: 'galland' | 'kotki_dwa';
  created_at: string;
}

const childrenQueryKey = (familyId: string) => ['children', familyId] as const;
const CHILD_SELECT =
  'id, family_id, name, birth_date, avatar_color, preferred_naps_per_day, preferred_bedtime, preferred_wake_time, algorithm, created_at';

interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  birth_date: string;
  avatar_color: string;
  preferred_naps_per_day: number | null;
  preferred_bedtime: string | null;
  preferred_wake_time: string | null;
  algorithm: string;
  created_at: string;
}

// Parser DB row -> domain typ. Spojnie z rowToSession w features/sessions/hooks,
// eliminuje type assertion (`as Child`) ktore lamie coding-rules §10.
// Walidacja minimalna — RLS+CHECK constraints w bazie gwarantuja niezmiennosc.
function rowToChild(row: ChildRow): Child {
  // DB CHECK constraint gwarantuje ze algorithm to 'galland' lub 'kotki_dwa'.
  // Narrowing z string -> union przez explicit guard.
  const algorithm: 'galland' | 'kotki_dwa' =
    row.algorithm === 'kotki_dwa' ? 'kotki_dwa' : 'galland';
  return {
    id: row.id,
    family_id: row.family_id,
    name: row.name,
    birth_date: row.birth_date,
    avatar_color: row.avatar_color,
    preferred_naps_per_day: row.preferred_naps_per_day,
    preferred_bedtime: row.preferred_bedtime,
    preferred_wake_time: row.preferred_wake_time,
    algorithm,
    created_at: row.created_at,
  };
}

export function useChildren(familyId: string | null): UseQueryResult<Child[]> {
  return useQuery({
    queryKey: childrenQueryKey(familyId ?? 'none'),
    enabled: Boolean(familyId),
    queryFn: async (): Promise<Child[]> => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('children')
        .select(CHILD_SELECT)
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(rowToChild);
    },
  });
}

interface CreateChildInput {
  familyId: string;
  name: string;
  birthDate: string; // 'YYYY-MM-DD'
  avatarColor: string;
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  const { setActiveChildId } = useActiveChild();

  return useMutation({
    mutationFn: async ({ familyId, name, birthDate, avatarColor }: CreateChildInput) => {
      const { data, error } = await supabase
        .from('children')
        .insert({
          family_id: familyId,
          name: name.trim(),
          birth_date: birthDate,
          avatar_color: avatarColor,
        })
        .select(CHILD_SELECT)
        .single();
      if (error) throw error;
      return rowToChild(data);
    },
    onSuccess: (child) => {
      void queryClient.invalidateQueries({ queryKey: childrenQueryKey(child.family_id) });
      // Drop sessions cache poprzedniego dziecka — w multi-child UI stary cache
      // dawalby flicker przed refetchem dla nowego id (P2-8 z review).
      queryClient.removeQueries({ queryKey: ['sessions'] });
      // Auto-select swiezo dodane dziecko jesli nic nie bylo wybrane.
      setActiveChildId(child.id);
    },
  });
}

export interface UpdateChildInput {
  childId: string;
  name?: string;
  birthDate?: string;
  avatarColor?: string;
  // null = wyczyszczenie preferencji (algorytm decyduje sam).
  // undefined = brak zmiany pola w tej mutacji.
  preferredNapsPerDay?: number | null;
  // 'HH:MM:SS' lub null.
  preferredBedtime?: string | null;
  // 'HH:MM:SS' lub null. Preferowana godzina pobudki.
  preferredWakeTime?: string | null;
  // Wybor algorytmu rekomendacji. undefined = brak zmiany.
  algorithm?: 'galland' | 'kotki_dwa';
}

export function useUpdateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      name,
      birthDate,
      avatarColor,
      preferredNapsPerDay,
      preferredBedtime,
      preferredWakeTime,
      algorithm,
    }: UpdateChildInput) => {
      // Buduj patch tylko z pol jawnie podanych. Pola null sa intencjonalne
      // (clear preferencji) i powinny isc do bazy.
      const patch: TablesUpdate<'children'> = {};
      if (name !== undefined) patch.name = name.trim();
      if (birthDate !== undefined) patch.birth_date = birthDate;
      if (avatarColor !== undefined) patch.avatar_color = avatarColor;
      if (preferredNapsPerDay !== undefined) patch.preferred_naps_per_day = preferredNapsPerDay;
      if (preferredBedtime !== undefined) patch.preferred_bedtime = preferredBedtime;
      if (preferredWakeTime !== undefined) patch.preferred_wake_time = preferredWakeTime;
      if (algorithm !== undefined) patch.algorithm = algorithm;

      const { data, error } = await supabase
        .from('children')
        .update(patch)
        .eq('id', childId)
        .select(CHILD_SELECT)
        .single();
      if (error) throw error;
      return rowToChild(data);
    },
    onSuccess: (child) => {
      void queryClient.invalidateQueries({ queryKey: childrenQueryKey(child.family_id) });
    },
  });
}
