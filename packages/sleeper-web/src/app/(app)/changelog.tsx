import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ChangelogEntry } from '@/features/changelog/changelog';
import { useChangelogHistory } from '@/features/changelog/useChangelogHistory';
import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { COLORS } from '@/lib/colors';

// Ekran „Historia zmian" — pelnoekranowa lista wszystkich wersji z krotkim
// opisem co sie w ktorej zmienilo. Dostepny przez wiersz w Ustawieniach
// (router.push('/changelog')). Wpiety jako Tab z `href: null` — ukryty w tab
// barze, ale routable. Wzorzec jak `settings.tsx`.

function VersionCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <View className="rounded-card bg-white p-5 dark:bg-dark-card">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-lg font-semibold text-navy dark:text-cream">
          Wersja {entry.version}
        </Text>
        <Text className="text-sm text-purple">{entry.date}</Text>
      </View>
      <View className="mt-3 gap-2">
        {entry.items.map((item, index) => (
          <View key={`${entry.v}-${index}`} className="flex-row gap-2">
            <Text className="text-sm text-purple">•</Text>
            <Text className="flex-1 text-sm text-navy dark:text-cream">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ChangelogScreen() {
  const router = useRouter();
  const effectiveTheme = useEffectiveTheme();
  const backIconColor = effectiveTheme === 'dark' ? COLORS.cream : COLORS.navy;
  const history = useChangelogHistory();

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-6 gap-6">
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wroc"
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className="w-11 h-11 items-center justify-center rounded-pill -ml-2">
            <ChevronLeft size={24} color={backIconColor} />
          </Pressable>
          <Text className="text-3xl font-semibold text-navy dark:text-cream">Historia zmian</Text>
        </View>

        {history.status === 'loading' ? (
          <View className="mt-4 items-center">
            <ActivityIndicator color={COLORS.navy} />
          </View>
        ) : history.status === 'error' ? (
          <Text className="text-sm text-orange">Nie udalo sie wczytac historii zmian.</Text>
        ) : history.entries.length === 0 ? (
          <Text className="text-sm text-purple">Brak historii zmian.</Text>
        ) : (
          history.entries.map((entry) => <VersionCard key={entry.v} entry={entry} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
