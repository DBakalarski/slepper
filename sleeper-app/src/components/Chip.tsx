import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

// Shared pigulka-style chip: selected = navy bg + cream text, inactive =
// cream bg + navy text. Uzywany w wyborze trybu (history) i typu sesji
// (session/[id], BackdatedSessionModal). Trzecie uzycie spelnia regule
// "abstrakcja od 2+ uzyc" z coding-rules §3.
export function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-xl px-4 py-2 ${selected ? 'bg-navy dark:bg-dark-surface' : 'bg-cream dark:bg-dark-card'}`}>
      <Text className={`text-sm font-semibold ${selected ? 'text-cream' : 'text-navy dark:text-cream'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
