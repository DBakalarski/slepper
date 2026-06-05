import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useUpdateChild, type Child } from '@/features/children/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';

const AVATAR_COLORS: string[] = ['#7C6BAD', '#E08B6F', '#1E1B4B', '#5A8B6F', '#B86F8B'];
const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BEDTIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
// 'Auto' = brak override (null w bazie). Pozostale = twardy override.
const NAP_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Auto' },
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

interface EditChildFormProps {
  child: Child;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Konwersja Postgres 'HH:MM:SS' -> 'HH:MM' dla TextInput (i odwrotnie przy zapisie).
function bedtimeFromDb(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function EditChildForm({ child, onSuccess, onCancel }: EditChildFormProps) {
  const updateChild = useUpdateChild();
  const [name, setName] = useState(child.name);
  const [birthDate, setBirthDate] = useState(child.birth_date);
  const [avatarColor, setAvatarColor] = useState<string>(child.avatar_color);
  const [algorithm, setAlgorithm] = useState<'galland' | 'kotki_dwa'>(child.algorithm);
  const [preferredNaps, setPreferredNaps] = useState<number | null>(
    child.preferred_naps_per_day,
  );
  const [preferredBedtime, setPreferredBedtime] = useState(
    bedtimeFromDb(child.preferred_bedtime),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const isPending = updateChild.isPending;

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
    if (preferredBedtime.length > 0 && !BEDTIME_REGEX.test(preferredBedtime)) {
      setValidationError('Godzina nocnego snu w formacie HH:MM (00:00 - 23:59)');
      return;
    }
    setValidationError(null);

    updateChild.mutate(
      {
        childId: child.id,
        name: trimmedName,
        birthDate,
        avatarColor,
        algorithm,
        preferredNapsPerDay: preferredNaps,
        preferredBedtime: preferredBedtime.length > 0 ? `${preferredBedtime}:00` : null,
      },
      {
        onSuccess: () => onSuccess?.(),
      },
    );
  }

  return (
    <View className="rounded-2xl bg-white p-5 dark:bg-dark-card">
      <Text className="text-lg font-semibold text-navy dark:text-cream">
        Edytuj dane dziecka
      </Text>
      <Text className="mt-1 text-sm text-purple">
        Zmiany sa zapisywane od razu po kliknieciu Zapisz.
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

        <View>
          <Text className="text-xs font-semibold text-purple">Algorytm rekomendacji</Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Algorytm Naukowy Galland"
              onPress={() => setAlgorithm('galland')}
              disabled={isPending}
              className={`flex-1 items-center justify-center rounded-xl border px-3 py-2 ${
                algorithm === 'galland' ? 'border-navy bg-navy' : 'border-purple/30 bg-transparent'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  algorithm === 'galland' ? 'text-cream' : 'text-navy dark:text-cream'
                }`}>
                Naukowy (Galland)
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Algorytm Kotki Dwa"
              onPress={() => setAlgorithm('kotki_dwa')}
              disabled={isPending}
              className={`flex-1 items-center justify-center rounded-xl border px-3 py-2 ${
                algorithm === 'kotki_dwa'
                  ? 'border-navy bg-navy'
                  : 'border-purple/30 bg-transparent'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  algorithm === 'kotki_dwa' ? 'text-cream' : 'text-navy dark:text-cream'
                }`}>
                Kotki Dwa
              </Text>
            </Pressable>
          </View>
          <Text className="mt-1 text-xs text-purple">
            Naukowy: okna pochodne z norm Galland 2012 + adaptacja z historii.
            Kotki Dwa: stale okna z lookup table per wiek, pobudka 07:00 (lub preferowana).
          </Text>
        </View>

        <View>
          <Text className="text-xs font-semibold text-purple">
            Preferowana liczba drzemek na dzien
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {NAP_OPTIONS.map((opt) => {
              const isSelected = preferredNaps === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Liczba drzemek ${opt.label}`}
                  onPress={() => setPreferredNaps(opt.value)}
                  disabled={isPending}
                  className={`min-w-[44px] items-center justify-center rounded-xl border px-3 py-2 ${
                    isSelected
                      ? 'border-navy bg-navy'
                      : 'border-purple/30 bg-transparent'
                  }`}>
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-cream' : 'text-navy dark:text-cream'
                    }`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-1 text-xs text-purple">
            Auto = algorytm decyduje na podstawie wieku i historii.
          </Text>
        </View>

        <View>
          <Text className="text-xs font-semibold text-purple">
            Preferowana godzina nocnego snu
          </Text>
          <TextInput
            value={preferredBedtime}
            onChangeText={setPreferredBedtime}
            placeholder="19:30"
            placeholderTextColor="#7C6BAD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={5}
            className="mt-1 rounded-xl border border-purple/30 px-3 py-2 text-base text-navy dark:text-cream"
            editable={!isPending}
            accessibilityLabel="Preferowana godzina nocnego snu w formacie HH:MM"
          />
          <Text className="mt-1 text-xs text-purple">
            Pozostaw puste, aby algorytm wyznaczyl godzine na podstawie okien czuwania.
          </Text>
        </View>

        {validationError ? (
          <Text className="text-sm text-orange">{validationError}</Text>
        ) : null}
        {updateChild.isError ? (
          <Text className="text-sm text-orange">
            Blad zapisu: {extractErrorMessage(updateChild.error)}
          </Text>
        ) : null}

        <View className="mt-2 flex-row gap-2">
          {onCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anuluj edycje"
              onPress={onCancel}
              disabled={isPending}
              className="flex-1 items-center justify-center rounded-xl border border-purple/30 px-4 py-3">
              <Text className="text-sm font-semibold text-navy dark:text-cream">
                Anuluj
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zapisz zmiany"
            onPress={handleSubmit}
            disabled={isPending}
            className={`flex-1 items-center justify-center rounded-xl px-4 py-3 ${
              isPending ? 'bg-navy/40' : 'bg-navy'
            }`}>
            {isPending ? (
              <ActivityIndicator color="#F5F0E8" />
            ) : (
              <Text className="text-sm font-semibold text-cream">Zapisz</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
