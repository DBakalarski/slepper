import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Snackbar / toast — jeden naraz, pozycjonowany absolutnie nad dolna krawedzia
// (z uwzglednieniem safe-area). Renderowany przez SnackbarProvider. Akcja
// opcjonalna (np. "Przywroc" po zakonczeniu sesji). `box-none` przepuszcza
// dotyk poza pigulka, zeby snackbar nie blokowal UI pod spodem.
export function Snackbar({ message, actionLabel, onAction }: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const hasAction = Boolean(actionLabel && onAction);
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center px-4"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="w-full max-w-md flex-row items-center justify-between rounded-card bg-navy px-4 py-3 shadow-card dark:bg-dark-surface">
        <Text
          className="flex-1 text-sm font-medium text-cream"
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
        {hasAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
            className="ml-3"
          >
            <Text className="text-sm font-bold text-orange-soft">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
