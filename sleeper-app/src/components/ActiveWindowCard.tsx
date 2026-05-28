import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, formatTime } from '@/lib/time';

interface ActiveWindowCardProps {
  // Czas zakonczenia ostatniej sesji. Jesli null = brak sesji w historii dziecka.
  lastSleepEndAt: Date | null;
  // Oczekiwane okno aktywnosci dla wieku (np. 105 min dla 3-6mc).
  // Faza 2: stala wartosc placeholder, Faza 5 podmienimy na age-based.
  targetWindowMinutes?: number;
}

// Pomaranczowa karta z mockupu #1: pokazuje ile trwa okno aktywnosci
// + opcjonalna planowana nastepna drzemka. Tick raz na minute (sekundy nie
// sa potrzebne dla okna aktywnosci).
const MINUTE_MS = 60 * 1000;

export function ActiveWindowCard({
  lastSleepEndAt,
  targetWindowMinutes = 105,
}: ActiveWindowCardProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(id);
  }, []);

  const sinceMs = lastSleepEndAt ? Math.max(0, now - lastSleepEndAt.getTime()) : null;
  const targetMs = targetWindowMinutes * MINUTE_MS;
  const remainingMs = sinceMs !== null ? Math.max(0, targetMs - sinceMs) : null;
  const progressValue = sinceMs !== null ? Math.min(1, sinceMs / targetMs) : 0;

  return (
    <View className="rounded-card bg-orange-soft p-5">
      {/* Header: kropka + label "OKNO AKTYWNOŚCI" */}
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-pill bg-orange" />
        <Text className="text-xs font-semibold uppercase tracking-wide text-orange">
          Okno aktywności
        </Text>
      </View>

      {sinceMs === null ? (
        <>
          <Text
            className="mt-3 font-display text-6xl font-semibold text-navy dark:text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            Nowy dzień
          </Text>
          <Text className="mt-2 text-sm text-text-muted">Brak sesji w historii.</Text>
        </>
      ) : (
        <>
          <Text
            className="mt-3 font-display text-6xl font-semibold text-navy dark:text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(sinceMs)}
          </Text>
          {/* ProgressBar pod timerem — tint orange, track jasny */}
          <View className="mt-4">
            <ProgressBar
              value={progressValue}
              tintClassName="bg-orange"
              trackClassName="bg-white/70"
            />
          </View>
          {/* Footer: "Pobudka o HH:MM" + Badge "Drzemka za" */}
          {lastSleepEndAt ? (
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-text-muted">
                Pobudka o {formatTime(lastSleepEndAt)}
              </Text>
              {remainingMs !== null && remainingMs > 0 ? (
                <Badge label={`Drzemka za ~${formatDuration(remainingMs)}`} variant="orange" />
              ) : (
                <Badge label="Można próbować drzemki" variant="orange" />
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
