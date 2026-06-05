import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveChild } from '@/features/children/useActiveChild';
import { useActiveSession, useEndSession } from '@/features/sessions/hooks';
import { useSessionTimer } from '@/features/sessions/useSessionTimer';

// Pelnoekranowy widok aktywnej sesji: duzy timer, dwa CTA (Zakoncz / Wyjdz).
// Jesli sesja zakonczy sie zdalnie (drugi telefon) — useActiveSession refetchuje
// przez focus, ekran wraca do `/`.
//
// Web-only: `expo-keep-awake` ZAMIESZCZONY z importu (native-only excluded
// per kontekst). Wake Lock API jako post-MVP feature (IU11 PWA polish). Bez
// tego ekran moze sie zablokowac po OS timeout — manual test confirm
// behavior na iOS Safari.
export default function SleepFullscreenScreen() {
  const router = useRouter();
  const { activeChildId } = useActiveChild();
  const activeQuery = useActiveSession(activeChildId);
  const endSession = useEndSession();

  const session = activeQuery.data ?? null;
  const { display } = useSessionTimer(session?.start_at ?? null);

  // Auto-redirect jesli nie ma aktywnej sesji (np. inny user zakonczyl).
  useEffect(() => {
    if (!activeQuery.isLoading && !session) {
      router.replace('/');
    }
  }, [activeQuery.isLoading, session, router]);

  if (!session || !activeChildId) {
    return (
      <SafeAreaView className="flex-1 bg-navy items-center justify-center">
        <Text className="text-cream/70">Brak aktywnej sesji</Text>
      </SafeAreaView>
    );
  }

  function handleEnd() {
    if (!session || !activeChildId) return;
    endSession.mutate(
      { sessionId: session.id, childId: activeChildId },
      {
        onSuccess: () => router.replace('/'),
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xs font-semibold uppercase tracking-widest text-cream/60">
          {session.type === 'nap' ? 'Drzemka w toku' : 'Sen nocny w toku'}
        </Text>
        <Text className="mt-6 font-mono text-7xl font-semibold text-cream">{display}</Text>
      </View>

      <View className="px-6 pb-8 gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={handleEnd}
          disabled={endSession.isPending}
          className={`items-center justify-center rounded-2xl px-6 py-5 ${
            endSession.isPending ? 'bg-orange/50' : 'bg-orange'
          }`}>
          <Text className="text-lg font-semibold text-cream">
            {endSession.isPending ? 'Zapisuje...' : 'Zakoncz sen'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="items-center justify-center rounded-2xl border border-cream/30 px-6 py-3">
          <Text className="text-sm font-semibold text-cream">Wroc</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
