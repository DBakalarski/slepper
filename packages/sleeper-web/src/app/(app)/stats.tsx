import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useChildren, type Child } from '@/features/children/hooks';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useCurrentFamily } from '@/features/family/hooks';
import { SleepBarChart } from '@/features/stats/components/SleepBarChart';
import { SleepFormBadge } from '@/features/stats/components/SleepFormBadge';
import { useSleepStats, type StatsRange } from '@/features/stats/useSleepStats';
import { COLORS } from '@/lib/colors';
import { sleepForm } from '@/lib/sleep-aggregation';
import { getNormForChild } from '@/lib/sleep-norms';
import { avgSleepPercentOfNorm } from '@/lib/sleep-stats';
import { formatClockMinutes, formatDuration } from '@/lib/time';

const MS_PER_HOUR = 60 * 60 * 1000;

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '7', label: '7 dni' },
  { value: '14', label: '14 dni' },
  { value: '30', label: '30 dni' },
];

interface StatRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

function StatRow({ label, value, isLast = false }: StatRowProps) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? '' : 'border-b border-cream dark:border-dark-surface'
      }`}
    >
      <Text className="text-base text-text-muted dark:text-cream/70">{label}</Text>
      <Text
        className="text-base font-semibold text-navy dark:text-cream"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatsContent({ child }: { child: Child }) {
  const [range, setRange] = useState<StatsRange>(7);
  const birthDate = useMemo(() => new Date(child.birth_date), [child.birth_date]);
  const norm = useMemo(() => getNormForChild(birthDate), [birthDate]);

  const stats = useSleepStats(child.id, range);

  const form = sleepForm(stats.avgSleepMsLast3 / MS_PER_HOUR, norm);
  const percentOfNorm = avgSleepPercentOfNorm(stats.avgSleepMs, norm.maxHours);

  return (
    <ScrollView contentContainerClassName="px-6 py-6 gap-6">
      <View>
        <Text className="text-3xl font-semibold text-navy dark:text-cream">Statystyki</Text>
        <Text className="mt-1 text-base text-text-muted dark:text-cream/60">
          Trendy snu — {child.name}
        </Text>
      </View>

      <SegmentedControl
        options={RANGE_OPTIONS}
        value={String(range)}
        onChange={(value) => setRange(Number(value) as StatsRange)}
      />

      {stats.isError ? (
        <Card>
          <Text className="text-base text-red-500">
            Nie udało się wczytać statystyk. Spróbuj ponownie.
          </Text>
        </Card>
      ) : stats.isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={COLORS.navy} />
        </View>
      ) : stats.daysCovered === 0 ? (
        <Card>
          <Text className="text-base font-semibold text-navy dark:text-cream">
            Brak danych w tym zakresie
          </Text>
          <Text className="mt-1 text-sm text-text-muted dark:text-cream/60">
            Zacznij śledzić sen — wykresy i trendy pojawią się tutaj po pełnych dniach.
          </Text>
        </Card>
      ) : (
        <>
          <SleepFormBadge form={form} />

          <Card>
            <Text className="mb-3 text-base font-semibold text-navy dark:text-cream">
              Sen na dobę
            </Text>
            <SleepBarChart series={stats.series} normMaxHours={norm.maxHours} />
          </Card>

          <Card>
            <StatRow
              label="Średni sen / dobę"
              value={`${formatDuration(stats.avgSleepMs)} (${percentOfNorm}% normy)`}
            />
            <StatRow label="Średnio drzemek / dobę" value={stats.avgNapCount.toFixed(1)} />
            {stats.regularity ? (
              <StatRow
                label="Regularność zasypiania"
                value={`${formatClockMinutes(stats.regularity.meanMinutes)} ±${stats.regularity.stdDevMinutes} min`}
              />
            ) : null}
            {stats.wakeRange ? (
              <StatRow
                label="Poranna pobudka"
                value={`${formatClockMinutes(stats.wakeRange.earliestMinutes)}–${formatClockMinutes(stats.wakeRange.latestMinutes)}`}
                isLast
              />
            ) : null}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

export default function StatsScreen() {
  const familyQuery = useCurrentFamily();
  const familyId = familyQuery.data?.id ?? null;
  const childrenQuery = useChildren(familyId);
  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);
  const { activeChildId } = useActiveChild();
  const activeChild = useMemo<Child | null>(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  );

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      {familyQuery.isLoading || childrenQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.navy} />
        </View>
      ) : activeChild ? (
        <StatsContent child={activeChild} />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-semibold text-navy dark:text-cream">Statystyki</Text>
          <Text className="mt-2 text-center text-base text-text-muted dark:text-cream/60">
            Dodaj dziecko w zakładce Profil, aby zobaczyć statystyki snu.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
