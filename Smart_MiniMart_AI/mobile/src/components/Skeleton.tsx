import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { radius, spacing } from '@/theme/typography';

type SkeletonProps = {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Pulse placeholder block — dùng thay spinner trắng. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.md,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.skeleton,
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.productCard, { backgroundColor: colors.surface }]}>
          <Skeleton height={110} borderRadius={radius.base} />
          <Skeleton height={12} width="80%" style={{ marginTop: spacing.sm }} />
          <Skeleton height={12} width="50%" style={{ marginTop: spacing.xs }} />
          <Skeleton height={14} width="40%" style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export function CategoryRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.catItem}>
          <Skeleton width={60} height={60} borderRadius={18} />
          <Skeleton height={10} width={52} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: spacing.md, gap: spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.rowCard, { backgroundColor: colors.surface }]}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={14} width="55%" />
            <Skeleton height={11} width="35%" />
            <Skeleton height={11} width="70%" style={{ marginTop: 4 }} />
          </View>
          <Skeleton height={22} width={72} borderRadius={radius.full} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  productCard: {
    width: '47%',
    borderRadius: radius.base,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  catItem: {
    alignItems: 'center',
    width: 72,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.base,
    padding: spacing.base,
  },
});
