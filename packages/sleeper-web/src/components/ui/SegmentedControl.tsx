import { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  // Opcjonalny icon prefix (np. List/Calendar). Renderowany przed labelem.
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Czas animacji jezdzika — default 200ms (Faza 6 polish).
  durationMs?: number;
}

// iOS-style pill segmented control. Reanimated `withTiming` (NIE withSpring —
// na Android zacina sie wg `ui-redesign-kontekst.md`). Aktywne tlo to animowany
// View pod opcjami; przesuwa sie po `value` change. Layout szerokosci segmentu
// wymierza pierwszy onLayout (zaklada rowne szerokosci).
//
// Generyk T extends string — dla type-safe `value` ('list' | 'calendar' itp.).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  durationMs = 200,
}: SegmentedControlProps<T>) {
  const indicatorX = useSharedValue(0);
  const segmentWidth = useSharedValue(0);

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  useEffect(() => {
    indicatorX.value = withTiming(selectedIndex * segmentWidth.value, {
      duration: durationMs,
    });
  }, [selectedIndex, segmentWidth, indicatorX, durationMs]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width / options.length;
    if (width === segmentWidth.value) return;
    segmentWidth.value = width;
    // Initial position bez animacji.
    indicatorX.value = selectedIndex * width;
  };

  const animatedIndicator = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth.value,
  }));

  return (
    <View
      onLayout={handleContainerLayout}
      className="relative flex-row rounded-pill bg-cream p-1 dark:bg-dark-surface">
      <Animated.View
        pointerEvents="none"
        style={animatedIndicator}
        className="absolute top-1 bottom-1 left-1 rounded-pill bg-white shadow-card dark:bg-dark-card"
      />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            className="flex-1 flex-row items-center justify-center gap-2 py-2">
            {option.icon}
            <Text
              className={`text-sm font-semibold ${isActive ? 'text-navy dark:text-cream' : 'text-text-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
