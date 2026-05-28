import { Text, View } from 'react-native';

export type BadgeVariant = 'success' | 'neutral' | 'orange';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_TO_CLASSES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'bg-success-soft dark:bg-success/30', text: 'text-success dark:text-success-soft' },
  neutral: { bg: 'bg-cream dark:bg-dark-surface', text: 'text-navy dark:text-cream' },
  orange: { bg: 'bg-orange-soft dark:bg-orange/30', text: 'text-orange dark:text-orange-soft' },
};

// Pill-shape badge (rounded-pill) — pasek statusu np. "Drzemka za ~Xg Ym".
// Warianty matchuja kolory z mockupow.
export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const classes = VARIANT_TO_CLASSES[variant];
  return (
    <View className={`${classes.bg} rounded-pill px-3 py-1`}>
      <Text className={`${classes.text} text-xs font-semibold`}>{label}</Text>
    </View>
  );
}
