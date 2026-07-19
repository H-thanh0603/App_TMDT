import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme/colors';
import { api, unwrap } from '@/services/api';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';

const useAdminCategories = () =>
  useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => unwrap<any[]>(await api.get('/categories')),
  });

const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => unwrap<any>(await api.post('/categories', dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
};

const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: any) => unwrap<any>(await api.patch(`/categories/${id}`, dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
};

const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<any>(await api.delete(`/categories/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
};

export function AdminCategoriesScreen() {
  const { data: cats = [], isLoading, isError, refetch, isFetching } = useAdminCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', imageUrl: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', imageUrl: '' });
    setOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, imageUrl: cat.imageUrl || '' });
    setOpen(true);
  };

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Thiếu tên', 'Vui lòng nhập tên danh mục');
      return;
    }
    const dto = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      imageUrl: form.imageUrl || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, dto });
      } else {
        await create.mutateAsync(dto);
      }
      setOpen(false);
      refetch();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu');
    }
  };

  const del = (cat: any) => {
    Alert.alert('Xóa danh mục', `Xóa "${cat.name}"? Lưu ý: không xóa được nếu có sản phẩm.`, [
      { text: 'Hủy' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(cat.id);
            refetch();
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xóa');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục sản phẩm</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </Pressable>
      </View>

      {isLoading && cats.length === 0 && !isError ? (
              <ListRowSkeleton count={5} />
            ) : isError && cats.length === 0 ? (
              <ErrorState title="Không tải được danh mục" onRetry={() => refetch()} />
            ) : (
              <FlatList
                data={cats}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 12, flexGrow: 1 }}
                onRefresh={refetch}
                refreshing={isFetching && !isLoading}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.icon}>
                      <Text style={{ fontSize: 22 }}>📁</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{item.name}</Text>
                      <Text style={styles.catSlug}>{item.slug}</Text>
                      {item._count && (
                        <Text style={styles.catCount}>{item._count.products || 0} sản phẩm</Text>
                      )}
                    </View>
                    <Pressable onPress={() => openEdit(item)} style={styles.editBtn}>
                      <Text style={styles.editText}>Sửa</Text>
                    </Pressable>
                    <Pressable onPress={() => del(item)} style={[styles.editBtn, styles.delBtn]}>
                      <Text style={[styles.editText, { color: colors.danger }]}>×</Text>
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyState
                    icon="🗂️"
                    title="Chưa có danh mục"
                    description="Thêm danh mục để tổ chức sản phẩm."
                    actionLabel="Thêm danh mục"
                    onAction={openCreate}
                  />
                }
              />
            )}

      <Modal visible={open} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={{ color: colors.danger, fontSize: 16 }}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</Text>
            <Pressable onPress={save}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Lưu</Text>
            </Pressable>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={styles.label}>Tên danh mục</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v, slug: form.slug || slugify(v) })}
              style={styles.input}
              placeholder="VD: Đồ uống, Bánh kẹo..."
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Slug</Text>
            <TextInput
              value={form.slug}
              onChangeText={(v) => setForm({ ...form, slug: v })}
              style={styles.input}
              placeholder="auto từ tên"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Text style={styles.label}>URL ảnh (optional)</Text>
            <TextInput
              value={form.imageUrl}
              onChangeText={(v) => setForm({ ...form, imageUrl: v })}
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    padding: 12, marginBottom: 8, borderRadius: 12, gap: 10,
  },
  icon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 15, fontWeight: '700', color: colors.text },
  catSlug: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  catCount: { fontSize: 11, color: colors.primaryDark, marginTop: 2, fontWeight: '600' },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.bgAlt,
  },
  delBtn: { backgroundColor: '#FEE2E2' },
  editText: { fontWeight: '700', color: colors.text },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: 'white',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 15, color: colors.text,
  },
});
