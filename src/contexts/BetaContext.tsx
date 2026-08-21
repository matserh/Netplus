'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from '@/contexts/AuthContext';

// Client-side admin emails (must match beta-config.ts ADMIN_EMAILS)
const ADMIN_EMAILS = ['matserhkevin12@gmail.com', 'devmaestro@puter.com'];
function isClientAdmin(email: string): boolean {
  const n = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(a => a.toLowerCase() === n);
}

export interface BetaInfo {
  hasAccess: boolean;
  isAdmin: boolean;
  betaMode: boolean;
  reason?: 'not_authenticated' | 'invalid_session' | 'banned' | 'paused' | 'no_access' | 'error';
}

interface BetaContextType extends BetaInfo {
  loading: boolean;
  refresh: () => Promise<void>;
}

const BetaContext = createContext<BetaContextType | null>(null);

export function BetaProvider({ children }: { children: ReactNode }) {
  const { data: session, status: authStatus } = useSession();
  const [betaInfo, setBetaInfo] = useState<BetaInfo>({
    hasAccess: false,
    isAdmin: false,
    betaMode: true,
    reason: 'not_authenticated',
  });
  const [loading, setLoading] = useState(true);

  const checkBeta = useCallback(async () => {
    setLoading(true);
    let apiSucceeded = false;

    try {
      const res = await fetch('/api/beta/check');
      if (res.ok) {
        const data = await res.json();
        setBetaInfo(data);
        apiSucceeded = true;
      }
    } catch {
      // API failed — will use client-side fallback
    }

    // CLIENT-SIDE FALLBACK: if API failed and user is admin, grant access locally
    if (!apiSucceeded && session?.user?.email && isClientAdmin(session.user.email)) {
      console.log('[BetaContext] API failed, using client-side admin fallback for', session.user.email);
      setBetaInfo({ hasAccess: true, isAdmin: true, betaMode: true });
    }

    setLoading(false);
  }, [session?.user?.email]);

  // Run beta check when auth status changes (session becomes available)
  useEffect(() => {
    if (authStatus === 'loading') return;
    checkBeta();
  }, [authStatus, checkBeta]);

  // Also refresh when window gains focus
  useEffect(() => {
    const handler = () => checkBeta();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [checkBeta]);

  return (
    <BetaContext.Provider value={{ ...betaInfo, loading, refresh: checkBeta }}>
      {children}
    </BetaContext.Provider>
  );
}

export function useBeta() {
  const ctx = useContext(BetaContext);
  if (!ctx) throw new Error('useBeta must be used within BetaProvider');
  return ctx;
}