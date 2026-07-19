import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './Button';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: string;
};

/**
 * Error UI chuẩn cho list/screen — luôn có nút Thử lại khi truyền onRetry.
 */
export function ErrorState({
  title = 'Có lỗi xảy ra',
  description = 'Không tải được dữ liệu. Kiểm tra mạng và thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  icon = '⚠️',
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.desc}>{description}</Text>}
      {onRetry ? (
        <View style={styles.action}>
          <Button title={retryLabel} onPress={onRetry} variant="primary" size="md" />
        </View>
      ) : null}
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
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.base,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 36 },
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
