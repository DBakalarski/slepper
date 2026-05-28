import {
  cancelNapNotification,
  scheduleNapNotification,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

// Faza 5: side-effects schedulowania powiadomien po mutacjach sesji.
//
// Wybor architekturalny: zamiast wolac scheduleNapNotification z UI (n miejsc),
// scentralizowane wywolania w hookach mutacji (hooks.ts). Te helpery sa
// fire-and-forget — jesli zawioda (brak permissions, brak siecio do childow),
// loguja warning i koncza ciche, bez wplywu na sukces mutacji.
//
// Wymagana metadata dziecka (`birth_date`, `name`) — pobierane przez 1-row
// query, runs tylko po mutacji (nie w render loop). Brak nadmiernego ruchu.

interface ChildMeta {
  name: string;
  birth_date: string;
}

async function fetchChildMeta(childId: string): Promise<ChildMeta | null> {
  const { data, error } = await supabase
    .from('children')
    .select('name, birth_date')
    .eq('id', childId)
    .maybeSingle();
  if (error || !data) return null;
  return { name: data.name, birth_date: data.birth_date };
}

// Schedule notyfikacja po zakonczeniu sesji LUB po update/delete ostatniej
// sesji (gdy ostatnia zakonczona sesja sie zmienila).
//
// `lastSleepEndAt` = end_at ostatniej sesji dziecka. Jesli null → cancel.
export async function rescheduleNapNotification(
  childId: string,
  lastSleepEndAt: Date | null,
): Promise<void> {
  try {
    if (!lastSleepEndAt) {
      await cancelNapNotification(childId);
      return;
    }
    const meta = await fetchChildMeta(childId);
    if (!meta) {
      // Dziecko zniknelo lub brak RLS dostepu — defensywnie anulujemy.
      await cancelNapNotification(childId);
      return;
    }
    await scheduleNapNotification({
      childId,
      childName: meta.name,
      birthDate: new Date(`${meta.birth_date}T00:00:00Z`),
      lastSleepEndAt,
    });
  } catch (err) {
    // Powiadomienia to nie-krytyczny boczny efekt. Logujemy warning, nie blokujemy
    // sukcesu mutacji. Brak Sentry w MVP — console.warn wystarczy.
    console.warn('[notifications] reschedule failed:', err);
  }
}

// Anuluj notyfikacje po starcie sesji (juz drzemie, niepotrzebny przypomnienie).
export async function cancelNapNotificationSafe(childId: string): Promise<void> {
  try {
    await cancelNapNotification(childId);
  } catch (err) {
    console.warn('[notifications] cancel failed:', err);
  }
}

// Po mutacji ktora mogla zmienic ktora sesja jest "ostatnia zakonczona" (delete
// albo update niekoniecznie ostatniej sesji) — zapytaj baze o aktualnie
// najnowsza zakonczona sesje i (re)schedule notyfikacje wzgledem niej.
// Jesli zadnej zakonczonej sesji nie ma → cancel.
//
// Uzywane w `useDeleteSession.onSuccess` oraz `useUpdateSession.onSuccess`
// dla zachowania symetrii: notyfikacja zawsze odzwierciedla "ostatnie okno
// aktywnosci", niezaleznie czy edytowano ostatnia czy starsza sesje.
export async function rescheduleFromLastEnded(childId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('end_at')
      .eq('child_id', childId)
      .not('end_at', 'is', null)
      .order('end_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[notifications] reschedule-from-last-ended query failed:', error);
      return;
    }
    const lastEndAt = data?.end_at ? new Date(data.end_at) : null;
    await rescheduleNapNotification(childId, lastEndAt);
  } catch (err) {
    console.warn('[notifications] reschedule-from-last-ended failed:', err);
  }
}
