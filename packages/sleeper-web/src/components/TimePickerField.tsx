import { useId } from 'react';
import { Platform, Text, View } from 'react-native';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { APP_TIMEZONE, parseAppTzDateTime } from '@/lib/time';

interface TimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

// Web-only TimePickerField. Uzywa natywnego HTML5 `<input type="time">`.
// iOS Safari renderuje natywny wheel picker minut (bez crop bug znanego z RN
// mobile fix `docs/active/fixy-edycja-aktywnosc-smart-start/`). Android Chrome
// renderuje natywny clock dialog. Desktop — text input z arrows / picker.
//
// Konwersja tz: wartosc reprezentowana jako Date (UTC instant). HTML5 input
// operuje na lokalnym formacie "HH:mm". `format(toZonedTime(value, app tz))`
// wyciaga godzine widzialna w app tz; `combineDateAndTimeInAppTz` skleja nowy
// czas (z input) z dzien z `value` w jednym instant. NIE uzywamy `setHours`
// na surowym Date — to operuje w device tz (learned-pattern TZ-safe time).
//
// font-size: 16px (inline style) — zapobiega iOS Safari auto-zoom przy focus.
// min-height: 44px (touch target HIG / WCAG 2.5.5).
export function TimePickerField({
  label,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: TimePickerFieldProps) {
  const inputId = useId();
  const timeString = format(toZonedTime(value, APP_TIMEZONE), 'HH:mm');

  function handleChangeWeb(event: { target: { value: string } }) {
    const next = event.target.value;
    if (!next) return;
    // HTML5 input emits "HH:mm". Combine z dniem z `value` w app tz przez
    // `combineDateAndTimeInAppTz` — sklada dzien `value` + godzine z inputu
    // w app tz, konwertuje na UTC. Tworzy tymczasowy Date przez
    // `parseAppTzDateTime` zeby uzyskac godzine jako instant.
    const dayKey = format(toZonedTime(value, APP_TIMEZONE), 'yyyy-MM-dd');
    const parsed = parseAppTzDateTime(dayKey, next);
    if (!parsed) return;
    onChange(parsed);
  }

  // Na web React tworzy raw DOM <input> przez createElement — react-native-web
  // toleruje DOM elementy jako children (renderowane przez ReactDOM tym samym
  // root'em). Na native ten plik nie jest budowany (sleeper-web = web-only).
  if (Platform.OS !== 'web') {
    // Defensive: w razie gdyby kiedys ten kod sie pojawil w bundlerze native.
    return (
      <View className="flex-1">
        <Text className="text-xs font-semibold text-purple">{label}</Text>
        <Text className="text-base text-navy dark:text-cream">{timeString}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="text-xs font-semibold text-purple">{label}</Text>
      <input
        id={inputId}
        type="time"
        value={timeString}
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
