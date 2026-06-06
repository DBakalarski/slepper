import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditChildForm } from '@/features/children/components/EditChildForm';
import { useChildren } from '@/features/children/hooks';
import { useCurrentFamily } from '@/features/family/hooks';
import { COLORS } from '@/lib/colors';

export default function EditChildScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const childId = typeof params.id === 'string' ? params.id : null;

  const familyQuery = useCurrentFamily();
  const familyId = familyQuery.data?.id ?? null;
  const childrenQuery = useChildren(familyId);

  const child = useMemo(() => {
    if (!childId || !childrenQuery.data) return null;
    return childrenQuery.data.find((c) => c.id === childId) ?? null;
  }, [childId, childrenQuery.data]);

  const isLoading = familyQuery.isLoading || childrenQuery.isLoading;

  function handleClose() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profile');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-6 gap-4">
        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={COLORS.navy} />
          </View>
        ) : child ? (
          <EditChildForm
            child={child}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        ) : (
          <View className="rounded-2xl bg-white p-5 dark:bg-dark-card">
            <Text className="text-base font-semibold text-navy dark:text-cream">
              Nie znaleziono dziecka
            </Text>
            <Text className="mt-1 text-sm text-text-muted dark:text-cream/60">
              Wroc do profilu i sprobuj ponownie.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
