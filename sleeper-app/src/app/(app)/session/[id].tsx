import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SessionEditForm,
  type SessionFormState,
} from '@/features/sessions/components/SessionEditForm';
import { useDeleteSession, useSessionById, useUpdateSession } from '@/features/sessions/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';

// Ekran edycji pojedynczej sesji. Bez optimistic update — formularz wymaga
// jawnego zapisu i pokazania bledu walidacji. Aktywna sesja (end_at = null)
// ma start edytowalny, end pozostaje null i odznaczamy "Zakoncz teraz".
export default function SessionEditScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = typeof params.id === 'string' ? params.id : null;

  const sessionQuery = useSessionById(sessionId);
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [form, setForm] = useState<SessionFormState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Inicjalizacja formularza z danych z bazy. Robimy raz, po pierwszym
  // udanym fetchu — pozniej user moze edytowac bez nadpisania.
  useEffect(() => {
    if (sessionQuery.data && form === null) {
      setForm({
        startDate: new Date(sessionQuery.data.start_at),
        endDate: sessionQuery.data.end_at ? new Date(sessionQuery.data.end_at) : null,
        type: sessionQuery.data.type,
        notes: sessionQuery.data.notes ?? '',
      });
    }
  }, [sessionQuery.data, form]);

  if (!sessionId) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-navy">Brak ID sesji.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionQuery.isLoading || !form) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-base text-navy">Nie udalo sie zaladowac sesji.</Text>
          {sessionQuery.isError ? (
            <Text className="text-xs text-orange">{extractErrorMessage(sessionQuery.error)}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="rounded-xl bg-navy px-4 py-3">
            <Text className="text-sm font-semibold text-cream">Wroc</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const session = sessionQuery.data;
  const isActive = session.end_at === null;
  const isPending = updateSession.isPending || deleteSession.isPending;

  function handleSave() {
    if (!form) return;
    setValidationError(null);

    if (form.endDate && form.endDate <= form.startDate) {
      setValidationError('Koniec sesji musi byc po starcie.');
      return;
    }
    if (form.startDate.getTime() > Date.now()) {
      setValidationError('Start sesji nie moze byc w przyszlosci.');
      return;
    }
    if (form.endDate && form.endDate.getTime() > Date.now()) {
      setValidationError('Koniec sesji nie moze byc w przyszlosci.');
      return;
    }

    updateSession.mutate(
      {
        sessionId: session.id,
        childId: session.child_id,
        patch: {
          type: form.type,
          start_at: form.startDate.toISOString(),
          // Nie wysylamy end_at dla aktywnej sesji — zostawiamy null bez zmiany.
          ...(isActive ? {} : { end_at: form.endDate ? form.endDate.toISOString() : null }),
          notes: form.notes.trim().length > 0 ? form.notes.trim() : null,
        },
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  function handleDelete() {
    Alert.alert(
      'Usunac sesje?',
      'Tej operacji nie da sie cofnac.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usun',
          style: 'destructive',
          onPress: () => {
            deleteSession.mutate(
              { sessionId: session.id, childId: session.child_id },
              {
                onSuccess: () => router.back(),
              },
            );
          },
        },
      ],
      { cancelable: true },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerClassName="px-6 py-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-semibold text-navy">Edytuj sesje</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anuluj"
              onPress={() => router.back()}>
              <Text className="text-sm font-semibold text-purple">Anuluj</Text>
            </Pressable>
          </View>

          <SessionEditForm
            form={form}
            onChange={setForm}
            isActive={isActive}
            isPending={isPending}
            validationError={validationError}
            saveError={updateSession.isError ? extractErrorMessage(updateSession.error) : null}
            deleteError={deleteSession.isError ? extractErrorMessage(deleteSession.error) : null}
            isSavePending={updateSession.isPending}
            isDeletePending={deleteSession.isPending}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
