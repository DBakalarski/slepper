import { Bell, ChevronDown } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import type { Child } from '@/features/children/hooks';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { COLORS } from '@/lib/colors';
import { useNotificationDot } from '@/lib/useNotificationDot';

interface HomeHeaderProps {
  child: Child;
  // Opcjonalny override "teraz" dla testow / Storybooka — pure greeting calc.
  now?: Date;
}

// Greeting zalezny od godziny w app tz. Granice z design.md:
// 5-11:59 "Dzień dobry", 12-17:59 "Dobre popołudnie", 18-22:59 "Dobry wieczór",
// 23-4:59 "Dobranoc". getHours() jest w device tz — dla MVP single-user solo dev
// w PL akceptowalne; jesli kiedys trafimy poza Warsaw, wyciagnac do helpera w
// lib/time.ts (toZonedTime + getHours).
function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Dzień dobry';
  if (hour >= 12 && hour < 18) return 'Dobre popołudnie';
  if (hour >= 18 && hour < 23) return 'Dobry wieczór';
  return 'Dobranoc';
}

// Header ekranu Dzisiaj (screen #1 z design.md): Avatar + greeting + bell.
// chevron-down to visual only (single-child first, brak dropdownu).
export function HomeHeader({ child, now }: HomeHeaderProps) {
  const dotVisible = useNotificationDot();
  const effectiveTheme = useEffectiveTheme();
  const referenceNow = now ?? new Date();
  const greeting = greetingForHour(referenceNow.getHours());
  // ChevronDown z lucide bierze HEX przez prop `color` (nie className) — pattern
  // ustalony w Fazie 2 (TabIcon). Dark navy w light, cream w dark.
  const tintColor = effectiveTheme === 'dark' ? COLORS.cream : COLORS.navy;

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <Avatar name={child.name} color={child.avatar_color} size="md" />
        <View className="flex-row items-center gap-1">
          <Text className="font-display text-base text-text-muted dark:text-cream/70">
            {greeting},{' '}
            <Text className="font-display font-bold text-navy dark:text-cream">
              {child.name}
            </Text>
          </Text>
          <ChevronDown size={18} color={tintColor} />
        </View>
      </View>
      <IconButton
        icon={Bell}
        accessibilityLabel="Powiadomienia"
        showDot={dotVisible}
        iconColor={tintColor}
      />
    </View>
  );
}
