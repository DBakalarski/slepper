import * as Haptics from 'expo-haptics';
import { Moon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { SessionType } from '@/features/sessions/hooks';
import { COLORS } from '@/lib/colors';

interface BigActionButtonProps {
  mode: 'start' | 'stop';
  onPress: () => void;
  isPending?: boolean;
  disabled?: boolean;
  // Typ sesji ktora bedzie rozpoczeta (start mode) lub konczona (stop mode).
  // Decyduje o ikonie: Moon dla night_sleep w start mode. Default 'nap' zachowuje
  // istniejace zachowanie (`handleStart('nap')`) bez ikony przed labelem dla naps.
  sessionType?: SessionType;
}

// Granatowy duzy CTA z mockupow. "Rozpocznij sen" gdy brak aktywnej sesji,
// "Zakoncz sen" gdy aktywna trwa. Dla start + night_sleep prepend Moon ikony
// (design.md Faza 3).
export function BigActionButton({
  mode,
  onPress,
  isPending = false,
  disabled = false,
  sessionType = 'nap',
}: BigActionButtonProps) {
  const label = mode === 'start' ? 'Rozpocznij sen' : 'Zakończ sen';
  const isDisabled = disabled || isPending;
  const showMoonIcon = mode === 'start' && sessionType === 'night_sleep';

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
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isPending }}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) =>
        pressed && !isDisabled
          ? { transform: [{ scale: 0.97 }], opacity: 0.85 }
          : null
      }
      className={`flex-row items-center justify-center gap-2 rounded-card px-6 py-5 ${
        isDisabled ? 'bg-navy/50 dark:bg-purple/40' : 'bg-navy dark:bg-purple'
      }`}>
      {isPending ? (
        <ActivityIndicator color={COLORS.cream} />
      ) : (
        <View className="flex-row items-center gap-2">
          {showMoonIcon ? <Moon size={20} color={COLORS.cream} /> : null}
          <Text className="text-lg font-semibold text-cream">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
