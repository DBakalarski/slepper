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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

interface FormErrors {
  email?: string;
  password?: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): FormErrors {
    const errors: FormErrors = {};
    if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Wpisz poprawny adres email.';
    }
    if (password.length < MIN_PASSWORD) {
      errors.password = `Haslo musi miec min. ${MIN_PASSWORD} znakow.`;
    }
    return errors;
  }

  async function handleSubmit() {
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (error) {
      setServerError(translateAuthError(error.message));
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
          <Text className="text-3xl font-semibold text-navy">Zaloz konto</Text>
          <Text className="mt-2 text-base text-purple">
            Dolaczysz do nowej rodziny lub do tej, do ktorej Cie zaproszono.
          </Text>

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
              {formErrors.email ? (
                <Text className="mt-1 text-xs text-orange">{formErrors.email}</Text>
              ) : null}
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-navy">Haslo</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="min. 6 znakow"
                placeholderTextColor="#9d97b5"
                className="rounded-2xl border border-purple/30 bg-white px-4 py-3 text-base text-navy"
              />
              {formErrors.password ? (
                <Text className="mt-1 text-xs text-orange">{formErrors.password}</Text>
              ) : null}
            </View>

            {serverError ? (
              <View className="rounded-2xl bg-orange/10 px-4 py-3">
                <Text className="text-sm text-orange">{serverError}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={handleSubmit}
              className={`mt-2 items-center justify-center rounded-2xl px-4 py-4 ${
                submitting ? 'bg-navy/40' : 'bg-navy'
              }`}>
              {submitting ? (
                <ActivityIndicator color="#F5F0E8" />
              ) : (
                <Text className="text-base font-semibold text-cream">Zaloz konto</Text>
              )}
            </Pressable>

            <View className="mt-4 flex-row justify-center gap-2">
              <Text className="text-sm text-purple">Masz juz konto?</Text>
              <Link href="/sign-in" className="text-sm font-semibold text-navy">
                Zaloguj sie
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
  if (lower.includes('already registered') || lower.includes('user already')) {
    return 'Konto z tym emailem juz istnieje. Zaloguj sie.';
  }
  if (lower.includes('password')) {
    return 'Haslo nie spelnia wymagan. Sprobuj dluzsze.';
  }
  if (lower.includes('network')) {
    return 'Blad polaczenia. Sprawdz internet.';
  }
  return message;
}
