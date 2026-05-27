import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { DatePickerField } from '@/components/DatePickerField';
import { TimePickerField } from '@/components/TimePickerField';
import { type SessionType } from '@/features/sessions/hooks';
import { combineDateAndTimeInAppTz } from '@/lib/time';

export interface SessionFormState {
  startDate: Date;
  endDate: Date | null;
  type: SessionType;
  notes: string;
}

interface SessionEditFormProps {
  form: SessionFormState;
  onChange: (next: SessionFormState) => void;
  isActive: boolean;
  isPending: boolean;
  validationError: string | null;
  saveError: string | null;
  deleteError: string | null;
  isSavePending: boolean;
  isDeletePending: boolean;
  onSave: () => void;
  onDelete: () => void;
}

// Presentational form Edycji sesji. Bez zaleznosci do query/mutacji —
// strona zarzadza stanem i side-effectami, ten komponent renderuje tylko UI.
export function SessionEditForm({
  form,
  onChange,
  isActive,
  isPending,
  validationError,
  saveError,
  deleteError,
  isSavePending,
  isDeletePending,
  onSave,
  onDelete,
}: SessionEditFormProps) {
  return (
    <>
      {isActive ? (
        <View className="rounded-xl bg-orange/15 px-4 py-3">
          <Text className="text-xs font-semibold text-navy">Sesja w toku</Text>
          <Text className="mt-1 text-xs text-purple">
            Mozna zmienic typ, start i notatki. Koniec ustawi sie automatycznie po
            zakonczeniu sesji.
          </Text>
        </View>
      ) : null}

      <View className="rounded-2xl bg-white p-4 gap-4">
        <View>
          <Text className="text-xs font-semibold text-purple">Typ</Text>
          <View className="mt-2 flex-row gap-2">
            <Chip
              label="Drzemka"
              selected={form.type === 'nap'}
              onPress={() => onChange({ ...form, type: 'nap' })}
            />
            <Chip
              label="Sen nocny"
              selected={form.type === 'night_sleep'}
              onPress={() => onChange({ ...form, type: 'night_sleep' })}
            />
          </View>
        </View>

        <DatePickerField
          label="Data startu"
          value={form.startDate}
          onChange={(next) =>
            onChange({
              ...form,
              startDate: combineDateAndTimeInAppTz(next, form.startDate),
            })
          }
          disabled={isPending}
          maximumDate={new Date()}
          accessibilityLabel="Data rozpoczecia sesji"
        />

        <View className="flex-row gap-3">
          <TimePickerField
            label="Godz. start"
            value={form.startDate}
            onChange={(next) =>
              onChange({
                ...form,
                startDate: combineDateAndTimeInAppTz(form.startDate, next),
              })
            }
            disabled={isPending}
            accessibilityLabel="Godzina rozpoczecia"
          />
          {!isActive && form.endDate ? (
            <TimePickerField
              label="Godz. koniec"
              value={form.endDate}
              onChange={(next) =>
                onChange({
                  ...form,
                  // Bezpieczne: form.endDate juz nie null w tej galezi.
                  endDate: combineDateAndTimeInAppTz(form.endDate ?? next, next),
                })
              }
              disabled={isPending}
              accessibilityLabel="Godzina zakonczenia"
            />
          ) : (
            <View className="flex-1" />
          )}
        </View>

        {!isActive && form.endDate ? (
          <DatePickerField
            label="Data konca"
            value={form.endDate}
            onChange={(next) =>
              onChange({
                ...form,
                endDate: combineDateAndTimeInAppTz(next, form.endDate ?? next),
              })
            }
            disabled={isPending}
            maximumDate={new Date()}
            accessibilityLabel="Data zakonczenia sesji"
          />
        ) : null}

        <View>
          <Text className="text-xs font-semibold text-purple">Notatki</Text>
          <TextInput
            value={form.notes}
            onChangeText={(text) => onChange({ ...form, notes: text })}
            placeholder="Opcjonalne notatki"
            placeholderTextColor="#7C6BAD"
            multiline
            numberOfLines={3}
            className="mt-1 min-h-[80px] rounded-xl border border-purple/30 px-3 py-2 text-base text-navy"
            editable={!isPending}
            accessibilityLabel="Notatki do sesji"
            textAlignVertical="top"
          />
        </View>

        {validationError ? (
          <Text className="text-sm text-orange">{validationError}</Text>
        ) : null}
        {saveError ? (
          <Text className="text-sm text-orange">Blad zapisu: {saveError}</Text>
        ) : null}
        {deleteError ? (
          <Text className="text-sm text-orange">Blad usuwania: {deleteError}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          disabled={isPending}
          className={`mt-2 items-center justify-center rounded-xl px-4 py-3 ${
            isPending ? 'bg-navy/40' : 'bg-navy'
          }`}>
          {isSavePending ? (
            <ActivityIndicator color="#F5F0E8" />
          ) : (
            <Text className="text-sm font-semibold text-cream">Zapisz zmiany</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        disabled={isPending}
        className={`items-center justify-center rounded-xl border border-orange px-4 py-3 ${
          isPending ? 'opacity-50' : ''
        }`}>
        {isDeletePending ? (
          <ActivityIndicator color="#E08B6F" />
        ) : (
          <Text className="text-sm font-semibold text-orange">Usun sesje</Text>
        )}
      </Pressable>
    </>
  );
}
