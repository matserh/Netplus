'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface WatchHistoryEntry {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  // Progress tracking
  progress: number; // 0-100 percentage
  timestamp: number; // seconds into the content
  duration: number; // estimated total seconds (if known)
  // TV-specific
  season?: number;
  episode?: number;
  episodeTitle?: string;
  // Metadata
  lastWatched: number; // timestamp (Date.now())
  genreIds?: number[];
  voteAverage?: number;
  year?: string;
}

interface WatchHistoryContextType {
  history: WatchHistoryEntry[];
  addToHistory: (entry: Omit<WatchHistoryEntry, 'lastWatched'>) => void;
  updateProgress: (id: number, mediaType: string, progress: number, timestamp: number, duration?: number, season?: number, episode?: number, episodeTitle?: string) => void;
  getHistoryEntry: (id: number, mediaType: string) => WatchHistoryEntry | undefined;
  removeFromHistory: (id: number, mediaType: string) => void;
  clearHistory: () => void;
  getContinueWatching: (limit?: number) => WatchHistoryEntry[];
  isWatched: (id: number, mediaType: string) => boolean;
}

const WatchHistoryContext = createContext<WatchHistoryContextType | null>(null);

const STORAGE_KEY = 'netplus-watch-history';
const MAX_HISTORY = 200;

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable
    }
  }, [history]);

  const addToHistory = useCallback((entry: Omit<WatchHistoryEntry, 'lastWatched'>) => {
    setHistory(prev => {
      // Remove existing entry for this content
      const filtered = prev.filter(
        h => !(h.id === entry.id && h.mediaType === entry.mediaType)
      );

      // Add new entry at the beginning
      const newEntry: WatchHistoryEntry = {
        ...entry,
        lastWatched: Date.now(),
      };

      // Keep only MAX_HISTORY entries
      return [newEntry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const updateProgress = useCallback((
    id: number,
    mediaType: string,
    progress: number,
    timestamp: number,
    duration?: number,
    season?: number,
    episode?: number,
    episodeTitle?: string
  ) => {
    setHistory(prev => {
      const index = prev.findIndex(
        h => h.id === id && h.mediaType === mediaType
      );

      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        progress,
        timestamp,
        duration: duration || updated[index].duration,
        season: season !== undefined ? season : updated[index].season,
        episode: episode !== undefined ? episode : updated[index].episode,
        episodeTitle: episodeTitle !== undefined ? episodeTitle : updated[index].episodeTitle,
        lastWatched: Date.now(),
      };

      return updated;
    });
  }, []);

  const getHistoryEntry = useCallback((id: number, mediaType: string) => {
    return history.find(h => h.id === id && h.mediaType === mediaType);
  }, [history]);

  const removeFromHistory = useCallback((id: number, mediaType: string) => {
    setHistory(prev => prev.filter(h => !(h.id === id && h.mediaType === mediaType)));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getContinueWatching = useCallback((limit: number = 10): WatchHistoryEntry[] => {
    return history
      .filter(h => h.progress > 0 && h.progress < 95) // Not finished
      .sort((a, b) => b.lastWatched - a.lastWatched)
      .slice(0, limit);
  }, [history]);

  const isWatched = useCallback((id: number, mediaType: string) => {
    return history.some(h => h.id === id && h.mediaType === mediaType);
  }, [history]);

  return (
    <WatchHistoryContext.Provider value={{
      history,
      addToHistory,
      updateProgress,
      getHistoryEntry,
      removeFromHistory,
      clearHistory,
      getContinueWatching,
      isWatched,
    }}>
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) throw new Error('useWatchHistory must be used within WatchHistoryProvider');
  return context;
}
