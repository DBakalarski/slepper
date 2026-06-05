import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-cream dark:bg-dark-bg">
      <Text className="text-2xl font-semibold text-navy dark:text-cream">Sleeper Web</Text>
      <Text className="mt-2 text-base text-purple dark:text-cream/70">Coming soon</Text>
    </View>
  );
}
