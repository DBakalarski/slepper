import { Text, View } from 'react-native';

import { tagLabel } from '@/features/sessions/tags';
import type { TagCorrelation } from '@/lib/sleep-aggregation';
import { formatDuration } from '@/lib/time';

interface SleepTagCorrelationProps {
  correlations: TagCorrelation[];
}

function deltaText(deltaMs: number): { label: string; className: string } {
  if (deltaMs < 0) {
    return { label: `krócej o ${formatDuration(-deltaMs)}`, className: 'text-red-500' };
  }
  if (deltaMs > 0) {
    return { label: `dłużej o ${formatDuration(deltaMs)}`, className: 'text-success' };
  }
  return { label: 'bez różnicy', className: 'text-text-muted dark:text-cream/60' };
}

// Lista korelacji tag -> sredni dzienny sen (z tagiem vs bez). Render tylko gdy
// `correlations` niepuste (decyzja w ekranie).
export function SleepTagCorrelation({ correlations }: SleepTagCorrelationProps) {
  return (
    <View className="gap-3">
      {correlations.map((correlation) => {
        const delta = deltaText(correlation.deltaMs);
        return (
          <View key={correlation.slug} className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-navy dark:text-cream">
                {tagLabel(correlation.slug)}
              </Text>
              <Text className="text-xs text-text-muted dark:text-cream/60">
                {correlation.taggedDays} {correlation.taggedDays === 1 ? 'dzień' : 'dni'} z tagiem
              </Text>
            </View>
            <View className="items-end">
              <Text
                className="text-sm text-navy dark:text-cream"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatDuration(correlation.avgTaggedMs)} vs {formatDuration(correlation.avgUntaggedMs)}
              </Text>
              <Text className={`text-xs font-semibold ${delta.className}`}>{delta.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
