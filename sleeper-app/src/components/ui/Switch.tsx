import { Switch as RNSwitch } from 'react-native';

import { COLORS } from '@/lib/colors';

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
const TRACK_ON = COLORS.purple;
const TRACK_OFF_LIGHT = '#E8DEF7'; // purple-soft (nie ma w COLORS — lokalne)
const THUMB = COLORS.cream;

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
