import { Text, View } from 'react-native';

import type { SleepForm } from '@/lib/sleep-aggregation';

interface SleepFormBadgeProps {
  form: SleepForm;
}

const FORM_META: Record<SleepForm, { label: string; dot: string; text: string }> = {
  good: { label: 'dobra', dot: 'bg-success', text: 'text-success' },
  ok: { label: 'ok', dot: 'bg-orange', text: 'text-orange' },
  poor: { label: 'słaba', dot: 'bg-red-500', text: 'text-red-500' },
};

// Jakosciowa „forma snu" — kolorowa kropka + label (dobra / ok / słaba).
export function SleepFormBadge({ form }: SleepFormBadgeProps) {
  const meta = FORM_META[form];
  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityRole="text"
      accessibilityLabel={`Forma snu: ${meta.label}`}
    >
      <Text className="text-sm text-text-muted dark:text-cream/60">Forma snu</Text>
      <View className={`h-2.5 w-2.5 rounded-pill ${meta.dot}`} />
      <Text className={`text-sm font-semibold ${meta.text}`}>{meta.label}</Text>
    </View>
  );
}
