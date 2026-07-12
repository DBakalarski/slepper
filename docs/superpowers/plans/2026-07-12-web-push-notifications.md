# Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push "drzemka/sen za ~X min" na iPhone'y (zainstalowane PWA), działający przy zamkniętej aplikacji.

**Architecture:** Podejście A ze specu (`docs/superpowers/specs/2026-07-12-web-push-notifications-design.md`): klient po każdej mutacji sesji liczy `recommendation.nextSleepAt` i upsertuje do `nap_schedule`; Edge Function `send-nap-push` (pg_cron co 5 min) wysyła Web Push (VAPID) do subskrypcji z `push_subscriptions`, dedup w `push_deliveries`.

**Tech Stack:** Expo SDK 54 web, Supabase (Postgres + Edge Functions Deno), Web Push API, `@block65/webcrypto-web-push` (Deno npm:), vitest.

## Global Constraints

- Wyprzedzenie per urządzenie: `lead_minutes` int, check 5..60, default 15; UI oferuje 5/10/15/20/30.
- Dotyczy drzemek ORAZ snu nocnego (jedno pole `nextSleepAt`, bez rozróżniania).
- Sesja w toku ⇒ `next_sleep_at = null`.
- Cały dostęp do `Notification`/`pushManager` wyłącznie w `src/lib/push.ts`.
- Zero `any`, zero non-null `!`; `as` tylko dla DOM/platform narrowing.
- `hooks.ts` (sessions) — NIETKNIĘTY; sygnatury `schedule-nap-side-effects.ts` bez zmian.
- Commity pośrednie: typ/scope inny niż `feat|fix|perf(web)` LUB `[no-changelog]` (zmiana niewidoczna dla usera dopóki UI niepodpięte). Finalny commit z UI = `feat(web)` + wpis changelog v11 + bump 0.11.0 w app.json+package.json.
- Każdy commit kodu = follow-up commit `docs(commits)` (format z CLAUDE.md).
- Env klienta: `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (brak ⇒ UI pokazuje "niedostępne", nie crash).

---

### Task 1: Migracja 0015 + typy DB

**Files:**
- Create: `packages/sleeper-web/supabase/migrations/0015_push_notifications.sql`
- Modify: `packages/sleeper-web/src/lib/database.types.ts` (dodanie 3 tabel w `public.Tables`)
- Modify: `packages/sleeper-web/supabase/config.toml` (sekcja `[functions.send-nap-push]`)

**Interfaces:**
- Produces: tabele `push_subscriptions`, `nap_schedule`, `push_deliveries` + typy TS `Database['public']['Tables']['push_subscriptions' | 'nap_schedule' | 'push_deliveries']`.

- [ ] **Step 1: Napisz migrację**

```sql
-- Web Push notifications (spec: docs/superpowers/specs/2026-07-12-web-push-notifications-design.md).
-- 1. push_subscriptions — jedna per urzadzenie/przegladarka (Web Push endpoint).
-- 2. nap_schedule — harmonogram per dziecko: najblizszy rekomendowany sen,
--    liczony client-side po kazdej mutacji sesji (podejscie A ze specu).
-- 3. push_deliveries — dedup wysylek per (subskrypcja, dziecko, next_sleep_at);
--    lead_minutes jest per subskrypcja, wiec dedup tez musi byc.
-- Cron job pg_cron NIE jest w migracji (zawiera project URL + CRON_SECRET) —
-- SQL do jednorazowego uruchomienia: docs/runbook/sleeper-web-push.md.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  lead_minutes int not null default 15 check (lead_minutes between 5 and 60),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner can read"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can insert"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can update"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: owner can delete"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.nap_schedule (
  child_id uuid primary key references public.children(id) on delete cascade,
  next_sleep_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.nap_schedule enable row level security;

create policy "nap_schedule: family members can read"
  on public.nap_schedule for select to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can insert"
  on public.nap_schedule for insert to authenticated
  with check (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can update"
  on public.nap_schedule for update to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ))
  with check (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

create policy "nap_schedule: family members can delete"
  on public.nap_schedule for delete to authenticated
  using (exists (
    select 1 from public.children c
    where c.id = child_id and public.is_family_member(c.family_id)
  ));

-- Tabela robocza edge function (service role omija RLS) — brak policies
-- dla authenticated = deny-all dla klienta.
create table public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  next_sleep_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, child_id, next_sleep_at)
);

