import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View,
  Pressable, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts, useCategories } from '@/services/queries';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';

export function AdminProductsScreen() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const { data: categories = [] } = useCategories();
  const queryParams = useMemo(() => {
    const p: any = { search, limit: 100 };
    if (categoryId) p.categoryId = categoryId;
    return p;
  }, [search, categoryId]);

  const { data, isLoading, refetch, isFetching } = useProducts(queryParams);
  const allItems = data?.items ?? [];

  const items = useMemo(() => {
    if (stockFilter === 'low') return allItems.filter((p: any) => p.stock > 0 && p.stock < (p.minStock ?? 10));
    if (stockFilter === 'out') return allItems.filter((p: any) => p.stock === 0);
    return allItems;
  }, [allItems, stockFilter]);

  const lowCount = allItems.filter((p: any) => p.stock > 0 && p.stock < (p.minStock ?? 10)).length;
  const outCount = allItems.filter((p: any) => p.stock === 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sản phẩm</Text>
          <Text style={styles.subtitle}>{data?.total ?? 0} sản phẩm</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="Tìm theo tên, SKU, brand..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Stock filter chips */}
      <View style={styles.filterRow}>
        <FilterChip label="Tất cả" count={allItems.length}
          active={stockFilter === 'all'} onPress={() => setStockFilter('all')} />
        <FilterChip label="Sắp hết" count={lowCount} variant="warning"
          active={stockFilter === 'low'} onPress={() => setStockFilter('low')} />
        <FilterChip label="Hết hàng" count={outCount} variant="danger"
          active={stockFilter === 'out'} onPress={() => setStockFilter('out')} />
      </View>

      {/* Category chips horizontal */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        <Pressable
          style={[styles.catChip, !categoryId && styles.catChipActive]}
          onPress={() => setCategoryId(undefined)}
        >
          <Text style={[styles.catChipText, !categoryId && styles.catChipTextActive]}>
            📋 Tất cả danh mục
          </Text>
        </Pressable>
        {categories.map((c: any) => (
          <Pressable
            key={c.id}
            style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          renderItem={({ item }) => {
            const minStock = (item as any).minStock ?? 10;
            const outOfStock = item.stock === 0;
            const lowStock = item.stock > 0 && item.stock < minStock;

            return (
              <View style={styles.productCard}>
                <View style={styles.imgWrap}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.img} />
                  ) : (
                    <Text style={styles.imgPlaceholder}>📦</Text>
                  )}
                  {item.isFeatured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredText}>★</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.sku}>{item.sku}</Text>
                    {outOfStock && <Badge label="HẾT" variant="danger" size="sm" />}
                    {lowStock && <Badge label="SẮP HẾT" variant="warning" size="sm" />}
                  </View>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.category}>{(item as any).category?.name || ''}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.price}>{formatVnd(Number(item.price))}</Text>
                    <Text style={[styles.stock, outOfStock && { color: colors.danger }]}>
                      Tồn: {item.stock} {item.unit}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>📦</Text>
              <Text style={styles.emptyText}>Không có sản phẩm</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({ label, count, active, variant, onPress }: any) {
  const bg =
    variant === 'warning' ? colors.goldSoft :
    variant === 'danger' ? '#FEE2E2' :
    colors.bgAlt;
  const activeBg =
    variant === 'warning' ? colors.gold :
    variant === 'danger' ? colors.danger :
    colors.primary;
  return (
    <Pressable
      style={[styles.filterChip, { backgroundColor: active ? activeBg : bg }]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && { color: 'white' }]}>{label}</Text>
      <Text style={[styles.filterChipCount, active && { color: 'white' }]}>({count})</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', padding: 16, paddingBottom: 8,
    backgroundColor: 'white',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgAlt, marginHorizontal: 16, marginVertical: 8,
    paddingHorizontal: 12, borderRadius: 12, height: 44,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 4 },
  filterChip: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  filterChipCount: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  catScroll: {
    backgroundColor: 'white', maxHeight: 50, marginTop: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderRadius: 16, backgroundColor: colors.bgAlt, height: 32,
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  catChipTextActive: { color: 'white' },
  productCard: {
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 12,
    padding: 12, marginBottom: 8, gap: 12,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  imgWrap: {
    width: 70, height: 70, borderRadius: 10, backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  img: { width: '100%', height: '100%', borderRadius: 10 },
  imgPlaceholder: { fontSize: 32 },
  featuredBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  featuredText: { color: 'white', fontWeight: '900', fontSize: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sku: { fontSize: 11, fontWeight: '700', color: colors.aiDark, fontFamily: 'monospace' },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 18 },
  category: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  stock: { fontSize: 12, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
});
