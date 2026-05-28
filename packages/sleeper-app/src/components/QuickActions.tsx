import type { LucideIcon } from 'lucide-react-native';
import { Moon, Plus, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/lib/colors';

interface QuickActionsProps {
  onStartNap: () => void;
  onStartNight: () => void;
  onAddBackdated: () => void;
  disabled?: boolean;
}

// 3 biale karty quick-access z okraglym ikonowym chipem (design.md Faza 3,
// screen #1). Sun (Drzemka, orange-soft), Moon (Sen, purple-soft), Plus
// (Dodaj wstecz, neutral-soft).
export function QuickActions({
  onStartNap,
  onStartNight,
  onAddBackdated,
  disabled = false,
}: QuickActionsProps) {
  return (
    <View className="flex-row gap-2">
      <ActionCard
        icon={Sun}
        iconColor={COLORS.orange}
        chipClassName="bg-orange-soft"
        label="Drzemka"
        onPress={onStartNap}
        disabled={disabled}
      />
      <ActionCard
        icon={Moon}
        iconColor={COLORS.purple}
        chipClassName="bg-purple-soft"
        label="Sen"
        onPress={onStartNight}
        disabled={disabled}
      />
      <ActionCard
        icon={Plus}
        iconColor={COLORS.textMuted}
        chipClassName="bg-cream dark:bg-dark-surface"
        label="Dodaj wstecz"
        onPress={onAddBackdated}
        disabled={disabled}
      />
    </View>
  );
}

interface ActionCardProps {
  icon: LucideIcon;
  // HEX kolor ikony lucide — pattern z Fazy 2 (lucide nie konsumuje className
  // bezposrednio cross-platform). Trzymamy z paletka tailwind.
  iconColor: string;
  chipClassName: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionCard({
  icon: Icon,
  iconColor,
  chipClassName,
  label,
  onPress,
  disabled = false,
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) =>
        pressed && !disabled
          ? { transform: [{ scale: 0.97 }], opacity: 0.85 }
          : null
      }
      className={`flex-1 items-center justify-center rounded-card bg-white p-4 shadow-card dark:bg-dark-card ${
        disabled ? 'opacity-50' : ''
      }`}>
      <View
        className={`h-10 w-10 items-center justify-center rounded-pill ${chipClassName}`}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text className="mt-2 text-center text-xs font-medium text-navy dark:text-cream">
        {label}
      </Text>
    </Pressable>
  );
}
