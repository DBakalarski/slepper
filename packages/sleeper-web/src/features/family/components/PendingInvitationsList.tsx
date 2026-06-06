import { Pressable, Text, View } from 'react-native';

import {
  useFamilyInvitations,
  useRevokeInvitation,
  type PendingInvitation,
} from '@/features/family/hooks';
import { confirmAction } from '@/lib/confirm';

interface PendingInvitationsListProps {
  familyId: string;
}

export function PendingInvitationsList({ familyId }: PendingInvitationsListProps) {
  const invitationsQuery = useFamilyInvitations(familyId);
  const revokeInvitation = useRevokeInvitation();
  const invitations = invitationsQuery.data ?? [];

  if (invitations.length === 0) return null;

  async function handleRevoke(invitation: PendingInvitation) {
    const ok = await confirmAction({
      title: 'Cofnac zaproszenie?',
      message: `Zaproszenie do ${invitation.email} zostanie usuniete.`,
      confirmText: 'Cofnij',
      cancelText: 'Anuluj',
      destructive: true,
    });
    if (!ok) return;
    revokeInvitation.mutate({ invitationId: invitation.id, familyId });
  }

  return (
    <View>
      <Text className="text-sm font-semibold text-navy dark:text-cream">Oczekujace zaproszenia</Text>
      <View className="mt-2 gap-2">
        {invitations.map((inv) => (
          <View
            key={inv.id}
            className="flex-row items-center justify-between rounded-xl bg-cream px-3 py-2 dark:bg-dark-surface">
            <Text className="flex-1 text-sm text-navy dark:text-cream">{inv.email}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleRevoke(inv)}
              hitSlop={8}>
              <Text className="text-xs font-semibold text-orange">Cofnij</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
