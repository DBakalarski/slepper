import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { COLORS } from '@/lib/colors';

interface ProgressRingProps {
  // 0..1 — wartosci spoza zakresu sa clampowane.
  value: number;
  // Srednica zewnetrzna w px.
  size: number;
  // Grubosc obreczy w px.
  strokeWidth: number;
  // Opcjonalny tekst w srodku (np. "98%"). Jesli pusty — sam pierscien.
  label?: string;
  // Tailwind/HEX kolory dla toru i wypelnienia. Default: purple-soft (track),
  // purple (progress).
  trackColor?: string;
  progressColor?: string;
  // Klasy dla tekstu w srodku (opcjonalny override).
  labelClassName?: string;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// Kolowy progress ring. Render via react-native-svg (dostepny tranzytywnie
// via `lucide-react-native@1.17` -> `react-native-svg@15.x`).
// Obrocony o -90deg zeby progress zaczynal sie u gory (godzina 12).
export function ProgressRing({
  value,
  size,
  strokeWidth,
  label,
  trackColor = '#E8DEF7',
  progressColor = COLORS.purple,
  labelClassName = 'text-sm font-semibold text-navy dark:text-cream',
}: ProgressRingProps) {
  const clamped = clamp01(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;

  // Fade-in przy mount (Faza 6 polish): 0 → 1 nad 300ms. Reanimated worklet,
  // brak re-rendera, gladko po starcie ekranu.
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 1, now: clamped }}
      style={[{ width: size, height: size }, animatedStyle]}
      className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={dashOffset}
          // Start progress at top (12 o'clock) instead of right (3 o'clock).
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {label ? (
        <Animated.View
          className="absolute inset-0 items-center justify-center"
          style={animatedStyle}>
          <Text className={labelClassName} style={{ fontVariant: ['tabular-nums'] }}>
            {label}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
