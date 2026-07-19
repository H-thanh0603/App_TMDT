import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Modal, TextInput, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '@/services/queries';
import type { Address } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';

const empty: any = {
  recipient: '', phone: '', line1: '',
  ward: '', district: '', city: '', isDefault: false,
};

export function AddressesScreen() {
  const { data: addresses = [], isLoading, isError, refetch, isFetching } = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const remove = useDeleteAddress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setForm({ ...addr });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.recipient || !form.phone || !form.line1) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên, SĐT và địa chỉ');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, dto: form });
      } else {
        await create.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu');
    }
  };

  const del = (addr: Address) => {
    Alert.alert('Xóa địa chỉ', `Xóa "${addr.recipient}"?`, [
      { text: 'Hủy' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => remove.mutateAsync(addr.id).catch(() => {}),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Địa chỉ giao hàng</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </Pressable>
      </View>

      {isLoading && addresses.length === 0 && !isError ? (
              <ListRowSkeleton count={3} />
            ) : isError && addresses.length === 0 ? (
              <ErrorState title="Không tải được địa chỉ" onRetry={() => refetch()} />
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item: Address) => item.id}
                contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                onRefresh={refetch}
                refreshing={isFetching && !isLoading}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.recipient}>{item.recipient}</Text>
                      {item.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Mặc định</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.phone}>{item.phone}</Text>
                    <Text style={styles.address}>
                      {[item.line1, item.ward, item.district, item.city].filter(Boolean).join(', ')}
                    </Text>
                    <View style={styles.actions}>
                      <Pressable onPress={() => openEdit(item)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>Sửa</Text>
                      </Pressable>
                      <Pressable onPress={() => del(item)} style={[styles.actionBtn, styles.dangerBtn]}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>Xóa</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyState
                    icon="📍"
                    title="Chưa có địa chỉ nào"
                    description="Thêm địa chỉ để checkout đơn hàng."
                    actionLabel="Thêm địa chỉ đầu tiên"
                    onAction={openCreate}
                  />
                }
              />
            )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={{ color: colors.danger, fontSize: 16 }}>Hủy</Text>
            </Pressable>
            <Text style={styles.modalTitle}>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</Text>
            <Pressable onPress={save}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Lưu</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Field label="Người nhận" value={form.recipient} onChange={(v: string) => setForm({ ...form, recipient: v })} />
            <Field label="Số điện thoại" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <Field label="Địa chỉ chi tiết" value={form.line1} onChange={(v: string) => setForm({ ...form, line1: v })} />
            <Field label="Phường/Xã" value={form.ward ?? ''} onChange={(v: string) => setForm({ ...form, ward: v })} />
            <Field label="Quận/Huyện" value={form.district ?? ''} onChange={(v: string) => setForm({ ...form, district: v })} />
            <Field label="Tỉnh/Thành" value={form.city ?? ''} onChange={(v: string) => setForm({ ...form, city: v })} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Đặt làm mặc định</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => setForm({ ...form, isDefault: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.textSecondary, marginBottom: 16 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: 'white', fontWeight: '700' },
  card: {
    backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 10,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipient: { fontWeight: '700', fontSize: 15, color: colors.text },
  defaultBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  defaultText: { fontSize: 11, color: colors.primaryDark, fontWeight: '700' },
  phone: { color: colors.textSecondary, marginTop: 4 },
  address: { color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.bgAlt,
  },
  dangerBtn: { backgroundColor: '#FEE2E2' },
  actionText: { fontWeight: '700', color: colors.text },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 15, color: colors.text,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
});
