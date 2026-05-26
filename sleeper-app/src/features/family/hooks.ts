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

export interface PendingInvitationForMe {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  created_at: string;
}

const familyQueryKey = (userId: string) => ['family', userId] as const;
const invitationsQueryKey = (familyId: string) => ['family-invitations', familyId] as const;
const myPendingInvitationsQueryKey = (userId: string) => ['my-pending-invitations', userId] as const;

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
        role: parseRole(m.role),
        created_at: m.created_at,
        isCurrentUser: m.user_id === userId,
      }));

      return {
        id: family.id,
        name: family.name,
        myRole: parseRole(ownMembership.role),
        members,
      };
    },
  });
}

// Supabase generuje role jako `string` (CHECK constraint nie tworzy enuma).
// Zawezamy do unii zgodnej z migracja 0001_families.sql.
function parseRole(role: string): 'owner' | 'member' {
  return role === 'owner' ? 'owner' : 'member';
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
        .eq('id', invitationId)
        .eq('family_id', familyId);

      if (error) throw error;
      return { familyId };
    },
    onSuccess: ({ familyId }) => {
      void queryClient.invalidateQueries({ queryKey: invitationsQueryKey(familyId) });
    },
  });
}

// Lista zaproszen czekajacych na biezacego usera (matching jego email).
// Wymaga zalogowanego usera. RPC SECURITY DEFINER czyta z auth.jwt().
export function useMyPendingInvitations(): UseQueryResult<PendingInvitationForMe[]> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: myPendingInvitationsQueryKey(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    queryFn: async (): Promise<PendingInvitationForMe[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_my_pending_invitations');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Akceptacja zaproszenia przez explicit consent.
// Przepiena usera ze starej rodziny do nowej (usuwa stara jesli osierocona).
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('accept_invitation', {
        _invitation_id: invitationId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: familyQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: myPendingInvitationsQueryKey(userId) });
    },
  });
}

// Idempotent fallback: zapewnia rodzine dla biezacego usera.
// Uzywany gdy useCurrentFamily zwraca null (trigger zfailowal lub user osierocony).
export function useEnsureFamily() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ensure_family');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: familyQueryKey(userId) });
    },
  });
}
