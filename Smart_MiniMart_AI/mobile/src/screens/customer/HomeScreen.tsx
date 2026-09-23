import { useEffect, useState } from 'react';
import {
  Dimensions, FlatList, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useCategories, useProducts, useActivePromos, useNotifications,
} from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import { ProductCard } from '@/components/ProductCard';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { CategoryRowSkeleton, ProductGridSkeleton } from '@/components/Skeleton';
import { spacing } from '@/theme/typography';

const BANNER_W = Dimensions.get('window').width - 32;

const CAT_ICONS: AppIconName[] = ['box', 'tag', 'gift', 'cart', 'flash', 'heart', 'grid', 'clock', 'wallet'];
const CAT_TONES = ['primarySoft', 'aiSoft', 'goldSoft', 'dangerSoft'] as const;

function useFlashCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Hết sale lúc 23:59 Asia/Ho_Chi_Minh (UTC+7, không DST).
  const vn = new Date(now + 7 * 3600_000);
  const endOfDay = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate(), 23, 59, 59) - 7 * 3600_000;
  const diff = Math.max(0, endOfDay - now);
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const categoriesQ = useCategories();
  const saleQ = useProducts({ onSale: 'true', limit: 8 });
  const bestSellingQ = useProducts({ sortBy: 'best_selling', limit: 6 });
  const newestQ = useProducts({ sortBy: 'newest', limit: 4 });
  const promosQ = useActivePromos();
  const notifQ = useNotifications();
  const countdown = useFlashCountdown();
  const [bannerIdx, setBannerIdx] = useState(0);

  const categories = categoriesQ.data ?? [];
  const sale = saleQ.data?.items ?? [];
  const bestSelling = bestSellingQ.data?.items ?? [];
  const newest = newestQ.data?.items ?? [];
  const promos = promosQ.data ?? [];
  const notifData = notifQ.data;

  const firstName = user?.fullName?.split(' ').pop() ?? '';
  const unread = notifData?.unread ?? 0;

  const banners = promos.length > 0 ? promos : [null];

  const isBootLoading = categoriesQ.isLoading && !categoriesQ.data;
  const isBootError = !categoriesQ.data && categoriesQ.isError;
  const isRefreshing = [categoriesQ, saleQ, bestSellingQ, newestQ, promosQ, notifQ]
    .some((query) => query.isRefetching);
  const isDiscoveryLoading = saleQ.isLoading || bestSellingQ.isLoading || newestQ.isLoading;

  const retryHome = () => {
    categoriesQ.refetch();
    saleQ.refetch();
    bestSellingQ.refetch();
    newestQ.refetch();
    promosQ.refetch();
    notifQ.refetch();
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl refreshing={isRefreshing} onRefresh={retryHome} colors={[colors.primary]} />
        )}
      >
        {/* Header cam */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{firstName}</Text>
              {user?.isVip && <Badge label="VIP" variant="gold" size="sm" />}
            </View>
            <Text style={styles.subtitle}>{user?.loyaltyPoints ?? 0} điểm tích lũy</Text>
          </View>
          <Pressable
            style={styles.bellBtn}
            onPress={() => nav.navigate('Notifications')}
            accessibilityLabel="Thông báo"
          >
            <AppIcon name="bell" size={24} color="#fff" />
            {unread > 0 && (
              <View style={styles.bellDot}>
                <Text style={styles.bellDotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* AI Search bar nổi */}
        <Pressable
          style={styles.searchBar}
          onPress={() => nav.navigate('Search')}
        >
          <View style={styles.aiIcon}>
            <AppIcon name="robot" size={22} color={colors.aiDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.searchTitle}>AI Search</Text>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Đồ ăn sáng dưới 30k, đồ uống mát...
            </Text>
          </View>
          <View style={styles.searchArrowBg}>
            <AppIcon name="chevron-right" size={20} color="#fff" />
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
            {/* Promo carousel */}
            <FlatList
              data={banners}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + 12));
                setBannerIdx(idx);
              }}
              renderItem={({ item: promo }: any) => (
                <Pressable
                  style={styles.promoSlide}
                  onPress={() => nav.navigate('ProductList', { title: 'Khuyến mãi' })}
                >
                  <View style={styles.promoShade} />
                  <View style={styles.promoLeft}>
                    <View style={styles.promoBadge}>
                      <Text style={styles.promoBadgeText}>{promo ? 'HOT' : 'SALE'}</Text>
                    </View>
                    <Text style={styles.promoTitle} numberOfLines={1}>
                      {promo?.name ?? 'Ưu đãi mỗi ngày'}
                    </Text>
                    <Text style={styles.promoCode}>
                      {promo ? `Mã: ${promo.code}` : 'Khám phá giá tốt hôm nay'}
                    </Text>
                    <Text style={styles.promoDiscount}>
                      {promo
                        ? (promo.discountType === 'PERCENT'
                          ? `Giảm ${promo.discountValue}%`
                          : `Giảm ${Number(promo.discountValue).toLocaleString('vi-VN')}đ`)
                        : 'Xem sản phẩm giảm giá'}
                    </Text>
                    <View style={styles.promoCta}>
                      <Text style={styles.promoCtaText}>Lấy ngay</Text>
                    </View>
                  </View>
                  <AppIcon name="gift" size={72} color="rgba(255,255,255,0.85)" />
                </Pressable>
              )}
            />
            {banners.length > 1 && (
              <View style={styles.dots}>
                {banners.map((_: any, i: number) => (
                  <View
                    key={i}
                    style={[styles.dot, i === bannerIdx && styles.dotActive]}
                  />
                ))}
              </View>
            )}

            {/* Flash sale */}
            {sale.length > 0 && (
              <>
                <View style={styles.flashHeader}>
                  <AppIcon name="flash" size={20} color={colors.danger} />
                  <Text style={styles.flashTitle}>Flash sale</Text>
                  <View style={styles.countBox}>
                    <AppIcon name="clock" size={14} color="#fff" />
                    <Text style={styles.countText}>{countdown}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => nav.navigate('ProductList', { title: 'Ưu đãi hôm nay', onSale: true })}>
                    <Text style={styles.seeAll}>Xem tất cả ›</Text>
                  </Pressable>
                </View>
                <FlatList
                  data={sale}
                  keyExtractor={(p: any) => p.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: spacing.md }}
                  renderItem={({ item }) => (
                    <View style={{ width: 140 }}>
                      <ProductCard
                        product={item}
                        onPress={() => nav.navigate('ProductDetail', { idOrSlug: item.slug })}
                      />
                    </View>
                  )}
                />
              </>
            )}

            {/* Danh mục grid chợ */}
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
                title="Chưa có danh mục"
                description="Cửa hàng đang cập nhật danh mục sản phẩm."
                actionLabel="Tải lại"
                onAction={retryHome}
                actionVariant="outline"
              />
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(cat: any) => cat.id}
                numColumns={4}
                scrollEnabled={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                columnWrapperStyle={{ justifyContent: 'space-around' }}
                renderItem={({ item: cat, index }: any) => {
                  const tone = CAT_TONES[index % CAT_TONES.length] as keyof typeof colors;
                  return (
                    <Pressable
                      style={styles.catCard}
                      onPress={() => nav.navigate('ProductList', { categoryId: cat.id, title: cat.name })}
                    >
                      <View style={[styles.catIconBg, { backgroundColor: (colors as any)[tone] }]}>
                        <AppIcon
                          name={CAT_ICONS[index % CAT_ICONS.length]}
                          size={26}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
                    </Pressable>
                  );
                }}
              />
            )}

            {/* Tiện ích */}
            <View style={styles.quickRow}>
              <QuickLink icon="robot" label="AI Chat" tone="aiSoft" iconColor={colors.aiDark} onPress={() => nav.navigate('AI')} colors={colors} />
              <QuickLink icon="cart" label="Giỏ hàng" tone="primarySoft" iconColor={colors.primaryDark} onPress={() => nav.navigate('Cart')} colors={colors} />
              <QuickLink icon="truck" label="Đơn hàng" tone="goldSoft" iconColor={colors.gold} onPress={() => nav.navigate('Orders')} colors={colors} />
              <QuickLink icon="pin" label="Địa chỉ" tone="dangerSoft" iconColor={colors.danger} onPress={() => nav.navigate('Addresses')} colors={colors} />
            </View>

            {isDiscoveryLoading ? <ProductGridSkeleton count={4} /> : (
              <>
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

function QuickLink({ icon, label, tone, iconColor, onPress, colors }: any) {
  return (
    <Pressable style={quickStyles.item} onPress={onPress}>
      <View style={[quickStyles.icon, { backgroundColor: (colors as any)[tone] }]}>
        <AppIcon name={icon as AppIconName} size={26} color={iconColor} />
      </View>
      <Text style={[quickStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const quickStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  icon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  label: { fontSize: 11, fontWeight: '700' },
});

function DiscoverySection({ title, subtitle, products, onSeeAll, onPressProduct }: any) {
  const { colors } = useTheme();
  if (!products.length) return null;
  return (
    <>
      <View style={discStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[discStyles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[discStyles.sub, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        <Pressable onPress={onSeeAll}>
          <Text style={[discStyles.seeAll, { color: colors.primary }]}>Xem tất cả ›</Text>
        </Pressable>
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

const discStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 22, marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', flex: 1 },
  sub: { fontSize: 11, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '700' },
});

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryDark,
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
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDotText: { color: 'white', fontSize: 9, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: -16,
    padding: 14, borderRadius: 16,
    shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  aiIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.aiSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  searchTitle: { fontSize: 14, fontWeight: '800', color: colors.aiDark },
  searchPlaceholder: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  searchArrowBg: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  promoSlide: {
    width: BANNER_W,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 16, borderRadius: 16, gap: 14,
    overflow: 'hidden',
  },
  promoShade: {
    position: 'absolute', right: -40, top: -60,
    width: 180, height: 220, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  promoLeft: { flex: 1 },
  promoBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fff',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6,
  },
  promoBadgeText: { color: colors.danger, fontSize: 10, fontWeight: '900' },
  promoTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  promoCode: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 2 },
  promoDiscount: { fontSize: 14, color: '#fff', fontWeight: '800', marginTop: 4 },
  promoCta: {
    alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  promoCtaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.primary },

  flashHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 12,
  },
  flashTitle: { fontSize: 17, fontWeight: '800', color: colors.danger },
  countBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 22, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },

  catCard: { width: 76, alignItems: 'center', marginVertical: 6 },
  catIconBg: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  catName: {
    fontSize: 11, color: colors.text, fontWeight: '600',
    textAlign: 'center', lineHeight: 14,
  },

  quickRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 12, marginTop: 18,
  },
});

