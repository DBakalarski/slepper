import { Pressable, Text, View } from 'react-native';

interface QuickActionsProps {
  onStartNap: () => void;
  onStartNight: () => void;
  onAddBackdated: () => void;
  disabled?: boolean;
}

// 3 biale przyciski quick-access pod glownym CTA (mockup #1).
export function QuickActions({
  onStartNap,
  onStartNight,
  onAddBackdated,
  disabled = false,
}: QuickActionsProps) {
  return (
    <View className="flex-row gap-2">
      <ActionButton label="Drzemka teraz" onPress={onStartNap} disabled={disabled} />
      <ActionButton label="Sen nocny" onPress={onStartNight} disabled={disabled} />
      <ActionButton label="Dodaj wstecz" onPress={onAddBackdated} disabled={disabled} />
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionButton({ label, onPress, disabled = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center justify-center rounded-xl bg-white px-3 py-3 dark:bg-dark-card ${
        disabled ? 'opacity-50' : ''
      }`}>
      <Text className="text-center text-xs font-semibold text-navy dark:text-cream">{label}</Text>
    </Pressable>
  );
}
