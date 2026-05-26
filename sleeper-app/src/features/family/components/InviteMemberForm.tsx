import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useInviteMember } from '@/features/family/hooks';
import { translateFamilyError } from '@/features/family/translate-family-error';
import { isValidEmail } from '@/lib/email';

interface InviteMemberFormProps {
  familyId: string;
  currentEmail: string | null;
}

export function InviteMemberForm({ familyId, currentEmail }: InviteMemberFormProps) {
  const inviteMember = useInviteMember();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Wpisz poprawny adres email.');
      return;
    }
    if (currentEmail && trimmed === currentEmail.toLowerCase()) {
      setError('Nie mozesz zaprosic samego siebie.');
      return;
    }

    try {
      await inviteMember.mutateAsync({ familyId, email: trimmed });
      setEmail('');
      setInfo(`Zaproszenie do ${trimmed} wyslane.`);
    } catch (err) {
      setError(translateFamilyError(err));
    }
  }

  return (
    <View>
      <Text className="text-sm font-semibold text-navy">Zapros partnera</Text>
      <Text className="mt-1 text-xs text-purple">
        Partner po sign-in zobaczy zaproszenie i bedzie mogl je zaakceptowac.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="email partnera"
        placeholderTextColor="#9d97b5"
        className="mt-3 rounded-2xl border border-purple/30 bg-cream px-4 py-3 text-base text-navy"
      />

      {error ? <Text className="mt-2 text-xs text-orange">{error}</Text> : null}
      {info ? <Text className="mt-2 text-xs text-purple">{info}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={inviteMember.isPending}
        onPress={handleSubmit}
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
  );
}
