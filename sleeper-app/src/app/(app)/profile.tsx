import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-navy">Profil</Text>
        <Text className="mt-2 text-base text-purple">Ustawienia i rodzina.</Text>
      </View>
    </SafeAreaView>
  );
}
