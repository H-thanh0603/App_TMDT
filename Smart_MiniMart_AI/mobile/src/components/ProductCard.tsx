import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { radius, shadow, spacing, typography } from '@/theme/typography';
import type { Product } from '@/types';
import { formatVnd } from '@/utils/format';
import { resolveImage } from '@/services/api';
import { AnimatedListItem, AnimatedPressableScale } from './Animated';

interface Props {
  product: Product;
  onPress?: () => void;
  variant?: 'grid' | 'list';
  /** index for staggered list enter animation */
  index?: number;
}

const EMOJI_RULES: Array<[RegExp, string]> = [
  [/coffee|cà phê|caphe/, '☕'],
  [/tea|trà|tra xanh/, '🍵'],
  [/milk|sữa|yogurt|honey|mật/, '🥛'],
  [/nước|nuoc|water|cola|pepsi|soda|lavie|aquafina|oki/, '💧'],
  [/beer|bia|rượu|ruou|soju/, '🍺'],
  [/choco|socola|bánh|banh|biscuit|cookie|gateau|gato|pie/, '🍪'],
  [/noodle|mì|mỳ|cháo|phở|pho|instant|hảo hảo|omachi/, '🍜'],
  [/snack|bim|khoai|chip|oca|biscuit/, '🍿'],
  [/kẹo|keo|candy|gum/, '🍬'],
  [/kem|ice/, '🍦'],
  [/fruit|táo|chuối|xoài|dưa|dâu|nho|ổi/, '🍎'],
  [/gạo|gao|dầu|mắm|nam|gia vị|tương/, '🧂'],
  [/trứng|egg|thịt|thit|ga|gà|jambon|sausage|pate/, '🍖'],
];
function productEmoji(name?: string): string {
  const n = (name || '').toLowerCase();
  for (const [re, emoji] of EMOJI_RULES) {
    if (re.test(n)) return emoji;
  }
  return '📦';
}

function PlaceholderBlock({ name, style }: { name?: string; style: any }) {
  const { colors } = useTheme();
  return (
    <View style={[style, styles.placeholder, { backgroundColor: colors.primarySoft }]}>
      <Text style={styles.placeholderEmoji}>{productEmoji(name)}</Text>
    </View>
  );
}

export function ProductCard({ product, onPress, variant = 'grid', index = 0 }: Props) {
  const { colors } = useTheme();
  const finalPrice = Number(product.salePrice ?? product.price);
  const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);
  const [failed, setFailed] = useState(false);
  const realUrl = resolveImage(product.imageUrl);
  const showReal = !failed && !!realUrl;

  const body = variant === 'list' ? (
    <AnimatedPressableScale
      onPress={onPress}
      style={[
        styles.list,
        shadow.sm,
        { backgroundColor: colors.surface },
      ]}
    >
      {showReal ? (
        <Image
          source={{ uri: realUrl! }}
          style={[styles.listImage, { backgroundColor: colors.bgSecondary }]}
          onError={() => setFailed(true)}
          resizeMode="cover"
        />
      ) : (
        <PlaceholderBlock
          name={product.name}
          style={styles.listImage}
        />
      )}
      <View style={styles.listBody}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
        {product.brand && <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>{formatVnd(finalPrice)}</Text>
          {hasSale && (
            <Text style={[styles.priceStrike, { color: colors.textTertiary }]}>
              {formatVnd(Number(product.price))}
            </Text>
          )}
        </View>
      </View>
    </AnimatedPressableScale>
  ) : (
    <AnimatedPressableScale
      onPress={onPress}
      style={[styles.grid, shadow.sm, { backgroundColor: colors.surface }]}
    >
      {showReal ? (
        <Image
          source={{ uri: realUrl! }}
          style={[styles.gridImage, { backgroundColor: colors.bgSecondary }]}
          onError={() => setFailed(true)}
          resizeMode="cover"
        />
      ) : (
        <PlaceholderBlock
          name={product.name}
          style={styles.gridImage}
        />
      )}
      {hasSale && (
        <View style={[styles.saleBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.saleBadgeText}>SALE</Text>
        </View>
      )}
      <View style={styles.gridBody}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
          {product.brand ?? product.unit}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>{formatVnd(finalPrice)}</Text>
        </View>
        {hasSale && (
          <Text style={[styles.priceStrike, { color: colors.textTertiary }]}>
            {formatVnd(Number(product.price))}
          </Text>
        )}
      </View>
    </AnimatedPressableScale>
  );

  return <AnimatedListItem index={index}>{body}</AnimatedListItem>;
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    borderRadius: radius.base,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  gridImage: {
    width: '100%', aspectRatio: 1, borderRadius: radius.sm,
  },
  gridBody: { paddingTop: spacing.sm },
  list: {
    flexDirection: 'row',
    borderRadius: radius.base, padding: spacing.sm, marginBottom: spacing.sm,
  },
  listImage: {
    width: 88, height: 88, borderRadius: radius.sm,
  },
  listBody: { flex: 1, marginLeft: spacing.md, justifyContent: 'space-between' },
  name: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, lineHeight: 18 },
  brand: { fontSize: typography.size.xs, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  price: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  priceStrike: {
    fontSize: typography.size.xs,
    textDecorationLine: 'line-through', marginLeft: spacing.xs,
  },
  saleBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm,
  },
  saleBadgeText: { color: '#fff', fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 40 },
});
