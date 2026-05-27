import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

export default function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-navy dark:text-cream">Statystyki</Text>
        <Text className="mt-2 text-base text-purple dark:text-cream/70">Placeholder w MVP.</Text>
      </View>
    </SafeAreaView>
  );
}
