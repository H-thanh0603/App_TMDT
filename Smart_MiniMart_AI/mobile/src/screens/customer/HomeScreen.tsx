import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCategories, useFeaturedProducts } from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { ProductCard } from '@/components/ProductCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { colors, radius, spacing, typography } from '@/theme';
import type { Category } from '@/types';

const CAT_EMOJI: Record<string, string> = {
  'Đồ ăn nhanh': '🍜', 'Đồ uống': '🥤', 'Bánh kẹo': '🍪', 'Sữa': '🥛',
  'Mỳ - Cháo': '🍝', 'Đồ dùng': '🧴', 'Vệ sinh': '🧻', 'Văn phòng phẩm': '✏️',
  'Khác': '📦',
};

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const { data: featured = [] } = useFeaturedProducts();

  const firstName = user?.fullName?.split(' ').pop() ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Chào, {firstName} 👋</Text>
            <Text style={styles.subtitle}>Mua gì hôm nay?</Text>
          </View>
          {user?.isVip && <Badge label="✨ VIP" variant="gold" size="md" />}
        </View>

        {/* AI Search bar */}
        <Pressable style={styles.searchBar} onPress={() => nav.navigate('Search')}>
          <View style={styles.aiIcon}>
            <Text style={styles.aiIconText}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.searchTitle}>AI Search</Text>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              "Đồ ăn sáng dưới 30k", "đồ uống mát"...
            </Text>
          </View>
          <Text style={styles.searchArrow}>→</Text>
        </Pressable>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable style={styles.quickItem} onPress={() => nav.navigate('AIChat')}>
            <View style={[styles.quickIcon, { backgroundColor: colors.aiSoft }]}>
              <Text style={styles.quickEmoji}>💬</Text>
            </View>
            <Text style={styles.quickLabel}>Trợ lý AI</Text>
          </Pressable>
          <Pressable style={styles.quickItem} onPress={() => nav.navigate('Cart')}>
            <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}>
              <Text style={styles.quickEmoji}>🛒</Text>
            </View>
            <Text style={styles.quickLabel}>Giỏ hàng</Text>
          </Pressable>
          <Pressable style={styles.quickItem} onPress={() => nav.navigate('Orders')}>
            <View style={[styles.quickIcon, { backgroundColor: colors.goldSoft }]}>
              <Text style={styles.quickEmoji}>📦</Text>
            </View>
            <Text style={styles.quickLabel}>Đơn hàng</Text>
          </Pressable>
          <Pressable style={styles.quickItem} onPress={() => nav.navigate('ProductList')}>
            <View style={[styles.quickIcon, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.quickEmoji}>🏷️</Text>
            </View>
            <Text style={styles.quickLabel}>Khuyến mãi</Text>
          </Pressable>
        </View>

        {/* Categories */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
        </View>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={categories} keyExtractor={(c: Category) => c.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.catCard}
              onPress={() => nav.navigate('ProductList', { categoryId: item.id, title: item.name })}
            >
              <View style={styles.catIconWrap}>
                <Text style={styles.catEmoji}>{CAT_EMOJI[item.name] ?? '📦'}</Text>
              </View>
              <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
            </Pressable>
          )}
        />

        {/* Hero promo banner */}
        <Pressable style={styles.banner} onPress={() => nav.navigate('ProductList')}>
          <View style={styles.bannerEmojiWrap}>
            <Text style={styles.bannerEmoji}>🎁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>WELCOME10</Text>
            <Text style={styles.bannerSub}>Giảm 10% đơn đầu tiên (đơn từ 50k)</Text>
            <View style={styles.bannerCta}>
              <Text style={styles.bannerCtaText}>Mua ngay →</Text>
            </View>
          </View>
        </Pressable>

        {/* Featured products */}
        <View style={styles.sectionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>🔥 Bán chạy</Text>
            <Text style={styles.sectionHint}>Sản phẩm khách hàng yêu thích nhất</Text>
          </View>
          <Pressable onPress={() => nav.navigate('ProductList')}>
            <Text style={styles.seeMore}>Xem tất cả</Text>
          </Pressable>
        </View>
        <View style={styles.featuredGrid}>
          {featured.slice(0, 6).map((p: any) => (
            <View key={p.id} style={styles.featuredItem}>
              <ProductCard product={p} onPress={() => nav.navigate('ProductDetail', { productId: p.id })} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: spacing.base, marginVertical: spacing.md,
    padding: 12, backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.aiSoft,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  aiIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ai,
    alignItems: 'center', justifyContent: 'center',
  },
  aiIconText: { fontSize: 20 },
  searchTitle: { fontSize: 13, color: colors.aiDark, fontWeight: '700' },
  searchPlaceholder: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  searchArrow: { fontSize: 22, color: colors.ai, fontWeight: '700' },
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: spacing.base, marginBottom: spacing.md,
  },
  quickItem: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  seeMore: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  catCard: { alignItems: 'center', width: 80 },
  catIconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  catEmoji: { fontSize: 30 },
  catName: { fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: spacing.base, marginTop: spacing.lg,
    padding: 16, backgroundColor: colors.gold, borderRadius: 18,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  bannerEmojiWrap: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 32 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  bannerCta: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12,
  },
  bannerCtaText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  featuredGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.base, gap: spacing.md, marginTop: spacing.sm,
  },
  featuredItem: { width: '48%' },
});
