import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { formatDuration } from '@/lib/time';

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

  return (
    <View className="rounded-2xl bg-orange p-5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-cream/80">
        Okno aktywnosci
      </Text>
      {sinceMs === null ? (
        <>
          <Text className="mt-2 text-3xl font-semibold text-cream">Nowy dzien</Text>
          <Text className="mt-1 text-sm text-cream/90">Brak sesji w historii.</Text>
        </>
      ) : (
        <>
          <Text className="mt-2 text-3xl font-semibold text-cream">{formatDuration(sinceMs)}</Text>
          <Text className="mt-1 text-sm text-cream/90">
            {remainingMs && remainingMs > 0
              ? `Planowana drzemka za ${formatDuration(remainingMs)}`
              : 'Mozna probowac drzemki'}
          </Text>
        </>
      )}
    </View>
  );
}
