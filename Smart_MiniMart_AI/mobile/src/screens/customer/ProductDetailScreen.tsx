import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useProduct, useAddToCart, useCreateReview, useProductReviews, useReviewStats } from '@/services/queries';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme';
import { radius, spacing, typography } from '@/theme/typography';
import { formatVnd } from '@/utils/format';
import { resolveImage } from '@/services/api';

export function ProductDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const idOrSlug = route.params?.idOrSlug;

  const { data: product, isLoading } = useProduct(idOrSlug);
  const addToCart = useAddToCart();
  const createReview = useCreateReview();
  const reviewsQ = useProductReviews(idOrSlug);
  const statsQ = useReviewStats(idOrSlug);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (isLoading || !product) {
    return <SafeAreaView style={[styles.container, styles.center]}><Text style={{ color: colors.textSecondary }}>Đang tải...</Text></SafeAreaView>;
  }

  const finalPrice = Number(product.salePrice ?? product.price);
  const hasSale = product.salePrice && Number(product.salePrice) < Number(product.price);

  const doAdd = async () => {
    await addToCart.mutateAsync({ productId: product.id, quantity: qty });
  };
  const handleAdd = async () => {
    try {
      await doAdd();
      Alert.alert('Đã thêm vào giỏ', `${qty} ${product.name}`, [
        { text: 'Tiếp tục mua', style: 'cancel' },
        { text: 'Xem giỏ', onPress: () => nav.navigate('Tabs', { screen: 'Cart' }) },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thêm vào giỏ thất bại');
    }
  };
  const handleBuyNow = async () => {
    try {
      await doAdd();
      nav.navigate('Tabs', { screen: 'Cart' });
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thêm vào giỏ thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <Image
          source={resolveImage(product.imageUrl) ? { uri: resolveImage(product.imageUrl)! } : require('../../assets/icon.png')}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(finalPrice)}</Text>
            {hasSale && (
              <>
                <Text style={styles.priceStrike}>{formatVnd(Number(product.price))}</Text>
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>
                    -{Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)}%
                  </Text>
                </View>
              </>
            )}
            <Text style={styles.unit}>/{product.unit}</Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={[styles.stockBadge, product.stock > 0 ? styles.inStock : styles.outStock]}>
              {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
            </Text>
            {product.tags?.includes('cận date') && (
              <Text style={[styles.stockBadge, { backgroundColor: colors.gold, color: '#fff' }]}>
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
            <Text style={styles.sectionTitle}>Đánh giá {statsQ.data?.count ? `(${statsQ.data.count})` : ''}</Text>
            <Text style={styles.rating}>{statsQ.data?.count ? `★ ${statsQ.data.average}/5` : 'Chưa có đánh giá'}</Text>
            {(reviewsQ.data ?? []).slice(0, 3).map((review: any) => (
              <View key={review.id} style={styles.review}>
                <Text style={styles.reviewName}>{review.user?.fullName ?? 'Khách hàng'} · {'★'.repeat(review.rating)}</Text>
                {!!review.comment && <Text style={styles.reviewText}>{review.comment}</Text>}
              </View>
            ))}
            <View style={styles.reviewForm}>
              <Text style={styles.reviewName}>Đánh giá của bạn</Text>
              <View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Text key={star} onPress={() => setRating(star)} style={[styles.star, star <= rating && styles.starOn]}>★</Text>)}</View>
              <TextInput value={comment} onChangeText={setComment} placeholder="Chia sẻ trải nghiệm (không bắt buộc)" style={styles.commentInput} multiline />
              <Button title="Gửi đánh giá" size="sm" loading={createReview.isPending} onPress={async () => { try { await createReview.mutateAsync({ productId: product.id, rating, comment: comment.trim() || undefined }); setComment(''); Alert.alert('Cảm ơn bạn', 'Đánh giá đã được gửi.'); } catch (error: any) { Alert.alert('Không thể gửi', error?.response?.data?.message ?? 'Bạn cần có đơn hoàn tất cho sản phẩm này.'); } }} />
            </View>
          </View>

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
        <View style={{ flex: 1 }}>
          <Button title="Thêm giỏ" variant="outline"
            onPress={handleAdd} loading={addToCart.isPending}
            disabled={product.stock < 1} fullWidth />
        </View>
        <View style={{ flex: 2 }}>
          <Button title={`Mua ngay • ${formatVnd(finalPrice * qty)}`}
            onPress={handleBuyNow} loading={addToCart.isPending}
            disabled={product.stock < 1} fullWidth size="lg" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
  saleBadge: { backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, marginLeft: spacing.sm },
  saleBadgeText: { color: '#fff', fontSize: typography.size.xs, fontWeight: '800' },
  inStock: { backgroundColor: colors.primarySoft, color: colors.success },
  outStock: { backgroundColor: colors.dangerSoft, color: colors.danger },
  sectionTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: 22 },
  rating: { color: colors.warning, fontWeight: '700' },
  review: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  reviewName: { fontSize: typography.size.sm, fontWeight: '700', color: colors.text },
  reviewText: { marginTop: 3, fontSize: typography.size.sm, color: colors.textSecondary },
  reviewForm: { marginTop: spacing.md, gap: spacing.sm }, stars: { flexDirection: 'row', gap: 5 }, star: { fontSize: 25, color: colors.border }, starOn: { color: colors.warning },
  commentInput: { minHeight: 65, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text, textAlignVertical: 'top' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  qtyText: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text, minWidth: 30, textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.base, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
