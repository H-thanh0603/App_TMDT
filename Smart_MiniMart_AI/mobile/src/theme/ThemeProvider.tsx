import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Appearance, StyleSheet, View, type ViewStyle } from 'react-native';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { getColors, type ThemeColors } from './colors';
import { useThemeStore, type ColorScheme } from '@/store/theme.store';

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ColorScheme;
  isDark: boolean;
  preference: 'light' | 'dark' | 'system';
  setPreference: (p: 'light' | 'dark' | 'system') => Promise<void>;
  toggle: () => Promise<void>;
  navigationTheme: NavTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useThemeStore((s) => s.preference);
  const scheme = useThemeStore((s) => s.scheme);
  const hydrate = useThemeStore((s) => s.hydrate);
  const setPreference = useThemeStore((s) => s.setPreference);
  const toggle = useThemeStore((s) => s.toggle);
  const syncSystem = useThemeStore((s) => s.syncSystem);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => syncSystem());
    return () => sub.remove();
  }, [syncSystem]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getColors(scheme);
    const isDark = scheme === 'dark';
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    const navigationTheme: NavTheme = {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
    return {
      colors,
      scheme,
      isDark,
      preference,
      setPreference,
      toggle,
      navigationTheme,
    };
  }, [scheme, preference, setPreference, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: value.colors.bg }}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback outside provider (tests / early render)
    const colors = getColors('light');
    return {
      colors,
      scheme: 'light',
      isDark: false,
      preference: 'system',
      setPreference: async () => undefined,
      toggle: async () => undefined,
      navigationTheme: NavDefaultTheme,
    };
  }
  return ctx;
}

/** StyleSheet factory — re-create styles when theme changes */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (c: ThemeColors, isDark: boolean) => T,
): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, isDark)), [colors, isDark, factory]);
}

export function themedSurfaceStyle(colors: ThemeColors): ViewStyle {
  return { flex: 1, backgroundColor: colors.bg };
}
