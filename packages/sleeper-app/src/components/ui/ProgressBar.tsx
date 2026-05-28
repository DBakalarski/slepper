import { View } from 'react-native';

interface ProgressBarProps {
  // 0..1 — wartosci spoza zakresu sa clampowane.
  value: number;
  // Override koloru wypelnienia. Domyslnie purple.
  tintClassName?: string;
  trackClassName?: string;
  // Wysokosc paska — domyslnie 8px (h-2).
  heightClassName?: string;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// Plaski rounded progress bar. Pasek wypelnia sie od lewej. Uzywany w
// `ActiveWindowCard`, karcie Profilu (avgSleep7d / norm). Nie animuje wartosci
// (animacja byloby fragile — wartosci aktualizuja sie co 1min lub na zmiane).
export function ProgressBar({
  value,
  tintClassName = 'bg-purple dark:bg-purple-light',
  trackClassName = 'bg-cream dark:bg-dark-surface',
  heightClassName = 'h-2',
}: ProgressBarProps) {
  const pct = clamp01(value) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      className={`${trackClassName} ${heightClassName} w-full overflow-hidden rounded-pill`}>
      <View className={`${tintClassName} h-full rounded-pill`} style={{ width: `${pct}%` }} />
    </View>
  );
}
