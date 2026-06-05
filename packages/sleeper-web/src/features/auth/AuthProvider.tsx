import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue =
  | { status: 'loading'; session: null; user: null }
  | { status: 'signed_out'; session: null; user: null }
  | { status: 'signed_in'; session: Session; user: User };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'signed_out' | 'signed_in'>('loading');

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setStatus(data.session ? 'signed_in' : 'signed_out');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[auth] getSession failed', err);
        setSession(null);
        setStatus('signed_out');
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setStatus(newSession ? 'signed_in' : 'signed_out');
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    if (status === 'loading') {
      return { status: 'loading', session: null, user: null };
    }
    if (status === 'signed_in' && session) {
      return { status: 'signed_in', session, user: session.user };
    }
    return { status: 'signed_out', session: null, user: null };
  }, [status, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
