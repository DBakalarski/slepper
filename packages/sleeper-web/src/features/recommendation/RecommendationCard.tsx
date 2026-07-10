import { Text, View } from 'react-native';
import type { Recommendation } from 'sleeper-machine';

import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import type { SleepSession } from '@/features/sessions/hooks';

import { RecommendationListView } from './components/RecommendationListView';
import { RecommendationTimelineView } from './components/RecommendationTimelineView';
import { useRecommendationViewStore, type RecommendationView } from './useRecommendationViewStore';

interface RecommendationCardProps {
  readonly recommendation: Recommendation | null;
  // Sesje dzisiejsze (app tz) — zrodlo dla DayTimeline i day-forecast. Zakres
  // pokrywa poranny ogon nocy z wczoraj (fetchSessionsInRange filtruje przez
  // overlap z oknem, nie tylko `start_at`), wiec to ten sam zbior co karta
  // "Sesje dzisiaj" na home — bez nowego query.
  readonly sessions: readonly SleepSession[];
  readonly now: Date;
  readonly birthDate: Date;
  // `child.preferred_wake_time !== null` — do noty o defaultowej pobudce 07:00.
  readonly hasPreferredWakeTime: boolean;
}

const VIEW_OPTIONS: SegmentOption<RecommendationView>[] = [
  { value: 'timeline', label: 'Oś' },
  { value: 'list', label: 'Lista' },
];

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'Mała pewność',
  medium: 'Średnia pewność',
  high: 'Wysoka pewność',
};

const CONFIDENCE_DOT: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-orange',
  medium: 'bg-purple',
  high: 'bg-navy',
};

// Karta rekomendacji — cienki orchestrator: naglowek (confidence) +
// przelacznik widoku (persystowany w useRecommendationViewStore) + delegacja
// do RecommendationListView / RecommendationTimelineView. Stan ladowania:
// karta zwraca `null` przy braku rekomendacji (bez skeletonu — decyzja
// odroczona, patrz raport Taska 5).
export function RecommendationCard({
  recommendation,
  sessions,
  now,
  birthDate,
  hasPreferredWakeTime,
}: RecommendationCardProps) {
  const view = useRecommendationViewStore((s) => s.view);
  const setView = useRecommendationViewStore((s) => s.setView);

  if (!recommendation) return null;

  return (
    <View className="rounded-card bg-white p-5 shadow-card dark:bg-dark-card">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Rekomendacja
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-pill ${CONFIDENCE_DOT[recommendation.confidence]}`} />
          <Text className="text-xs text-text-muted">
            {CONFIDENCE_LABEL[recommendation.confidence]}
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      </View>

      <View className="mt-4">
        {view === 'timeline' ? (
          <RecommendationTimelineView
            recommendation={recommendation}
            sessions={sessions}
            now={now}
            birthDate={birthDate}
            hasPreferredWakeTime={hasPreferredWakeTime}
          />
        ) : (
          <RecommendationListView recommendation={recommendation} sessions={sessions} />
        )}
      </View>
    </View>
  );
}
