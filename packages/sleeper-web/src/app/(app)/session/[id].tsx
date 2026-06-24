import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { confirmAction } from '@/lib/confirm';
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
  const [initializedSignature, setInitializedSignature] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Inicjalizacja formularza z danych z bazy. Ekran `session/[id]` jest ukrytym
  // Tab screenem (patrz `_layout.tsx`) — react-navigation trzyma go zamontowany,
  // wiec `useState` przezywa nawigacje miedzy sesjami. Guard po samej sygnaturze
  // sesji (id + czy zakonczona) re-inicjalizuje formularz gdy:
  //   - user przechodzi do innej sesji (rozne id) — fix stale start_at,
  //   - aktywna sesja zostala zakonczona (active -> ended) — fix "Sesja w toku"
  //     po zakonczeniu drzemki.
  // NIE re-inicjalizujemy przy zwyklym refetchu tej samej sesji w tym samym
  // stanie — chroni edycje usera przed nadpisaniem przez realtime.
  useEffect(() => {
    const data = sessionQuery.data;
    if (!data) return;
    const signature = `${data.id}:${data.end_at === null ? 'active' : 'ended'}`;
    if (signature === initializedSignature) return;
    setForm({
      startDate: new Date(data.start_at),
      endDate: data.end_at ? new Date(data.end_at) : null,
      type: data.type,
      notes: data.notes ?? '',
      tags: data.tags,
    });
    setInitializedSignature(signature);
    setValidationError(null);
  }, [sessionQuery.data, initializedSignature]);

  if (!sessionId) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-navy dark:text-cream">Brak ID sesji.</Text>
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
          <Text className="text-base text-navy dark:text-cream">Nie udalo sie zaladowac sesji.</Text>
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
          tags: form.tags,
        },
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: 'Usunac sesje?',
      message: 'Tej operacji nie da sie cofnac.',
      confirmText: 'Usun',
      cancelText: 'Anuluj',
      destructive: true,
    });
    if (!ok) return;
    deleteSession.mutate(
      { sessionId: session.id, childId: session.child_id },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerClassName="px-6 py-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-semibold text-navy dark:text-cream">Edytuj sesje</Text>
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
