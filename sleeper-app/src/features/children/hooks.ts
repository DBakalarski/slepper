import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useActiveChild } from '@/features/children/useActiveChild';
import { supabase } from '@/lib/supabase';

export interface Child {
  id: string;
  family_id: string;
  name: string;
  birth_date: string; // ISO date 'YYYY-MM-DD'
  avatar_color: string;
  created_at: string;
}

const childrenQueryKey = (familyId: string) => ['children', familyId] as const;

interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  birth_date: string;
  avatar_color: string;
  created_at: string;
}

// Parser DB row -> domain typ. Spojnie z rowToSession w features/sessions/hooks,
// eliminuje type assertion (`as Child`) ktore lamie coding-rules §10.
// Walidacja minimalna — RLS+CHECK constraints w bazie gwarantuja niezmiennosc.
function rowToChild(row: ChildRow): Child {
  return {
    id: row.id,
    family_id: row.family_id,
    name: row.name,
    birth_date: row.birth_date,
    avatar_color: row.avatar_color,
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
        .select('id, family_id, name, birth_date, avatar_color, created_at')
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
        .select('id, family_id, name, birth_date, avatar_color, created_at')
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
