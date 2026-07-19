import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import {
  useAdminUsers, useCreateStaff, useUpdateUser, useAdjustLoyalty,
} from '@/services/queries';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/Skeleton';

const ROLES = ['CUSTOMER', 'STAFF', 'STORE_ADMIN', 'AI_MANAGER'] as const;
const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  STORE_ADMIN: 'Quản lý',
  AI_MANAGER: 'AI Manager',
};
const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  CUSTOMER: { bg: '#DBEAFE', fg: '#1E40AF' },
  STAFF: { bg: colors.primarySoft, fg: colors.primaryDark },
  STORE_ADMIN: { bg: colors.aiSoft, fg: colors.aiDark },
  AI_MANAGER: { bg: colors.goldSoft, fg: '#92400E' },
};

export function AdminUsersScreen() {
  const [filterRole, setFilterRole] = useState<string>('STAFF');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState<any>(null);

  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers({
      role: filterRole === 'ALL' ? undefined : filterRole,
      q: search || undefined,
      page: 1,
    });

    const items = data?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý người dùng</Text>
        <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Text style={styles.addBtnText}>+ Tạo NV</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['ALL', ...ROLES].map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, filterRole === r && styles.chipActive]}
              onPress={() => setFilterRole(r)}
            >
              <Text style={[styles.chipText, filterRole === r && styles.chipTextActive]}>
                {r === 'ALL' ? 'Tất cả' : ROLE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="🔍 Tìm theo tên, email, SĐT..."
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
      />

      {isLoading && !data ? (
              <ListRowSkeleton count={5} />
            ) : isError && !data ? (
              <ErrorState title="Không tải được người dùng" onRetry={() => refetch()} />
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 12, flexGrow: 1 }}
                onRefresh={refetch}
                refreshing={isFetching && !isLoading}
                renderItem={({ item }) => {
                  const color = ROLE_COLORS[item.role] || ROLE_COLORS.CUSTOMER;
                  return (
                    <View style={styles.userCard}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.fullName?.charAt(0) || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{item.fullName}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
                        <View style={styles.tagRow}>
                          <View style={[styles.tag, { backgroundColor: color.bg }]}>
                            <Text style={[styles.tagText, { color: color.fg }]}>
                              {ROLE_LABELS[item.role]}
                            </Text>
                          </View>
                          {item.isVip && (
                            <View style={[styles.tag, { backgroundColor: colors.goldSoft }]}>
                              <Text style={[styles.tagText, { color: colors.gold }]}>⭐ VIP</Text>
                            </View>
                          )}
                          <Text style={styles.points}>{item.loyaltyPoints} điểm</Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => setPointsOpen(item)}
                      >
                        <Text style={styles.editBtnText}>±</Text>
                      </Pressable>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <EmptyState
                    icon="👥"
                    title="Không tìm thấy người dùng"
                    description={filterRole === 'ALL' ? 'Chưa có user trong hệ thống.' : 'Thử đổi bộ lọc vai trò hoặc tìm kiếm.'}
                    actionLabel={filterRole === 'STAFF' ? 'Tạo nhân viên' : 'Tải lại'}
                    onAction={() => {
                      if (filterRole === 'STAFF') setCreateOpen(true);
                      else refetch();
                    }}
                  />
                }
              />
            )}

      <CreateStaffModal open={createOpen} onClose={() => { setCreateOpen(false); refetch(); }} />
      <AdjustPointsModal user={pointsOpen} onClose={() => { setPointsOpen(null); refetch(); }} />
    </SafeAreaView>
  );
}

function CreateStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateStaff();
  const [form, setForm] = useState<any>({
    email: '', password: '', fullName: '', phone: '', role: 'STAFF',
  });

  const submit = async () => {
    if (!form.email || !form.password || !form.fullName) {
      Alert.alert('Thiếu thông tin', 'Email, mật khẩu, họ tên là bắt buộc');
      return;
    }
    try {
      await create.mutateAsync(form);
      Alert.alert('Thành công', `Đã tạo tài khoản ${form.email}`);
      setForm({ email: '', password: '', fullName: '', phone: '', role: 'STAFF' });
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
          <Text style={styles.modalTitle}>Tạo nhân viên mới</Text>
          <Pressable onPress={submit} disabled={create.isPending}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              {create.isPending ? '...' : 'Tạo'}
            </Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Field label="Họ tên" value={form.fullName} onChange={(v: string) => setForm({ ...form, fullName: v })} />
          <Field label="Email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} keyboardType="email-address" />
          <Field label="Mật khẩu" value={form.password} onChange={(v: string) => setForm({ ...form, password: v })} secure />
          <Field label="Số điện thoại" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />

          <Text style={styles.label}>Vai trò</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                onPress={() => setForm({ ...form, role: r })}
              >
                <Text style={[styles.roleChipText, form.role === r && { color: 'white' }]}>
                  {ROLE_LABELS[r]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AdjustPointsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const adjust = useAdjustLoyalty();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  if (!user) return null;

  const submit = async () => {
    const n = Number(delta);
    if (!n || isNaN(n)) {
      Alert.alert('Sai định dạng', 'Nhập số điểm (có thể âm)');
      return;
    }
    try {
      await adjust.mutateAsync({ id: user.id, delta: n, reason });
      Alert.alert('Thành công', `Đã ${n > 0 ? 'cộng' : 'trừ'} ${Math.abs(n)} điểm`);
      setDelta(''); setReason('');
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể điều chỉnh');
    }
  };

  return (
    <Modal visible={!!user} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>Hủy</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Điều chỉnh điểm</Text>
          <Pressable onPress={submit}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Lưu</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.userInfo}>
            <Text style={styles.userInfoName}>{user.fullName}</Text>
            <Text style={styles.userInfoMail}>{user.email}</Text>
            <Text style={styles.userInfoPoints}>Hiện có: {user.loyaltyPoints} điểm</Text>
          </View>

          <Field
            label="Số điểm (dương = cộng, âm = trừ)"
            value={delta} onChange={setDelta}
            keyboardType="numbers-and-punctuation"
            placeholder="Ví dụ: 100 hoặc -50"
          />
          <Field label="Lý do" value={reason} onChange={setReason} placeholder="VIP, sự kiện, hoàn trả..." />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, value, onChange, keyboardType, secure, placeholder }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        style={styles.input}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
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
  filterRow: { padding: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: colors.bgAlt, marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: 'white' },
  searchInput: {
    margin: 12, marginTop: 0, padding: 12, backgroundColor: 'white',
    borderRadius: 10, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: colors.textSecondary },
  userCard: {
    flexDirection: 'row', backgroundColor: 'white', padding: 12,
    marginBottom: 8, borderRadius: 12, gap: 10, alignItems: 'center',
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
  userName: { fontSize: 15, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  userPhone: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  tagRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '700' },
  points: { fontSize: 12, color: colors.gold, fontWeight: '700' },
  editBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.aiSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { color: colors.aiDark, fontSize: 18, fontWeight: '800' },
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
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  userInfo: {
    backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  userInfoName: { fontSize: 15, fontWeight: '800', color: colors.text },
  userInfoMail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  userInfoPoints: { fontSize: 14, fontWeight: '700', color: colors.gold, marginTop: 8 },
});
