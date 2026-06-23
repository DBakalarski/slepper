import { Text, View } from 'react-native';
import type { Recommendation } from 'sleeper-machine';

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, formatTime } from '@/lib/time';

interface ActiveWindowCardProps {
  // Czas zakonczenia ostatniej sesji. Jesli null = brak sesji w historii dziecka.
  readonly lastSleepEndAt: Date | null;
  // Rekomendacja z sleeper-machine. Null = brak kotwicy / loading / swieze dziecko.
  readonly recommendation: Recommendation | null;
  // Aktualny czas — tick rzadzony przez parent (useNow w ActiveChildSection).
  readonly now: Date;
  // Algorytm dziecka — dla 'kotki_dwa' rozbijamy okno na "do lozeczka" + "drzemka".
  readonly algorithm: 'galland' | 'kotki_dwa';
}

const MINUTE_MS = 60 * 1000;

// Kotki Dwa: dziecko odkladamy do lozeczka na sen, po rytuale, na 15 min PRZED
// koncem okna aktywnosci (= przed `nextSleepAt`). Patrz przewodnik snu, rozdz.
// "Jak ustalic harmonogram dnia": "Odkladaj do lozeczka na sen, po rytuale do
// snu, na 15min przed koncem okna aktywnosci."
const CRIB_LEAD_MINUTES = 15;

// Wiersz odliczania: label po lewej, badge "za ~X" / "~X temu" po prawej.
function CountdownRow({ label, remainingMs }: { label: string; remainingMs: number }) {
  const isFuture = remainingMs > 0;
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-navy">{label}</Text>
      <Badge
        label={isFuture ? `za ~${formatDuration(remainingMs)}` : `~${formatDuration(-remainingMs)} temu`}
        variant="orange"
      />
    </View>
  );
}

// Pomaranczowa karta z mockupu #1: ile trwa okno aktywnosci + age-based
// rekomendacja kolejnej drzemki. Wszystkie wartosci docelowe pochodza
// z `recommendation` (sleeper-machine.recommend()), zadnych hardcode placeholderow.
export function ActiveWindowCard({
  lastSleepEndAt,
  recommendation,
  now,
  algorithm,
}: ActiveWindowCardProps) {
  const nowMs = now.getTime();
  const sinceMs = lastSleepEndAt ? Math.max(0, nowMs - lastSleepEndAt.getTime()) : null;

  const targetMs = recommendation ? recommendation.currentWakeWindowDuration * MINUTE_MS : null;

  const remainingMs = recommendation?.nextSleepAt
    ? recommendation.nextSleepAt.getTime() - nowMs
    : null;

  // Kotki Dwa: pokaz osobno odlozenie do lozeczka (15 min przed `nextSleepAt`)
  // i sam moment zasniecia. Galland zostaje przy pojedynczym badge "Drzemka za".
  const isKotkiDwa = algorithm === 'kotki_dwa';
  const cribRemainingMs = remainingMs === null ? null : remainingMs - CRIB_LEAD_MINUTES * MINUTE_MS;
  // Typ najblizszego snu — etykieta "Drzemka" vs "Sen nocny". Pusty plan = wszystkie
  // drzemki zrobione, wiec kolejny sen to noc.
  const nextSleepLabel =
    recommendation?.remainingNapsToday[0]?.type === 'NIGHT' ? 'Sen nocny' : 'Drzemka';

  const progressValue =
    sinceMs !== null && targetMs !== null && targetMs > 0
      ? Math.min(1, sinceMs / targetMs)
      : null;

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
            className="mt-3 font-display text-6xl font-semibold text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            Nowy dzień
          </Text>
          <Text className="mt-2 text-sm text-text-muted">Brak sesji w historii.</Text>
        </>
      ) : (
        <>
          <Text
            className="mt-3 font-display text-6xl font-semibold text-navy"
            style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(sinceMs)}
          </Text>
          {/* Wrapper holds space (h-2 = 8pt) even when progressValue is null,
              preventing layout shift when recommendation loads/unloads. */}
          <View className="mt-4 h-2">
            {progressValue !== null ? (
              <ProgressBar
                value={progressValue}
                tintClassName="bg-orange"
                trackClassName="bg-white/70"
              />
            ) : null}
          </View>
          {lastSleepEndAt ? (
            isKotkiDwa && remainingMs !== null && cribRemainingMs !== null ? (
              <View className="mt-4 gap-2">
                <Text className="text-sm text-text-muted">
                  Pobudka o {formatTime(lastSleepEndAt)}
                </Text>
                <View className="gap-1.5">
                  <CountdownRow label="Do łóżeczka" remainingMs={cribRemainingMs} />
                  <CountdownRow label={nextSleepLabel} remainingMs={remainingMs} />
                </View>
                <Text className="text-xs text-text-muted">
                  Okno liczone od pobudki — krótsza drzemka przesuwa łóżeczko i sen wcześniej.
                </Text>
              </View>
            ) : (
              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-text-muted">
                  Pobudka o {formatTime(lastSleepEndAt)}
                </Text>
                {remainingMs === null ? null : remainingMs > 0 ? (
                  <Badge label={`Drzemka za ~${formatDuration(remainingMs)}`} variant="orange" />
                ) : (
                  <Badge
                    label={`Przekroczono okno o ~${formatDuration(-remainingMs)}`}
                    variant="orange"
                  />
                )}
              </View>
            )
          ) : null}
        </>
      )}
    </View>
  );
}
