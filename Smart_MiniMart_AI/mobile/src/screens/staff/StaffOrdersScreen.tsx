import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAllOrders, useUpdateOrderStatus } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const FILTERS: Array<{ label: string; value?: OrderStatus }> = [
  { label: 'Tất cả' },
  { label: 'Chờ xác nhận', value: 'PENDING' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Đang chuẩn bị', value: 'PREPARING' },
  { label: 'Đang giao', value: 'DELIVERING' },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'DELIVERING',
  DELIVERING: 'COMPLETED', COMPLETED: null, CANCELED: null,
};

export function StaffOrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | undefined>('PENDING');
  const { data, isLoading } = useAllOrders(filter ? { status: filter } : {});
  const update = useUpdateOrderStatus();
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn cần xử lý</Text>
      </View>

      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={FILTERS} keyExtractor={(f) => f.label}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}
        style={{ maxHeight: 50 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setFilter(item.value)}
            style={[styles.chip, filter === item.value && styles.chipActive]}>
            <Text style={[styles.chipText, filter === item.value && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => {
            const next = NEXT_STATUS[item.status];
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                  <Text style={styles.status}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
                <Text style={styles.userInfo}>
                  {(item as any).user?.fullName} • {(item as any).user?.email}
                </Text>
                <View style={styles.itemList}>
                  {item.items.slice(0, 3).map((it: any) => (
                    <Text key={it.id} style={styles.itemLine} numberOfLines={1}>
                      • {it.productName} × {it.quantity}
                    </Text>
                  ))}
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
                  {next && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={styles.cancelBtn}
                        onPress={() => update.mutate({ id: item.id, status: 'CANCELED', reason: 'Hủy bởi nhân viên' })}>
                        <Text style={styles.cancelText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nextBtn}
                        onPress={() => update.mutate({ id: item.id, status: next })}>
                        <Text style={styles.nextText}>→ {statusLabel(next)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>📭</Text>
              <Text style={styles.emptyText}>Không có đơn nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.roleStaff, borderColor: colors.roleStaff },
  chipText: { fontSize: typography.size.sm, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: typography.weight.semibold },
  card: { backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNumber: { fontWeight: typography.weight.bold, color: colors.text },
  status: { color: colors.roleStaff, fontWeight: typography.weight.semibold, fontSize: typography.size.sm },
  date: { color: colors.textTertiary, fontSize: typography.size.xs, marginTop: 2 },
  userInfo: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: spacing.xs },
  itemList: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  itemLine: { fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  total: { fontWeight: typography.weight.bold, color: colors.primary, fontSize: typography.size.base },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger },
  cancelText: { color: colors.danger, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  nextBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.roleStaff },
  nextText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});
