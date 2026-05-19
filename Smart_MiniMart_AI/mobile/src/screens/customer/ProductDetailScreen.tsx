import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useProduct, useAddToCart } from '@/services/queries';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/theme';
import { formatVnd } from '@/utils/format';

export function ProductDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const idOrSlug = route.params?.idOrSlug;

  const { data: product, isLoading } = useProduct(idOrSlug);
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);

  if (isLoading || !product) {
    return <SafeAreaView style={[styles.container, styles.center]}><Text>Đang tải...</Text></SafeAreaView>;
  }

  const finalPrice = Number(product.salePrice ?? product.price);
  const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);

  const handleAdd = async () => {
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: qty });
      Alert.alert('Đã thêm vào giỏ', `${qty} ${product.name}`, [
        { text: 'Tiếp tục mua', style: 'cancel' },
        { text: 'Xem giỏ', onPress: () => nav.navigate('Tabs', { screen: 'Cart' }) },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thêm vào giỏ thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <Image source={{ uri: product.imageUrl ?? 'https://via.placeholder.com/600' }}
          style={styles.image} />
        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(finalPrice)}</Text>
            {hasSale && (
              <Text style={styles.priceStrike}>{formatVnd(Number(product.price))}</Text>
            )}
            <Text style={styles.unit}>/{product.unit}</Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={[styles.stockBadge, product.stock > 0 ? styles.inStock : styles.outStock]}>
              {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
            </Text>
            {product.tags?.includes('cận date') && (
              <Text style={[styles.stockBadge, { backgroundColor: colors.expWarning, color: '#fff' }]}>
                Cận date — giảm sâu
              </Text>
            )}
          </View>

          {product.description && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sectionTitle}>Số lượng</Text>
            <View style={styles.qtyRow}>
              <Button title="−" variant="outline" size="sm"
                onPress={() => setQty(Math.max(1, qty - 1))} />
              <Text style={styles.qtyText}>{qty}</Text>
              <Button title="+" variant="outline" size="sm"
                onPress={() => setQty(Math.min(product.stock, qty + 1))} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button title={`Thêm vào giỏ • ${formatVnd(finalPrice * qty)}`}
          onPress={handleAdd} loading={addToCart.isPending}
          disabled={product.stock < 1} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgSecondary },
  body: { padding: spacing.lg },
  name: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  brand: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md },
  price: { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.primary },
  priceStrike: { fontSize: typography.size.base, color: colors.textTertiary, textDecorationLine: 'line-through', marginLeft: spacing.sm },
  unit: { fontSize: typography.size.sm, color: colors.textSecondary, marginLeft: spacing.xs },
  stockRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, fontSize: typography.size.xs, fontWeight: '600' },
  inStock: { backgroundColor: colors.primaryLight, color: colors.primaryDark },
  outStock: { backgroundColor: '#FEE2E2', color: colors.danger },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: 22 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  qtyText: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text, minWidth: 30, textAlign: 'center' },
  bottomBar: {
    padding: spacing.base, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
