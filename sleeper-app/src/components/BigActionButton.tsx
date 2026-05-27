import * as Haptics from 'expo-haptics';
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

  function handlePress() {
    // Medium impact daje wyrazne potwierdzenie startu/stopu bez nadmiernego
    // wibrowania (Light = za delikatne dla glownego CTA, Heavy = drazniace).
    // Fire-and-forget: brak haptic enginu (Android starsze, iOS w trybie cichym)
    // nie blokuje akcji; expo-haptics zwraca void na unsupported.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isPending }}
      onPress={handlePress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-2xl px-6 py-5 ${
        isDisabled ? 'bg-navy/50 dark:bg-purple/40' : 'bg-navy dark:bg-purple'
      }`}>
      {isPending ? (
        <ActivityIndicator color="#F5F0E8" />
      ) : (
        <Text className="text-lg font-semibold text-cream">{label}</Text>
      )}
    </Pressable>
  );
}
