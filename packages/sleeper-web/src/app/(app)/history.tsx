import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { Calendar, List } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionListItem } from '@/components/SessionListItem';
import { Card } from '@/components/ui/Card';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { useChildren } from '@/features/children/hooks';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useCurrentFamily } from '@/features/family/hooks';
import { useSessions, type SleepSession } from '@/features/sessions/hooks';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { COLORS } from '@/lib/colors';
import { extractErrorMessage } from '@/lib/extract-error-message';
import { computeGapsBetweenSessions } from '@/lib/session-gaps';
import {
  dayKeyInAppTz,
  endOfDayInAppTz,
  formatDateNoYear,
  formatDuration,
  startOfDayInAppTz,
  todayDateInAppTz,
} from '@/lib/time';

// Ile dni wstecz pokazujemy. 14 dni = realny scope MVP (typowa retencja
// pamietania snu) bez paginacji.
const RANGE_DAYS = 14;

type ViewMode = 'list' | 'calendar';

// Ekran historii (screen #2, design.md Faza 4). Header + SegmentedControl
// (Lista / Kalendarz), widok Lista grupuje sesje po dniach w Card z
// agregatami i "aktywnościami" miedzy sesjami.
export default function HistoryScreen() {
  const router = useRouter();
  const familyQuery = useCurrentFamily();
  const childrenQuery = useChildren(familyQuery.data?.id ?? null);
  const { activeChildId } = useActiveChild();
  const effectiveTheme = useEffectiveTheme();

  const [view, setView] = useState<ViewMode>('list');

  // Granice okna dla query — ostatnie 14 dni do koncu dzisiaj. Memo stabilizuje
  // referencje (queryKey w useSessions). `useState` na `now` zeby NIE zmienial
  // sie co render — drift kilkugodzinny nie ma znaczenia (lista zostaje swieza
  // po ewentualnym pull-to-refresh / nawigacji), za to stabilny zakres unika
  // refetchu co render.
  const [createdAt] = useState(() => new Date());
  const range = useMemo(() => {
    // TZ-safe: addDays z date-fns operuje na ms, NIE na device tz `setDate`
    // (zgodnie z `learned-patterns.md` TZ-safe time pattern, batch-fix Fazy 6).
    const end = endOfDayInAppTz(createdAt);
    const start = startOfDayInAppTz(addDays(createdAt, -(RANGE_DAYS - 1)));
    return { start, end };
  }, [createdAt]);

  const sessionsQuery = useSessions(activeChildId, range.start, range.end);
  const sessions = sessionsQuery.data ?? [];

  const hasChild = (childrenQuery.data ?? []).length > 0;

  const iconColor = effectiveTheme === 'dark' ? COLORS.cream : COLORS.navy;
  const iconColorMuted = effectiveTheme === 'dark' ? COLORS.purpleLight : COLORS.textMuted;

  const segmentOptions: SegmentOption<ViewMode>[] = useMemo(
    () => [
      {
        value: 'list',
        label: 'Lista',
        icon: <List size={16} color={view === 'list' ? iconColor : iconColorMuted} />,
      },
      {
        value: 'calendar',
        label: 'Kalendarz',
        icon: (
          <Calendar size={16} color={view === 'calendar' ? iconColor : iconColorMuted} />
        ),
      },
    ],
    [view, iconColor, iconColorMuted],
  );

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      {/* TODO Faza future: zamienic ScrollView na FlatList przy >100 sesji.
          RANGE_DAYS=14 ogranicza skale do typowego MVP; refaktor wymaga
          flat-listy z section headers (np. SectionList z dayKey -> sessions). */}
      <ScrollView contentContainerClassName="px-6 py-6 gap-4">
        <View>
          <Text className="font-display text-3xl font-semibold text-navy dark:text-cream">
            Historia
          </Text>
          <Text className="mt-1 text-base text-text-muted dark:text-cream/70">
            Wszystkie sesje snu
          </Text>
        </View>

        <SegmentedControl options={segmentOptions} value={view} onChange={setView} />

        {!hasChild ? (
          <Card>
            <Text className="text-base text-navy dark:text-cream">
              Brak dziecka w rodzinie.
            </Text>
            <Text className="mt-1 text-xs text-text-muted dark:text-cream/70">
              Dodaj dziecko na ekranie Dzisiaj, zeby zobaczyc historie.
            </Text>
          </Card>
        ) : view === 'calendar' ? (
          <CalendarPlaceholder iconColor={iconColorMuted} />
        ) : sessionsQuery.isLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator color={iconColor} />
          </View>
        ) : sessionsQuery.isError ? (
          <Card>
            <Text className="text-base text-navy dark:text-cream">
              Blad ladowania historii.
            </Text>
            <Text className="mt-1 text-xs text-orange">
              {extractErrorMessage(sessionsQuery.error)}
            </Text>
          </Card>
        ) : (
          <GroupedHistoryList
            sessions={sessions}
            onPressSession={(id) =>
              router.push({ pathname: '/session/[id]', params: { id } })
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface CalendarPlaceholderProps {
  iconColor: string;
}

function CalendarPlaceholder({ iconColor }: CalendarPlaceholderProps) {
  return (
    <Card>
      <View className="items-center justify-center gap-3 py-8">
        <Calendar size={36} color={iconColor} />
        <Text className="text-base text-text-muted dark:text-cream/70">
          Widok kalendarza wkrótce
        </Text>
      </View>
    </Card>
  );
}

interface DayGroup {
  dayKey: string;
  title: string;
  sessions: SleepSession[];
  totalMs: number;
}

// Polska nazwa "Dzisiaj" / "Wczoraj" / data po polsku (np. "Piatek, 22 maja").
// Implementacja prosta: dayKey === today/yesterday → label specjalny, w pozostalych
// uzywamy istniejacego `formatDateNoYear` (DD.MM) z time.ts. Brak date-fns/locale
// polskiego — unikamy nowej zaleznosci, "Piatek, 22 maja" wymagaloby `pl` locale.
// MVP: DD.MM dla starszych dni (pattern z poprzedniej implementacji history.tsx).
function dayTitleFor(dayKey: string, now: Date): string {
  const todayKey = todayDateInAppTz(now);
  if (dayKey === todayKey) return 'Dzisiaj';

  const yesterday = addDays(now, -1);
  const yesterdayKey = todayDateInAppTz(yesterday);
  if (dayKey === yesterdayKey) return 'Wczoraj';

  // Reprezentatywny instant w samym srodku dnia (12:00 UTC) — formatter
  // konwertuje to do app tz i wypisze DD.MM.
  return formatDateNoYear(new Date(`${dayKey}T12:00:00Z`));
}

function groupByDay(sessions: SleepSession[], now: Date): DayGroup[] {
  // Grupowanie wg klucza dnia w app tz. useSessions zwraca posortowane desc po
  // start_at — zachowujemy ta kolejnosc dni (najnowszy najpierw).
  const groups: Record<string, SleepSession[]> = {};
  const order: string[] = [];
  for (const s of sessions) {
    const key = dayKeyInAppTz(new Date(s.start_at));
    if (!(key in groups)) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(s);
  }
  return order.map((key) => {
    const daySessions = groups[key];
    const totalMs = daySessions.reduce((acc, s) => {
      if (!s.end_at) return acc; // sesja w toku — nie wliczamy do agregatu
      return acc + (new Date(s.end_at).getTime() - new Date(s.start_at).getTime());
    }, 0);
    return {
      dayKey: key,
      title: dayTitleFor(key, now),
      sessions: daySessions,
      totalMs,
    };
  });
}

interface GroupedHistoryListProps {
  sessions: SleepSession[];
  onPressSession: (id: string) => void;
}

function GroupedHistoryList({ sessions, onPressSession }: GroupedHistoryListProps) {
  const now = useMemo(() => new Date(), []);
  const groups = useMemo(() => groupByDay(sessions, now), [sessions, now]);

  if (groups.length === 0) {
    return (
      <Card>
        <Text className="text-base text-navy dark:text-cream">
          Brak sesji w historii.
        </Text>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {groups.map((group) => (
        <DayGroupSection
          key={group.dayKey}
          group={group}
          onPressSession={onPressSession}
        />
      ))}
    </View>
  );
}

interface DayGroupSectionProps {
  group: DayGroup;
  onPressSession: (id: string) => void;
}

function DayGroupSection({ group, onPressSession }: DayGroupSectionProps) {
  // Sortuj rosnaco (chronologicznie) wewnatrz dnia — najwczesniejsza u gory,
  // zeby gapy "aktywnosci" mialy sens kierunkowy (prev.end → next.start).
  const orderedSessions = useMemo(() => {
    return [...group.sessions].sort((a, b) => {
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
  }, [group.sessions]);

  const gapMap = useMemo(() => {
    return computeGapsBetweenSessions(orderedSessions);
  }, [orderedSessions]);

  const sessionCount = orderedSessions.length;

  return (
    <View className="gap-2">
      <View className="flex-row items-end justify-between px-1">
        <Text className="font-display text-base font-semibold text-navy dark:text-cream">
          {group.title}
        </Text>
        <Text className="text-xs text-text-muted dark:text-cream/70">
          {formatDuration(group.totalMs)} · {sessionCount}{' '}
          {sessionCount === 1 ? 'sesja' : 'sesji'}
        </Text>
      </View>
      <Card className="py-0">
        {orderedSessions.map((session, index) => (
          <View
            key={session.id}
            className={
              index === 0
                ? ''
                : 'border-t border-cream dark:border-dark-surface'
            }>
            <SessionListItem
              session={session}
              gapBeforeMs={gapMap.get(session.id)}
              onPress={() => onPressSession(session.id)}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}
