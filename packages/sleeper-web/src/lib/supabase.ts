import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail-fast podczas dev. Brak kluczy = blad konfiguracji srodowiska.
  console.warn(
    '[supabase] Brak EXPO_PUBLIC_SUPABASE_URL lub EXPO_PUBLIC_SUPABASE_ANON_KEY w .env',
  );
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web PWA: parsujemy `#access_token=...` z URL dla magic link / OAuth callback /
    // password reset flow. Mobile (sleeper-app) ma `false` bo OAuth tam idzie przez
    // expo-web-browser + Linking.parse(url) manual.
    detectSessionInUrl: true,
  },
});
