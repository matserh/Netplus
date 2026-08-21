'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { isAdmin } from '@/lib/beta-config';

export interface BetaInfo {
  hasAccess: boolean;
  isAdmin: boolean;
  betaMode: boolean;
  reason?: 'not_authenticated' | 'invalid_session' | 'banned' | 'paused' | 'no_access' | 'error';
}

interface BetaContextType extends BetaInfo {
  refresh: () => Promise<void>;
}

const BetaContext = createContext<BetaContextType | null>(null);

export function BetaProvider({ children }: { children: ReactNode }) {
  const [betaInfo, setBetaInfo] = useState<BetaInfo>({
    hasAccess: false,
    isAdmin: false,
    betaMode: true,
    reason: 'not_authenticated',
  });

  const checkBeta = useCallback(async () => {
    try {
      const res = await fetch('/api/beta/check');
      if (res.ok) {
        const data = await res.json();
        setBetaInfo(data);
      }
    } catch {
      // Silently fail — will show beta access page
    }
  }, []);

  useEffect(() => { checkBeta(); }, [checkBeta]);

  // Also refresh when window gains focus (user might have been unbanned etc.)
  useEffect(() => {
    const handler = () => checkBeta();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [checkBeta]);

  return (
    <BetaContext.Provider value={{ ...betaInfo, refresh: checkBeta }}>
      {children}
    </BetaContext.Provider>
  );
}

export function useBeta() {
  const ctx = useContext(BetaContext);
  if (!ctx) throw new Error('useBeta must be used within BetaProvider');
  return ctx;
}