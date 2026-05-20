import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAllOrders, useUpdateOrderStatus } from '@/services/queries';
import { Badge } from '@/components/Badge';
import { colors } from '@/theme/colors';
import { formatDateTime, formatVnd, statusLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

const STATUSES: Array<{ label: string; value?: OrderStatus; emoji: string }> = [
  { label: 'Tất cả', emoji: '📋' },
  { label: 'Chờ', value: 'PENDING', emoji: '⏳' },
  { label: 'Xác nhận', value: 'CONFIRMED', emoji: '✓' },
  { label: 'Chuẩn bị', value: 'PREPARING', emoji: '📦' },
  { label: 'Giao', value: 'DELIVERING', emoji: '🚚' },
  { label: 'Xong', value: 'COMPLETED', emoji: '✅' },
  { label: 'Hủy', value: 'CANCELED', emoji: '❌' },
];

const STATUS_VARIANT: Record<string, any> = {
  PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'ai',
  DELIVERING: 'gold', COMPLETED: 'success', CANCELED: 'danger',
};

export function AdminOrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);
  const { data, isLoading, refetch, isFetching } = useAllOrders(
    filter ? { status: filter, limit: 100 } : { limit: 100 },
  );
  const update = useUpdateOrderStatus();
  const items = data?.items ?? [];

  // Quick stats
  const { data: allData } = useAllOrders({ limit: 100 });
  const stats = useMemo(() => {
    const all = allData?.items ?? [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayOrders = all.filter((o: any) =>
      new Date(o.createdAt).getTime() >= today.getTime());
    return {
      total: all.length,
      pending: all.filter((o: any) => o.status === 'PENDING').length,
      todayRevenue: todayOrders
        .filter((o: any) => o.status !== 'CANCELED')
        .reduce((s: number, o: any) => s + Number(o.totalAmount), 0),
    };
  }, [allData]);

  const cancel = (id: string) => {
    Alert.alert('Hủy đơn?', 'Bạn có chắc muốn hủy đơn này?', [
      { text: 'Không' },
      {
        text: 'Hủy đơn', style: 'destructive',
        onPress: async () => {
          try { await update.mutateAsync({ id, status: 'CANCELED' }); }
          catch (e: any) { Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể hủy'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Đơn hàng</Text>
          <Text style={styles.subtitle}>{data?.total ?? 0} đơn</Text>
        </View>
      </View>

      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Tổng đơn</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Chờ xử lý</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { fontSize: 14 }]}>{formatVnd(stats.todayRevenue)}</Text>
          <Text style={styles.statLabel}>DT hôm nay</Text>
        </View>
      </View>

      {/* Status filter chips */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUSES} keyExtractor={(s) => s.label}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        style={{ maxHeight: 50 }}
        renderItem={({ item }) => {
          const active = filter === item.value;
          return (
            <Pressable
              onPress={() => setFilter(item.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={styles.chipEmoji}>{item.emoji}</Text>
              <Text style={[styles.chipText, active && { color: 'white' }]}>{item.label}</Text>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o: any) => o.id}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          renderItem={({ item: rawItem }) => {
            const item = rawItem as any;
            const canCancel = ['PENDING', 'CONFIRMED'].includes(item.status);
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                    <Text style={styles.orderTime}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                  <Badge
                    label={statusLabel(item.status)}
                    variant={STATUS_VARIANT[item.status] || 'default'}
                    size="md"
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.customerRow}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>
                      {item.customer?.fullName ?? item.shippingName ?? 'Khách'}
                    </Text>
                    <Text style={styles.customerPhone}>
                      {item.customer?.phone ?? item.shippingPhone ?? ''}
                    </Text>
                  </View>
                  <Text style={styles.payment}>
                    {item.paymentMethod === 'COD' ? '💵 COD' : '🏦 ' + item.paymentMethod}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.itemCount}>{item.items?.length ?? 0} sản phẩm</Text>
                  <Text style={styles.total}>{formatVnd(Number(item.totalAmount))}</Text>
                </View>

                {canCancel && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => cancel(item.id)}
                  >
                    <Text style={styles.cancelText}>Hủy đơn</Text>
                  </Pressable>
                )}
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
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statsBanner: {
    flexDirection: 'row', backgroundColor: 'white',
    marginHorizontal: 12, marginVertical: 10,
    paddingVertical: 14, borderRadius: 12,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18, backgroundColor: colors.bgAlt, height: 36,
  },
  chipActive: { backgroundColor: colors.primary },
  chipEmoji: { fontSize: 13 },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  orderCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    marginBottom: 8,
    shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: colors.text },
  orderTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerName: { fontSize: 13, fontWeight: '700', color: colors.text },
  customerPhone: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  payment: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },
  itemCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  total: { fontSize: 17, fontWeight: '900', color: colors.primary },
  cancelBtn: {
    marginTop: 10, paddingVertical: 8,
    backgroundColor: '#FEE2E2', borderRadius: 8, alignItems: 'center',
  },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
});
