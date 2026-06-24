import { Text, View } from 'react-native';

import type { DailySleep } from '@/lib/sleep-aggregation';

interface SleepBarChartProps {
  series: DailySleep[];
  normMaxHours: number;
}

const CHART_HEIGHT = 130;
const MS_PER_HOUR = 60 * 60 * 1000;

// Etykieta osi X = dzien miesiaca z dayKey ('YYYY-MM-DD'). Sparse dla dluzszych
// zakresow, zeby nie tloczyc (7d -> kazdy, 30d -> co ~5).
function dayOfMonth(dayKey: string): string {
  return String(Number(dayKey.slice(8, 10)));
}

// Prosty wykres slupkowy snu/dobe (slupki = View, zero zaleznosci) z pozioma
// linia normy (gorna granica normy snu). Wysokosc slupka proporcjonalna do
// max(norma, najwyzszy slupek), zeby linia normy zawsze miescila sie w kadrze.
export function SleepBarChart({ series, normMaxHours }: SleepBarChartProps) {
  const normMaxMs = normMaxHours * MS_PER_HOUR;
  const maxSeriesMs = series.reduce((max, day) => Math.max(max, day.totalSleepMs), 0);
  const scaleMaxMs = Math.max(normMaxMs, maxSeriesMs, 1);
  const normLineBottom = (normMaxMs / scaleMaxMs) * CHART_HEIGHT;

  const labelStep = Math.ceil(series.length / 7);

  return (
    <View>
      <View style={{ height: CHART_HEIGHT }} className="relative">
        {/* Linia normy */}
        <View
          className="absolute inset-x-0 flex-row items-center justify-end"
          style={{ bottom: normLineBottom }}
        >
          <View className="h-px flex-1 bg-success/50" />
          <Text className="ml-1 text-[10px] text-success">norma {normMaxHours}g</Text>
        </View>
        {/* Slupki */}
        <View className="absolute inset-0 flex-row items-end gap-1">
          {series.map((day) => {
            const ratio = day.totalSleepMs / scaleMaxMs;
            const heightPx = Math.max(0, Math.min(1, ratio)) * CHART_HEIGHT;
            return (
              <View
                key={day.dayKey}
                className="flex-1 rounded-t bg-purple dark:bg-purple-light"
                style={{ height: heightPx }}
              />
            );
          })}
        </View>
      </View>
      {/* Etykiety dni */}
      <View className="mt-1 flex-row gap-1">
        {series.map((day, index) => (
          <Text
            key={day.dayKey}
            className="flex-1 text-center text-[10px] text-text-muted dark:text-cream/50"
          >
            {index % labelStep === 0 || index === series.length - 1 ? dayOfMonth(day.dayKey) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
