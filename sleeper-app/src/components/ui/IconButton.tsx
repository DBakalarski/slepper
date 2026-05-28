import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'ghost';

interface IconButtonProps {
  icon: LucideIcon;
  // VoiceOver/TalkBack — wymagane, bo ikona nie ma tekstu.
  accessibilityLabel: string;
  onPress?: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  // Opcjonalny dot statusu (np. bell z nieprzeczytana notyfikacja).
  showDot?: boolean;
  // Override koloru tla — domyslnie zalezy od `variant`.
  bgClassName?: string;
  // HEX/RGB koloru ikony — lucide-react-native przyjmuje `color` jako prop
  // (NIE className — NativeWind interop dla SVG nie pokrywa wszystkich case'ow,
  // wiec HEX jest bezpieczniejszy cross-platform). Default: navy.
  iconColor?: string;
}

const SIZE_TO_CLASSES: Record<IconButtonSize, { wrapper: string; icon: number }> = {
  sm: { wrapper: 'w-9 h-9', icon: 18 },
  md: { wrapper: 'w-11 h-11', icon: 20 },
  lg: { wrapper: 'w-14 h-14', icon: 24 },
};

// Okragly button z lucide ikona. Tap area ≥44pt dla size `md` i `lg`
// (a11y guidelines). `showDot` renderuje pomaranczowa kropke w prawym gornym rogu
// (np. bell z nieprzeczytana notyfikacja).
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  size = 'md',
  variant = 'default',
  showDot = false,
  bgClassName,
  iconColor = '#1E1B4B',
}: IconButtonProps) {
  const sizing = SIZE_TO_CLASSES[size];
  const bg =
    bgClassName ??
    (variant === 'ghost' ? 'bg-transparent' : 'bg-white dark:bg-dark-card');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={`${sizing.wrapper} ${bg} items-center justify-center rounded-pill`}>
      <View>
        <Icon size={sizing.icon} color={iconColor} />
        {showDot ? (
          <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-pill border border-white bg-orange dark:border-dark-card" />
        ) : null}
      </View>
    </Pressable>
  );
}
