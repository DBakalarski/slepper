import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useEnsureFamily, useMyIncomingInvitations } from '@/features/family/hooks';

export function NoFamilyFallback() {
  const incomingQuery = useMyIncomingInvitations();
  const ensureFamily = useEnsureFamily();
  const hasIncoming = (incomingQuery.data?.length ?? 0) > 0;

  return (
    <View className="mt-3">
      {hasIncoming ? (
        <Text className="text-sm text-purple">
          Masz oczekujace zaproszenie. Zaakceptuj je z ekranu &bdquo;Dzisiaj&rdquo; zamiast
          tworzyc nowa rodzine.
        </Text>
      ) : (
        <>
          <Text className="text-sm text-purple">
            Nie nalezysz do zadnej rodziny. To moze sie zdarzyc gdy auto-tworzenie
            nie powiodlo sie przy rejestracji.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={ensureFamily.isPending}
            onPress={() => ensureFamily.mutate()}
            className={`mt-3 items-center justify-center rounded-2xl px-4 py-3 ${
              ensureFamily.isPending ? 'bg-navy/40' : 'bg-navy'
            }`}>
            {ensureFamily.isPending ? (
              <ActivityIndicator color="#F5F0E8" />
            ) : (
              <Text className="text-sm font-semibold text-cream">Stworz rodzine</Text>
            )}
          </Pressable>
          {ensureFamily.error ? (
            <Text className="mt-2 text-xs text-orange">
              {ensureFamily.error instanceof Error
                ? ensureFamily.error.message
                : 'Nie udalo sie stworzyc rodziny.'}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
