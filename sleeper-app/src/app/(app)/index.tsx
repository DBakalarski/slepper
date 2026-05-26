import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  useAcceptInvitation,
  useCurrentFamily,
  useMyPendingInvitations,
  type PendingInvitationForMe,
} from '@/features/family/hooks';

export default function TodayScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const pendingQuery = useMyPendingInvitations();
  const acceptInvitation = useAcceptInvitation();

  const pending = pendingQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-6 py-8 gap-4">
        <View>
          <Text className="text-3xl font-semibold text-navy">Dzisiaj</Text>
          <Text className="mt-2 text-base text-purple">Tu pojawi sie widok dnia.</Text>
        </View>

        {pending.length > 0 ? (
          <View className="rounded-2xl bg-orange/15 p-4">
            <Text className="text-sm font-semibold text-navy">
              {pending.length === 1 ? 'Masz zaproszenie' : `Masz ${pending.length} zaproszen`}
            </Text>
            <Text className="mt-1 text-xs text-purple">
              Aby dolaczyc do rodziny ktora Cie zaprosila, kliknij ponizej.
            </Text>
            <View className="mt-3 gap-2">
              {pending.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={() => acceptInvitation.mutate(invitation.id)}
                  isPending={acceptInvitation.isPending && acceptInvitation.variables === invitation.id}
                />
              ))}
            </View>
            {acceptInvitation.error ? (
              <Text className="mt-2 text-xs text-orange">
                {acceptInvitation.error instanceof Error
                  ? acceptInvitation.error.message
                  : 'Nie udalo sie dolaczyc.'}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-navy">Status</Text>
          <Text className="mt-1 text-sm text-navy">Zalogowany: {user?.email ?? 'brak'}</Text>
          <Text className="mt-1 text-sm text-navy">
            Rodzina:{' '}
            {familyQuery.isLoading
              ? 'ladowanie...'
              : familyQuery.data
                ? `${familyQuery.data.name} (${familyQuery.data.members.length})`
                : 'brak'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface InvitationRowProps {
  invitation: PendingInvitationForMe;
  onAccept: () => void;
  isPending: boolean;
}

function InvitationRow({ invitation, onAccept, isPending }: InvitationRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
      <View className="flex-1">
        <Text className="text-sm font-medium text-navy">{invitation.family_name}</Text>
        <Text className="text-xs text-purple">na {invitation.email}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isPending}
        onPress={onAccept}
        className={`items-center justify-center rounded-xl px-3 py-2 ${
          isPending ? 'bg-navy/40' : 'bg-navy'
        }`}>
        {isPending ? (
          <ActivityIndicator color="#F5F0E8" size="small" />
        ) : (
          <Text className="text-xs font-semibold text-cream">Dolacz</Text>
        )}
      </Pressable>
    </View>
  );
}
