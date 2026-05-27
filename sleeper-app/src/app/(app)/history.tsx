import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatePickerField } from '@/components/DatePickerField';
import { SessionListItem } from '@/components/SessionListItem';
import { useChildren } from '@/features/children/hooks';
import { useActiveChild } from '@/features/children/useActiveChild';
import { useCurrentFamily } from '@/features/family/hooks';
import { useSessions, type SleepSession } from '@/features/sessions/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';
import {
  dayKeyInAppTz,
  endOfDayInAppTz,
  formatDateNoYear,
  startOfDayInAppTz,
} from '@/lib/time';

// Ile dni wstecz pokazujemy w "wszystkie sesje". 14 dni = realny scope MVP
// (typowa retencja pamietania snu) bez paginacji.
const ALL_RANGE_DAYS = 14;

type ViewMode = 'day' | 'all';

// Ekran historii. Dwa tryby: konkretny dzien (z pickerem) i ostatnie 14 dni
// pogrupowane po dniu (sekcje SectionList). Brak paginacji — MVP.
export default function HistoryScreen() {
  const familyQuery = useCurrentFamily();
  const childrenQuery = useChildren(familyQuery.data?.id ?? null);
  const { activeChildId } = useActiveChild();

  const [mode, setMode] = useState<ViewMode>('day');
  const [pickedDate, setPickedDate] = useState<Date>(() => new Date());

  // Granice okna dla query — zalezne od trybu. Memo zeby nie generowac
  // nowych Date'ow co render (stabilny queryKey w useSessions).
  const range = useMemo(() => {
    if (mode === 'day') {
      const start = startOfDayInAppTz(pickedDate);
      const end = endOfDayInAppTz(pickedDate);
      return { start, end };
    }
    // 'all': cofamy sie ALL_RANGE_DAYS od dzis.
    const today = new Date();
    const end = endOfDayInAppTz(today);
    const startBase = new Date(today);
    startBase.setDate(startBase.getDate() - (ALL_RANGE_DAYS - 1));
    const start = startOfDayInAppTz(startBase);
    return { start, end };
  }, [mode, pickedDate]);

  const sessionsQuery = useSessions(activeChildId, range.start, range.end);
  const sessions = sessionsQuery.data ?? [];

  const hasChild = (childrenQuery.data ?? []).length > 0;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-6 pt-6">
        <Text className="text-3xl font-semibold text-navy">Historia</Text>
        <View className="mt-4 flex-row gap-2">
          <ModeChip label="Wybierz dzien" selected={mode === 'day'} onPress={() => setMode('day')} />
          <ModeChip
            label={`Ostatnie ${ALL_RANGE_DAYS} dni`}
            selected={mode === 'all'}
            onPress={() => setMode('all')}
          />
        </View>
        {mode === 'day' ? (
          <View className="mt-3">
            <DatePickerField
              label="Dzien"
              value={pickedDate}
              onChange={setPickedDate}
              maximumDate={new Date()}
              accessibilityLabel="Wybierz dzien historii"
            />
          </View>
        ) : null}
      </View>

      <View className="mt-4 flex-1">
        {!hasChild ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-base text-navy">Brak dziecka w rodzinie.</Text>
            <Text className="mt-1 text-xs text-purple">
              Dodaj dziecko na ekranie Dzisiaj, zeby zobaczyc historie.
            </Text>
          </View>
        ) : sessionsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1E1B4B" />
          </View>
        ) : sessionsQuery.isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-base text-navy">Blad ladowania historii.</Text>
            <Text className="mt-1 text-xs text-orange">
              {extractErrorMessage(sessionsQuery.error)}
            </Text>
          </View>
        ) : mode === 'all' ? (
          <GroupedHistoryList sessions={sessions} />
        ) : (
          <FlatHistoryList sessions={sessions} />
        )}
      </View>
    </SafeAreaView>
  );
}

interface ModeChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function ModeChip({ label, selected, onPress }: ModeChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-xl px-3 py-2 ${selected ? 'bg-navy' : 'bg-white'}`}>
      <Text className={`text-xs font-semibold ${selected ? 'text-cream' : 'text-navy'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

interface ListProps {
  sessions: SleepSession[];
}

function FlatHistoryList({ sessions }: ListProps) {
  if (sessions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-navy">Brak sesji tego dnia.</Text>
      </View>
    );
  }
  return (
    <View className="flex-1 px-6">
      <View className="gap-2">
        {sessions.map((s) => (
          <SessionListItem key={s.id} session={s} />
        ))}
      </View>
    </View>
  );
}

interface DaySection {
  title: string;
  data: SleepSession[];
}

function groupByDay(sessions: SleepSession[]): DaySection[] {
  // useSessions zwraca sesje posortowane desc po start_at — zachowujemy
  // ta kolejnosc w sekcjach (najnowszy dzien najpierw).
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
  return order.map((key) => ({
    title: formatDateNoYear(new Date(`${key}T12:00:00Z`)),
    data: groups[key],
  }));
}

function GroupedHistoryList({ sessions }: ListProps) {
  const sections = useMemo(() => groupByDay(sessions), [sessions]);

  if (sections.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-navy">Brak sesji w ostatnich {ALL_RANGE_DAYS} dniach.</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-6 pb-6 gap-2"
      renderItem={({ item }) => <SessionListItem session={item} />}
      renderSectionHeader={({ section }) => (
        <View className="mt-3 mb-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-purple">
            {section.title}
          </Text>
        </View>
      )}
      stickySectionHeadersEnabled={false}
    />
  );
}
