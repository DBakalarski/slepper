import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

export default function TodayScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-navy">Dzisiaj</Text>
        <Text className="mt-2 text-base text-purple">Tu pojawi sie widok dnia.</Text>
      </View>
    </SafeAreaView>
  );
}
