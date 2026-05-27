import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { FamilyMembersList } from '@/features/family/components/FamilyMembersList';
import { InviteMemberForm } from '@/features/family/components/InviteMemberForm';
import { NoFamilyFallback } from '@/features/family/components/NoFamilyFallback';
import { PendingInvitationsList } from '@/features/family/components/PendingInvitationsList';
import { useCurrentFamily } from '@/features/family/hooks';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const family = familyQuery.data ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-8 gap-6">
        <View>
          <Text className="text-3xl font-semibold text-navy dark:text-cream">Profil</Text>
          <Text className="mt-1 text-base text-purple dark:text-cream/70">{user?.email}</Text>
        </View>

        <View className="rounded-2xl bg-white p-4">
          <Text className="text-lg font-semibold text-navy">Rodzina</Text>

          {familyQuery.isLoading ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color="#1E1B4B" />
            </View>
          ) : familyQuery.error ? (
            <Text className="mt-2 text-sm text-orange">
              Blad ladowania rodziny: {familyQuery.error.message}
            </Text>
          ) : family ? (
            <>
              <Text className="mt-1 text-sm text-purple">{family.name}</Text>

              <View className="mt-4">
                <FamilyMembersList members={family.members} currentEmail={user?.email ?? null} />
              </View>

              <View className="mt-6 border-t border-purple/15 pt-4">
                <InviteMemberForm familyId={family.id} currentEmail={user?.email ?? null} />
              </View>

              <View className="mt-6 border-t border-purple/15 pt-4">
                <PendingInvitationsList familyId={family.id} />
              </View>
            </>
          ) : (
            <NoFamilyFallback />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          className="mt-4 items-center justify-center rounded-2xl border border-orange/40 px-4 py-3">
          <Text className="text-sm font-semibold text-orange">Wyloguj</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
