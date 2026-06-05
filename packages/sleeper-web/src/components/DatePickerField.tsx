import { useId } from 'react';
import { Platform, Text, View } from 'react-native';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import {
  APP_TIMEZONE,
  combineDateAndTimeInAppTz,
  parseAppTzDateTime,
} from '@/lib/time';

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  maximumDate?: Date;
  accessibilityLabel?: string;
}

// Web-only DatePickerField. HTML5 `<input type="date">` (natywny picker iOS
// Safari / Android Chrome / desktop calendar widget). Format wartosci: "YYYY-MM-DD".
//
// Konwersja tz: `value` to Date (UTC instant). `format(toZonedTime, app tz)`
// wyciaga widziany day-key. Po zmianie sklejamy nowy day-key z godzina z
// `value` przez `combineDateAndTimeInAppTz`. Nie uzywamy `setDate`/`setMonth`
// — operowaloby w device tz (learned-pattern TZ-safe time).
//
// `maximumDate`: konwertujemy na "YYYY-MM-DD" w app tz i przekazujemy do
// HTML5 `max` attr. Browser blokuje wybor pozniejszych dat.
//
// font-size: 16px (inline style) — zapobiega iOS Safari auto-zoom przy focus.
export function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  maximumDate,
  accessibilityLabel,
}: DatePickerFieldProps) {
  const inputId = useId();
  const dayKey = format(toZonedTime(value, APP_TIMEZONE), 'yyyy-MM-dd');
  const maxKey = maximumDate
    ? format(toZonedTime(maximumDate, APP_TIMEZONE), 'yyyy-MM-dd')
    : undefined;
  const timeKey = format(toZonedTime(value, APP_TIMEZONE), 'HH:mm');

  function handleChangeWeb(event: { target: { value: string } }) {
    const next = event.target.value;
    if (!next) return;
    // Sklej nowy dzien z istniejaca godzina `value` w app tz.
    const parsedNewDay = parseAppTzDateTime(next, timeKey);
    if (!parsedNewDay) return;
    // combineDateAndTimeInAppTz wymaga dwoch Date — uzywamy parsed jako date
    // part i `value` jako time part (rownowaznie do dayKey + timeKey).
    onChange(combineDateAndTimeInAppTz(parsedNewDay, value));
  }

  if (Platform.OS !== 'web') {
    return (
      <View>
        <Text className="text-xs font-semibold text-purple">{label}</Text>
        <Text className="text-base text-navy dark:text-cream">{dayKey}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-xs font-semibold text-purple">{label}</Text>
      <input
        id={inputId}
        type="date"
        value={dayKey}
        max={maxKey}
        onChange={handleChangeWeb}
        disabled={disabled}
        aria-label={accessibilityLabel ?? label}
        style={{
          fontSize: 16,
          minHeight: 44,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'rgba(167, 139, 250, 0.3)',
          borderRadius: 12,
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 8,
          paddingBottom: 8,
          marginTop: 4,
          width: '100%',
          backgroundColor: 'transparent',
          color: 'inherit',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'inherit',
        }}
      />
    </View>
  );
}
