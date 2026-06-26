import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { FamilyMembersList } from '@/features/family/components/FamilyMembersList';
import { InviteMemberForm } from '@/features/family/components/InviteMemberForm';
import { NoFamilyFallback } from '@/features/family/components/NoFamilyFallback';
import { PendingInvitationsList } from '@/features/family/components/PendingInvitationsList';
import { useCurrentFamily } from '@/features/family/hooks';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { COLORS } from '@/lib/colors';
import { supabase } from '@/lib/supabase';

// Ekran Ustawienia — wprowadzony w Fazie 5 ui-redesign jako miejsce dla sekcji
// Rodzina (przeniesionej z `profile.tsx`) i Wyloguj. Dostepny przez gear icon
// z Profilu (`router.push('/settings')`). Wpiety jako Tab z `href: null` —
// ukryty w tab barze, ale routable. Pattern jak `sleep-fullscreen` /
// `session/[id]` w `(app)/_layout.tsx`.

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const family = familyQuery.data ?? null;
  const effectiveTheme = useEffectiveTheme();
  const backIconColor = effectiveTheme === 'dark' ? COLORS.cream : COLORS.navy;
  const chevronColor = effectiveTheme === 'dark' ? COLORS.purpleLight : COLORS.textMuted;
  const appVersion = Constants.expoConfig?.version ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-6 gap-6">
        {/* Header — back button + tytul. Brak Stack.Screen header bo (app)
            uzywa Tabs, settings to Tab z `href: null`. */}
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wroc"
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className="w-11 h-11 items-center justify-center rounded-pill -ml-2">
            <ChevronLeft size={24} color={backIconColor} />
          </Pressable>
          <Text className="text-3xl font-semibold text-navy dark:text-cream">Ustawienia</Text>
        </View>

        <View className="rounded-card bg-white p-5 dark:bg-dark-card">
          <Text className="text-lg font-semibold text-navy dark:text-cream">Rodzina</Text>

          {familyQuery.isLoading ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color={COLORS.navy} />
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
          accessibilityLabel="Historia zmian"
          onPress={() => router.push('/changelog')}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          className="flex-row items-center justify-between rounded-card bg-white p-5 dark:bg-dark-card">
          <Text className="text-lg font-semibold text-navy dark:text-cream">Historia zmian</Text>
          <View className="flex-row items-center gap-2">
            {appVersion ? (
              <Text className="text-sm text-purple">Wersja {appVersion}</Text>
            ) : null}
            <ChevronRight size={20} color={chevronColor} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wyloguj"
          onPress={handleSignOut}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          className="mt-2 items-center justify-center rounded-card border border-orange/40 px-4 py-3">
          <Text className="text-sm font-semibold text-orange">Wyloguj</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
