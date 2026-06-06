import { View } from 'react-native';

export interface ProgressSegment {
  // 0..1 — frakcja calego paska. Suma segmentow > 1 jest renormalizowana
  // proporcjonalnie. Suma < 1 zostawia puste miejsce po prawej.
  value: number;
  className: string;
}

interface ProgressBarStackedProps {
  segments: ProgressSegment[];
  trackClassName?: string;
  heightClassName?: string;
}

function normalize(segments: ProgressSegment[]): ProgressSegment[] {
  const sum = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  if (sum <= 1) return segments.map((s) => ({ ...s, value: Math.max(0, s.value) }));
  return segments.map((s) => ({ ...s, value: Math.max(0, s.value) / sum }));
}

// Stacked progress bar z kilku segmentow obok siebie (Sen nocny / Drzemki /
// Aktywnosc na karcie DZISIAJ). Sumarycznie do 100% szerokosci, segmenty
// renderowane sa flexbox-em z proporcjonalnym `flex`.
export function ProgressBarStacked({
  segments,
  trackClassName = 'bg-cream dark:bg-dark-surface',
  heightClassName = 'h-2',
}: ProgressBarStackedProps) {
  const normalized = normalize(segments);
  return (
    <View className={`${trackClassName} ${heightClassName} w-full flex-row overflow-hidden rounded-pill`}>
      {normalized.map((segment, idx) => (
        <View
          key={`${segment.className}-${idx}`}
          className={`${segment.className} h-full`}
          style={{ flex: segment.value }}
        />
      ))}
    </View>
  );
}
