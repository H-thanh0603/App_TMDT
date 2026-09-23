import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'gold' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
  count?: number;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm', count }) => {
  const { colors } = useTheme();
  const map: Record<Variant, { bg: string; fg: string }> = {
    success: { bg: colors.primarySoft, fg: colors.success }, warning: { bg: colors.goldSoft, fg: colors.gold }, danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: '#DBEAFE', fg: '#1E40AF' }, ai: { bg: colors.aiSoft, fg: colors.aiDark }, gold: { bg: colors.goldSoft, fg: colors.gold }, neutral: { bg: colors.bgAlt, fg: colors.textSecondary },
  };
  const c = map[variant];
  return (
    <View style={[styles.base, { backgroundColor: c.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: c.fg }, size === 'md' && styles.textMd]}>{label}</Text>
      {typeof count === 'number' && count > 0 ? (
        <View style={styles.dot}>
          <Text style={styles.dotText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  md: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  text: { fontSize: 11, fontWeight: '700' },
  dot: {
    marginLeft: 6, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  textMd: { fontSize: 13 },
});
