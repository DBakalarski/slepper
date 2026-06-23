import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveChild } from '@/features/children/useActiveChild';
import { useActiveSession, useEndSession } from '@/features/sessions/hooks';
import { useSessionTimer } from '@/features/sessions/useSessionTimer';

// Minimalny typ Wake Lock API (Sentinel + Navigator). RN-Web nie ma DOM lib
// w tsconfig pelnym, wiec definujemy local — zero runtime impactu.
type WakeLockSentinelLike = {
  readonly release: () => Promise<void>;
};
type NavigatorWithWakeLock = Navigator & {
  readonly wakeLock?: {
    readonly request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

// Pelnoekranowy widok aktywnej sesji: duzy timer, dwa CTA (Zakoncz / Wyjdz).
// Jesli sesja zakonczy sie zdalnie (drugi telefon) — useActiveSession refetchuje
// przez focus, ekran wraca do `/`.
//
// Web: uzywamy Wake Lock API (iOS Safari 16.4+, Chrome 84+) zeby zapobiec
// wygaszeniu ekranu w czasie pelnoekranowego timera. Starsze przegladarki —
// graceful no-op (`navigator.wakeLock` undefined). Re-acquire na
// `visibilitychange` (Safari zwalnia sentinel gdy karta straci focus).
// (review Fazy 3 P2.3)
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

  // Wake Lock — utrzymuje ekran wlaczony podczas pelnoekranowego timera.
  // Web only (`navigator.wakeLock`); native (Expo Go) nie ma tego globala,
  // tam sleep-fullscreen i tak nie jest uzywane (osobny native flow).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined') return;
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const s = await nav.wakeLock!.request('screen');
        if (cancelled) {
          await s.release().catch(() => {});
          return;
        }
        sentinel = s;
      } catch {
        // Permission denied lub niewspierane — graceful degrade.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible' && !sentinel) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinel) {
        void sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, []);

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
          accessibilityLabel="Edytuj start sesji"
          onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
          className="items-center justify-center rounded-2xl border border-cream/30 px-6 py-3">
          <Text className="text-sm font-semibold text-cream">Edytuj start</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="items-center justify-center rounded-2xl px-6 py-3">
          <Text className="text-sm font-semibold text-cream/70">Wroc</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
