import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime } from '@/lib/time';

interface TimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

// Pole wyboru godziny z natywnym pickerem.
// iOS: spinner UIDatePicker renderowany w `<View flex-1>` cropuje kolumne MM
// (UIDatePicker dziedziczy szerokosc rodzica). Rozwiazanie: owijamy w
// transparent `<Modal>` z bottom-sheet kontenerem full-width + przyciskami
// "Anuluj"/"Gotowe". `tempValue` commituje sie dopiero po "Gotowe" — eliminuje
// spam `onChange` podczas scroll na iOS.
// Android: zachowuje natywny system dialog (galaz `Platform.OS === 'android'`)
// bez Modala.
export function TimePickerField({
  label,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: TimePickerFieldProps) {
  const [show, setShow] = useState(false);
  const [tempValue, setTempValue] = useState<Date>(value);
  const isIos = Platform.OS === 'ios';

  function handleOpen() {
    setTempValue(value);
    setShow(true);
  }

  function handleClose() {
    setShow(false);
  }

  function handleConfirm() {
    onChange(tempValue);
    setShow(false);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  }

  function handleIosChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempValue(selected);
  }

  return (
    <View className="flex-1">
      <Text className="text-xs font-semibold text-purple">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={handleOpen}
        disabled={disabled}
        className={`mt-1 rounded-xl border border-purple/30 px-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
        <Text className="text-base text-navy dark:text-cream">{formatTime(value)}</Text>
      </Pressable>
      {isIos ? (
        <Modal
          visible={show}
          transparent
          animationType="fade"
          onRequestClose={handleClose}>
          {/* Backdrop — tap traktowany jako Anuluj (bez commitu). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zamknij wybor godziny bez zapisu"
            onPress={handleClose}
            className="flex-1 bg-black/50 justify-end">
            {/* Stop-propagation: tap na sam sheet NIE zamyka modala. */}
            <Pressable accessible={false} onPress={() => {}}>
              <SafeAreaView edges={['bottom']} className="bg-cream dark:bg-navy rounded-t-2xl">
                <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Anuluj wybor godziny"
                    onPress={handleClose}
                    hitSlop={HIT_SLOP}
                    className="px-2 py-2">
                    <Text className="text-base text-purple">Anuluj</Text>
                  </Pressable>
                  <Text className="text-base font-semibold text-navy dark:text-cream">
                    {label}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Zapisz wybrana godzine"
                    onPress={handleConfirm}
                    hitSlop={HIT_SLOP}
                    className="px-2 py-2">
                    <Text className="text-base font-semibold text-purple">Gotowe</Text>
                  </Pressable>
                </View>
                <View className="px-4 pb-2">
                  <DateTimePicker
                    value={tempValue}
                    mode="time"
                    display="spinner"
                    is24Hour
                    onChange={handleIosChange}
                  />
                </View>
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : show ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          is24Hour
          onChange={handleAndroidChange}
        />
      ) : null}
    </View>
  );
}
