// Harmonogram powiadomien push per dziecko (tabela nap_schedule).
// Podejscie A ze specu (docs/superpowers/specs/2026-07-12-web-push-notifications-design.md):
// klient po kazdej mutacji sesji liczy next rekomendowany sen i upsertuje go;
// edge function `send-nap-push` tylko wysyla. Sesja w toku => null (dziecko
// spi, przypomnienie bez sensu; mutacja konczaca sen wywola przeliczenie).

import { recommend as recommendGalland, type SleepSession } from 'sleeper-machine';
import { recommendKotkiDwa } from 'sleeper-machine-kotki';

import { toLibProfile } from '@/features/recommendation/adapter';
import { supabase } from '@/lib/supabase';

export interface ScheduleSessionRow {
  readonly type: string;
  readonly start_at: string;
  readonly end_at: string | null;
}

export interface ScheduleChildRow {
  readonly birth_date: string;
  readonly algorithm: string;
  readonly preferred_naps_per_day: number | null;
  readonly preferred_bedtime: string | null;
  readonly preferred_wake_time: string | null;
}

export function computeNextSleepAt(
  rows: readonly ScheduleSessionRow[],
  child: ScheduleChildRow,
  now: Date,
): Date | null {
  if (rows.some((r) => r.end_at === null)) return null;

  const history: SleepSession[] = rows.flatMap((r) =>
    r.end_at === null
      ? []
      : [
          {
            start: new Date(r.start_at),
            end: new Date(r.end_at),
            type: r.type === 'night_sleep' ? ('NIGHT' as const) : ('NAP' as const),
          },
        ],
  );

  const profile = toLibProfile(
    child.birth_date,
    child.preferred_wake_time,
    child.preferred_naps_per_day,
    child.preferred_bedtime,
  );
  const fn = child.algorithm === 'kotki_dwa' ? recommendKotkiDwa : recommendGalland;
  try {
    return fn({ now, history }, profile).nextSleepAt ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[nap-schedule] recommend() threw, degrading to null', err);
    }
    return null;
  }
}

// Pobiera swieze dane z bazy (nie z cache react-query) i upsertuje harmonogram.
export async function recomputeNapSchedule(childId: string): Promise<void> {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 14 * 86_400_000);

  const [childRes, sessionsRes] = await Promise.all([
    supabase
      .from('children')
      .select(
        'birth_date, algorithm, preferred_naps_per_day, preferred_bedtime, preferred_wake_time',
      )
      .eq('id', childId)
      .single(),
    supabase
      .from('sessions')
      .select('type, start_at, end_at')
      .eq('child_id', childId)
      .gte('start_at', rangeStart.toISOString())
      .order('start_at', { ascending: true }),
  ]);

  if (childRes.error) throw childRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const nextSleepAt = computeNextSleepAt(sessionsRes.data, childRes.data, now);

  const { error } = await supabase.from('nap_schedule').upsert({
    child_id: childId,
    next_sleep_at: nextSleepAt ? nextSleepAt.toISOString() : null,
    updated_at: now.toISOString(),
  });
  if (error) throw error;
}
