// Czysta logika "kto jest due" dla send-nap-push — zero Deno API, testowana
// vitestem z sleeper-web (src/features/notifications/__tests__/push-due.test.ts).

export interface DueCandidate {
  readonly nextSleepAt: Date;
  readonly leadMinutes: number;
  readonly alreadyDelivered: boolean;
}

export type DueVerdict = 'send' | 'not-yet' | 'skip-expired' | 'already-delivered';

export function classifyDue(candidate: DueCandidate, now: Date): DueVerdict {
  if (candidate.alreadyDelivered) return 'already-delivered';
  const nowMs = now.getTime();
  const nextMs = candidate.nextSleepAt.getTime();
  if (nowMs >= nextMs) return 'skip-expired';
  if (nowMs >= nextMs - candidate.leadMinutes * 60_000) return 'send';
  return 'not-yet';
}

export function formatPushBody(nextSleepAt: Date, now: Date): string {
  const minutes = Math.round((nextSleepAt.getTime() - now.getTime()) / 60_000);
  const time = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  }).format(nextSleepAt);
  return `Rekomendowany sen ok. ${time} (za ~${minutes} min)`;
}
