import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { radius, spacing, typography } from '@/theme/typography';
import { Button } from './Button';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}: Props) {
  const { colors } = useTheme();
  const cta =
    action ??
    (actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} variant={actionVariant} size="md" />
    ) : null);

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text> : null}
      {cta ? <View style={styles.action}>{cta}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  desc: {
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.lg,
    minWidth: 160,
    borderRadius: radius.base,
  },
});
