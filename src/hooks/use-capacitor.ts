/**
 * React hooks for Capacitor native features
 * Provides convenient hooks that work on both web and native platforms
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  isNative,
  getPlatform,
  initNativeFeatures,
  hapticImpact,
  getNetworkStatus,
  preferences,
} from '@/lib/capacitor';

/** Hook to check if running as a native app */
export function useNativePlatform() {
  return {
    isNative: isNative(),
    platform: getPlatform(),
  };
}

/** Hook to initialize native features on mount */
export function useNativeInit() {
  useEffect(() => {
    initNativeFeatures();
  }, []);
}

/** Hook for haptic feedback */
export function useHaptic() {
  const trigger = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    hapticImpact(style);
  }, []);

  return { haptic: trigger };
}

/** Hook for network status with real-time updates */
export function useNetworkStatus() {
  const [status, setStatus] = useState<{ connected: boolean; connectionType: string }>({
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    // Initial check
    getNetworkStatus().then(setStatus);

    // Listen for changes
    const handleOnline = () => setStatus({ connected: true, connectionType: 'wifi' });
    const handleOffline = () => setStatus({ connected: false, connectionType: 'none' });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/** Hook for persistent preferences */
export function usePreference(key: string, defaultValue: string = '') {
  const [value, setValue] = useState<string>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    preferences.get(key).then((stored) => {
      setValue(stored ?? defaultValue);
      setLoaded(true);
    });
  }, [key, defaultValue]);

  const set = useCallback(async (newValue: string) => {
    setValue(newValue);
    await preferences.set(key, newValue);
  }, [key]);

  const remove = useCallback(async () => {
    setValue(defaultValue);
    await preferences.remove(key);
  }, [key, defaultValue]);

  return { value, set, remove, loaded };
}