alter table public.push_deliveries enable row level security;
```

- [ ] **Step 2: Dodaj typy do `database.types.ts`** — w `public.Tables` (alfabetycznie: `nap_schedule` przed `push_deliveries` przed `push_subscriptions`, zgodnie ze stylem generatora):

```ts
      nap_schedule: {
        Row: {
          child_id: string
          next_sleep_at: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          next_sleep_at?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          next_sleep_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nap_schedule_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      push_deliveries: {
        Row: {
          child_id: string
          next_sleep_at: string
          sent_at: string
          subscription_id: string
        }
        Insert: {
          child_id: string
          next_sleep_at: string
          sent_at?: string
          subscription_id: string
        }
        Update: {
          child_id?: string
          next_sleep_at?: string
          sent_at?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          lead_minutes: number
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          lead_minutes?: number
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          lead_minutes?: number
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
```

(Uwaga: wstaw we właściwe miejsca alfabetyczne między istniejące tabele.)

- [ ] **Step 3: `config.toml`** — dodaj na końcu:

```toml
[functions.send-nap-push]
# Cron wywoluje funkcje z custom naglowkiem x-cron-secret, bez JWT usera.
verify_jwt = false
```

- [ ] **Step 4: Walidacja** — `pnpm --filter sleeper-web exec tsc --noEmit` → 0 błędów.

- [ ] **Step 5: Commit**

```bash
git add packages/sleeper-web/supabase packages/sleeper-web/src/lib/database.types.ts
git commit -m "feat(db): tabele web push — push_subscriptions, nap_schedule, push_deliveries"
```
Plus follow-up `docs/commits/`.

---

### Task 2: Harmonogram — `nap-schedule.ts` + wypełnienie no-opów

**Files:**
- Create: `packages/sleeper-web/src/features/sessions/nap-schedule.ts`
- Create: `packages/sleeper-web/src/features/sessions/__tests__/nap-schedule.test.ts`
- Modify: `packages/sleeper-web/src/features/sessions/schedule-nap-side-effects.ts` (rewrite)
- Modify: `packages/sleeper-web/src/features/sessions/__tests__/schedule-nap-side-effects.test.ts` (rewrite — testowany no-op przestaje istnieć, zastępujemy testami delegacji; NIE osłabiamy asercji, wymieniamy funkcjonalność zgodnie ze specem)

**Interfaces:**
- Consumes: `toLibProfile` z `@/features/recommendation/adapter`; `recommend`/`recommendKotkiDwa` z pakietów machine; `supabase` z `@/lib/supabase`; tabela `nap_schedule` z Task 1.
- Produces: `computeNextSleepAt(rows: readonly ScheduleSessionRow[], child: ScheduleChildRow, now: Date): Date | null` oraz `recomputeNapSchedule(childId: string): Promise<void>`; `ScheduleSessionRow = { type: string; start_at: string; end_at: string | null }`, `ScheduleChildRow = { birth_date: string; algorithm: string; preferred_naps_per_day: number | null; preferred_bedtime: string | null; preferred_wake_time: string | null }`.

- [ ] **Step 1: Failing testy** `nap-schedule.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recommendGallandMock = vi.fn();
const recommendKotkiMock = vi.fn();

vi.mock('sleeper-machine', () => ({ recommend: recommendGallandMock }));
vi.mock('sleeper-machine-kotki', () => ({ recommendKotkiDwa: recommendKotkiMock }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { computeNextSleepAt } from '../nap-schedule';

const CHILD = {
  birth_date: '2025-11-01',
  algorithm: 'kotki_dwa',
  preferred_naps_per_day: null,
  preferred_bedtime: null,
  preferred_wake_time: null,
};

const NOW = new Date('2026-07-12T10:00:00Z');

describe('computeNextSleepAt', () => {
  beforeEach(() => {
    recommendGallandMock.mockReset();
    recommendKotkiMock.mockReset();
  });

  it('zwraca nextSleepAt z algorytmu kotki_dwa dla historii bez sesji w toku', () => {
    const next = new Date('2026-07-12T11:30:00Z');
    recommendKotkiMock.mockReturnValue({ nextSleepAt: next });
    const rows = [
      { type: 'nap', start_at: '2026-07-12T08:00:00Z', end_at: '2026-07-12T09:00:00Z' },
    ];
    expect(computeNextSleepAt(rows, CHILD, NOW)).toEqual(next);
    expect(recommendKotkiMock).toHaveBeenCalledTimes(1);
  });

  it('uzywa algorytmu galland gdy child.algorithm !== kotki_dwa', () => {
    recommendGallandMock.mockReturnValue({ nextSleepAt: null });
    expect(computeNextSleepAt([], { ...CHILD, algorithm: 'galland' }, NOW)).toBeNull();
    expect(recommendGallandMock).toHaveBeenCalledTimes(1);
    expect(recommendKotkiMock).not.toHaveBeenCalled();
  });

  it('sesja w toku (end_at null) => null bez wolania algorytmu', () => {
    const rows = [{ type: 'nap', start_at: '2026-07-12T09:50:00Z', end_at: null }];
    expect(computeNextSleepAt(rows, CHILD, NOW)).toBeNull();
    expect(recommendKotkiMock).not.toHaveBeenCalled();
  });

  it('throw z algorytmu => null (fail-safe, mutacja sesji nie moze paść)', () => {
    recommendKotkiMock.mockImplementation(() => {
      throw new Error('invariant violation');
    });
    expect(computeNextSleepAt([], CHILD, NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter sleeper-web exec vitest run src/features/sessions/__tests__/nap-schedule.test.ts` → FAIL (moduł nie istnieje).

- [ ] **Step 3: Implementacja `nap-schedule.ts`**:

```ts
// Harmonogram powiadomien push per dziecko (tabela nap_schedule).
// Podejscie A ze specu (docs/superpowers/specs/2026-07-12-web-push-notifications-design.md):
// klient po kazdej mutacji sesji liczy next rekomendowany sen i upsertuje go;
// edge function `send-nap-push` tylko wysyla. Sesja w toku => null (dziecko
// spi, przypomnienie bez sensu; mutacja konczaca sen wywola przeliczenie).

import { recommend as recommendGalland } from 'sleeper-machine';
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

  const history = rows.flatMap((r) =>
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
    return fn({ now, history, activeSession: undefined }, profile).nextSleepAt ?? null;
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
      .select('birth_date, algorithm, preferred_naps_per_day, preferred_bedtime, preferred_wake_time')
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
```

(Uwaga: jeśli `recommend`/`recommendKotkiDwa` mają węższy typ parametru `history`, dopasuj mapping do faktycznego `SleepSession` z lib — `start`/`end`/`type` to pełny shape.)

- [ ] **Step 4: Run testy** → PASS.

- [ ] **Step 5: Rewrite `schedule-nap-side-effects.ts`**:

```ts
// Side-effects harmonogramu powiadomien push po mutacjach sesji.
// Do 2026-07-12 no-op (push wykluczony ze scope PWA); wypelnione w ramach
// feature/web-push-notifications — patrz spec
// docs/superpowers/specs/2026-07-12-web-push-notifications-design.md.
// Sygnatury bez zmian — hooks.ts (callsite'y start/end/update/delete) nietkniete.
// Wszystkie trzy funkcje deleguja do jednego przeliczenia z bazy: to scisle
// mocniejsza wersja kazdej z dawnych semantyk (cancel/reschedule/from-last-ended).

import { recomputeNapSchedule } from './nap-schedule';

async function recomputeSafe(childId: string): Promise<void> {
  try {
    await recomputeNapSchedule(childId);
  } catch (err) {
    // Fire-and-forget: harmonogram powiadomien nie moze wywalic mutacji sesji.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[nap-schedule] recompute failed', err);
    }
  }
}

export async function rescheduleNapNotification(
  childId: string,
  _lastSleepEndAt: Date | null,
): Promise<void> {
  await recomputeSafe(childId);
}

export async function cancelNapNotificationSafe(childId: string): Promise<void> {
  await recomputeSafe(childId);
}

export async function rescheduleFromLastEnded(childId: string): Promise<void> {
  await recomputeSafe(childId);
}
```

- [ ] **Step 6: Rewrite testu `schedule-nap-side-effects.test.ts`** (no-op przestał istnieć — testujemy delegację i fail-safe):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recomputeMock = vi.fn<(childId: string) => Promise<void>>();

vi.mock('../nap-schedule', () => ({
  recomputeNapSchedule: (childId: string) => recomputeMock(childId),
}));

import {
  cancelNapNotificationSafe,
  rescheduleFromLastEnded,
  rescheduleNapNotification,
} from '../schedule-nap-side-effects';

describe('schedule-nap-side-effects (delegacja do recomputeNapSchedule)', () => {
  beforeEach(() => {
    recomputeMock.mockReset();
    recomputeMock.mockResolvedValue(undefined);
  });

  it('rescheduleNapNotification przelicza harmonogram dziecka', async () => {
    await rescheduleNapNotification('child-1', new Date());
    expect(recomputeMock).toHaveBeenCalledExactlyOnceWith('child-1');
  });

  it('cancelNapNotificationSafe przelicza harmonogram dziecka', async () => {
    await cancelNapNotificationSafe('child-2');
    expect(recomputeMock).toHaveBeenCalledExactlyOnceWith('child-2');
  });

  it('rescheduleFromLastEnded przelicza harmonogram dziecka', async () => {
    await rescheduleFromLastEnded('child-3');
    expect(recomputeMock).toHaveBeenCalledExactlyOnceWith('child-3');
  });

  it('blad przeliczenia NIE propaguje (fire-and-forget z hooks.ts)', async () => {
    recomputeMock.mockRejectedValue(new Error('network down'));
    await expect(rescheduleNapNotification('child-1', null)).resolves.toBeUndefined();
  });

  // Invariant: web build NIE moze importowac expo-notifications (native-only).
  it('does NOT import expo-notifications', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.resolve(dir, '../schedule-nap-side-effects.ts'), 'utf-8');
    expect(source).not.toContain('expo-notifications');
  });
});
```

- [ ] **Step 7: Run** oba pliki testów + `pnpm --filter sleeper-web exec tsc --noEmit` → PASS.

- [ ] **Step 8: Commit** `feat(push): klient liczy nap_schedule po mutacjach sesji` + docs/commits follow-up.

---

### Task 3: Edge Function `send-nap-push`

**Files:**
- Create: `packages/sleeper-web/supabase/functions/send-nap-push/due.ts` (czysta logika, zero Deno API)
- Create: `packages/sleeper-web/supabase/functions/send-nap-push/index.ts` (Deno)
- Create: `packages/sleeper-web/src/features/notifications/__tests__/push-due.test.ts` (vitest importuje `due.ts` relatywnie)

**Interfaces:**
- Consumes: tabele z Task 1; `family_members(user_id, family_id)`; sekrety `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` + wbudowane `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `classifyDue(candidate, now): 'send' | 'not-yet' | 'skip-expired' | 'already-delivered'`; `formatPushBody(nextSleepAt: Date, now: Date): string`; deployowalna funkcja HTTP.

- [ ] **Step 1: Failing testy `push-due.test.ts`**:

```ts
import { describe, expect, it } from 'vitest';

import { classifyDue, formatPushBody } from '../../../../supabase/functions/send-nap-push/due';

const NEXT = new Date('2026-07-12T11:00:00Z');

function candidate(leadMinutes: number, alreadyDelivered = false) {
  return { nextSleepAt: NEXT, leadMinutes, alreadyDelivered };
}

describe('classifyDue', () => {
  it('not-yet gdy za wczesnie (przed oknem lead)', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:30:00Z'))).toBe('not-yet');
  });

  it('send gdy w oknie [next-lead, next)', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:45:00Z'))).toBe('send');
    expect(classifyDue(candidate(15), new Date('2026-07-12T10:59:59Z'))).toBe('send');
  });

  it('skip-expired gdy next_sleep_at minal', () => {
    expect(classifyDue(candidate(15), new Date('2026-07-12T11:00:00Z'))).toBe('skip-expired');
  });

  it('already-delivered ma priorytet', () => {
    expect(classifyDue(candidate(15, true), new Date('2026-07-12T10:45:00Z'))).toBe(
      'already-delivered',
    );
  });

  it('respektuje lead_minutes per subskrypcja', () => {
    const now = new Date('2026-07-12T10:35:00Z');
    expect(classifyDue(candidate(30), now)).toBe('send');
    expect(classifyDue(candidate(15), now)).toBe('not-yet');
  });
});

describe('formatPushBody', () => {
  it('formatuje czas w Europe/Warsaw i zaokragla minuty', () => {
    // 11:00 UTC = 13:00 w Europe/Warsaw (CEST).
    expect(formatPushBody(NEXT, new Date('2026-07-12T10:46:00Z'))).toBe(
      'Rekomendowany sen ok. 13:00 (za ~14 min)',
    );
  });
});
```

- [ ] **Step 2: Run** → FAIL (brak pliku).

- [ ] **Step 3: `due.ts`**:

```ts
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
```

- [ ] **Step 4: Run testy** → PASS.

- [ ] **Step 5: `index.ts`** (Deno; weryfikacja sekretu → kandydaci → wysyłka → dedup → cleanup martwych subskrypcji):

```ts
// Edge function: wysyla Web Push "sen za ~X min" wg nap_schedule.
// Wywolywana przez pg_cron co 5 min (POST z naglowkiem x-cron-secret).
// Deploy/sekrety/cron: docs/runbook/sleeper-web-push.md.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@2';

import { classifyDue, formatPushBody } from './due.ts';

interface ScheduleRow {
  child_id: string;
  next_sleep_at: string;
  children: { name: string; family_id: string } | null;
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

  const rows = (schedules.data as ScheduleRow[]).filter((r) => r.children !== null);
  if (rows.length === 0) return Response.json({ sent: 0 });

  const familyIds = [...new Set(rows.map((r) => r.children!.family_id))];
  const members = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('family_id', familyIds);
  if (members.error) return new Response(members.error.message, { status: 500 });

  const userIds = [...new Set(members.data.map((m) => m.user_id))];
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
    .in('child_id', rows.map((r) => r.child_id));
  if (deliveries.error) return new Response(deliveries.error.message, { status: 500 });

  const delivered = new Set(
    deliveries.data.map(
      (d) => `${d.subscription_id}:${d.child_id}:${new Date(d.next_sleep_at).getTime()}`,
    ),
  );
  const usersByFamily = new Map<string, string[]>();
  for (const m of members.data) {
    const list = usersByFamily.get(m.family_id) ?? [];
    list.push(m.user_id);
    usersByFamily.set(m.family_id, list);
  }

  let sent = 0;
  const vapid = { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate };

  for (const row of rows) {
    const child = row.children;
    if (!child) continue;
    const nextSleepAt = new Date(row.next_sleep_at);
    const familyUsers = usersByFamily.get(child.family_id) ?? [];
    for (const sub of subs.data.filter((s) => familyUsers.includes(s.user_id))) {
      const key = `${sub.id}:${row.child_id}:${nextSleepAt.getTime()}`;
      const verdict = classifyDue(
        { nextSleepAt, leadMinutes: sub.lead_minutes, alreadyDelivered: delivered.has(key) },
        now,
      );
      if (verdict === 'not-yet' || verdict === 'already-delivered') continue;

      // Dedup PRZED wysylka (idempotencja crona): insert; konflikt = inny run wygral.
      const claim = await supabase.from('push_deliveries').insert({
        subscription_id: sub.id,
        child_id: row.child_id,
        next_sleep_at: row.next_sleep_at,
      });
      if (claim.error) continue; // 23505 = juz obsluzone przez rownolegly run

      if (verdict === 'skip-expired') continue; // wpis blokuje ponawianie, bez wysylki

      const message = {
        data: JSON.stringify({
          title: `${child.name} 😴`,
          body: formatPushBody(nextSleepAt, now),
        }),
      };
      const subscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        const res = await fetch(sub.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
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
```

(Wersję `@block65/webcrypto-web-push` zweryfikuj na npm przy implementacji — użyj aktualnej major; API `buildPushPayload(message, subscription, vapid)`.)

- [ ] **Step 6: Walidacja** — `pnpm --filter sleeper-web exec tsc --noEmit` (index.ts jest poza `src/`, tsc go nie widzi — OK; due.ts importowane przez test musi się kompilować) + testy PASS.

- [ ] **Step 7: Commit** `feat(push): edge function send-nap-push (VAPID + dedup + cron secret)` + docs/commits.

---

### Task 4: `lib/push.ts` + service worker + static invariants

**Files:**
- Create: `packages/sleeper-web/src/lib/push.ts`
- Modify: `packages/sleeper-web/public/sw.js` (handlery `push`/`notificationclick`, bump CACHE_NAME v8→v9)
- Create: `packages/sleeper-web/src/lib/__tests__/push.invariants.test.ts`

**Interfaces:**
- Produces: `getPushSupport(): 'ok' | 'needs-install' | 'unsupported'`; `getVapidPublicKey(): string | null`; `subscribeToPush(): Promise<PushSubscriptionKeys | 'permission-denied'>` gdzie `PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string }`; `getCurrentEndpoint(): Promise<string | null>`.

- [ ] **Step 1: Failing test `push.invariants.test.ts`**:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../..');
const swPath = path.resolve(srcRoot, '../public/sw.js');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('web push static invariants', () => {
  it('Notification/pushManager tylko w lib/push.ts (poza testami)', () => {
    const offenders = walk(srcRoot).filter((file) => {
      if (file.endsWith(path.join('lib', 'push.ts'))) return false;
      if (file.includes('__tests__')) return false;
      const source = readFileSync(file, 'utf-8');
      return /Notification\.requestPermission|pushManager/.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('sw.js ma handlery push i notificationclick', () => {
    const sw = readFileSync(swPath, 'utf-8');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
  });

  it('lib/push.ts nie importuje expo-notifications', () => {
    const source = readFileSync(path.resolve(srcRoot, 'lib/push.ts'), 'utf-8');
    expect(source).not.toContain('expo-notifications');
  });
});
```

- [ ] **Step 2: Run** → FAIL (brak lib/push.ts + brak handlerów w sw.js).

- [ ] **Step 3: `lib/push.ts`**:

```ts
// Web Push subscription wrapper — CALY dostep do Notification / PushManager
// zyje w tym pliku (wzorzec lib-wrapper dla platform API, patrz
// learned-patterns "Native-only API na web"). Konsumenci: usePushSettings.

export type PushSupport = 'ok' | 'needs-install' | 'unsupported';

export interface PushSubscriptionKeys {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export function getVapidPublicKey(): string | null {
  return process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari legacy: navigator.standalone (poza typami DOM — platform narrowing).
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function getPushSupport(): PushSupport {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return 'unsupported';
  }
  if ('PushManager' in window && 'Notification' in window) return 'ok';
  // iOS Safari wystawia PushManager TYLKO w zainstalowanym PWA (standalone).
  return isStandalone() ? 'unsupported' : 'needs-install';
}

// applicationServerKey wymaga Uint8Array z base64url (klucz z `npx web-push
// generate-vapid-keys`).
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getCurrentEndpoint(): Promise<string | null> {
  if (getPushSupport() !== 'ok') return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export async function subscribeToPush(): Promise<PushSubscriptionKeys | 'permission-denied'> {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) throw new Error('[push] Brak EXPO_PUBLIC_VAPID_PUBLIC_KEY w env');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'permission-denied';

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error('[push] Subskrypcja bez kluczy p256dh/auth');
  return { endpoint: subscription.endpoint, p256dh, auth };
}
```

- [ ] **Step 4: `sw.js`** — bump `const CACHE_NAME = 'sleeper-shell-v9';` i dopisz na końcu pliku:

```js
// Web Push: payload JSON { title, body } z edge function send-nap-push.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Sleeper', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Sleeper', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const client = clientList.find((c) => 'focus' in c);
        if (client) return client.focus();
        return self.clients.openWindow('/');
      }),
  );
});
```

- [ ] **Step 5: Run testy + tsc** → PASS.

- [ ] **Step 6: Commit** `feat(push): lib/push.ts wrapper + sw.js push handlers [no-changelog]` — uzasadnienie no-changelog: bez UI (Task 5) user nie ma jak włączyć; wpis changelog idzie z Task 5. + docs/commits.

---

### Task 5: UI — usePushSettings + NotificationsBottomSheet + profil + changelog

**Files:**
- Create: `packages/sleeper-web/src/features/notifications/usePushSettings.ts`
- Create: `packages/sleeper-web/src/features/notifications/NotificationsBottomSheet.tsx`
- Create: `packages/sleeper-web/src/features/notifications/__tests__/usePushSettings.test.ts`
- Modify: `packages/sleeper-web/src/app/(app)/profile.tsx` (podpięcie placeholdera "Przypomnienia")
- Modify: `packages/sleeper-web/public/changelog.json` (wpis v11 na górze)
- Modify: `packages/sleeper-web/app.json` + `packages/sleeper-web/package.json` (version 0.11.0)

**Interfaces:**
- Consumes: `getPushSupport`, `subscribeToPush`, `getCurrentEndpoint` z `@/lib/push` (Task 4); tabela `push_subscriptions` (Task 1); `useAuth` z `@/features/auth/AuthProvider`; wzorzec sheeta z `ThemeModeBottomSheet.tsx`.
- Produces: `usePushSettings(): { support, isLoading, isEnabled, leadMinutes, enable, disable, setLeadMinutes, permissionDenied }`; `<NotificationsBottomSheet visible onClose />`.

- [ ] **Step 1: Failing test `usePushSettings.test.ts`** — static invariants (spójnie z projektową strategią testowania hooków UI):

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(path.resolve(__dirname, '../usePushSettings.ts'), 'utf-8');
const sheetSource = readFileSync(
  path.resolve(__dirname, '../NotificationsBottomSheet.tsx'),
  'utf-8',
);
const profileSource = readFileSync(
  path.resolve(__dirname, '../../../app/(app)/profile.tsx'),
  'utf-8',
);

describe('usePushSettings static invariants', () => {
  it('dostep do push API wylacznie przez @/lib/push', () => {
    expect(hookSource).toContain("from '@/lib/push'");
    expect(hookSource).not.toMatch(/pushManager|Notification\.requestPermission/);
  });

  it('queryKey stabilny — literal push-settings, bez new Date()/Date.now() w kluczu', () => {
    expect(hookSource).toContain("['push-settings']");
    expect(hookSource).not.toMatch(/queryKey:\s*\[[^\]]*(new Date\(|Date\.now\()/);
  });

  it('upsert po endpoint (onConflict) — jedna subskrypcja per urzadzenie', () => {
    expect(hookSource).toContain("onConflict: 'endpoint'");
  });

  it('sheet uzywa hooka i nie dotyka supabase bezposrednio', () => {
    expect(sheetSource).toContain('usePushSettings');
    expect(sheetSource).not.toContain("from '@/lib/supabase'");
  });

  it('profil otwiera NotificationsBottomSheet zamiast placeholdera', () => {
    expect(profileSource).toContain('NotificationsBottomSheet');
    expect(profileSource).not.toContain('Placeholder — flow `expo-notifications`');
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: `usePushSettings.ts`**:

```ts
// Stan i akcje ustawien push per urzadzenie (wiersz push_subscriptions po
// endpoint biezacej subskrypcji SW). Query + 3 mutacje; UI: NotificationsBottomSheet.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  getCurrentEndpoint,
  getPushSupport,
  subscribeToPush,
  type PushSupport,
} from '@/lib/push';
import { supabase } from '@/lib/supabase';

export const LEAD_OPTIONS = [5, 10, 15, 20, 30] as const;

interface PushSettingsRow {
  readonly id: string;
  readonly enabled: boolean;
  readonly lead_minutes: number;
}

interface PushSettingsState {
  readonly support: PushSupport;
  readonly endpoint: string | null;
  readonly row: PushSettingsRow | null;
}

export interface UsePushSettingsResult {
  readonly support: PushSupport;
  readonly isLoading: boolean;
  readonly isEnabled: boolean;
  readonly leadMinutes: number;
  readonly permissionDenied: boolean;
  readonly enable: () => void;
  readonly disable: () => void;
  readonly setLeadMinutes: (minutes: number) => void;
}

async function fetchState(): Promise<PushSettingsState> {
  const support = getPushSupport();
  if (support !== 'ok') return { support, endpoint: null, row: null };
  const endpoint = await getCurrentEndpoint();
  if (!endpoint) return { support, endpoint: null, row: null };
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, enabled, lead_minutes')
    .eq('endpoint', endpoint)
    .maybeSingle();
  if (error) throw error;
  return { support, endpoint, row: data };
}

export function usePushSettings(): UsePushSettingsResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const query = useQuery({ queryKey: ['push-settings'], queryFn: fetchState });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['push-settings'] });

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Brak zalogowanego usera');
      const result = await subscribeToPush();
      if (result === 'permission-denied') {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: result.endpoint,
          p256dh: result.p256dh,
          auth: result.auth,
          enabled: true,
        },
        { onConflict: 'endpoint' },
      );
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const endpoint = query.data?.endpoint;
      if (!endpoint) return;
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ enabled: false })
        .eq('endpoint', endpoint);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const leadMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const endpoint = query.data?.endpoint;
      if (!endpoint) return;
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ lead_minutes: minutes })
        .eq('endpoint', endpoint);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return {
    support: query.data?.support ?? getPushSupport(),
    isLoading: query.isLoading || enableMutation.isPending,
    isEnabled: query.data?.row?.enabled === true,
    leadMinutes: query.data?.row?.lead_minutes ?? 15,
    permissionDenied,
    enable: () => enableMutation.mutate(),
    disable: () => disableMutation.mutate(),
    setLeadMinutes: (minutes: number) => leadMutation.mutate(minutes),
  };
}
```

- [ ] **Step 4: `NotificationsBottomSheet.tsx`** — wzorzec `ThemeModeBottomSheet` (RN `Modal` transparent + slide, backdrop-close, stop-propagation):

```tsx
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEAD_OPTIONS, usePushSettings } from './usePushSettings';

