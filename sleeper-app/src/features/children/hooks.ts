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
      return data;
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
      return data as Child;
    },
    onSuccess: (child) => {
      void queryClient.invalidateQueries({ queryKey: childrenQueryKey(child.family_id) });
      // Auto-select swiezo dodane dziecko jesli nic nie bylo wybrane.
      setActiveChildId(child.id);
    },
  });
}
