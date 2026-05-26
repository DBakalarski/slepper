import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

type HealthStatus = 'checking' | 'ok' | 'unauthorized' | 'error';

export default function TodayScreen() {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const { error } = await supabase.from('_health').select('*').limit(1).abortSignal(controller.signal);

      if (controller.signal.aborted) return;

      if (!error) {
        setStatus('ok');
        setDetail('Klient polaczony, _health istnieje.');
        return;
      }

      // PGRST205 / 42P01 = "relation does not exist" => klient dziala, brak tabeli to OK na tym etapie
      if (error.code === 'PGRST205' || error.code === '42P01') {
        setStatus('ok');
        setDetail('Klient polaczony (brak tabeli _health to oczekiwane).');
        return;
      }

      if (error.message?.toLowerCase().includes('jwt') || error.message?.toLowerCase().includes('unauthorized')) {
        setStatus('unauthorized');
        setDetail(error.message);
        return;
      }

      setStatus('error');
      setDetail(`${error.code ?? '?'}: ${error.message}`);
    })();

    return () => controller.abort();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-navy">Dzisiaj</Text>
        <Text className="mt-2 text-base text-purple">Tu pojawi sie widok dnia.</Text>

        <View className="mt-8 w-full rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-navy">Supabase health</Text>
          <Text className="mt-1 text-sm text-navy">
            Status:{' '}
            <Text className={statusColor(status)}>
              {statusLabel(status)}
            </Text>
          </Text>
          {detail ? <Text className="mt-1 text-xs text-purple">{detail}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case 'checking': return 'sprawdzam...';
    case 'ok': return 'OK';
    case 'unauthorized': return '401 (zle klucze)';
    case 'error': return 'blad';
  }
}

function statusColor(status: HealthStatus): string {
  switch (status) {
    case 'ok': return 'text-purple font-semibold';
    case 'unauthorized':
    case 'error': return 'text-orange font-semibold';
    case 'checking': return 'text-navy';
  }
}
