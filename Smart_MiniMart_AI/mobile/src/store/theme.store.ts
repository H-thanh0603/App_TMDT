import { create } from 'zustand';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

const KEY = 'theme_preference';

function resolveScheme(pref: ThemePreference): ColorScheme {
  if (pref === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return pref;
}

interface ThemeState {
  preference: ThemePreference;
  scheme: ColorScheme;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (pref: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
  syncSystem: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  scheme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  hydrated: false,

  hydrate: async () => {
    try {
      const saved = await SecureStore.getItemAsync(KEY);
      const preference = (saved as ThemePreference) || 'system';
      if (preference === 'light' || preference === 'dark' || preference === 'system') {
        set({ preference, scheme: resolveScheme(preference), hydrated: true });
        return;
      }
    } catch { /* ignore */ }
    set({ hydrated: true, scheme: resolveScheme('system') });
  },

  setPreference: async (preference) => {
    set({ preference, scheme: resolveScheme(preference) });
    try {
      await SecureStore.setItemAsync(KEY, preference);
    } catch { /* ignore */ }
  },

  toggle: async () => {
    const next: ThemePreference = get().scheme === 'dark' ? 'light' : 'dark';
    await get().setPreference(next);
  },

  syncSystem: () => {
    if (get().preference === 'system') {
      set({ scheme: resolveScheme('system') });
    }
  },
}));