// Sheet ustawien powiadomien push (toggle per urzadzenie + wyprzedzenie).
// Wzorzec modala: ThemeModeBottomSheet (RN Modal, bez nowych zaleznosci).

interface NotificationsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsBottomSheet({ visible, onClose }: NotificationsBottomSheetProps) {
  const settings = usePushSettings();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zamknij ustawienia powiadomien"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end">
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView edges={['bottom']} className="bg-cream dark:bg-dark-card rounded-t-card">
            <View className="px-6 pt-5 pb-3">
              <Text className="text-base font-semibold text-navy dark:text-cream">
                Przypomnienia
              </Text>
              <Text className="mt-1 text-xs text-text-muted dark:text-cream/60">
                Push przed rekomendowanym snem — na tym urzadzeniu
              </Text>
            </View>

            {settings.support === 'needs-install' ? (
              <Text className="px-6 pb-6 text-sm text-text-muted dark:text-cream/60">
                Zainstaluj aplikacje na ekranie glownym (Udostepnij → Do ekranu
                poczatkowego), aby wlaczyc powiadomienia.
              </Text>
            ) : settings.support === 'unsupported' ? (
              <Text className="px-6 pb-6 text-sm text-text-muted dark:text-cream/60">
                Ta przegladarka nie wspiera powiadomien push.
              </Text>
            ) : (
              <View className="px-6 pb-6 gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-navy dark:text-cream">
                    Przypomnienie o snie
                  </Text>
                  <Switch
                    accessibilityLabel="Przypomnienie o snie"
                    value={settings.isEnabled}
                    disabled={settings.isLoading}
                    onValueChange={(value) => (value ? settings.enable() : settings.disable())}
                  />
                </View>

                {settings.permissionDenied ? (
                  <Text className="text-xs text-orange">
                    Brak zgody na powiadomienia. Wlacz je w Ustawienia iOS →
                    Powiadomienia → Sleeper i sprobuj ponownie.
                  </Text>
                ) : null}

                {settings.isEnabled ? (
                  <View className="gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Wyprzedzenie
                    </Text>
                    <View className="flex-row gap-2">
                      {LEAD_OPTIONS.map((minutes) => {
                        const isActive = minutes === settings.leadMinutes;
                        return (
                          <Pressable
                            key={minutes}
                            accessibilityRole="button"
                            accessibilityLabel={`${minutes} minut przed`}
                            accessibilityState={{ selected: isActive }}
                            onPress={() => settings.setLeadMinutes(minutes)}
                            className={`px-3 py-2 rounded-pill ${
                              isActive
                                ? 'bg-navy dark:bg-cream'
                                : 'bg-white dark:bg-dark-surface'
                            }`}>
                            <Text
                              className={`text-sm font-semibold ${
                                isActive
                                  ? 'text-cream dark:text-navy'
                                  : 'text-navy dark:text-cream'
                              }`}>
                              {minutes} min
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 5: `profile.tsx`** — import `NotificationsBottomSheet` + `usePushSettings`; nowy stan `const [notifSheetVisible, setNotifSheetVisible] = useState(false);`; w `ShortcutRow` "Przypomnienia": `value={pushSettings.isEnabled ? 'Wlaczone' : 'Wylaczone'}` i `onPress={() => setNotifSheetVisible(true)}` (usuwając placeholder comment); render `<NotificationsBottomSheet visible={notifSheetVisible} onClose={() => setNotifSheetVisible(false)} />` obok `ThemeModeBottomSheet`.

- [ ] **Step 6: changelog v11 + bump 0.11.0** — `public/changelog.json` na górze:

```json
{
  "v": 11,
  "version": "0.11.0",
  "date": "2026-07-12",
  "items": [
    "Powiadomienia push na telefon — aplikacja przypomni o zbliżającej się drzemce lub śnie nocnym, także gdy jest zamknięta (wymaga zainstalowanej aplikacji na ekranie głównym)",
    "Nowe ustawienia w Profilu → Przypomnienia: włączanie powiadomień na tym urządzeniu i wybór, ile minut przed snem ma przyjść przypomnienie (5–30 min)"
  ]
}
```

Plus `"version": "0.11.0"` w `app.json` i `package.json`.

- [ ] **Step 7: Run** wszystkie testy + tsc → PASS.

- [ ] **Step 8: Commit** `feat(web): powiadomienia push o zblizajacym sie snie (toggle w Profilu)` — zawiera changelog + bump (hook przepuści). + docs/commits.

---

### Task 6: Runbook + walidacja końcowa

**Files:**
- Create: `docs/runbook/sleeper-web-push.md`
- Modify: `docs/runbook/sleeper-web-deploy.md` (odnośnik do push runbooka, jeśli plik ma sekcję "powiązane")

**Interfaces:** brak (dokumentacja + walidacja).

- [ ] **Step 1: Runbook** — kroki jednorazowe (user): `npx web-push generate-vapid-keys`; `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:dawid.bakalarski@gmail.com CRON_SECRET=$(openssl rand -hex 32)`; `EXPO_PUBLIC_VAPID_PUBLIC_KEY` w Vercel env + lokalny `.env`; `supabase db push`; `supabase functions deploy send-nap-push`; SQL cron (dashboard, jednorazowo):

```sql
select cron.schedule(
  'send-nap-push-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-nap-push',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$
);
```

(wymaga rozszerzeń `pg_cron` + `pg_net` włączonych w dashboardzie) + sekcja debug (sprawdzanie `cron.job_run_details`, logi edge function, tabela `push_deliveries`) + manual smoke checklist (zainstalowane PWA → toggle → zgoda → zakończ drzemkę → push przy zamkniętej apce).

- [ ] **Step 2: Pełna walidacja** — `pnpm web:build:check` → PASS; `pnpm --filter sleeper-machine test`, `pnpm --filter sleeper-machine-kotki test` → PASS (nietknięte, sanity).

- [ ] **Step 3: Commit** `docs(runbook): web push — VAPID, sekrety, cron, smoke` + docs/commits (jeśli commit zawiera tylko docs, jeden wpis wystarczy).

## Self-review (wykonany)

- Spec coverage: migracja+RLS (T1), harmonogram klienta (T2), edge function+dedup+410 cleanup (T3), lib/push+sw.js (T4), UI+changelog (T5), runbook/ops (T6). Edge case'y ze specu pokryte: expired→skip (T3 due.ts + delivery-claim), sesja w toku→null (T2), permission denied (T5), needs-install (T4/T5).
- Placeholders: brak TBD; wersja biblioteki webcrypto-web-push oznaczona do weryfikacji przy implementacji (świadomie — npm wersjonowanie).
- Typy spójne: `PushSubscriptionKeys` (T4→T5), `classifyDue`/`formatPushBody` (T3), `recomputeNapSchedule` (T2), `LEAD_OPTIONS` (T5).
