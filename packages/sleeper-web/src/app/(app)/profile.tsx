import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Moon, Settings as SettingsIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useChildren, type Child } from '@/features/children/hooks';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useCurrentFamily } from '@/features/family/hooks';
import { ThemeModeBottomSheet } from '@/features/settings/ThemeModeBottomSheet';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { useThemeStore } from '@/features/settings/useThemeStore';
import { formatChildAge } from '@/lib/child-age';
import { COLORS } from '@/lib/colors';
import { getNormForChild } from '@/lib/sleep-norms';
import {
  avgSleepPercentOfNorm,
  avgSleepProgressRatio,
  useAvgSleep7d,
} from '@/lib/sleep-stats';
import { formatDuration } from '@/lib/time';

// Profil — Faza 5 ui-redesign. Karta aktywnego dziecka (Avatar + wiek + norma
// snu + srednia 7d), sekcja SKROTY (Przypomnienia placeholder + Tryb ciemny
// tri-state). Sekcja Rodzina + Wyloguj przeniesione do `/settings` (gear icon).

const SUCCESS_THRESHOLD_PCT = 85;

function modeLabel(mode: 'system' | 'light' | 'dark'): string {
  if (mode === 'system') return 'System';
  if (mode === 'light') return 'Jasny';
  return 'Ciemny';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const family = familyQuery.data ?? null;
  const familyId = family?.id ?? null;
  const childrenQuery = useChildren(familyId);
  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);
  const { activeChildId } = useActiveChild();
  const activeChild = useMemo<Child | null>(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  );

  const effectiveTheme = useEffectiveTheme();
  const themeMode = useThemeStore((s) => s.mode);
  const [themeSheetVisible, setThemeSheetVisible] = useState(false);

  const isDark = effectiveTheme === 'dark';
  const gearIconColor = isDark ? COLORS.cream : COLORS.navy;
  // chevronColor wyciagniete z `ShortcutRow` (P3 Fazy 6: per-row
  // `useEffectiveTheme()` powodowal duplikujace sie subskrypcje).
  const chevronColor = isDark ? COLORS.purpleLight : COLORS.textMuted;

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-6 gap-6">
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-semibold text-navy dark:text-cream">Profil</Text>
            <Text className="mt-1 text-base text-text-muted dark:text-cream/60">
              Dzieci i ustawienia
            </Text>
          </View>
          <IconButton
            icon={SettingsIcon}
            accessibilityLabel="Ustawienia"
            onPress={() => router.push('/settings')}
            iconColor={gearIconColor}
          />
        </View>

        {/* Karta aktywnego dziecka */}
        {familyQuery.isLoading || childrenQuery.isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={COLORS.navy} />
          </View>
        ) : activeChild ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edytuj dane dziecka ${activeChild.name}`}
            onPress={() => router.push(`/child/${activeChild.id}/edit`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <ActiveChildCard child={activeChild} />
          </Pressable>
        ) : (
          <NoActiveChildCard email={user?.email ?? null} />
        )}

        {/* Sekcja SKROTY */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Skroty
          </Text>
          <View className="rounded-card bg-white shadow-card dark:bg-dark-card">
            <ShortcutRow
              icon={Bell}
              iconBgClassName="bg-orange-soft dark:bg-orange/20"
              iconColor={COLORS.orange}
              chevronColor={chevronColor}
              label="Przypomnienia"
              value="Wlaczone"
              onPress={() => {
                // Placeholder — flow `expo-notifications` out of scope redesignu.
              }}
              isLast={false}
            />
            <ShortcutRow
              icon={Moon}
              iconBgClassName="bg-purple-soft dark:bg-purple/30"
              iconColor={COLORS.purple}
              chevronColor={chevronColor}
              label="Tryb ciemny"
              value={modeLabel(themeMode)}
              onPress={() => setThemeSheetVisible(true)}
              isLast
            />
          </View>
        </View>
      </ScrollView>

      <ThemeModeBottomSheet
        visible={themeSheetVisible}
        onClose={() => setThemeSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

interface ActiveChildCardProps {
  child: Child;
}

function ActiveChildCard({ child }: ActiveChildCardProps) {
  const birthDate = useMemo(() => new Date(child.birth_date), [child.birth_date]);
  const norm = useMemo(() => getNormForChild(birthDate), [birthDate]);
  const { avgMs, daysCovered } = useAvgSleep7d(child.id);

  const progress = avgSleepProgressRatio(avgMs, norm.maxHours);
  const percentOfNorm = avgSleepPercentOfNorm(avgMs, norm.maxHours);
  const isWithinNorm = percentOfNorm >= SUCCESS_THRESHOLD_PCT;

  // Karta z solid `bg-purple-light` (decyzja Fazy 0 — SKIP gradient).
  // Tekst: navy w light, cream w dark (na fioletowym tle WCAG AA OK dla navy).
  return (
    <View className="rounded-card bg-purple-light shadow-card p-5 gap-4 dark:bg-dark-surface">
      <View className="flex-row items-center gap-4">
        <Avatar
          name={child.name}
          color={child.avatar_color}
          size="lg"
          ringClassName="border-2 border-white dark:border-cream/30"
        />
        <View className="flex-1">
          <Text className="font-display text-2xl font-bold text-navy dark:text-cream">
            {child.name}
          </Text>
          <Text className="mt-1 text-base text-navy/70 dark:text-cream/70">
            {formatChildAge(child.birth_date)}
          </Text>
        </View>
      </View>

      {/* Zagniezdzona biala karta z norma snu */}
      <View className="rounded-card bg-white p-4 gap-2 dark:bg-dark-card">
        <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Norma snu dla wieku
        </Text>
        <Text className="text-2xl font-bold text-navy dark:text-cream">
          {norm.minHours}-{norm.maxHours}g/dobe
        </Text>
        <View className="mt-2">
          <ProgressBar
            value={progress}
            tintClassName={isWithinNorm ? 'bg-success' : 'bg-orange'}
          />
        </View>
        <Text className="mt-1 text-xs text-text-muted dark:text-cream/60">
          {daysCovered > 0
            ? `Srednio ${formatDuration(avgMs)} ostatnie ${daysCovered} ${daysCovered === 1 ? 'dzien' : 'dni'} · `
            : 'Brak danych z ostatnich 7 dni · '}
          <Text
            className={
              isWithinNorm ? 'font-semibold text-success' : 'font-semibold text-orange'
            }>
            {percentOfNorm}% normy
          </Text>
        </Text>
      </View>
    </View>
  );
}

interface NoActiveChildCardProps {
  email: string | null;
}

function NoActiveChildCard({ email }: NoActiveChildCardProps) {
  return (
    <View className="rounded-card bg-white p-5 shadow-card dark:bg-dark-card">
      <Text className="text-base font-semibold text-navy dark:text-cream">
        Brak aktywnego dziecka
      </Text>
      <Text className="mt-1 text-sm text-text-muted dark:text-cream/60">
        Aby zobaczyc karte profilu, dodaj dziecko z ekranu Dzisiaj lub przyjmij
        zaproszenie do rodziny.
      </Text>
      {email ? (
        <Text className="mt-3 text-xs text-text-muted dark:text-cream/50">
          Zalogowany: {email}
        </Text>
      ) : null}
    </View>
  );
}

interface ShortcutRowProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBgClassName: string;
  iconColor: string;
  // chevronColor jest propsem od rodzica — zeby nie wolac `useEffectiveTheme()`
  // per row (P3 batch-fix Fazy 6, redukcja subskrypcji theme store o N rows).
  chevronColor: string;
  label: string;
  value: string;
  onPress: () => void;
  isLast: boolean;
}

function ShortcutRow({
  icon: Icon,
  iconBgClassName,
  iconColor,
  chevronColor,
  label,
  value,
  onPress,
  isLast,
}: ShortcutRowProps) {
  const separator = isLast ? '' : 'border-b border-cream dark:border-dark-surface';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className={`flex-row items-center px-4 py-4 ${separator}`}>
      <View
        className={`w-10 h-10 items-center justify-center rounded-pill ${iconBgClassName}`}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text className="ml-3 flex-1 text-base text-navy dark:text-cream">{label}</Text>
      <Text className="text-sm text-text-muted dark:text-cream/60 mr-2">{value}</Text>
      <ChevronRight size={20} color={chevronColor} />
    </Pressable>
  );
}
