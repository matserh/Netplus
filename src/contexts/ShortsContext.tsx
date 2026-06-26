'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ShortsContextType {
  shortModeEnabled: boolean;
  toggleShortMode: () => void;
}

const ShortsContext = createContext<ShortsContextType | null>(null);

const STORAGE_KEY = 'netplus-short-mode';

export function ShortsProvider({ children }: { children: ReactNode }) {
  const [shortModeEnabled, setShortModeEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setShortModeEnabled(true);
  }, []);

  const toggleShortMode = () => {
    setShortModeEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <ShortsContext.Provider value={{ shortModeEnabled, toggleShortMode }}>
      {children}
    </ShortsContext.Provider>
  );
}

export function useShortsMode() {
  const context = useContext(ShortsContext);
  if (!context) throw new Error('useShortsMode must be used within ShortsProvider');
  return context;
}
