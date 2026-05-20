import { useState, useMemo } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable,
  TextInput, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProducts, useCategories } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';
import { Badge } from '@/components/Badge';
import { colors, spacing, typography } from '@/theme';
import type { Product } from '@/types';

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'best_selling', label: 'Bán chạy' },
  { key: 'price_asc', label: 'Giá thấp → cao' },
  { key: 'price_desc', label: 'Giá cao → thấp' },
  { key: 'name', label: 'Tên A → Z' },
];

const PRICE_PRESETS = [
  { label: 'Dưới 30k', max: 30000 },
  { label: '30k - 50k', min: 30000, max: 50000 },
  { label: '50k - 100k', min: 50000, max: 100000 },
  { label: 'Trên 100k', min: 100000 },
];

export function ProductListScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategoryId = route.params?.categoryId;
  const initialTitle = route.params?.title;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
  const [sortBy, setSortBy] = useState('newest');
  const [pricePreset, setPricePreset] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const { data: categories = [] } = useCategories();

  const queryParams = useMemo(() => {
    const p: any = { page, limit: 12, sortBy };
    if (search) p.search = search;
    if (categoryId) p.categoryId = categoryId;
    if (inStockOnly) p.inStock = 'true';
    if (pricePreset !== null) {
      const preset = PRICE_PRESETS[pricePreset];
      if (preset.min !== undefined) p.minPrice = preset.min;
      if (preset.max !== undefined) p.maxPrice = preset.max;
    }
    return p;
  }, [page, search, categoryId, sortBy, pricePreset, inStockOnly]);

  const { data, isLoading, isFetching, refetch } = useProducts(queryParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const activeFilters =
    (categoryId ? 1 : 0) +
    (pricePreset !== null ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const resetFilters = () => {
    setCategoryId(undefined);
    setPricePreset(null);
    setInStockOnly(false);
    setSortBy('newest');
    setPage(1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search + Filter row */}
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm sản phẩm..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
          onPress={() => setFilterModalOpen(true)}
        >
          <Text style={styles.filterIcon}>⚙</Text>
          {activeFilters > 0 && (
            <View style={styles.filterDot}>
              <Text style={styles.filterDotText}>{activeFilters}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Sort chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.chip, sortBy === opt.key && styles.chipActive]}
            onPress={() => { setSortBy(opt.key); setPage(1); }}
          >
            <Text style={[styles.chipText, sortBy === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Result count */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          <Text style={styles.resultNumber}>{total}</Text> sản phẩm
          {categoryId && categories.find((c: any) => c.id === categoryId) && (
            <Text> · {categories.find((c: any) => c.id === categoryId)?.name}</Text>
          )}
        </Text>
        {activeFilters > 0 && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.resetText}>Xoá lọc</Text>
          </Pressable>
        )}
      </View>

      {/* Product grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p: Product) => p.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => nav.navigate('ProductDetail', { idOrSlug: item.slug })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text>
              {activeFilters > 0 && (
                <Pressable style={styles.resetBtn} onPress={resetFilters}>
                  <Text style={styles.resetBtnText}>Xoá bộ lọc</Text>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <Text style={styles.pageBtnText}>‹ Trước</Text>
                </Pressable>
                <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                <Pressable
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <Text style={styles.pageBtnText}>Sau ›</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={(id: string | undefined) => { setCategoryId(id); setPage(1); }}
        pricePreset={pricePreset}
        onPriceChange={(idx: number | null) => { setPricePreset(idx); setPage(1); }}
        inStockOnly={inStockOnly}
        onInStockChange={(v: boolean) => { setInStockOnly(v); setPage(1); }}
        onReset={resetFilters}
      />
    </SafeAreaView>
  );
}

function FilterModal({
  open, onClose, categories, categoryId, onCategoryChange,
  pricePreset, onPriceChange, inStockOnly, onInStockChange, onReset,
}: any) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>Đóng</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Bộ lọc</Text>
          <Pressable onPress={() => { onReset(); onClose(); }}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Xoá</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Category */}
          <Text style={styles.filterLabel}>Danh mục</Text>
          <View style={styles.filterGrid}>
            <Pressable
              style={[styles.filterChip, !categoryId && styles.filterChipActive]}
              onPress={() => onCategoryChange(undefined)}
            >
              <Text style={[styles.filterChipText, !categoryId && styles.filterChipTextActive]}>Tất cả</Text>
            </Pressable>
            {categories.map((c: any) => (
              <Pressable
                key={c.id}
                style={[styles.filterChip, categoryId === c.id && styles.filterChipActive]}
                onPress={() => onCategoryChange(c.id)}
              >
                <Text style={[styles.filterChipText, categoryId === c.id && styles.filterChipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price */}
          <Text style={[styles.filterLabel, { marginTop: 20 }]}>Khoảng giá</Text>
          <View style={styles.filterGrid}>
            <Pressable
              style={[styles.filterChip, pricePreset === null && styles.filterChipActive]}
              onPress={() => onPriceChange(null)}
            >
              <Text style={[styles.filterChipText, pricePreset === null && styles.filterChipTextActive]}>Mọi giá</Text>
            </Pressable>
            {PRICE_PRESETS.map((p, i) => (
              <Pressable
                key={i}
                style={[styles.filterChip, pricePreset === i && styles.filterChipActive]}
                onPress={() => onPriceChange(i)}
              >
                <Text style={[styles.filterChipText, pricePreset === i && styles.filterChipTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* In stock */}
          <Pressable
            style={styles.checkRow}
            onPress={() => onInStockChange(!inStockOnly)}
          >
            <View style={[styles.checkbox, inStockOnly && styles.checkboxActive]}>
              {inStockOnly && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>Chỉ hàng còn trong kho</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyText}>Áp dụng bộ lọc</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 12, gap: 6,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  filterBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: colors.bgAlt,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterIcon: { fontSize: 20 },
  filterDot: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  filterDotText: { color: 'white', fontSize: 10, fontWeight: '800' },
  chipScroll: { backgroundColor: 'white', paddingVertical: 8, maxHeight: 48 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, marginHorizontal: 4,
    borderRadius: 16, backgroundColor: colors.bgAlt, height: 32,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: 'white' },
  resultBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  resultText: { color: colors.textSecondary, fontSize: 13 },
  resultNumber: { color: colors.primary, fontWeight: '800' },
  resetText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  resetBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: colors.primary, borderRadius: 10,
  },
  resetBtnText: { color: 'white', fontWeight: '700' },
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 20, gap: 16,
  },
  pageBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'white', borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: colors.text, fontWeight: '700' },
  pageInfo: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: 'white',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  filterLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  filterChipTextActive: { color: 'white' },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, marginTop: 10,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: 'white', fontWeight: '900' },
  checkLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  modalFooter: {
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: 'white',
  },
  applyBtn: {
    backgroundColor: colors.primary, padding: 14,
    borderRadius: 10, alignItems: 'center',
  },
  applyText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
