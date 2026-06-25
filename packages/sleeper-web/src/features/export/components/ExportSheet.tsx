import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { useExportCsv } from '@/features/export/useExportCsv';
import { COLORS } from '@/lib/colors';

// Bottom-sheet eksportu CSV: wybor zakresu (presety) + przycisk eksportu.
// Wzorzec RN Modal (transparent + slide) z ThemeModeBottomSheet — bez nowych
// zaleznosci. Wynik eksportu komunikowany snackbarem przez useExportCsv.

type RangeValue = '14' | '30' | '90';

const RANGE_OPTIONS: SegmentOption<RangeValue>[] = [
  { value: '14', label: '2 tyg' },
  { value: '30', label: '30 dni' },
  { value: '90', label: '90 dni' },
];

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  childId: string;
}

export function ExportSheet({ visible, onClose, childId }: ExportSheetProps) {
  const [range, setRange] = useState<RangeValue>('14');
  const { status, exportCsv } = useExportCsv();
  const isLoading = status === 'loading';

  async function handleExport() {
    await exportCsv(childId, Number(range));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zamknij eksport"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end">
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView edges={['bottom']} className="bg-cream dark:bg-dark-card rounded-t-card">
            <View className="px-6 pt-5 pb-3">
              <Text className="text-base font-semibold text-navy dark:text-cream">
                Eksport danych snu
              </Text>
              <Text className="mt-1 text-xs text-text-muted dark:text-cream/60">
                Plik CSV do otwarcia w arkuszu lub wyslania pediatrze
              </Text>
            </View>

            <View className="px-6 pb-2">
              <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
            </View>

            <View className="px-6 pb-3 pt-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Eksportuj CSV"
                accessibilityState={{ disabled: isLoading }}
                disabled={isLoading}
                onPress={handleExport}
                style={({ pressed }) => ({ opacity: pressed || isLoading ? 0.85 : 1 })}
                className="flex-row items-center justify-center gap-2 rounded-card bg-navy px-4 py-3 dark:bg-dark-surface">
                {isLoading ? <ActivityIndicator size="small" color={COLORS.cream} /> : null}
                <Text className="text-sm font-semibold text-cream">
                  {isLoading ? 'Eksportowanie…' : 'Eksportuj CSV'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
