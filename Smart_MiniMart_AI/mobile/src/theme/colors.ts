/**
 * Smart MiniMart AI - Brand Color System
 * Light + Dark tokens (Emerald primary + Violet AI + Gold)
 */

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  ai: string;
  aiDark: string;
  aiLight: string;
  aiSoft: string;
  gold: string;
  goldLight: string;
  goldSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  bg: string;
  bgAlt: string;
  bgSecondary: string;
  card: string;
  surface: string;
  border: string;
  borderLight: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  textInverse: string;
  secondary: string;
  roleCustomer: string;
  roleStaff: string;
  roleAdmin: string;
  roleAiManager: string;
  accent: string;
  expWarning: string;
  overlay: string;
  shadow: string;
  skeleton: string;
  dangerSoft: string;
};

export const lightColors: ThemeColors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primarySoft: '#D1FAE5',
  ai: '#8B5CF6',
  aiDark: '#7C3AED',
  aiLight: '#A78BFA',
  aiSoft: '#EDE9FE',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  goldSoft: '#FEF3C7',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  bg: '#F8FAFC',
  bgAlt: '#F1F5F9',
  bgSecondary: '#F1F5F9',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  secondary: '#3B82F6',
  roleCustomer: '#10B981',
  roleStaff: '#3B82F6',
  roleAdmin: '#8B5CF6',
  roleAiManager: '#F59E0B',
  accent: '#8B5CF6',
  expWarning: '#F59E0B',
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(15, 23, 42, 0.08)',
  skeleton: '#E2E8F0',
  dangerSoft: '#FEE2E2',
};

export const darkColors: ThemeColors = {
  primary: '#34D399',
  primaryDark: '#10B981',
  primaryLight: '#6EE7B7',
  primarySoft: '#064E3B',
  ai: '#A78BFA',
  aiDark: '#8B5CF6',
  aiLight: '#C4B5FD',
  aiSoft: '#2E1065',
  gold: '#FBBF24',
  goldLight: '#FCD34D',
  goldSoft: '#78350F',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  bg: '#0B1220',
  bgAlt: '#111827',
  bgSecondary: '#0F172A',
  card: '#1E293B',
  surface: '#1E293B',
  border: '#334155',
  borderLight: '#1F2937',
  divider: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  secondary: '#60A5FA',
  roleCustomer: '#34D399',
  roleStaff: '#60A5FA',
  roleAdmin: '#A78BFA',
  roleAiManager: '#FBBF24',
  accent: '#A78BFA',
  expWarning: '#FBBF24',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(0, 0, 0, 0.45)',
  skeleton: '#334155',
  dangerSoft: '#7F1D1D',
};

/** Default light palette — giữ tương thích import cũ `import { colors }` */
export const colors: ThemeColors = { ...lightColors };

export function getColors(scheme: 'light' | 'dark'): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
