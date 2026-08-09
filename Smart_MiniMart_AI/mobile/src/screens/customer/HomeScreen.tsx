import React from 'react';
import {
  FlatList, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useCategories, useProducts, useActivePromos, useNotifications,
} from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { ProductCard } from '@/components/ProductCard';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { CategoryRowSkeleton, ProductGridSkeleton } from '@/components/Skeleton';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/typography';

const CAT_EMOJI: Record<string, string> = {
  'Đồ ăn nhanh': '🍜', 'Đồ uống': '🥤', 'Bánh kẹo': '🍪', 'Sữa': '🥛',
  'Mỳ - Cháo': '🍝', 'Đồ dùng': '🧴', 'Vệ sinh': '🧻',
  'Văn phòng phẩm': '✏️', 'Khác': '📦',
};

const CAT_COLORS = [
  '#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5',
  '#EDE9FE', '#FFE4E6', '#DCFCE7', '#FEF9C3', '#E0E7FF',
];

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const categoriesQ = useCategories();
  const saleQ = useProducts({ onSale: 'true', limit: 4 });
  const bestSellingQ = useProducts({ sortBy: 'best_selling', limit: 6 });
  const newestQ = useProducts({ sortBy: 'newest', limit: 4 });
  const promosQ = useActivePromos();
  const notifQ = useNotifications();

  const categories = categoriesQ.data ?? [];
  const sale = saleQ.data?.items ?? [];
  const bestSelling = bestSellingQ.data?.items ?? [];
  const newest = newestQ.data?.items ?? [];
  const promos = promosQ.data ?? [];
  const notifData = notifQ.data;

  const firstName = user?.fullName?.split(' ').pop() ?? '';
  const unread = notifData?.unread ?? 0;
  const topPromo = promos[0];

  const isBootLoading =
    (categoriesQ.isLoading && !categoriesQ.data) ||
    (bestSellingQ.isLoading && !bestSellingQ.data);

  const isBootError =
    (!categoriesQ.data && categoriesQ.isError) ||
    (!bestSellingQ.data && bestSellingQ.isError);

  const retryHome = () => {
    categoriesQ.refetch();
    saleQ.refetch();
    bestSellingQ.refetch();
    newestQ.refetch();
    promosQ.refetch();
    notifQ.refetch();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{firstName} 👋</Text>
              {user?.isVip && <Badge label="✨ VIP" variant="gold" size="sm" />}
            </View>
            <Text style={styles.subtitle}>{user?.loyaltyPoints ?? 0} điểm tích lũy</Text>
          </View>
          <Pressable
            style={styles.bellBtn}
            onPress={() => nav.navigate('Notifications')}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unread > 0 && (
              <View style={styles.bellDot}>
                <Text style={styles.bellDotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* AI Search bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => nav.navigate('Search')}
        >
          <View style={styles.aiIcon}>
            <Text style={styles.aiIconText}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.searchTitle}>AI Search</Text>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Đồ ăn sáng dưới 30k, đồ uống mát...
            </Text>
          </View>
          <View style={styles.searchArrowBg}>
            <Text style={styles.searchArrow}>→</Text>
          </View>
        </Pressable>

        {isBootError ? (
          <ErrorState
            title="Không tải được trang chủ"
            description="Kiểm tra kết nối mạng hoặc thử lại sau."
            onRetry={retryHome}
          />
        ) : (
          <>
            {/* Promo Banner */}
            {topPromo && (
              <Pressable
                style={styles.promoBanner}
                onPress={() => nav.navigate('ProductList', { title: 'Khuyến mãi' })}
              >
                <View style={styles.promoLeft}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>HOT</Text>
                  </View>
                  <Text style={styles.promoTitle} numberOfLines={1}>{topPromo.name}</Text>
                  <Text style={styles.promoCode}>Mã: {topPromo.code}</Text>
                  <Text style={styles.promoDiscount}>
                    {topPromo.discountType === 'PERCENT'
                      ? `Giảm ${topPromo.discountValue}%`
                      : `Giảm ${Number(topPromo.discountValue).toLocaleString('vi-VN')}đ`}
                  </Text>
                </View>
                <Text style={styles.promoEmoji}>🎁</Text>
              </Pressable>
            )}

            {/* Quick links */}
            <View style={styles.quickRow}>
              <QuickLink icon="🤖" label="AI Chat" color={colors.aiSoft}
                textColor={colors.aiDark} onPress={() => nav.navigate('AI')} />
              <QuickLink icon="🛒" label="Giỏ hàng" color={colors.primarySoft}
                textColor={colors.primaryDark} onPress={() => nav.navigate('Cart')} />
              <QuickLink icon="📦" label="Đơn hàng" color={colors.goldSoft}
                textColor="#92400E" onPress={() => nav.navigate('Orders')} />
              <QuickLink icon="📍" label="Địa chỉ" color="#FCE7F3"
                textColor="#BE185D" onPress={() => nav.navigate('Addresses')} />
            </View>

            {/* Categories */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh mục</Text>
              <Pressable onPress={() => nav.navigate('ProductList')}>
                <Text style={styles.seeAll}>Xem tất cả ›</Text>
              </Pressable>
            </View>

            {isBootLoading ? (
              <CategoryRowSkeleton />
            ) : categories.length === 0 ? (
              <EmptyState
                icon="🗂️"
                title="Chưa có danh mục"
                description="Cửa hàng đang cập nhật danh mục sản phẩm."
                actionLabel="Tải lại"
                onAction={retryHome}
                actionVariant="outline"
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
              >
                {categories.map((cat: any, idx: number) => (
                  <Pressable
                    key={cat.id}
                    style={styles.catCard}
                    onPress={() => nav.navigate('ProductList', { categoryId: cat.id, title: cat.name })}
                  >
                    <View
                      style={[
                        styles.catIconBg,
                        { backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] },
                      ]}
                    >
                      <Text style={styles.catEmoji}>{CAT_EMOJI[cat.name] ?? '📦'}</Text>
                    </View>
                    <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {isBootLoading ? <ProductGridSkeleton count={4} /> : (
              <>
                <DiscoverySection title="Ưu đãi hôm nay" subtitle="Giá tốt đang chờ bạn" products={sale}
                  onSeeAll={() => nav.navigate('ProductList', { title: 'Ưu đãi hôm nay', onSale: true })}
                  onPressProduct={(item: any) => nav.navigate('ProductDetail', { idOrSlug: item.slug })} />
                <DiscoverySection title="Được mua nhiều" subtitle="Sản phẩm bán chạy" products={bestSelling}
                  onSeeAll={() => nav.navigate('ProductList', { title: 'Được mua nhiều', sortBy: 'best_selling' })}
                  onPressProduct={(item: any) => nav.navigate('ProductDetail', { idOrSlug: item.slug })} />
                <DiscoverySection title="Mới về" subtitle="Vừa có mặt tại cửa hàng" products={newest}
                  onSeeAll={() => nav.navigate('ProductList', { title: 'Mới về', sortBy: 'newest' })}
                  onPressProduct={(item: any) => nav.navigate('ProductDetail', { idOrSlug: item.slug })} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickLink({ icon, label, color, textColor, onPress }: any) {
  return (
    <Pressable style={styles.quickItem} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Text style={styles.quickEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.quickLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function DiscoverySection({ title, subtitle, products, onSeeAll, onPressProduct }: any) {
  if (!products.length) return null;
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
        <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>Xem tất cả ›</Text></Pressable>
      </View>
      <FlatList
        data={products}
        keyExtractor={(p: any) => p.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: spacing.md }}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => onPressProduct(item)} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  userName: { color: 'white', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellIcon: { fontSize: 22 },
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDotText: { color: 'white', fontSize: 9, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', marginHorizontal: 16, marginTop: -16,
    padding: 14, borderRadius: 16,
    shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  aiIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.aiSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  aiIconText: { fontSize: 22 },
  searchTitle: { fontSize: 14, fontWeight: '800', color: colors.aiDark },
  searchPlaceholder: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  searchArrowBg: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  searchArrow: { color: 'white', fontWeight: '800', fontSize: 16 },

  promoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.aiSoft, marginHorizontal: 16, marginTop: 12,
    padding: 16, borderRadius: 16, gap: 14,
    borderLeftWidth: 4, borderLeftColor: colors.ai,
  },
  promoLeft: { flex: 1 },
  promoBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.danger,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6,
  },
  promoBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  promoTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  promoCode: { fontSize: 11, color: colors.aiDark, fontWeight: '700', marginTop: 2 },
  promoDiscount: { fontSize: 13, color: colors.danger, fontWeight: '800', marginTop: 4 },
  promoEmoji: { fontSize: 40 },

  quickRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 12, marginTop: 18,
  },
  quickItem: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontSize: 11, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 22, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  sectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  catCard: {
    width: 76, alignItems: 'center', marginHorizontal: 6,
  },
  catIconBg: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  catEmoji: { fontSize: 28 },
  catName: {
    fontSize: 11, color: colors.text, fontWeight: '600',
    textAlign: 'center', lineHeight: 14,
  },
});
