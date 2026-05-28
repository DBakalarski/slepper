import { useRouter } from 'expo-router';
import { ChevronRight, Moon, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { SleepSession } from '@/features/sessions/hooks';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { formatDuration, formatTime } from '@/lib/time';

interface SessionListItemProps {
  session: SleepSession;
  // Domyslnie tap nawiguje do edycji sesji. Niektore konteksty (np. lista
  // read-only) moga to wylaczyc — backward-compat z usage'em w `index.tsx`.
  disableNavigation?: boolean;
  // Gap aktywnosci PRZED ta sesja (ms) — renderowany jako linia "aktywność Xg Ym"
  // nad itemem. Default: undefined (renderuje sie bez gapu, np. na ekranie Dzisiaj).
  gapBeforeMs?: number;
  // Optional override nawigacji (np. ekran Historia chce uzyc router.push z
  // konkretnym pathname). Gdy podane — uzywane zamiast default `/session/[id]`.
  onPress?: () => void;
}

const TYPE_LABELS: Record<SleepSession['type'], string> = {
  nap: 'Drzemka',
  night_sleep: 'Sen nocny',
};

// Paleta dla chipa ikony (Sun = drzemka pomaranczowa, Moon = sen fioletowy).
// HEX z tailwind tokens — lucide nie konsumuje className cross-platform (pattern
// ustalony w Fazach 2/3, np. HomeHeader/QuickActions).
const NAP_ICON_COLOR = '#E08B6F';
const NIGHT_ICON_COLOR = '#7C6BAD';
const CHEVRON_LIGHT = '#6B6580';
const CHEVRON_DARK = '#B8A8D9';

// Pojedynczy wiersz historii sesji (screen #2, design.md Faza 4).
// - Lewo: okragly chip z ikona Sun/Moon
// - Srodek: zakres "HH:MM — HH:MM" (lub "HH:MM — trwa" dla aktywnej) + linia
//   "Drzemka · 1g 11m" + kropka statusu
// - Prawo: ChevronRight (caly row Pressable → nawigacja na `/session/[id]`)
// - Nad itemem (gdy gapBeforeMs > 0): "aktywność Xg Ym" w male czcionce
//   text-orange-dark.
export function SessionListItem({
  session,
  disableNavigation = false,
  gapBeforeMs,
  onPress,
}: SessionListItemProps) {
  const router = useRouter();
  const effectiveTheme = useEffectiveTheme();

  const start = new Date(session.start_at);
  const end = session.end_at ? new Date(session.end_at) : null;
  const isActive = end === null;
  const durationMs = end ? end.getTime() - start.getTime() : 0;

  const isNap = session.type === 'nap';
  const iconColor = isNap ? NAP_ICON_COLOR : NIGHT_ICON_COLOR;
  const chipClassName = isNap
    ? 'bg-orange-soft dark:bg-orange/30'
    : 'bg-purple-soft dark:bg-purple/30';
  const dotClassName = isNap ? 'bg-orange' : 'bg-purple';
  const chevronColor = effectiveTheme === 'dark' ? CHEVRON_DARK : CHEVRON_LIGHT;
  const IconComponent = isNap ? Sun : Moon;

  const rangeLabel = `${formatTime(start)} — ${end ? formatTime(end) : 'trwa'}`;
  const subtitleSuffix = isActive ? 'trwa' : formatDuration(durationMs);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (disableNavigation) return;
    router.push({ pathname: '/session/[id]', params: { id: session.id } });
  };

  const isPressable = Boolean(onPress) || !disableNavigation;
  const showGap = typeof gapBeforeMs === 'number' && gapBeforeMs > 0;

  const row = (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className={`h-11 w-11 items-center justify-center rounded-pill ${chipClassName}`}>
        <IconComponent size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="font-display text-lg font-semibold text-navy dark:text-cream">
          {rangeLabel}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          <View className={`h-1.5 w-1.5 rounded-pill ${dotClassName}`} />
          <Text className="text-xs text-text-muted dark:text-cream/70">
            {TYPE_LABELS[session.type]} · {subtitleSuffix}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} color={chevronColor} />
    </View>
  );

  const content = (
    <View>
      {showGap ? (
        <View className="flex-row items-center gap-2 py-1 pl-14">
          <View className="h-3 w-px bg-orange/40" />
          <Text className="text-xs text-orange">
            aktywność {formatDuration(gapBeforeMs)}
          </Text>
        </View>
      ) : null}
      {row}
    </View>
  );

  if (!isPressable) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Otworz sesje ${TYPE_LABELS[session.type]} ${rangeLabel}`}
      onPress={handlePress}>
      {content}
    </Pressable>
  );
}
