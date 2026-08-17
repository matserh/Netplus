/**
 * Capacitor Platform Helper
 * Provides safe access to native Capacitor APIs with web fallbacks
 */

import { Capacitor } from '@capacitor/core';

// Lazy-load plugins only when running natively
const getPlugins = () => {
  if (!Capacitor.isNativePlatform()) return null;
  return {
    get StatusBar() { return require('@capacitor/status-bar').StatusBar; },
    get SplashScreen() { return require('@capacitor/splash-screen').SplashScreen; },
    get Haptics() { return require('@capacitor/haptics').Haptics; },
    get Network() { return require('@capacitor/network').Network; },
    get Preferences() { return require('@capacitor/preferences').Preferences; },
    get Keyboard() { return require('@capacitor/keyboard').Keyboard; },
    get App() { return require('@capacitor/app').App; },
  };
};

/** Check if running as a native app */
export const isNative = Capacitor.isNativePlatform;

/** Get the current platform name */
export const getPlatform = Capacitor.getPlatform;

/** Initialize native features on app startup */
export async function initNativeFeatures() {
  if (!isNative()) return;

  const plugins = getPlugins();
  if (!plugins) return;

  // Configure status bar for dark theme
  try {
    await plugins.StatusBar.setStyle({ style: 'DARK' });
    await plugins.StatusBar.setBackgroundColor({ color: '#0f0f23' });
  } catch (e) {
    console.warn('StatusBar not available:', e);
  }

  // Hide splash screen after app is ready
  try {
    await plugins.SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('SplashScreen not available:', e);
  }
}

/** Trigger haptic feedback */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative()) return;
  const plugins = getPlugins();
  if (!plugins) return;

  try {
    const { ImpactStyle } = require('@capacitor/haptics');
    await plugins.Haptics.impact({ style: ImpactStyle[style.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY'] });
  } catch (e) {
    console.warn('Haptics not available:', e);
  }
}

/** Check network connectivity */
export async function getNetworkStatus() {
  if (!isNative()) {
    return { connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' };
  }

  const plugins = getPlugins();
  if (!plugins) return { connected: navigator.onLine, connectionType: 'unknown' };

  try {
    const status = await plugins.Network.getStatus();
    return { connected: status.connected, connectionType: status.connectionType };
  } catch (e) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
}

/** Get/set persistent preferences (native key-value store) */
export const preferences = {
  async get(key: string): Promise<string | null> {
    if (!isNative()) {
      return localStorage.getItem(`netplus_${key}`);
    }
    const plugins = getPlugins();
    if (!plugins) return localStorage.getItem(`netplus_${key}`);

    try {
      const result = await plugins.Preferences.get({ key: `netplus_${key}` });
      return result.value;
    } catch (e) {
      return localStorage.getItem(`netplus_${key}`);
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (!isNative()) {
      localStorage.setItem(`netplus_${key}`, value);
      return;
    }
    const plugins = getPlugins();
    if (!plugins) { localStorage.setItem(`netplus_${key}`, value); return; }

    try {
      await plugins.Preferences.set({ key: `netplus_${key}`, value });
    } catch (e) {
      localStorage.setItem(`netplus_${key}`, value);
    }
  },

  async remove(key: string): Promise<void> {
    if (!isNative()) {
      localStorage.removeItem(`netplus_${key}`);
      return;
    }
    const plugins = getPlugins();
    if (!plugins) { localStorage.removeItem(`netplus_${key}`); return; }

    try {
      await plugins.Preferences.remove({ key: `netplus_${key}` });
    } catch (e) {
      localStorage.removeItem(`netplus_${key}`);
    }
  },
};

/** Manage the native keyboard */
export const keyboard = {
  async hide() {
    if (!isNative()) return;
    const plugins = getPlugins();
    if (!plugins) return;
    try { await plugins.Keyboard.hide(); } catch (e) { /* ignore */ }
  },
  async show() {
    if (!isNative()) return;
    const plugins = getPlugins();
    if (!plugins) return;
    try { await plugins.Keyboard.show(); } catch (e) { /* ignore */ }
  },
};

export default {
  isNative,
  getPlatform,
  initNativeFeatures,
  hapticImpact,
  getNetworkStatus,
  preferences,
  keyboard,
};
