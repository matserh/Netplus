'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ---- Types ----

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  data: Session | null;
  status: SessionStatus;
  update: () => Promise<Session | null>;
  signOut: (opts?: { callbackUrl?: string; redirect?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const fetchSession = useCallback(async (): Promise<Session | null> => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) { setSession(null); setStatus('unauthenticated'); return null; }
      const data = await res.json();
      if (data && data.user) {
        const s: Session = { user: data.user, expires: data.expires };
        setSession(s);
        setStatus('authenticated');
        return s;
      }
      setSession(null);
      setStatus('unauthenticated');
      return null;
    } catch {
      setSession(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  // Fetch session on mount
  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Also listen for storage events (logout from another tab)
  useEffect(() => {
    const handler = () => fetchSession();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [fetchSession]);

  const signOut = useCallback(async (opts?: { callbackUrl?: string; redirect?: boolean }) => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl: opts?.callbackUrl || '/login', csrfToken: 'x', json: true }),
      });
    } catch { /* ignore */ }
    setSession(null);
    setStatus('unauthenticated');
    if (opts?.redirect !== false) {
      window.location.href = opts?.callbackUrl || '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ data: session, status, update: fetchSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook ----

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within AuthProvider');
  return ctx;
}

export function useSignOut() {
  const { signOut } = useSession();
  return signOut;
}