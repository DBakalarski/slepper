import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(translateAuthError(signInError.message));
      return;
    }
    router.replace('/');
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-semibold text-navy">Zaloguj sie</Text>
          <Text className="mt-2 text-base text-purple">Wroc do swojej rodziny.</Text>

          <View className="mt-8 gap-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-navy">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="email@example.com"
                placeholderTextColor="#9d97b5"
                className="rounded-2xl border border-purple/30 bg-white px-4 py-3 text-base text-navy"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-navy">Haslo</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                placeholder="••••••••"
                placeholderTextColor="#9d97b5"
                className="rounded-2xl border border-purple/30 bg-white px-4 py-3 text-base text-navy"
              />
            </View>

            {error ? (
              <View className="rounded-2xl bg-orange/10 px-4 py-3">
                <Text className="text-sm text-orange">{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              className={`mt-2 items-center justify-center rounded-2xl px-4 py-4 ${
                canSubmit ? 'bg-navy' : 'bg-navy/40'
              }`}>
              {submitting ? (
                <ActivityIndicator color="#F5F0E8" />
              ) : (
                <Text className="text-base font-semibold text-cream">Zaloguj</Text>
              )}
            </Pressable>

            <View className="mt-4 flex-row justify-center gap-2">
              <Text className="text-sm text-purple">Nie masz konta?</Text>
              <Link href="/sign-up" className="text-sm font-semibold text-navy">
                Zaloz konto
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Niepoprawny email lub haslo.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email niepotwierdzony. Sprawdz skrzynke.';
  }
  if (lower.includes('network')) {
    return 'Blad polaczenia. Sprawdz internet.';
  }
  return message;
}
