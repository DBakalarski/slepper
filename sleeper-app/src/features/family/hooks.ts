import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { translateFamilyError } from '@/features/family/translate-family-error';
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

export interface IncomingInvitation {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  created_at: string;
}

const familyQueryKey = (userId: string) => ['family', userId] as const;
const invitationsQueryKey = (familyId: string) => ['family-invitations', familyId] as const;
const incomingInvitationsQueryKey = (userId: string) =>
  ['incoming-invitations', userId] as const;

// Pending invitations to nie hot path — invitations zmieniaja sie rzadko.
// Pelne 5 min staleTime: po accept jest manual invalidate, po revoke
// focusManager refetch zalatwi sprawe.
const INCOMING_INVITATIONS_STALE_MS = 5 * 60 * 1000;

export function useCurrentFamily(): UseQueryResult<FamilyWithMembers | null> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: familyQueryKey(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    queryFn: async (): Promise<FamilyWithMembers | null> => {
      if (!userId) return null;

      // Jeden round-trip: relational embed family + wszyscy czlonkowie.
      const { data, error } = await supabase
        .from('family_members')
        .select(
          `
          id,
          role,
          family:families!inner(
            id,
            name,
            members:family_members(id, user_id, role, created_at)
          )
        `,
        )
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.family) return null;

      const family = data.family;
      const members: FamilyMember[] = family.members
        .map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: parseRole(m.role),
          created_at: m.created_at,
          isCurrentUser: m.user_id === userId,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      return {
        id: family.id,
        name: family.name,
        myRole: parseRole(data.role),
        members,
      };
    },
  });
}

// Zawezenie role z bazy do unii. Fail-loud — nieoczekiwane wartosci sygnaluja
// niespojnosc migracji (np. nowa rola dodana w bazie bez aktualizacji typow).
function parseRole(role: string): 'owner' | 'member' {
  if (role === 'owner' || role === 'member') return role;
  throw new Error(`Unexpected family_members.role from DB: ${role}`);
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

// Lista zaproszen czekajacych na biezacego usera (matching auth.email()).
// Wymaga zalogowanego usera. RPC SECURITY DEFINER czyta z auth.jwt().
export function useMyIncomingInvitations(): UseQueryResult<IncomingInvitation[]> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: incomingInvitationsQueryKey(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: INCOMING_INVITATIONS_STALE_MS,
    queryFn: async (): Promise<IncomingInvitation[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_my_pending_invitations');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Akceptacja zaproszenia przez explicit consent.
// Przepiena usera ze starej rodziny do nowej (usuwa stara jesli osierocona).
// onSettled (nie tylko onSuccess) inwaliduje pending list — gdy invitation
// zostalo revoked w trakcie, banner zsynchronizuje sie z baza.
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('accept_invitation', {
        _invitation_id: invitationId,
      });
      if (error) {
        // Wzbogac error o PL message — UI moze go pokazac wprost.
        const translated = translateFamilyError(error);
        const wrappedError = new Error(translated);
        // Zachowaj original code dla debug.
        if ('code' in error) {
          Object.assign(wrappedError, { code: error.code });
        }
        throw wrappedError;
      }
      return data;
    },
    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: familyQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: incomingInvitationsQueryKey(userId) });
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
      if (error) {
        const translated = translateFamilyError(error);
        throw new Error(translated);
      }
      return data;
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: familyQueryKey(userId) });
    },
  });
}
