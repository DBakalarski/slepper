import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useCreateChild } from '@/features/children/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';
import { requestPermissions } from '@/lib/notifications';

const AVATAR_COLORS: string[] = ['#7C6BAD', '#E08B6F', '#1E1B4B', '#5A8B6F', '#B86F8B'];
const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface AddChildFormProps {
  familyId: string;
}

// Onboarding ekran (pokazany gdy children.length === 0): imie, data ur.,
// kolor avatara. Wprowadzanie daty jako tekst (YYYY-MM-DD) — pelny picker
// dochodzi w Fazie 3.
export function AddChildForm({ familyId }: AddChildFormProps) {
  const createChild = useCreateChild();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isPending = createChild.isPending;

  function handleSubmit() {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setValidationError('Imie nie moze byc puste');
      return;
    }
    if (!BIRTH_DATE_REGEX.test(birthDate)) {
      setValidationError('Data urodzenia w formacie YYYY-MM-DD');
      return;
    }
    const parsed = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      setValidationError('Nieprawidlowa data');
      return;
    }
    if (parsed.getTime() > Date.now()) {
      setValidationError('Data urodzenia nie moze byc w przyszlosci');
      return;
    }
    setValidationError(null);
    createChild.mutate(
      {
        familyId,
        name: trimmedName,
        birthDate,
        avatarColor,
      },
      {
        // Po dodaniu pierwszego dziecka prosimy o uprawnienia do powiadomien
        // (Faza 5). Idempotent — przy kolejnych dzieciach status juz granted/denied
        // i system nie pokaze promptu ponownie. Fire-and-forget; nie blokujemy
        // przejscia do glownego ekranu jesli user odmowi.
        onSuccess: () => {
          void requestPermissions();
        },
      },
    );
  }

  return (
    <View className="rounded-2xl bg-white p-5 dark:bg-dark-card">
      <Text className="text-lg font-semibold text-navy dark:text-cream">Dodaj dziecko</Text>
      <Text className="mt-1 text-sm text-purple">
        Aby rozpoczac trackowanie, dodaj pierwsze dziecko.
      </Text>

      <View className="mt-4 gap-3">
        <View>
          <Text className="text-xs font-semibold text-purple">Imie</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="np. Maja"
            placeholderTextColor="#7C6BAD"
            className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy dark:text-cream"
            editable={!isPending}
            accessibilityLabel="Imie dziecka"
          />
        </View>

        <View>
          <Text className="text-xs font-semibold text-purple">Data urodzenia</Text>
          <TextInput
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="2025-03-15"
            placeholderTextColor="#7C6BAD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy dark:text-cream"
            editable={!isPending}
            accessibilityLabel="Data urodzenia dziecka"
          />
        </View>

        <View>
          <Text className="text-xs font-semibold text-purple">Kolor</Text>
          <View className="mt-2 flex-row gap-2">
            {AVATAR_COLORS.map((color) => {
              const isSelected = avatarColor === color;
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={`Kolor ${color}`}
                  onPress={() => setAvatarColor(color)}
                  disabled={isPending}
                  style={{ backgroundColor: color }}
                  className={`h-10 w-10 rounded-full ${
                    isSelected ? 'border-2 border-navy' : 'border border-transparent'
                  }`}
                />
              );
            })}
          </View>
        </View>

        {validationError ? (
          <Text className="text-sm text-orange">{validationError}</Text>
        ) : null}
        {createChild.isError ? (
          <Text className="text-sm text-orange">
            Blad zapisu: {extractErrorMessage(createChild.error)}
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
            <Text className="text-sm font-semibold text-cream">Dodaj dziecko</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
