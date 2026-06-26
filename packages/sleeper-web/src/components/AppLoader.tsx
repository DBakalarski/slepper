import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { COLORS } from '@/lib/colors';
import { Moon } from '@/lib/icons';

// Pelnoekranowy loader na czas auth bootstrap (status === 'loading').
// Wizualnie identyczny z inline splashem w `public/index.html` -> przejscie
// HTML splash -> React jest bezszwowe (zero blank-gap, zero skoku ekranu).
// "Oddychajacy ksiezyc" — spokojny, pasuje do appki o snie (nie spinner).
export function AppLoader() {
  const isDark = useEffectiveTheme() === 'dark';
  const color = isDark ? COLORS.cream : COLORS.navy;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const moonStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + progress.value * 0.45,
    transform: [{ scale: 1 + progress.value * 0.08 }],
  }));

  return (
    <View className="flex-1 items-center justify-center bg-cream dark:bg-dark-bg" style={{ gap: 18 }}>
      <Animated.View style={moonStyle}>
        <Moon size={56} color={color} strokeWidth={2} />
      </Animated.View>
      <Text style={{ fontSize: 20, fontWeight: '600', letterSpacing: 1.6, color, opacity: 0.85 }}>
        Sleeper
      </Text>
    </View>
  );
}
