import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChangelogBannerProps {
  items: string[];
  extraCount: number;
  onRestart: () => void;
  onDismiss: () => void;
}

// Banner „co nowego po deployu" — overlay nad dolna krawedzia (safe-area).
// Renderowany przez (app)/_layout gdy useChangelogUpdate zwroci visible.
// `box-none` przepuszcza dotyk poza karta.
export function ChangelogBanner({ items, extraCount, onRestart, onDismiss }: ChangelogBannerProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center px-4"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="w-full max-w-md rounded-card bg-navy px-4 py-4 shadow-card dark:bg-dark-surface">
        <Text className="mb-2 text-sm font-bold text-cream">Nowości w aplikacji</Text>
        <View className="mb-3">
          {items.map((item, index) => (
            <Text key={`${index}-${item}`} className="text-sm text-cream/90">
              {`• ${item}`}
            </Text>
          ))}
          {extraCount > 0 ? (
            <Text className="text-sm text-cream/70">
              {`…i ${extraCount} ${extraCount === 1 ? 'inna zmiana' : 'innych zmian'}`}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center justify-end">
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Później"
            hitSlop={8}
            className="mr-4 px-2 py-1"
          >
            <Text className="text-sm font-semibold text-cream/70">Później</Text>
          </Pressable>
          <Pressable
            onPress={onRestart}
            accessibilityRole="button"
            accessibilityLabel="Zrestartuj teraz"
            hitSlop={8}
            className="rounded-pill bg-orange px-4 py-2"
          >
            <Text className="text-sm font-bold text-white">Zrestartuj teraz</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
