import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/Chip';
import { useInsertBackdatedSession, type SessionType } from '@/features/sessions/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';
import { parseAppTzDateTime, todayDateInAppTz } from '@/lib/time';

interface BackdatedSessionModalProps {
  visible: boolean;
  childId: string;
  onClose: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseAppTzInput(date: string, time: string): Date | null {
  if (!DATE_REGEX.test(date) || !TIME_REGEX.test(time)) return null;
  // User wpisuje godziny w strefie Europe/Warsaw (konwencja UI), niezaleznie
  // od device tz — uzywamy fromZonedTime przez parseAppTzDateTime.
  return parseAppTzDateTime(date, time);
}

// Modal do wstawienia sesji w przeszlosci. MVP: text input HH:MM zamiast
// natywnego DateTimePickera — uniknij nowej zaleznosci, polish w Fazie 3.
export function BackdatedSessionModal({
  visible,
  childId,
  onClose,
}: BackdatedSessionModalProps) {
  const insertSession = useInsertBackdatedSession();
  const [date, setDate] = useState<string>(todayDateInAppTz());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [type, setType] = useState<SessionType>('nap');
  const [validationError, setValidationError] = useState<string | null>(null);

  function resetForm() {
    setDate(todayDateInAppTz());
    setStartTime('09:00');
    setEndTime('10:30');
    setType('nap');
    setValidationError(null);
  }

  function handleClose() {
    resetForm();
    insertSession.reset();
    onClose();
  }

  function handleSubmit() {
    setValidationError(null);
    const start = parseAppTzInput(date, startTime);
    const end = parseAppTzInput(date, endTime);
    if (!start || !end) {
      setValidationError('Sprawdz format daty i godzin (YYYY-MM-DD, HH:MM)');
      return;
    }
    if (end <= start) {
      setValidationError('Koniec musi byc po starcie');
      return;
    }
    if (start.getTime() > Date.now()) {
      setValidationError('Sesja nie moze byc w przyszlosci');
      return;
    }
    insertSession.mutate(
      {
        childId,
        type,
        startAt: start,
        endAt: end,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }

  const isPending = insertSession.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-cream">
        <ScrollView contentContainerClassName="px-6 py-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-semibold text-navy">Dodaj sesje wstecz</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zamknij"
              onPress={handleClose}>
              <Text className="text-sm font-semibold text-purple">Anuluj</Text>
            </Pressable>
          </View>

          <View className="rounded-2xl bg-white p-4 gap-3">
            <View>
              <Text className="text-xs font-semibold text-purple">Typ</Text>
              <View className="mt-2 flex-row gap-2">
                <Chip
                  label="Drzemka"
                  selected={type === 'nap'}
                  onPress={() => setType('nap')}
                />
                <Chip
                  label="Sen nocny"
                  selected={type === 'night_sleep'}
                  onPress={() => setType('night_sleep')}
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-purple">Data</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#7C6BAD"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy"
                editable={!isPending}
                accessibilityLabel="Data sesji"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-purple">Start (HH:MM)</Text>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor="#7C6BAD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy"
                  editable={!isPending}
                  accessibilityLabel="Godzina rozpoczecia"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-purple">Koniec (HH:MM)</Text>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:30"
                  placeholderTextColor="#7C6BAD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy"
                  editable={!isPending}
                  accessibilityLabel="Godzina zakonczenia"
                />
              </View>
            </View>

            {validationError ? (
              <Text className="text-sm text-orange">{validationError}</Text>
            ) : null}
            {insertSession.isError ? (
              <Text className="text-sm text-orange">
                Blad zapisu: {extractErrorMessage(insertSession.error)}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={isPending}
              className={`mt-2 items-center justify-center rounded-xl px-4 py-3 ${
                isPending ? 'bg-navy/40' : 'bg-navy'
              }`}>
              {isPending ? (
                <ActivityIndicator color="#F5F0E8" />
              ) : (
                <Text className="text-sm font-semibold text-cream">Zapisz sesje</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

