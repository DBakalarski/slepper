import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatTime } from '@/lib/time';

interface TimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

// Pole wyboru godziny z natywnym pickerem. Sygnalizacja przez `onChange`;
// rodzic decyduje, czy resetowac do "now", czy laczyc z osobnym date pickerem.
export function TimePickerField({
  label,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: TimePickerFieldProps) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  }

  return (
    <View className="flex-1">
      <Text className="text-xs font-semibold text-purple">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={() => setShow(true)}
        disabled={disabled}
        className={`mt-1 rounded-xl border border-purple/30 px-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
        <Text className="text-base text-navy dark:text-cream">{formatTime(value)}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
