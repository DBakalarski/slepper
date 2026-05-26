import { Alert, Pressable, Text, View } from 'react-native';

import {
  useFamilyInvitations,
  useRevokeInvitation,
  type PendingInvitation,
} from '@/features/family/hooks';

interface PendingInvitationsListProps {
  familyId: string;
}

export function PendingInvitationsList({ familyId }: PendingInvitationsListProps) {
  const invitationsQuery = useFamilyInvitations(familyId);
  const revokeInvitation = useRevokeInvitation();
  const invitations = invitationsQuery.data ?? [];

  if (invitations.length === 0) return null;

  function handleRevoke(invitation: PendingInvitation) {
    Alert.alert(
      'Cofnac zaproszenie?',
      `Zaproszenie do ${invitation.email} zostanie usuniete.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Cofnij',
          style: 'destructive',
          onPress: () => {
            revokeInvitation.mutate({ invitationId: invitation.id, familyId });
          },
        },
      ],
    );
  }

  return (
    <View>
      <Text className="text-sm font-semibold text-navy">Oczekujace zaproszenia</Text>
      <View className="mt-2 gap-2">
        {invitations.map((inv) => (
          <View
            key={inv.id}
            className="flex-row items-center justify-between rounded-xl bg-cream px-3 py-2">
            <Text className="flex-1 text-sm text-navy">{inv.email}</Text>
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
