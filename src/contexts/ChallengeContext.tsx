'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { ADMIN_EMAILS } from '@/lib/beta-config';

interface ChallengeState {
  // Task 1: Talk with Maître Netplus
  hasChattedWithAI: boolean;
  chatMessageCount: number;
  // Task 2: Watch an anime/content for a few seconds
  hasWatchedContent: boolean;
  watchSeconds: number;
  // Task 3: Scroll 5 times on homepage
  scrollCount: number;
  hasScrolledEnough: boolean;
  // Access control
  watchCount: number; // how many contents watched
  isPremium: boolean; // unlocked after completing all 3 tasks
}

interface ChallengeContextType extends ChallengeState {
  // Trackers
  recordAIChat: () => void;
  recordWatchStart: () => void;
  recordWatchSeconds: (seconds: number) => void;
  recordScroll: () => void;
  incrementWatchCount: () => boolean; // returns false if blocked (limit reached)
  canWatch: () => boolean;
  resetChallenges: () => void;
  getProgress: () => number; // 0-3 tasks completed
  BASIC_LIMIT: number;
  isLoaded: boolean; // true once localStorage state has been hydrated
  isAdminUser: boolean;
  getUserLimit: () => number;
}

const STORAGE_KEY = 'netplus_challenges';
const BASIC_LIMIT = 10;
const REQUIRED_SCROLLS = 5;
const REQUIRED_WATCH_SECONDS = 5;

const defaultState: ChallengeState = {
  hasChattedWithAI: false,
  chatMessageCount: 0,
  hasWatchedContent: false,
  watchSeconds: 0,
  scrollCount: 0,
  hasScrolledEnough: false,
  watchCount: 0,
  isPremium: false,
};

function loadState(): ChallengeState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = { ...defaultState, ...parsed };
      // Recalculate isPremium from task flags to ensure consistency
      // This fixes the bug where isPremium could be stale/wrong after localStorage load
      merged.isPremium = checkPremium(merged);
      return merged;
    }
  } catch {}
  return defaultState;
}

function saveState(state: ChallengeState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function checkPremium(state: ChallengeState): boolean {
  return state.hasChattedWithAI && state.hasWatchedContent && state.hasScrolledEnough;
}

const ChallengeContext = createContext<ChallengeContextType | null>(null);

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChallengeState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session, status } = useSession();

  // Admin check
  const isAdminUser = useMemo(() => {
    if (status !== 'authenticated' || !session?.user?.email) return false;
    return ADMIN_EMAILS.some(a => a.toLowerCase() === session.user.email.toLowerCase());
  }, [status, session?.user?.email]);

  // Dynamic user limit based on tier
  const getUserLimit = useCallback((): number => {
    if (isAdminUser) return Infinity;
    const effectivePremium = checkPremium(state);
    if (effectivePremium) return Infinity;
    if (status === 'authenticated') return 20;
    return 10; // guest/basic
  }, [isAdminUser, state, status]);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setIsLoaded(true);
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (state !== defaultState) {
      saveState(state);
    }
  }, [state]);

  const recordAIChat = useCallback(() => {
    setState(prev => {
      const newChatCount = prev.chatMessageCount + 1;
      const hasChatted = newChatCount >= 1;
      const newState = {
        ...prev,
        chatMessageCount: newChatCount,
        hasChattedWithAI: hasChatted,
      };
      newState.isPremium = checkPremium(newState);
      return newState;
    });
  }, []);

  const recordWatchStart = useCallback(() => {
    // Called when user opens the watch page
  }, []);

  const recordWatchSeconds = useCallback((seconds: number) => {
    setState(prev => {
      const newSeconds = Math.max(prev.watchSeconds, seconds);
      const hasWatched = newSeconds >= REQUIRED_WATCH_SECONDS;
      const newState = {
        ...prev,
        watchSeconds: newSeconds,
        hasWatchedContent: hasWatched,
      };
      newState.isPremium = checkPremium(newState);
      return newState;
    });
  }, []);

  const recordScroll = useCallback(() => {
    setState(prev => {
      const newScrollCount = prev.scrollCount + 1;
      const hasScrolled = newScrollCount >= REQUIRED_SCROLLS;
      const newState = {
        ...prev,
        scrollCount: newScrollCount,
        hasScrolledEnough: hasScrolled,
      };
      newState.isPremium = checkPremium(newState);
      return newState;
    });
  }, []);

  const incrementWatchCount = useCallback((): boolean => {
    // Admin always allowed
    if (isAdminUser) return true;
    // Use functional update to avoid stale closure over state
    let allowed = false;
    setState(prev => {
      const limit = getUserLimit();
      const canIncrement = checkPremium(prev) || prev.watchCount < limit;
      if (canIncrement) {
        allowed = true;
        return { ...prev, watchCount: prev.watchCount + 1 };
      }
      return prev;
    });
    return allowed;
  }, [isAdminUser, getUserLimit]);

  const canWatch = useCallback((): boolean => {
    // Admin always allowed
    if (isAdminUser) return true;
    // Recalculate isPremium from task flags to prevent stale premium state
    const effectivePremium = checkPremium(state);
    if (effectivePremium) return true;
    const limit = getUserLimit();
    return state.watchCount < limit;
  }, [isAdminUser, state, getUserLimit]);

  const resetChallenges = useCallback(() => {
    setState(defaultState);
    saveState(defaultState);
  }, []);

  const getProgress = useCallback((): number => {
    let count = 0;
    if (state.hasChattedWithAI) count++;
    if (state.hasWatchedContent) count++;
    if (state.hasScrolledEnough) count++;
    return count;
  }, [state.hasChattedWithAI, state.hasWatchedContent, state.hasScrolledEnough]);

  return (
    <ChallengeContext.Provider value={{
      ...state,
      recordAIChat,
      recordWatchStart,
      recordWatchSeconds,
      recordScroll,
      incrementWatchCount,
      canWatch,
      resetChallenges,
      getProgress,
      BASIC_LIMIT,
      isLoaded,
      isAdminUser,
      getUserLimit,
    }}>
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenge must be used within a ChallengeProvider');
  }
  return context;
}
