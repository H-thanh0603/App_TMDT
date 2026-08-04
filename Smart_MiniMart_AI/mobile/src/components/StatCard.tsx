import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: { value: string; positive?: boolean };
  variant?: 'primary' | 'ai' | 'gold' | 'info' | 'danger';
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, trend, variant = 'primary', style,
}) => {
  const { colors } = useTheme();
  const variantMap = {
    primary: { bg: colors.primarySoft, accent: colors.primary }, ai: { bg: colors.aiSoft, accent: colors.aiDark }, gold: { bg: colors.goldSoft, accent: colors.gold },
    info: { bg: '#DBEAFE', accent: '#1E40AF' }, danger: { bg: colors.dangerSoft, accent: colors.danger },
  };
  const v = variantMap[variant];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: v.bg }]}>
        <Text style={[styles.icon, { color: v.accent }]}>{icon ?? '◆'}</Text>
      </View>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
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
    borderRadius: 16,
    padding: 14,
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
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  trend: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
