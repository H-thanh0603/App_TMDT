/**
 * Smart MiniMart AI - Brand Color System
 * Light + Dark tokens (Marketplace orange primary + Violet AI + Gold)
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
  primary: '#EE4D2D',
  primaryDark: '#D73211',
  primaryLight: '#FF6B4A',
  primarySoft: '#FEE4D9',
  ai: '#8B5CF6',
  aiDark: '#7C3AED',
  aiLight: '#A78BFA',
  aiSoft: '#EDE9FE',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  goldSoft: '#FEF3C7',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  bg: '#FFF8F4',
  bgAlt: '#FEEFE8',
  bgSecondary: '#F5F1EC',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#F0D9CE',
  borderLight: '#FBE7DC',
  divider: '#F0D9CE',
  text: '#1F1B16',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textTertiary: '#A8A29E',
  textInverse: '#FFFFFF',
  secondary: '#3B82F6',
  roleCustomer: '#EE4D2D',
  roleStaff: '#1677FF',
  roleAdmin: '#8B5CF6',
  roleAiManager: '#F59E0B',
  accent: '#EE4D2D',
  expWarning: '#F59E0B',
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(15, 23, 42, 0.08)',
  skeleton: '#E2E8F0',
  dangerSoft: '#FEE2E2',
};

export const darkColors: ThemeColors = {
  primary: '#FF6B4A',
  primaryDark: '#EE4D2D',
  primaryLight: '#FF8A66',
  primarySoft: '#431407',
  ai: '#A78BFA',
  aiDark: '#8B5CF6',
  aiLight: '#C4B5FD',
  aiSoft: '#2E1065',
  gold: '#FBBF24',
  goldLight: '#FCD34D',
  goldSoft: '#78350F',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  bg: '#140F0C',
  bgAlt: '#1F1712',
  bgSecondary: '#1F1712',
  card: '#241A14',
  surface: '#241A14',
  border: '#3F2D22',
  borderLight: '#2A1D15',
  divider: '#3F2D22',
  text: '#FFF7ED',
  textSecondary: '#E7D5C5',
  textMuted: '#94A3B8',
  textTertiary: '#78716C',
  textInverse: '#0F172A',
  secondary: '#60A5FA',
  roleCustomer: '#FF6B4A',
  roleStaff: '#60A5FA',
  roleAdmin: '#A78BFA',
  roleAiManager: '#FBBF24',
  accent: '#FF6B4A',
  expWarning: '#FBBF24',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(0, 0, 0, 0.45)',
  skeleton: '#334155',
  dangerSoft: '#7F1D1D',
};

export function getColors(scheme: 'light' | 'dark'): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
