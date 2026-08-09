import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useCategories, useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct,
} from '@/services/queries';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';
import { resolveImage } from '@/services/api';

type ProductForm = {
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  brand: string;
  unit: string;
  price: string;
  salePrice: string;
  stock: string;
  minStock: string;
  imageUrl: string;
  isFeatured: boolean;
  isActive: boolean;
};

const emptyForm = (categoryId = ''): ProductForm => ({
  name: '',
  sku: '',
  slug: '',
  categoryId,
  brand: '',
  unit: 'cái',
  price: '',
  salePrice: '',
  stock: '0',
  minStock: '5',
  imageUrl: '',
  isFeatured: false,
  isActive: true,
});

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function AdminProductsScreen() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());

  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const queryParams = useMemo(() => {
    const p: any = { search, limit: 100, includeInactive: 'true' };
    if (categoryId) p.categoryId = categoryId;
    return p;
  }, [search, categoryId]);

  const { data, isLoading, isError, refetch, isFetching } = useProducts(queryParams);
  const allItems = data?.items ?? [];

  const items = useMemo(() => {
    if (stockFilter === 'low') return allItems.filter((p: any) => p.stock > 0 && p.stock < (p.minStock ?? 10));
    if (stockFilter === 'out') return allItems.filter((p: any) => p.stock === 0);
    return allItems;
  }, [allItems, stockFilter]);

  const lowCount = allItems.filter((p: any) => p.stock > 0 && p.stock < (p.minStock ?? 10)).length;
  const outCount = allItems.filter((p: any) => p.stock === 0).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name ?? '',
      sku: item.sku ?? '',
      slug: item.slug ?? '',
      categoryId: item.categoryId ?? item.category?.id ?? '',
      brand: item.brand ?? '',
      unit: item.unit ?? 'cái',
      price: String(item.price ?? ''),
      salePrice: item.salePrice != null ? String(item.salePrice) : '',
      stock: String(item.stock ?? 0),
      minStock: String(item.minStock ?? 5),
      imageUrl: item.imageUrl ?? '',
      isFeatured: !!item.isFeatured,
      isActive: item.isActive !== false,
    });
    setModalOpen(true);
  };

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !editingId) {
        next.slug = slugify(String(value));
        if (!prev.sku) {
          next.sku = `SP-${slugify(String(value)).slice(0, 12).toUpperCase() || Date.now()}`;
        }
      }
      return next;
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.slug.trim() || !form.categoryId) {
      Alert.alert('Thiếu thông tin', 'Cần tên, SKU, slug và danh mục');
      return;
    }
    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      Alert.alert('Giá không hợp lệ', 'Nhập giá ≥ 0');
      return;
    }
    const dto: Record<string, any> = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      slug: form.slug.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim() || undefined,
      unit: form.unit.trim() || 'cái',
      price,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      imageUrl: form.imageUrl.trim() || undefined,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };
    if (form.salePrice.trim()) {
      const sp = Number(form.salePrice);
      if (!Number.isNaN(sp)) dto.salePrice = sp;
    }

    try {
      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, dto });
      } else {
        await createProduct.mutateAsync(dto);
      }
      setModalOpen(false);
      refetch();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Lỗi', Array.isArray(msg) ? msg.join(', ') : (msg || e?.message || 'Không lưu được'));
    }
  };

  const confirmDelete = (item: any) => {
    Alert.alert('Ngừng kinh doanh', `Ẩn sản phẩm "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Ngừng bán',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct.mutateAsync(item.id);
            refetch();
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không xóa được');
          }
        },
      },
    ]);
  };

  const saving = createProduct.isPending || updateProduct.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sản phẩm</Text>
          <Text style={styles.subtitle}>{data?.total ?? 0} sản phẩm</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm theo tên, SKU, brand..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        <FilterChip label="Tất cả" count={allItems.length}
          active={stockFilter === 'all'} onPress={() => setStockFilter('all')} />
        <FilterChip label="Sắp hết" count={lowCount} variant="warning"
          active={stockFilter === 'low'} onPress={() => setStockFilter('low')} />
        <FilterChip label="Hết hàng" count={outCount} variant="danger"
          active={stockFilter === 'out'} onPress={() => setStockFilter('out')} />
      </View>

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

      {isLoading && !data ? (
              <ListRowSkeleton count={6} />
            ) : isError && !data ? (
              <ErrorState
                title="Không tải được sản phẩm"
                onRetry={() => refetch()}
              />
            ) : (
              <FlatList
                data={items}
                keyExtractor={(p: any) => p.id}
                contentContainerStyle={{ padding: 12, paddingBottom: 40, flexGrow: 1 }}
                onRefresh={refetch}
                refreshing={isFetching && !isLoading}
                renderItem={({ item }) => {
                  const minStock = (item as any).minStock ?? 10;
                  const outOfStock = item.stock === 0;
                  const lowStock = item.stock > 0 && item.stock < minStock;
                  const inactive = (item as any).isActive === false;
                  const imageUrl = resolveImage(item.imageUrl);

                  return (
                    <Pressable style={[styles.productCard, inactive && { opacity: 0.55 }]} onPress={() => openEdit(item)}>
                      <View style={styles.imgWrap}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={styles.img} />
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
                          {inactive && <Badge label="ẨN" variant="neutral" size="sm" />}
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
                        <View style={styles.actions}>
                          <Pressable style={styles.editChip} onPress={() => openEdit(item)}>
                            <Text style={styles.editChipText}>Sửa</Text>
                          </Pressable>
                          <Pressable style={styles.delChip} onPress={() => confirmDelete(item)}>
                            <Text style={styles.delChipText}>Ngừng</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <EmptyState
                    icon="📦"
                    title="Không có sản phẩm"
                    description="Thêm sản phẩm mới để bắt đầu bán."
                    actionLabel="Thêm sản phẩm"
                    onAction={() => openCreate()}
                  />
                }
              />
            )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
            <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
              <Field label="Tên *" value={form.name} onChange={(v) => setField('name', v)} />
              <Field label="SKU *" value={form.sku} onChange={(v) => setField('sku', v)} />
              <Field label="Slug *" value={form.slug} onChange={(v) => setField('slug', v)} />
              <Text style={styles.fieldLabel}>Danh mục *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {categories.map((c: any) => (
                  <Pressable
                    key={c.id}
                    style={[styles.catChip, form.categoryId === c.id && styles.catChipActive, { marginBottom: 4 }]}
                    onPress={() => setField('categoryId', c.id)}
                  >
                    <Text style={[styles.catChipText, form.categoryId === c.id && styles.catChipTextActive]}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Field label="Brand" value={form.brand} onChange={(v) => setField('brand', v)} />
              <Field label="Đơn vị" value={form.unit} onChange={(v) => setField('unit', v)} />
              <Field label="Giá *" value={form.price} onChange={(v) => setField('price', v)} keyboardType="numeric" />
              <Field label="Giá sale" value={form.salePrice} onChange={(v) => setField('salePrice', v)} keyboardType="numeric" />
              <Field label="Tồn kho" value={form.stock} onChange={(v) => setField('stock', v)} keyboardType="numeric" />
              <Field label="Tồn tối thiểu" value={form.minStock} onChange={(v) => setField('minStock', v)} keyboardType="numeric" />
              <Field label="Image URL" value={form.imageUrl} onChange={(v) => setField('imageUrl', v)} />
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Nổi bật</Text>
                <Switch value={form.isFeatured} onValueChange={(v) => setField('isFeatured', v)} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Đang bán</Text>
                <Switch value={form.isActive} onValueChange={(v) => setField('isActive', v)} />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
    </View>
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
    backgroundColor: 'white', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  addBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editChip: {
    backgroundColor: colors.primarySoft || '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  editChipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  delChip: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  delChipText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
    backgroundColor: colors.bgAlt,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.bgAlt, alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: colors.text },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center',
  },
  saveText: { fontWeight: '800', color: 'white' },
});
