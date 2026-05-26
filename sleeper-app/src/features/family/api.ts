import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export interface FamilyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  isCurrentUser: boolean;
}

export interface FamilyWithMembers {
  id: string;
  name: string;
  myRole: 'owner' | 'member';
  members: FamilyMember[];
}

export interface PendingInvitation {
  id: string;
  email: string;
  created_at: string;
}

const familyQueryKey = (userId: string) => ['family', userId] as const;
const invitationsQueryKey = (familyId: string) => ['family-invitations', familyId] as const;

export function useCurrentFamily(): UseQueryResult<FamilyWithMembers | null> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: familyQueryKey(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    queryFn: async (): Promise<FamilyWithMembers | null> => {
      if (!userId) return null;

      const { data: ownMembership, error: ownError } = await supabase
        .from('family_members')
        .select('id, family_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownError) throw ownError;
      if (!ownMembership) return null;

      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('id, name')
        .eq('id', ownMembership.family_id)
        .single();

      if (familyError) throw familyError;

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('id, user_id, role, created_at')
        .eq('family_id', ownMembership.family_id)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      const members: FamilyMember[] = membersData.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        isCurrentUser: m.user_id === userId,
      }));

      return {
        id: family.id,
        name: family.name,
        myRole: ownMembership.role,
        members,
      };
    },
  });
}

export function useFamilyInvitations(familyId: string | null): UseQueryResult<PendingInvitation[]> {
  return useQuery({
    queryKey: invitationsQueryKey(familyId ?? 'none'),
    enabled: Boolean(familyId),
    queryFn: async (): Promise<PendingInvitation[]> => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('family_invitations')
        .select('id, email, created_at')
        .eq('family_id', familyId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

interface InviteMemberInput {
  familyId: string;
  email: string;
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ familyId, email }: InviteMemberInput) => {
      if (!user?.id) throw new Error('Brak zalogowanego usera');

      const { data, error } = await supabase
        .from('family_invitations')
        .insert({
          family_id: familyId,
          email: email.trim().toLowerCase(),
          invited_by: user.id,
        })
        .select('id, email, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKey(variables.familyId) });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, familyId }: { invitationId: string; familyId: string }) => {
      const { error } = await supabase
        .from('family_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return { familyId };
    },
    onSuccess: ({ familyId }) => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKey(familyId) });
    },
  });
}
