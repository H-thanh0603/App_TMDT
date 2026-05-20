/**
 * Smart MiniMart AI - Brand Color System
 * Emerald green primary + Violet AI accents + Gold sparkle
 */
export const colors = {
  // Brand primary - Emerald green
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primarySoft: '#D1FAE5',

  // AI accent - Violet
  ai: '#8B5CF6',
  aiDark: '#7C3AED',
  aiLight: '#A78BFA',
  aiSoft: '#EDE9FE',

  // Gold sparkle (premium / VIP)
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  goldSoft: '#FEF3C7',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Neutrals
  bg: '#F8FAFC',
  bgAlt: '#F1F5F9',
  bgSecondary: '#F1F5F9',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Role accents (legacy aliases)
  secondary: '#3B82F6',
  roleCustomer: '#10B981',
  roleStaff: '#3B82F6',
  roleAdmin: '#8B5CF6',
  roleAiManager: '#F59E0B',

  // Legacy aliases
  accent: '#8B5CF6',
  expWarning: '#F59E0B',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export type ThemeColors = typeof colors;
