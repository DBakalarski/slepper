import { ActivityIndicator, Pressable, Text } from 'react-native';

interface BigActionButtonProps {
  mode: 'start' | 'stop';
  onPress: () => void;
  isPending?: boolean;
  disabled?: boolean;
}

// Granatowy duzy CTA z mockupow. "Rozpocznij sen" gdy brak aktywnej sesji,
// "Zakoncz sen" gdy aktywna trwa.
export function BigActionButton({
  mode,
  onPress,
  isPending = false,
  disabled = false,
}: BigActionButtonProps) {
  const label = mode === 'start' ? 'Rozpocznij sen' : 'Zakoncz sen';
  const isDisabled = disabled || isPending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isPending }}
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-2xl px-6 py-5 ${
        isDisabled ? 'bg-navy/50' : 'bg-navy'
      }`}>
      {isPending ? (
        <ActivityIndicator color="#F5F0E8" />
      ) : (
        <Text className="text-lg font-semibold text-cream">{label}</Text>
      )}
    </Pressable>
  );
}
