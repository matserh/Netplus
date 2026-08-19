'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface GuestContextType {
  isGuest: boolean;
  guestId: string;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const STORAGE_KEY = 'netplus_guest_mode';
const GUEST_ID_KEY = 'netplus_guest_id';

const GuestContext = createContext<GuestContextType | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setIsGuest(true);
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    setGuestId(id);
  }, []);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    if (!localStorage.getItem(GUEST_ID_KEY)) {
      const id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
      setGuestId(id);
    }
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_ID_KEY);
    setGuestId('');
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, guestId, enterGuestMode, exitGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuest must be used within GuestProvider');
  return context;
}
