import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'gold' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
}

const map: Record<Variant, { bg: string; fg: string }> = {
  success: { bg: colors.primarySoft, fg: colors.primaryDark },
  warning: { bg: colors.goldSoft, fg: '#92400E' },
  danger: { bg: '#FEE2E2', fg: '#991B1B' },
  info: { bg: '#DBEAFE', fg: '#1E40AF' },
  ai: { bg: colors.aiSoft, fg: colors.aiDark },
  gold: { bg: colors.goldSoft, fg: colors.gold },
  neutral: { bg: colors.bgAlt, fg: colors.textSecondary },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm' }) => {
  const c = map[variant];
  return (
    <View style={[styles.base, { backgroundColor: c.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: c.fg }, size === 'md' && styles.textMd]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  md: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  text: { fontSize: 11, fontWeight: '700' },
  textMd: { fontSize: 13 },
});
