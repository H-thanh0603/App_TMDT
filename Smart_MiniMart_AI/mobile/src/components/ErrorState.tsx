import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius, spacing, typography } from '@/theme/typography';
import { Button } from './Button';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: string;
};

export function ErrorState({
  title = 'Có lỗi xảy ra',
  description = 'Không tải được dữ liệu. Kiểm tra mạng và thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  icon = '⚠️',
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!description && <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 36 },
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
