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

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['push-settings'] });
  };

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
