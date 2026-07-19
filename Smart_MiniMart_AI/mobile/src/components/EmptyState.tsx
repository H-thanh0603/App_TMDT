import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './Button';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  /** Tuỳ chọn: React node custom (ưu tiên hơn actionLabel) */
  action?: React.ReactNode;
  /** Nút CTA chuẩn — dùng với onAction */
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
}

/**
 * Empty state chuẩn: minh hoạ + title + mô tả + CTA (tạo mới / mua sắm / xoá lọc…).
 */
export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}: Props) {
  const cta =
    action ??
    (actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} variant={actionVariant} size="md" />
    ) : null);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
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
