import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  useAcceptInvitation,
  useCurrentFamily,
  useMyIncomingInvitations,
  type IncomingInvitation,
} from '@/features/family/hooks';

export default function TodayScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const incomingQuery = useMyIncomingInvitations();
  const acceptInvitation = useAcceptInvitation();

  const incoming = incomingQuery.data ?? [];
  const family = familyQuery.data;
  const hasNoFamily = !familyQuery.isLoading && !family;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-6 py-8 gap-4">
        <View>
          <Text className="text-3xl font-semibold text-navy">Dzisiaj</Text>
          <Text className="mt-2 text-base text-purple">Tu pojawi sie widok dnia.</Text>
        </View>

        {hasNoFamily ? (
          <View className="rounded-2xl bg-orange/15 p-4">
            <Text className="text-sm font-semibold text-navy">Nie nalezysz do rodziny</Text>
            <Text className="mt-1 text-xs text-purple">
              Przejdz do profilu zeby stworzyc rodzine lub przyjac zaproszenie.
            </Text>
            <Link
              href="/profile"
              className="mt-3 text-sm font-semibold text-navy underline">
              Przejdz do profilu
            </Link>
          </View>
        ) : null}

        {incoming.length > 0 ? (
          <View className="rounded-2xl bg-orange/15 p-4">
            <Text className="text-sm font-semibold text-navy">
              {incoming.length === 1 ? 'Masz zaproszenie' : `Masz ${incoming.length} zaproszen`}
            </Text>
            <Text className="mt-1 text-xs text-purple">
              Aby dolaczyc do rodziny ktora Cie zaprosila, kliknij ponizej.
            </Text>
            <View className="mt-3 gap-2">
              {incoming.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={() => acceptInvitation.mutate(invitation.id)}
                  isProcessing={
                    acceptInvitation.isPending &&
                    acceptInvitation.variables === invitation.id
                  }
                  errorMessage={
                    acceptInvitation.isError &&
                    acceptInvitation.variables === invitation.id &&
                    acceptInvitation.error instanceof Error
                      ? acceptInvitation.error.message
                      : null
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-navy">Status</Text>
          <Text className="mt-1 text-sm text-navy">Zalogowany: {user?.email ?? 'brak'}</Text>
          <Text className="mt-1 text-sm text-navy">
            Rodzina:{' '}
            {familyQuery.isLoading
              ? 'ladowanie...'
              : family
                ? `${family.name} (${family.members.length})`
                : 'brak'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface InvitationRowProps {
  invitation: IncomingInvitation;
  onAccept: () => void;
  isProcessing: boolean;
  errorMessage: string | null;
}

function InvitationRow({ invitation, onAccept, isProcessing, errorMessage }: InvitationRowProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
        <View className="flex-1">
          <Text className="text-sm font-medium text-navy">{invitation.family_name}</Text>
          <Text className="text-xs text-purple">na {invitation.email}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isProcessing}
          onPress={onAccept}
          className={`items-center justify-center rounded-xl px-3 py-2 ${
            isProcessing ? 'bg-navy/40' : 'bg-navy'
          }`}>
          {isProcessing ? (
            <ActivityIndicator color="#F5F0E8" size="small" />
          ) : (
            <Text className="text-xs font-semibold text-cream">Dolacz</Text>
          )}
        </Pressable>
      </View>
      {errorMessage ? (
        <Text className="mt-1 px-1 text-xs text-orange">{errorMessage}</Text>
      ) : null}
    </View>
  );
}
