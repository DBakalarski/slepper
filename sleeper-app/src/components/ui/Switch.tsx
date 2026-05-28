import { Switch as RNSwitch } from 'react-native';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

// Wrapper na RN Switch z nasza paleta. Track on = purple (akcent appki),
// track off = neutralny cream/dark-surface. Thumb ma kolor cream (light/dark
// wersja appki) zeby kontrastowal z obydwoma tlami.
//
// `trackColor` musi byc HEX (RN nie akceptuje Tailwind className tutaj).
const TRACK_ON = '#7C6BAD'; // purple
const TRACK_OFF_LIGHT = '#E8DEF7'; // purple-soft
const THUMB = '#F5F0E8'; // cream

export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      trackColor={{ true: TRACK_ON, false: TRACK_OFF_LIGHT }}
      thumbColor={THUMB}
    />
  );
}
