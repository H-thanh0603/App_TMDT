import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { Product } from '@/types';
import { formatVnd } from '@/utils/format';

interface Props {
  product: Product;
  onPress?: () => void;
  variant?: 'grid' | 'list';
}

export function ProductCard({ product, onPress, variant = 'grid' }: Props) {
  const finalPrice = Number(product.salePrice ?? product.price);
  const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);

  if (variant === 'list') {
    return (
      <Pressable onPress={onPress} style={[styles.list, shadow.sm]}>
        <Image
          source={{ uri: product.imageUrl ?? 'https://via.placeholder.com/96' }}
          style={styles.listImage}
        />
        <View style={styles.listBody}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(finalPrice)}</Text>
            {hasSale && (
              <Text style={styles.priceStrike}>{formatVnd(Number(product.price))}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.grid, shadow.sm]}>
      <Image
        source={{ uri: product.imageUrl ?? 'https://via.placeholder.com/200' }}
        style={styles.gridImage}
      />
      {hasSale && <View style={styles.saleBadge}><Text style={styles.saleBadgeText}>SALE</Text></View>}
      <View style={styles.gridBody}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.brand} numberOfLines={1}>{product.brand ?? product.unit}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatVnd(finalPrice)}</Text>
        </View>
        {hasSale && (
          <Text style={styles.priceStrike}>{formatVnd(Number(product.price))}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: colors.surface, borderRadius: radius.base,
    padding: spacing.sm, width: '47%', marginBottom: spacing.md,
  },
  gridImage: {
    width: '100%', aspectRatio: 1, borderRadius: radius.sm,
    backgroundColor: colors.bgSecondary,
  },
  gridBody: { paddingTop: spacing.sm },
  list: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.base, padding: spacing.sm, marginBottom: spacing.sm,
  },
  listImage: {
    width: 88, height: 88, borderRadius: radius.sm,
    backgroundColor: colors.bgSecondary,
  },
  listBody: { flex: 1, marginLeft: spacing.md, justifyContent: 'space-between' },
  name: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text },
  brand: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  price: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.primary },
  priceStrike: {
    fontSize: typography.size.xs, color: colors.textTertiary,
    textDecorationLine: 'line-through', marginLeft: spacing.xs,
  },
  saleBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm,
  },
  saleBadgeText: { color: '#fff', fontSize: typography.size.xs, fontWeight: typography.weight.bold },
});
