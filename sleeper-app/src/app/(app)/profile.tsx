import type { PostgrestError } from '@supabase/supabase-js';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  useCurrentFamily,
  useEnsureFamily,
  useFamilyInvitations,
  useInviteMember,
  useRevokeInvitation,
  type FamilyMember,
  type PendingInvitation,
} from '@/features/family/hooks';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfileScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const family = familyQuery.data ?? null;
  const invitationsQuery = useFamilyInvitations(family?.id ?? null);
  const inviteMember = useInviteMember();
  const revokeInvitation = useRevokeInvitation();

  const ensureFamily = useEnsureFamily();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  async function handleInvite() {
    setInviteError(null);
    setInviteInfo(null);
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setInviteError('Wpisz poprawny adres email.');
      return;
    }
    if (!family) {
      setInviteError('Brak rodziny do zaproszenia.');
      return;
    }
    if (trimmed === user?.email?.toLowerCase()) {
      setInviteError('Nie mozesz zaprosic samego siebie.');
      return;
    }

    try {
      await inviteMember.mutateAsync({ familyId: family.id, email: trimmed });
      setInviteEmail('');
      setInviteInfo(`Zaproszenie do ${trimmed} wyslane.`);
    } catch (error) {
      if (isUniqueViolation(error)) {
        setInviteError('To zaproszenie juz istnieje.');
        return;
      }
      const message = error instanceof Error ? error.message : 'Nieznany blad';
      setInviteError(message);
    }
  }

  function isUniqueViolation(error: unknown): error is PostgrestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === '23505'
    );
  }

  function handleRevoke(invitation: PendingInvitation) {
    if (!family) return;
    Alert.alert(
      'Cofnac zaproszenie?',
      `Zaproszenie do ${invitation.email} zostanie usuniete.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Cofnij',
          style: 'destructive',
          onPress: () => {
            revokeInvitation.mutate({ invitationId: invitation.id, familyId: family.id });
          },
        },
      ],
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-6 py-8 gap-6">
        <View>
          <Text className="text-3xl font-semibold text-navy">Profil</Text>
          <Text className="mt-1 text-base text-purple">{user?.email}</Text>
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

              <View className="mt-4 gap-2">
                {family.members.map((member) => (
                  <MemberRow key={member.id} member={member} currentEmail={user?.email ?? null} />
                ))}
              </View>

              <View className="mt-6 border-t border-purple/15 pt-4">
                <Text className="text-sm font-semibold text-navy">Zapros partnera</Text>
                <Text className="mt-1 text-xs text-purple">
                  Po sign-up uzyje tego emaila i automatycznie dolaczy do rodziny.
                </Text>

                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="email partnera"
                  placeholderTextColor="#9d97b5"
                  className="mt-3 rounded-2xl border border-purple/30 bg-cream px-4 py-3 text-base text-navy"
                />

                {inviteError ? (
                  <Text className="mt-2 text-xs text-orange">{inviteError}</Text>
                ) : null}
                {inviteInfo ? (
                  <Text className="mt-2 text-xs text-purple">{inviteInfo}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={inviteMember.isPending}
                  onPress={handleInvite}
                  className={`mt-3 items-center justify-center rounded-2xl px-4 py-3 ${
                    inviteMember.isPending ? 'bg-navy/40' : 'bg-navy'
                  }`}>
                  {inviteMember.isPending ? (
                    <ActivityIndicator color="#F5F0E8" />
                  ) : (
                    <Text className="text-sm font-semibold text-cream">Zapros</Text>
                  )}
                </Pressable>
              </View>

              {invitationsQuery.data && invitationsQuery.data.length > 0 ? (
                <View className="mt-6 border-t border-purple/15 pt-4">
                  <Text className="text-sm font-semibold text-navy">Oczekujace zaproszenia</Text>
                  <View className="mt-2 gap-2">
                    {invitationsQuery.data.map((inv) => (
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
              ) : null}
            </>
          ) : (
            <View className="mt-3">
              <Text className="text-sm text-purple">
                Nie nalezysz do zadnej rodziny. To moze sie zdarzyc gdy auto-tworzenie
                nie powiodlo sie przy rejestracji.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={ensureFamily.isPending}
                onPress={() => ensureFamily.mutate()}
                className={`mt-3 items-center justify-center rounded-2xl px-4 py-3 ${
                  ensureFamily.isPending ? 'bg-navy/40' : 'bg-navy'
                }`}>
                {ensureFamily.isPending ? (
                  <ActivityIndicator color="#F5F0E8" />
                ) : (
                  <Text className="text-sm font-semibold text-cream">Stworz rodzine</Text>
                )}
              </Pressable>
              {ensureFamily.error ? (
                <Text className="mt-2 text-xs text-orange">
                  {ensureFamily.error instanceof Error
                    ? ensureFamily.error.message
                    : 'Nie udalo sie stworzyc rodziny.'}
                </Text>
              ) : null}
            </View>
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

interface MemberRowProps {
  member: FamilyMember;
  currentEmail: string | null;
}

function MemberRow({ member, currentEmail }: MemberRowProps) {
  const label = member.isCurrentUser ? (currentEmail ?? 'Ty') : 'Czlonek rodziny';
  const roleLabel = member.role === 'owner' ? 'Wlasciciel' : 'Czlonek';

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-cream px-3 py-2">
      <View className="flex-1">
        <Text className="text-sm font-medium text-navy">{label}</Text>
        {member.isCurrentUser ? null : (
          <Text className="text-xs text-purple">id: {member.user_id.slice(0, 8)}…</Text>
        )}
      </View>
      <Text className="text-xs font-semibold text-purple">{roleLabel}</Text>
    </View>
  );
}
