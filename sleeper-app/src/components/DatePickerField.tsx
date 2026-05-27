import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatDateShort } from '@/lib/time';

interface DatePickerFieldProps {
  label: string;
  // Aktualna wartosc reprezentowana jako Date — komponent rozumie tz w ramach
  // formatera; rodzic decyduje kiedy i jak konwertowac.
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  // Ogranicza wybor do `maximumDate` (uzywane do "nie pozwol wybrac jutra w
  // pickerze historii").
  maximumDate?: Date;
  accessibilityLabel?: string;
}

// Pole wyboru daty z natywnym pickerem. iOS: inline po tapie, kontrolowane
// stanem `show`. Android: modal systemowy, zamyka sie po wyborze (event 'set'
// lub 'dismissed'). Sygnalizujemy zmiane przez `onChange` — rodzic ma pelna
// kontrole nad utrzymaniem wartosci miedzy renderami.
export function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  maximumDate,
  accessibilityLabel,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  }

  return (
    <View>
      <Text className="text-xs font-semibold text-purple">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={() => setShow(true)}
        disabled={disabled}
        className={`mt-1 rounded-xl border border-purple/30 px-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
        <Text className="text-base text-navy">{formatDateShort(value)}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}
