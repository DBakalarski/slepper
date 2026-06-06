import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// PRE-PROD hardening (IU11): production build bez env vars = misconfig (np. brak Vercel env)
// → throw build-time aby zatrzymac deploy. W dev pozostawiamy `console.warn` zeby smoke test
// `pnpm start --web` bez `.env` nadal dawal czytelny komunikat zamiast crashu w runtime.
// (Faza 1 P3 — env warn vs throw, fix przed Faza 4 deploy.)
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in production build. Configure Vercel env vars.',
    );
  }
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
    // PKCE flow: zamiast implicit (ktore leakuje `access_token` w URL fragment do
    // history API + Referer headers + browser extensions), uzywamy code-exchange.
    // Best practice dla web PWA (Supabase docs). Wymaga `detectSessionInUrl: true`
    // do obsluzenia callback URL po redirect z Supabase Auth.
    // (Faza 1 P2.1 — Security hardening przed deploy.)
    flowType: 'pkce',
  },
});
