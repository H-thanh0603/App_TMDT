import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAllOrders } from '@/services/queries';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const STATUSES: Array<{ label: string; value?: OrderStatus }> = [
  { label: 'Tất cả' },
  { label: 'Chờ', value: 'PENDING' },
  { label: 'Xác nhận', value: 'CONFIRMED' },
  { label: 'Chuẩn bị', value: 'PREPARING' },
  { label: 'Giao', value: 'DELIVERING' },
  { label: 'Xong', value: 'COMPLETED' },
  { label: 'Hủy', value: 'CANCELED' },
];

export function AdminOrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);
  const { data, isLoading } = useAllOrders(filter ? { status: filter, limit: 50 } : { limit: 50 });
  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tất cả đơn hàng</Text>
        <Text style={styles.subtitle}>{data?.total ?? 0} đơn</Text>
      </View>

      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUSES} keyExtractor={(s) => s.label}
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
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <Text style={styles.status}>{statusLabel(item.status)}</Text>
              </View>
              <Text style={styles.userInfo}>
                {item.user?.fullName} • {item.user?.email}
              </Text>
              <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.itemCount}>
                  {item.items.length} sản phẩm
                </Text>
                <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={styles.emptyText}>Không có đơn hàng</Text>
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
  subtitle: { color: colors.textSecondary, marginTop: 2, fontSize: typography.size.sm },
  chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.roleAdmin, borderColor: colors.roleAdmin },
  chipText: { fontSize: typography.size.sm, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: typography.weight.semibold },
  card: { backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNumber: { fontWeight: typography.weight.bold, color: colors.text },
  status: { color: colors.roleAdmin, fontWeight: typography.weight.semibold, fontSize: typography.size.sm },
  userInfo: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: 4 },
  date: { color: colors.textTertiary, fontSize: typography.size.xs, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  itemCount: { color: colors.textSecondary, fontSize: typography.size.sm },
  total: { fontWeight: typography.weight.bold, color: colors.primary, fontSize: typography.size.base },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});
