/** Bảng màu Smart MiniMart AI — xanh lá tươi (siêu thị/healthy) */
export const colors = {
  primary: '#10B981',     // emerald-500
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#F59E0B',   // amber-500
  accent: '#3B82F6',      // blue-500

  bg: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  divider: '#F3F4F6',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Role colors
  roleCustomer: '#10B981',
  roleStaff: '#3B82F6',
  roleAdmin: '#8B5CF6',
  roleAiManager: '#F59E0B',

  // Alert tiers
  expCritical: '#EF4444',
  expWarning: '#F59E0B',
  expNotice: '#3B82F6',
} as const;

export type ColorKey = keyof typeof colors;
