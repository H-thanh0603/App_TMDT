import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: { value: string; positive?: boolean };
  variant?: 'primary' | 'ai' | 'gold' | 'info' | 'danger';
  style?: ViewStyle;
}

const variantMap = {
  primary: { bg: colors.primarySoft, accent: colors.primary, ring: colors.primary },
  ai:      { bg: colors.aiSoft,      accent: colors.aiDark,  ring: colors.ai },
  gold:    { bg: colors.goldSoft,    accent: colors.gold,    ring: colors.gold },
  info:    { bg: '#DBEAFE',          accent: '#1E40AF',      ring: '#3B82F6' },
  danger:  { bg: '#FEE2E2',          accent: '#991B1B',      ring: '#EF4444' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, trend, variant = 'primary', style,
}) => {
  const v = variantMap[variant];
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: v.bg }]}>
        <Text style={[styles.icon, { color: v.accent }]}>{icon ?? '◆'}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trend && (
        <Text
          style={[
            styles.trend,
            { color: trend.positive ? colors.success : colors.danger },
          ]}
        >
          {trend.positive ? '↑' : '↓'} {trend.value}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  icon: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  trend: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
