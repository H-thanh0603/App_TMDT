import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCategories, useFeaturedProducts } from '@/services/queries';
import { useAuthStore } from '@/store/auth.store';
import { ProductCard } from '@/components/ProductCard';
import { colors, radius, spacing, typography } from '@/theme';
import type { Category } from '@/types';

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const { data: featured = [] } = useFeaturedProducts();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Chào, {user?.fullName.split(' ').pop()}</Text>
            <Text style={styles.subtitle}>Mua gì hôm nay?</Text>
          </View>
          {user?.isVip && <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>}
        </View>

        <Pressable style={styles.searchBar} onPress={() => nav.navigate('Search')}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Tìm kiếm hoặc mô tả: "đồ ăn sáng dưới 30k"</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Danh mục</Text>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={categories} keyExtractor={(c: Category) => c.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.catCard}
              onPress={() => nav.navigate('ProductList', { categoryId: item.id, title: item.name })}
            >
              <View style={styles.catIcon}><Text style={{ fontSize: 28 }}>📦</Text></View>
              <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
            </Pressable>
          )}
        />

        <View style={styles.bannerWrap}>
          <View style={styles.banner}>
            <Text style={styles.bannerEmoji}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Mã WELCOME10</Text>
              <Text style={styles.bannerSub}>Giảm 10% đơn đầu tiên (đơn từ 50k)</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Bán chạy</Text>
          <Pressable onPress={() => nav.navigate('ProductList')}>
            <Text style={styles.seeAll}>Xem tất cả →</Text>
          </Pressable>
        </View>

        <View style={styles.gridWrap}>
          {featured.map((p) => (
            <ProductCard key={p.id} product={p}
              onPress={() => nav.navigate('ProductDetail', { idOrSlug: p.slug })} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
  },
  greeting: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  vipBadge: { backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  vipText: { color: '#fff', fontWeight: '700', fontSize: typography.size.xs },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchPlaceholder: { color: colors.textTertiary, fontSize: typography.size.sm, flex: 1 },
  sectionTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.primary, fontWeight: '600', marginRight: spacing.lg, marginTop: spacing.lg },
  catCard: { width: 80, alignItems: 'center' },
  catIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: typography.size.xs, color: colors.text, marginTop: 6, textAlign: 'center' },
  bannerWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, padding: spacing.base, borderRadius: radius.base },
  bannerEmoji: { fontSize: 36, marginRight: spacing.md },
  bannerTitle: { fontWeight: typography.weight.bold, color: colors.primaryDark, fontSize: typography.size.base },
  bannerSub: { color: colors.text, fontSize: typography.size.sm, marginTop: 2 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
});
