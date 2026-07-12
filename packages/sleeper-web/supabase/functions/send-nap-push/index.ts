// Edge function: wysyla Web Push "sen za ~X min" wg nap_schedule.
// Wywolywana przez pg_cron co 5 min (POST z naglowkiem x-cron-secret).
// Deploy/sekrety/cron: docs/runbook/sleeper-web-push.md.
// Podejscie A ze specu (docs/superpowers/specs/2026-07-12-web-push-notifications-design.md):
// klient liczy nap_schedule.next_sleep_at, ta funkcja tylko wysyla + dedupuje.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1';

import { classifyDue, formatPushBody } from './due.ts';

interface ScheduleChild {
  name: string;
  family_id: string;
}

interface ScheduleRow {
  child_id: string;
  next_sleep_at: string;
  children: ScheduleChild | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('unauthorized', { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return new Response('missing env', { status: 500 });
  }

  const supabase = createClient(url, serviceKey);
  const now = new Date();

  const schedules = await supabase
    .from('nap_schedule')
    .select('child_id, next_sleep_at, children(name, family_id)')
    .not('next_sleep_at', 'is', null);
  if (schedules.error) return new Response(schedules.error.message, { status: 500 });

  const rows = (schedules.data as unknown as ScheduleRow[]).flatMap((r) =>
    r.children === null ? [] : [{ ...r, children: r.children }],
  );
  if (rows.length === 0) return Response.json({ sent: 0 });

  const familyIds = [...new Set(rows.map((r) => r.children.family_id))];
  const members = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('family_id', familyIds);
  if (members.error) return new Response(members.error.message, { status: 500 });

  const userIds = [...new Set(members.data.map((m) => m.user_id as string))];
  if (userIds.length === 0) return Response.json({ sent: 0 });

  const subs = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, lead_minutes')
    .eq('enabled', true)
    .in('user_id', userIds);
  if (subs.error) return new Response(subs.error.message, { status: 500 });
  if (subs.data.length === 0) return Response.json({ sent: 0 });

  const deliveries = await supabase
    .from('push_deliveries')
    .select('subscription_id, child_id, next_sleep_at')
    .in(
      'child_id',
      rows.map((r) => r.child_id),
    );
  if (deliveries.error) return new Response(deliveries.error.message, { status: 500 });

  const delivered = new Set(
    deliveries.data.map(
      (d) => `${d.subscription_id}:${d.child_id}:${new Date(d.next_sleep_at).getTime()}`,
    ),
  );
  const usersByFamily = new Map<string, string[]>();
  for (const m of members.data) {
    const familyId = m.family_id as string;
    const list = usersByFamily.get(familyId) ?? [];
    list.push(m.user_id as string);
    usersByFamily.set(familyId, list);
  }

  let sent = 0;
  const vapid = { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate };

  for (const row of rows) {
    const nextSleepAt = new Date(row.next_sleep_at);
    const familyUsers = usersByFamily.get(row.children.family_id) ?? [];
    for (const sub of subs.data.filter((s) => familyUsers.includes(s.user_id as string))) {
      const key = `${sub.id}:${row.child_id}:${nextSleepAt.getTime()}`;
      const verdict = classifyDue(
        {
          nextSleepAt,
          leadMinutes: sub.lead_minutes as number,
          alreadyDelivered: delivered.has(key),
        },
        now,
      );
      if (verdict === 'not-yet' || verdict === 'already-delivered') continue;

      // Dedup PRZED wysylka (idempotencja crona): insert; konflikt 23505 =
      // rownolegly/poprzedni run juz obsluzyl te pare.
      const claim = await supabase.from('push_deliveries').insert({
        subscription_id: sub.id,
        child_id: row.child_id,
        next_sleep_at: row.next_sleep_at,
      });
      if (claim.error) continue;

      if (verdict === 'skip-expired') continue; // wpis blokuje ponawianie, bez wysylki

      const message = {
        data: JSON.stringify({
          title: `${row.children.name} 😴`,
          body: formatPushBody(nextSleepAt, now),
        }),
      };
      const subscription = {
        endpoint: sub.endpoint as string,
        expirationTime: null,
        keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
      };
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        const res = await fetch(subscription.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          // Martwa subskrypcja (user cofnal zgode / odinstalowal PWA) — sprzataj.
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else if (res.ok) {
          sent += 1;
        } else {
          console.error('[send-nap-push] push service error', res.status, await res.text());
        }
      } catch (err) {
        console.error('[send-nap-push] send failed', err);
      }
    }
  }

  return Response.json({ sent });
});
