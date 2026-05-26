import { useMutation } from '@tanstack/react-query';
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

import { translateAuthError } from '@/features/auth/translate-auth-error';
import { supabase } from '@/lib/supabase';

interface SignInInput {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useMutation({
    mutationFn: async ({ email: e, password: p }: SignInInput) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: e.trim(),
        password: p,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace('/');
    },
  });

  const canSubmit = email.trim().length > 0 && password.length > 0 && !signIn.isPending;
  const errorMessage = signIn.error instanceof Error ? translateAuthError(signIn.error.message) : null;

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

            {errorMessage ? (
              <View className="rounded-2xl bg-orange/10 px-4 py-3">
                <Text className="text-sm text-orange">{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => signIn.mutate({ email, password })}
              className={`mt-2 items-center justify-center rounded-2xl px-4 py-4 ${
                canSubmit ? 'bg-navy' : 'bg-navy/40'
              }`}>
              {signIn.isPending ? (
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
