import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Modal, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme/colors';
import { api, unwrap } from '@/services/api';
import { formatVnd } from '@/utils/format';

const useAdminPromos = () =>
  useQuery({
    queryKey: ['admin-promos'],
    queryFn: async () =>
      unwrap<any[]>(await api.get('/promotions', { params: { all: 'true' } })),
  });

const useCreatePromo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => unwrap<any>(await api.post('/promotions', dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
};

const useTogglePromo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      unwrap<any>(await api.patch(`/promotions/${id}`, { isActive: active })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
};

export function AdminPromotionsScreen() {
  const { data: promos = [], isLoading, refetch } = useAdminPromos();
  const toggle = useTogglePromo();
  const [createOpen, setCreateOpen] = useState(false);

  const now = Date.now();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Khuyến mãi & Voucher</Text>
        <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Text style={styles.addBtnText}>+ Tạo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : promos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyText}>Chưa có khuyến mãi nào</Text>
        </View>
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const expired = new Date(item.endsAt).getTime() < now;
            const upcoming = new Date(item.startsAt).getTime() > now;
            const status = !item.isActive
              ? { text: 'Đã tắt', color: '#991B1B', bg: '#FEE2E2' }
              : expired
              ? { text: 'Đã hết hạn', color: '#92400E', bg: '#FEF3C7' }
              : upcoming
              ? { text: 'Sắp diễn ra', color: '#1E40AF', bg: '#DBEAFE' }
              : { text: 'Đang chạy', color: colors.primaryDark, bg: colors.primarySoft };

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>
                <Text style={styles.promoName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.promoDesc}>{item.description}</Text>
                )}
                <View style={styles.discountRow}>
                  <Text style={styles.discountLabel}>Giảm:</Text>
                  <Text style={styles.discountValue}>
                    {item.discountType === 'PERCENT'
                      ? `${item.discountValue}%`
                      : formatVnd(Number(item.discountValue))}
                  </Text>
                  {Number(item.maxDiscount) > 0 && item.discountType === 'PERCENT' && (
                    <Text style={styles.maxDiscount}>tối đa {formatVnd(Number(item.maxDiscount))}</Text>
                  )}
                </View>
                {Number(item.minOrderValue) > 0 && (
                  <Text style={styles.minOrder}>
                    Đơn từ {formatVnd(Number(item.minOrderValue))}
                  </Text>
                )}
                <Text style={styles.dateRange}>
                  {new Date(item.startsAt).toLocaleDateString('vi-VN')} →{' '}
                  {new Date(item.endsAt).toLocaleDateString('vi-VN')}
                </Text>
                <Pressable
                  style={styles.toggleBtn}
                  onPress={() =>
                    toggle.mutateAsync({ id: item.id, active: !item.isActive })
                  }
                >
                  <Text style={styles.toggleText}>
                    {item.isActive ? '⏸ Tắt' : '▶ Bật'}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <CreatePromoModal open={createOpen} onClose={() => { setCreateOpen(false); refetch(); }} />
    </SafeAreaView>
  );
}

function CreatePromoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePromo();
  const [form, setForm] = useState<any>({
    code: '', name: '', description: '',
    discountType: 'PERCENT', discountValue: '',
    minOrderValue: '', maxDiscount: '',
    startsAt: '', endsAt: '',
  });

  const submit = async () => {
    if (!form.code || !form.name || !form.discountValue) {
      Alert.alert('Thiếu thông tin', 'Mã, tên và giá trị giảm là bắt buộc');
      return;
    }
    try {
      const today = new Date();
      const week = new Date(today);
      week.setDate(week.getDate() + 30);
      await create.mutateAsync({
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        startsAt: form.startsAt || today.toISOString(),
        endsAt: form.endsAt || week.toISOString(),
      });
      Alert.alert('Thành công', `Đã tạo voucher ${form.code.toUpperCase()}`);
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tạo');
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>Hủy</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Tạo khuyến mãi</Text>
          <Pressable onPress={submit}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Tạo</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Field label="Mã voucher (UPPERCASE)" value={form.code}
            onChange={(v: string) => setForm({ ...form, code: v.toUpperCase() })}
            placeholder="VD: WELCOME10, SUMMER2026" />
          <Field label="Tên chương trình" value={form.name}
            onChange={(v: string) => setForm({ ...form, name: v })}
            placeholder="Giảm 10% đơn đầu tiên" />
          <Field label="Mô tả" value={form.description}
            onChange={(v: string) => setForm({ ...form, description: v })} multiline />

          <Text style={styles.label}>Loại giảm</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggle, form.discountType === 'PERCENT' && styles.toggleActive]}
              onPress={() => setForm({ ...form, discountType: 'PERCENT' })}
            >
              <Text style={[styles.toggleLabel, form.discountType === 'PERCENT' && { color: 'white' }]}>%</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, form.discountType === 'FIXED' && styles.toggleActive]}
              onPress={() => setForm({ ...form, discountType: 'FIXED' })}
            >
              <Text style={[styles.toggleLabel, form.discountType === 'FIXED' && { color: 'white' }]}>VND</Text>
            </Pressable>
          </View>

          <Field
            label={form.discountType === 'PERCENT' ? 'Giá trị giảm (%)' : 'Số tiền giảm (VND)'}
            value={form.discountValue}
            onChange={(v: string) => setForm({ ...form, discountValue: v })}
            keyboardType="numeric"
          />
          <Field label="Đơn tối thiểu (VND)" value={form.minOrderValue}
            onChange={(v: string) => setForm({ ...form, minOrderValue: v })}
            keyboardType="numeric" placeholder="0 = không giới hạn" />
          {form.discountType === 'PERCENT' && (
            <Field label="Giảm tối đa (VND)" value={form.maxDiscount}
              onChange={(v: string) => setForm({ ...form, maxDiscount: v })}
              keyboardType="numeric" placeholder="0 = không giới hạn" />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, value, onChange, keyboardType, placeholder, multiline }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        multiline={multiline}
      />
    </View>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.textSecondary },
  card: {
    backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 10,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: {
    backgroundColor: colors.aiSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: colors.ai, borderStyle: 'dashed',
  },
  codeText: { color: colors.aiDark, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  promoName: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10 },
  promoDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  discountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  discountLabel: { fontSize: 13, color: colors.textMuted },
  discountValue: { fontSize: 18, fontWeight: '800', color: colors.danger },
  maxDiscount: { fontSize: 11, color: colors.textMuted },
  minOrder: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dateRange: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  toggleBtn: {
    alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.bgAlt, borderRadius: 8,
  },
  toggleText: { fontWeight: '700', color: colors.text, fontSize: 12 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: 'white',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 15, color: colors.text,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  toggle: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleLabel: { fontWeight: '700', color: colors.text },
});
