import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentFamily } from '@/features/family/api';

export default function TodayScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-navy">Dzisiaj</Text>
        <Text className="mt-2 text-base text-purple">Tu pojawi sie widok dnia.</Text>

        <View className="mt-8 w-full rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-navy">Status</Text>
          <Text className="mt-1 text-sm text-navy">Zalogowany: {user?.email ?? 'brak'}</Text>
          <Text className="mt-1 text-sm text-navy">
            Rodzina:{' '}
            {familyQuery.isLoading
              ? 'ladowanie...'
              : familyQuery.data
                ? `${familyQuery.data.name} (${familyQuery.data.members.length})`
                : 'brak'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
