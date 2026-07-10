import type { PlanEntry } from 'sleeper-machine';
import { Text, View } from 'react-native';

import type { SleepSession } from '@/features/sessions/hooks';
import { formatTime, pluralizePL } from '@/lib/time';

import {
  computeDayTimelineGeometry,
  type DayTimelineSegment,
  type DayTimelineSegmentKind,
} from '../day-timeline-segments';

interface DayTimelineProps {
  readonly sessions: readonly SleepSession[];
  readonly plan: readonly PlanEntry[];
  readonly now: Date;
}

const TRACK_HEIGHT = 32;
const HOUR_LABELS = [0, 6, 12, 18, 24];

// Fakty: kolor pelny (spojny z SessionListItem/TodayStatsCard — drzemka
// pomaranczowa, sen nocny fioletowy). Predykcje: ten sam odcien, ale
// polprzezroczysty + obrys (kreskowanie jest kosztowne w RN-web).
const SEGMENT_STYLES: Record<DayTimelineSegmentKind, string> = {
  'fact-nap': 'bg-orange',
  'fact-night': 'bg-purple dark:bg-purple-light',
  'plan-nap': 'bg-orange/25 border border-orange',
  'plan-night': 'bg-purple/25 border border-purple dark:bg-purple-light/20 dark:border-purple-light',
};

// Podsumowanie tekstowe dla a11y ("Rytm dnia: 2 drzemki odbyte, plan:
// drzemka 13:40, sen nocny 19:30"). Plan bierzemy wprost z propsa — kaskada
// kotwicy w silniku juz gwarantuje start >= now (remainingNapsToday).
function buildSummaryLabel(napsFactCount: number, plan: readonly PlanEntry[]): string {
  const factPart = `${napsFactCount} ${pluralizePL(napsFactCount, [
    'drzemka odbyta',
    'drzemki odbyte',
    'drzemek odbytych',
  ])}`;
  if (plan.length === 0) return `Rytm dnia: ${factPart}`;
  const planPart = plan
    .map((entry) => `${entry.type === 'NIGHT' ? 'sen nocny' : 'drzemka'} ${formatTime(entry.plannedStart)}`)
    .join(', ');
  return `Rytm dnia: ${factPart}, plan: ${planPart}`;
}

function segmentKey(segment: DayTimelineSegment): string {
  return `${segment.kind}:${segment.leftPct.toFixed(4)}:${segment.widthPct.toFixed(4)}`;
}

// `dot` = wypelniona kropka (fakty). `bar` = pionowa kreska (znacznik "teraz")
// — celowo odrozniona ksztaltem od `dot`, zeby "Teraz" nie mylilo sie z
// "Drzemka" (oba maja ten sam kolor bg-orange). Review fixy Task 4.
type LegendSwatchShape = 'dot' | 'bar';

function LegendItem({
  swatchClassName,
  label,
  shape = 'dot',
}: {
  swatchClassName: string;
  label: string;
  shape?: LegendSwatchShape;
}) {
  const swatchShapeClassName = shape === 'bar' ? 'h-2.5 w-0.5' : 'h-2 w-2 rounded-pill';
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`${swatchShapeClassName} ${swatchClassName}`} />
      <Text className="text-[11px] text-text-muted dark:text-cream/60">{label}</Text>
    </View>
  );
}

// Reużywalny, read-only pas doby: bloki faktow (<= now) i predykcji (> now),
// znacznik "teraz" i sparse etykiety godzin. Komponent glupi — bez hookow
// danych, bez timera (`now` przychodzi propem). Renderuje sie BEZ wlasnego
// Card wrappera — jedyny konsument (RecommendationTimelineView) osadza go
// wewnatrz chrome'u karty rekomendacji; wlasny Card dawal karte-w-karcie
// (podwojny padding/shadow, zwezona os). Review fix Task 5 (IMPORTANT 1).
export function DayTimeline({ sessions, plan, now }: DayTimelineProps) {
  const geometry = computeDayTimelineGeometry(sessions, plan, now);
  const napsFactCount = geometry.factSegments.filter((s) => s.kind === 'fact-nap').length;
  const summaryLabel = buildSummaryLabel(napsFactCount, plan);
  const allSegments = [...geometry.factSegments, ...geometry.planSegments];

  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Rytm dnia
      </Text>

      <View
        className="mt-3 overflow-hidden rounded-xl bg-cream dark:bg-dark-surface"
        style={{ height: TRACK_HEIGHT }}
        accessibilityRole="image"
        accessibilityLabel={summaryLabel}>
        <View className="relative h-full">
          {allSegments.map((segment) => (
            <View
              key={segmentKey(segment)}
              className={`absolute inset-y-0 ${SEGMENT_STYLES[segment.kind]}`}
              style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }}
            />
          ))}
          <View
            className="absolute inset-y-0 w-0.5 bg-orange"
            style={{ left: `${geometry.nowPct}%` }}
          />
        </View>
      </View>

      <View className="mt-1 flex-row justify-between">
        {HOUR_LABELS.map((hour) => (
          <Text key={hour} className="text-[10px] text-text-muted dark:text-cream/50">
            {hour}
          </Text>
        ))}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
        <LegendItem swatchClassName="bg-purple dark:bg-purple-light" label="Sen nocny" />
        <LegendItem swatchClassName="bg-orange" label="Drzemka" />
        <LegendItem
          swatchClassName="bg-purple/25 border border-purple dark:bg-purple-light/20 dark:border-purple-light"
          label="Plan snu nocnego"
        />
        <LegendItem swatchClassName="bg-orange/25 border border-orange" label="Plan drzemki" />
        <LegendItem swatchClassName="bg-orange" label="Teraz" shape="bar" />
      </View>
    </View>
  );
}
